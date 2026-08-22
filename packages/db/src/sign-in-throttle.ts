/**
 * Per-account sign-in throttling — threat model T-14 (credential stuffing).
 *
 * This is a different control from `rate-limit.ts`, and both are needed. The
 * rate limiter counts requests from one *client*; this counts failures against
 * one *address*. A stuffing run distributed across a botnet defeats the first
 * and is caught by the second; a single client hammering one endpoint is the
 * reverse.
 *
 * The key is an HMAC of the address with a daily rotation, so this table never
 * holds an address that failed to sign in — including addresses that belong to
 * nobody, which is most of them during an attack.
 */
import { createHmac } from 'node:crypto';
import { isLockedOut, SIGN_IN_ATTEMPT_LIMIT, SIGN_IN_LOCKOUT_MS } from '@northstar/domain';
import { withSystemContext } from './client';

const SYSTEM_REASON = 'sign-in throttle (keyed by address hash, not by tenant)';

/**
 * Same construction as the rate limiter's `clientHash`, and the same reasoning:
 * a daily salt means counters cannot be correlated across days, by anyone.
 */
export function throttleKey(email: string, now: Date = new Date()): string {
  const secret = process.env['RATE_LIMIT_SECRET'];
  if (!secret) {
    throw new Error('RATE_LIMIT_SECRET is not set. See .env.example.');
  }
  const day = now.toISOString().slice(0, 10);
  return createHmac('sha256', secret).update(`signin:${day}:${email.trim().toLowerCase()}`).digest('hex');
}

export interface ThrottleDecision {
  readonly lockedOut: boolean;
  readonly retryAfterSeconds: number;
  readonly failedAttempts: number;
}

interface Row {
  failed_attempts: number;
  last_failure_at: Date | null;
}

async function read(key: string): Promise<Row | undefined> {
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<Row>(
      `SELECT failed_attempts, last_failure_at FROM sign_in_throttle WHERE subject_key = $1`,
      [key],
    );
    return rows[0];
  });
}

/**
 * Whether this address is currently locked out.
 *
 * Checked *before* the credentials are sent to the identity provider, so a
 * locked account costs an attacker a database read rather than a provider call.
 * It also means the provider's own throttling is not the only line of defence,
 * which matters because that behaviour differs between vendors (Q-13).
 */
export async function checkSignInThrottle(
  email: string,
  now: Date = new Date(),
): Promise<ThrottleDecision> {
  const row = await read(throttleKey(email, now));
  if (!row) return { lockedOut: false, retryAfterSeconds: 0, failedAttempts: 0 };

  const lockedOut = isLockedOut(row.failed_attempts, row.last_failure_at, now);
  const retryAfterSeconds =
    lockedOut && row.last_failure_at
      ? Math.max(
          1,
          Math.ceil((row.last_failure_at.getTime() + SIGN_IN_LOCKOUT_MS - now.getTime()) / 1000),
        )
      : 0;
  return { lockedOut, retryAfterSeconds, failedAttempts: row.failed_attempts };
}

/**
 * Records a failure and reports the resulting state.
 *
 * The counter resets when the lockout window has passed rather than
 * accumulating forever: an address that failed nine times last week and once
 * today is not under attack, and treating it as though it were locks out a
 * person who mistypes a password occasionally.
 */
export async function recordSignInFailure(
  email: string,
  now: Date = new Date(),
): Promise<ThrottleDecision> {
  const key = throttleKey(email, now);
  const row = await withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<Row>(
      `INSERT INTO sign_in_throttle (subject_key, failed_attempts, last_failure_at, updated_at)
       VALUES ($1, 1, $2, $2)
       ON CONFLICT (subject_key) DO UPDATE
         SET failed_attempts = CASE
               WHEN sign_in_throttle.last_failure_at < $2 - ($3 || ' milliseconds')::interval THEN 1
               ELSE sign_in_throttle.failed_attempts + 1
             END,
             last_failure_at = $2,
             updated_at = $2
       RETURNING failed_attempts, last_failure_at`,
      [key, now, String(SIGN_IN_LOCKOUT_MS)],
    );
    return rows[0]!;
  });

  const lockedOut = isLockedOut(row.failed_attempts, row.last_failure_at, now);
  return {
    lockedOut,
    retryAfterSeconds: lockedOut ? Math.ceil(SIGN_IN_LOCKOUT_MS / 1000) : 0,
    failedAttempts: row.failed_attempts,
  };
}

/** Clears the counter after a successful sign-in. */
export async function clearSignInFailures(email: string, now: Date = new Date()): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(`DELETE FROM sign_in_throttle WHERE subject_key = $1`, [throttleKey(email, now)]);
  });
}

export { SIGN_IN_ATTEMPT_LIMIT, SIGN_IN_LOCKOUT_MS };
