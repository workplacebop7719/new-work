/**
 * RATE LIMITING (PRD §01, §69).
 *
 * The bot challenge prices bulk automation. It does nothing about somebody
 * patiently trying ten thousand passwords against one account, or asking for a
 * password reset a hundred times to bury somebody in mail. This does.
 *
 * TWO DIMENSIONS, FOR TWO DIFFERENT ATTACKS.
 *
 *   By SUBJECT — the address being acted on. Stops one address being used
 *   over and over: a hundred reset emails, or a hundred sign-ups.
 *
 *   By CALLER — whoever is asking. Stops credential stuffing, which is a few
 *   attempts each against thousands of accounts and is invisible to any
 *   per-account counter.
 *
 * WHY SIGN-IN IS NOT LIMITED BY ACCOUNT.
 *
 * The first version of this counted failed sign-ins against the address and
 * refused once the allowance was spent. A browser test then did the obvious
 * thing — burned the allowance with wrong guesses, then signed in with the
 * CORRECT password — and the owner was refused. That is an account lockout
 * handed to anybody who knows your email address, which is a denial of
 * service dressed as a protection.
 *
 * So sign-in is limited by CALLER only. An attacker can fill their own bucket
 * and nobody else's, and a correct password is never refused however many
 * wrong ones came before it.
 *
 * The residual risk is stated rather than hidden: a distributed attack, a few
 * guesses each from a thousand different callers, is not stopped by this. The
 * answer to that is password strength and monitoring, not a lockout that
 * hands the same weapon to anybody who wants to use it.
 *
 * Every OTHER bucket keeps both dimensions, because refusing a sign-up, a
 * reset request or a subscription cannot lock anybody out of an account they
 * already have.
 *
 * WHAT IS NEVER STORED. Not an address and not an IP. Both are reduced to a
 * keyed token (security/secret.ts) which is deleted within the hour. The key
 * is what makes that safe: an unkeyed hash of an IPv4 address is four billion
 * candidates, which is seconds of work.
 *
 * This module is pure. It decides; the store counts.
 */

/** What is being limited. Each carries its own window and allowance. */
export type RateLimitBucket =
  | 'SIGN_IN'
  | 'SIGN_UP'
  | 'PASSWORD_RESET'
  | 'PASSWORD_RESET_TOKEN'
  | 'SUBSCRIBE';

export interface RateLimitRule {
  /** How long the window is, in milliseconds. */
  windowMs: number;
  /**
   * Attempts allowed against one address (or other subject) in that window.
   *
   * `null` means this bucket is NOT limited by subject — see the note above
   * on why sign-in is not. Nothing is recorded against the subject either,
   * because storing a count that cannot act on anything is a table pretending
   * to be a protection.
   */
  perSubject: number | null;
  /** Attempts allowed from one caller in that window. */
  perCaller: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * The allowances.
 *
 * Chosen so that a person having a bad morning never meets them. Somebody who
 * has genuinely forgotten which of two passwords they used will try three or
 * four times, not ten; somebody who has genuinely lost access asks for one
 * reset link and then maybe one more when the first does not arrive.
 *
 * The per-caller numbers are higher than the per-subject ones because a
 * household, an office or a school shares one address as far as the network is
 * concerned, and a shared connection must not be punished for being shared.
 */
export const RATE_LIMITS: Record<RateLimitBucket, RateLimitRule> = {
  /**
   * Caller only, and failures only. Limiting by address here would let anybody
   * who knows your email lock you out of your own account.
   *
   * Twenty rather than the fifty this started at, precisely BECAUSE there is
   * no address limit behind it: the caller allowance is now the only thing
   * standing between somebody and an unlimited supply of guesses. Fifty
   * failures every quarter of an hour is nearly five thousand a day from one
   * connection, which is not a rate limit so much as a formality.
   *
   * Twenty failures in fifteen minutes still lets a household or a small
   * office of people mistyping their own passwords through without noticing.
   * A large corporate network behind one address could meet it; that is the
   * cost of not having an account lockout, and it is the cheaper of the two.
   */
  SIGN_IN: { windowMs: 15 * MINUTE, perSubject: null, perCaller: 20 },
  SIGN_UP: { windowMs: HOUR, perSubject: 5, perCaller: 20 },
  // The costly one: every attempt here can put mail in somebody else's inbox.
  PASSWORD_RESET: { windowMs: HOUR, perSubject: 3, perCaller: 15 },
  // Guessing a reset token. There is no legitimate reason to be here often.
  PASSWORD_RESET_TOKEN: { windowMs: 15 * MINUTE, perSubject: 10, perCaller: 20 },
  SUBSCRIBE: { windowMs: HOUR, perSubject: 3, perCaller: 15 },
};

export type RateLimitDimension = 'subject' | 'caller';

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; dimension: RateLimitDimension; retryAfterMs: number };

export interface RateLimitCounts {
  /** Hits recorded against this subject inside the window. */
  subject: number;
  /** Hits recorded against this caller inside the window, or null when the
   *  caller could not be identified at all. */
  caller: number | null;
  /** When the oldest hit in the window was recorded, for the retry hint. */
  oldestAt: number | null;
}

/**
 * Whether this attempt may proceed.
 *
 * A caller count of `null` means the request arrived with nothing that
 * identifies where it came from — no proxy header, or a deployment that does
 * not set one. That dimension is then SKIPPED rather than treated as a single
 * shared bucket.
 *
 * That choice is deliberate and it fails open. The alternative fails closed:
 * one missing header and every visitor in the world shares one allowance, so
 * the site rate-limits itself into an outage. A missing header is a
 * misconfiguration; an outage is an incident.
 */
export function decide(
  bucket: RateLimitBucket,
  counts: RateLimitCounts,
  now: number,
): RateLimitDecision {
  const rule = RATE_LIMITS[bucket];
  const retryAfterMs = counts.oldestAt === null
    ? rule.windowMs
    : Math.max(0, counts.oldestAt + rule.windowMs - now);

  if (rule.perSubject !== null && counts.subject >= rule.perSubject) {
    return { allowed: false, dimension: 'subject', retryAfterMs };
  }
  if (counts.caller !== null && counts.caller >= rule.perCaller) {
    return { allowed: false, dimension: 'caller', retryAfterMs };
  }
  return { allowed: true };
}

/**
 * What a refused caller is told.
 *
 * One message for both dimensions, and it names no account. Saying "too many
 * attempts for THIS address" would confirm the address is worth attacking,
 * which turns a protection into the enumeration oracle every other part of
 * this flow is written to avoid.
 *
 * It gives a rounded wait rather than a precise one, because a precise
 * countdown is a timer to automate against.
 */
export function rateLimitMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / MINUTE));
  const rounded = minutes <= 5 ? minutes : Math.ceil(minutes / 5) * 5;
  return `Too many attempts. Try again in about ${rounded} ${rounded === 1 ? 'minute' : 'minutes'}.`;
}
