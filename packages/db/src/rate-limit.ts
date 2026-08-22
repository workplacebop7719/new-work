/**
 * Rate limiting for anonymous endpoints — question Q-27.
 *
 * ## Why not a CAPTCHA
 *
 * The obvious answer to "an anonymous endpoint is being abused" is a challenge
 * widget. PRD §15 (ACC-005) and §27 rule that out: a visual or timed puzzle is a
 * barrier to exactly the users this product exists to serve, and §27 says to
 * replace a component that blocks accessibility rather than patch around it.
 *
 * So the control is a plain fixed-window counter. It costs an abuser time rather
 * than asking a disabled user to prove they are human, and when it refuses it
 * says so in words with a Retry-After, which any assistive technology can convey.
 *
 * ## Why fixed window rather than a token bucket
 *
 * A fixed window is a single upsert and is trivially correct under concurrency
 * with `ON CONFLICT`. Its known weakness is burst-at-the-boundary: an abuser can
 * send 2× the limit across a window edge. At the volumes this protects — a
 * public form, not an API — that is an acceptable trade for a control with no
 * moving parts and no separate datastore.
 */
import { createHmac } from 'node:crypto';
import { withSystemContext } from './client';

export interface RateLimitRule {
  readonly limit: number;
  readonly windowSeconds: number;
}

/**
 * Limits are sized against the false-positive case, not the abuse case.
 *
 * The identifier is an IP address, and the buyers this product targets are
 * organizations — which means many legitimate visitors arrive from **one**
 * office NAT. A limit tuned to "how often would one person do this?" would lock
 * out an entire client the moment two colleagues compared notes. So each budget
 * is set to comfortably absorb a plausible burst from a shared address, and
 * still cost a script far more time than the endpoint is worth.
 *
 * `resume_email` stays the tightest because it is the only endpoint that accepts
 * an address and could be pointed at a third party — but even it allows a small
 * office to use the feature normally.
 */
export const RATE_LIMITS = {
  /** ~60 people from one office starting the qualifier in an hour. */
  qualifier_start: { limit: 60, windowSeconds: 3600 },
  /** Eight answers per run; 600 absorbs ~75 completed runs from one address. */
  qualifier_answer: { limit: 600, windowSeconds: 3600 },
  /** Enough for a small team to each request a link; tight enough to be useless for sending mail in volume. */
  resume_email: { limit: 10, windowSeconds: 3600 },
  consent: { limit: 200, windowSeconds: 3600 },
  /**
   * Sign-in attempts from one address. Sized against the false-positive case:
   * the buyers are organizations behind one office NAT, so a limit tuned for a
   * single person would lock out a whole client at 9am. Per-account throttling
   * (`sign_in_throttle`) is the control that actually stops credential stuffing;
   * this one stops a flood.
   */
  sign_in: { limit: 120, windowSeconds: 3600 },
  /** Enrolment and recovery are rarer, and each one costs a provider call. */
  account_security: { limit: 60, windowSeconds: 3600 },
  /** Organization creation. Generous for a genuine office, useless for scripting. */
  sign_up: { limit: 20, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitedAction = keyof typeof RATE_LIMITS;

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  /** Seconds until the current window ends. Surfaced to the user and as Retry-After. */
  readonly retryAfterSeconds: number;
}

/**
 * Derives the storage key.
 *
 * The client identifier (an IP address) is personal data, so it is never stored.
 * It is HMAC'd with a server secret and the current UTC date: the secret stops
 * an offline dictionary attack over the small IPv4 space, and the date rotation
 * stops counters being correlated across days.
 */
export function clientHash(clientIdentifier: string, now: Date): string {
  const secret = process.env['RATE_LIMIT_SECRET'];
  if (!secret) {
    // Failing loudly beats silently hashing with a constant: a deployment
    // missing this variable would otherwise get correlatable keys forever.
    throw new Error('RATE_LIMIT_SECRET is not set. See .env.example.');
  }
  const day = now.toISOString().slice(0, 10);
  return createHmac('sha256', secret).update(`${day}:${clientIdentifier}`).digest('hex');
}

function windowStart(now: Date, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

/**
 * Records one hit and reports whether it is allowed.
 *
 * Counts first, then compares: the increment happens even when the request is
 * refused, so hammering a limited endpoint keeps the window occupied instead of
 * resetting it.
 */
export async function consume(
  clientIdentifier: string,
  action: RateLimitedAction,
  now: Date = new Date(),
): Promise<RateLimitDecision> {
  const rule = RATE_LIMITS[action];
  const start = windowStart(now, rule.windowSeconds);
  const key = clientHash(clientIdentifier, now);

  const count = await withSystemContext('rate limit counter (no personal data)', async (tx) => {
    const { rows } = await tx.query<{ count: number }>(
      `INSERT INTO rate_limit_counters (client_hash, action, window_start, count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (client_hash, action, window_start)
       DO UPDATE SET count = rate_limit_counters.count + 1
       RETURNING count`,
      [key, action, start],
    );
    return rows[0]?.count ?? 0;
  });

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((start.getTime() + rule.windowSeconds * 1000 - now.getTime()) / 1000),
  );

  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds,
  };
}

/** Deletes counters for windows that have closed. Called by the retention sweep. */
export async function pruneRateLimitCounters(now: Date = new Date()): Promise<number> {
  const longestWindow = Math.max(...Object.values(RATE_LIMITS).map((r) => r.windowSeconds));
  const cutoff = new Date(now.getTime() - longestWindow * 2000);
  return withSystemContext('rate limit counter pruning', async (tx) => {
    const { rowCount } = await tx.query('DELETE FROM rate_limit_counters WHERE window_start < $1', [
      cutoff,
    ]);
    return rowCount ?? 0;
  });
}
