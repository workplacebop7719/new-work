import 'server-only';
import { headers } from 'next/headers';
import { getPool } from '@/db/client';
import { token } from './secret';
import {
  decide, RATE_LIMITS,
  type RateLimitBucket, type RateLimitDecision, type RateLimitDimension,
} from './rate-limit';

/**
 * Counting attempts, without recording who made them.
 *
 * The policy lives in rate-limit.ts and is pure. This is the half that talks
 * to a database — and the half that has to decide what to do when there is no
 * database at all.
 */

/** Rate limiting needs somewhere durable to count. */
export const rateLimitingAvailable = (): boolean => Boolean(process.env.DATABASE_URL);

/**
 * Who is asking, as a keyed token rather than an address.
 *
 * `x-forwarded-for` can carry a list appended by every proxy in the chain, and
 * a client can put whatever it likes at the front. Only the LAST entry is
 * written by infrastructure we control, so that is the one taken — trusting
 * the first would let anybody rotate their own limit away by sending a new
 * header each time.
 *
 * Returns null when nothing identifies the caller, which the policy treats as
 * "skip that dimension" rather than "everybody shares one bucket". See decide().
 */
export async function callerToken(): Promise<string | null> {
  const jar = await headers();

  const forwarded = jar.get('x-forwarded-for');
  const candidates = forwarded
    ? forwarded.split(',').map((part) => part.trim()).filter(Boolean)
    : [];
  const nearest = candidates.at(-1) ?? jar.get('x-real-ip')?.trim() ?? null;

  if (!nearest) return null;
  return token('rate-limit-caller', nearest);
}

/** An address, or any other subject, as a token. Lower-cased so casing does
 *  not hand somebody a fresh allowance. */
export const subjectToken = (value: string): string =>
  token('rate-limit-subject', value.trim().toLowerCase());

interface Counted {
  subject: number;
  caller: number | null;
  oldestAt: number | null;
}

async function count(
  bucket: RateLimitBucket, subject: string | null, caller: string | null, since: Date,
): Promise<Counted> {
  const { rows } = await getPool().query<{
    dimension: RateLimitDimension; hits: string; oldest: Date;
  }>(
    `select dimension, count(*) as hits, min(occurred_at) as oldest
     from rate_limit_hits
     where bucket = $1
       and occurred_at >= $2
       and ((dimension = 'subject' and token = $3)
         or (dimension = 'caller'  and token = $4))
     group by dimension`,
    [bucket, since, subject ?? '', caller ?? ''],
  );

  const forDimension = (dimension: RateLimitDimension) =>
    rows.find((row) => row.dimension === dimension);

  const oldest = rows
    .map((row) => row.oldest.getTime())
    .sort((a, b) => a - b)[0] ?? null;

  return {
    subject: Number(forDimension('subject')?.hits ?? 0),
    caller: caller === null ? null : Number(forDimension('caller')?.hits ?? 0),
    oldestAt: oldest,
  };
}

/**
 * Whether this attempt may proceed, WITHOUT recording it.
 *
 * Checking and recording are separate on purpose. A sign-in records only when
 * it fails, so a correct password never counts against anybody.
 *
 * With no database configured this allows everything. That is the honest
 * behaviour for the fixture mode the public site runs in, where there are no
 * accounts to attack; `rateLimitingAvailable()` is what surfaces it, so a
 * deployment cannot quietly run unprotected while believing otherwise.
 */
export async function checkRateLimit(
  bucket: RateLimitBucket, subject: string, now: Date = new Date(),
): Promise<RateLimitDecision> {
  if (!rateLimitingAvailable()) return { allowed: true };

  const since = new Date(now.getTime() - RATE_LIMITS[bucket].windowMs);
  // A bucket with no subject limit reads no subject rows: there are none, and
  // asking for them would only invite somebody to start writing them.
  const subjectKey = RATE_LIMITS[bucket].perSubject === null ? null : subjectToken(subject);
  const counts = await count(bucket, subjectKey, await callerToken(), since);
  return decide(bucket, counts, now.getTime());
}

/** Records one attempt against both dimensions. */
export async function recordRateLimitHit(
  bucket: RateLimitBucket, subject: string,
): Promise<void> {
  if (!rateLimitingAvailable()) return;

  const caller = await callerToken();
  const rows: Array<[RateLimitBucket, RateLimitDimension, string]> = [];
  // Nothing is written against a subject the policy will never read.
  if (RATE_LIMITS[bucket].perSubject !== null) {
    rows.push([bucket, 'subject', subjectToken(subject)]);
  }
  if (caller) rows.push([bucket, 'caller', caller]);
  if (rows.length === 0) return;

  await getPool().query(
    `insert into rate_limit_hits (bucket, dimension, token)
     select * from unnest($1::text[], $2::text[], $3::text[])`,
    [rows.map((r) => r[0]), rows.map((r) => r[1]), rows.map((r) => r[2])],
  );
}

/**
 * Forgets a subject's hits.
 *
 * The CALLER's count is deliberately left alone: somebody who succeeds once
 * has not earned an unlimited supply of attempts against everybody else.
 *
 * Not used by sign-in, which has no subject limit to forget — see the note in
 * rate-limit.ts. It exists for the buckets that do.
 */
export async function clearRateLimit(
  bucket: RateLimitBucket, subject: string,
): Promise<void> {
  if (!rateLimitingAvailable()) return;
  await getPool().query(
    `delete from rate_limit_hits
     where bucket = $1 and dimension = 'subject' and token = $2`,
    [bucket, subjectToken(subject)],
  );
}

/**
 * Marks a solved bot challenge as spent, and reports whether it already was.
 *
 * This closes the replay gap BOT-RESISTANCE.md documented: a solved challenge
 * could otherwise be submitted repeatedly inside its ten-minute life, so one
 * unit of work bought as many sign-ups as somebody cared to send.
 *
 * The insert IS the check. Asking first and inserting afterwards leaves a
 * window where two concurrent requests both see nothing and both proceed —
 * which is exactly the request pattern an attacker sends.
 */
export async function spendChallenge(signature: string): Promise<boolean> {
  if (!rateLimitingAvailable()) return true;

  const { rowCount } = await getPool().query(
    'insert into challenge_uses (signature) values ($1) on conflict do nothing',
    [signature],
  );
  return rowCount === 1;
}

/** Housekeeping, called from the sweep. Returns how many rows went. */
export async function pruneRateLimits(): Promise<number> {
  if (!rateLimitingAvailable()) return 0;
  const { rows } = await getPool().query<{ prune_rate_limits: number }>(
    'select prune_rate_limits()',
  );
  return rows[0]?.prune_rate_limits ?? 0;
}
