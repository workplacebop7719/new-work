/**
 * The valuable tests here are about the two ways a rate limiter goes wrong:
 * letting an attack through, and locking out the person it was protecting.
 */
import { describe, it, expect } from 'vitest';
import {
  decide, rateLimitMessage, RATE_LIMITS,
  type RateLimitBucket, type RateLimitCounts,
} from './rate-limit';

const NOW = Date.parse('2026-08-24T12:00:00Z');
const counts = (over: Partial<RateLimitCounts> = {}): RateLimitCounts =>
  ({ subject: 0, caller: 0, oldestAt: null, ...over });

describe('allowing an ordinary attempt', () => {
  it('lets a first attempt through', () => {
    expect(decide('SIGN_IN', counts(), NOW)).toEqual({ allowed: true });
  });

  it('lets somebody having a bad morning keep trying', () => {
    // Four wrong passwords is a person, not an attack.
    expect(decide('SIGN_IN', counts({ subject: 4, caller: 4 }), NOW)).toEqual({ allowed: true });
  });

  it('allows right up to the allowance, and refuses at it', () => {
    const limit = RATE_LIMITS.PASSWORD_RESET.perSubject!;
    expect(decide('PASSWORD_RESET', counts({ subject: limit - 1 }), NOW).allowed).toBe(true);
    expect(decide('PASSWORD_RESET', counts({ subject: limit }), NOW).allowed).toBe(false);
  });
});

describe('refusing an attack', () => {
  it('stops one address being used over and over', () => {
    const decision = decide('PASSWORD_RESET', counts({ subject: 3, oldestAt: NOW - 60_000 }), NOW);
    expect(decision).toMatchObject({ allowed: false, dimension: 'subject' });
  });

  /** The attack no per-account counter can see: a few tries each, everywhere. */
  it('stops credential stuffing spread across many addresses', () => {
    const decision = decide('SIGN_IN', counts({ subject: 1, caller: 50 }), NOW);
    expect(decision).toMatchObject({ allowed: false, dimension: 'caller' });
  });

  it('reports how long is left in the window, not the whole window', () => {
    const decision = decide(
      'SIGN_IN', counts({ caller: 99, oldestAt: NOW - 5 * 60_000 }), NOW,
    );
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.retryAfterMs).toBe(RATE_LIMITS.SIGN_IN.windowMs - 5 * 60_000);
  });

  it('never reports a negative wait for a window that has already passed', () => {
    const decision = decide(
      'SIGN_IN', counts({ caller: 99, oldestAt: NOW - 60 * 60_000 }), NOW,
    );
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.retryAfterMs).toBe(0);
  });
});

/**
 * THE FAILURE MODE THAT MATTERS MOST.
 *
 * A request arriving with nothing that identifies where it came from — no
 * proxy header, or a deployment that stopped setting one — must not put every
 * visitor in the world into a single shared bucket. That is a self-inflicted
 * outage from a missing header.
 */
describe('an unidentifiable caller', () => {
  it('is skipped rather than treated as one shared bucket', () => {
    expect(decide('SIGN_IN', counts({ subject: 0, caller: null }), NOW))
      .toEqual({ allowed: true });
  });

  it('does not disable the per-subject limit as well', () => {
    expect(decide('PASSWORD_RESET', counts({ subject: 3, caller: null }), NOW))
      .toMatchObject({ allowed: false, dimension: 'subject' });
  });
});

describe('the allowances themselves', () => {
  const buckets = Object.keys(RATE_LIMITS) as RateLimitBucket[];

  /** A household, an office or a school shares one address to the network. */
  it('is always more generous to a caller than to one subject', () => {
    for (const bucket of buckets) {
      const rule = RATE_LIMITS[bucket];
      if (rule.perSubject === null) continue;
      expect({ bucket, ok: rule.perCaller > rule.perSubject })
        .toEqual({ bucket, ok: true });
    }
  });

  it('gives password reset the tightest per-address allowance', () => {
    // Every attempt there can put mail in somebody else's inbox.
    for (const bucket of buckets) {
      const limit = RATE_LIMITS[bucket].perSubject;
      if (limit === null) continue;
      expect(RATE_LIMITS.PASSWORD_RESET.perSubject!).toBeLessThanOrEqual(limit);
    }
  });

  /**
   * THE ONE THAT MUST NOT REGRESS.
   *
   * A per-address limit on sign-in is an account lockout handed to anybody who
   * knows your email. A browser test caught it once; this catches it before
   * the browser has to.
   */
  it('never limits sign-in by address, because that is a lockout', () => {
    expect(RATE_LIMITS.SIGN_IN.perSubject).toBeNull();
  });

  it('has a window and a positive allowance for every bucket', () => {
    for (const bucket of buckets) {
      const rule = RATE_LIMITS[bucket];
      expect(rule.windowMs).toBeGreaterThan(0);
      expect(rule.perCaller).toBeGreaterThan(0);
      if (rule.perSubject !== null) expect(rule.perSubject).toBeGreaterThan(0);
    }
  });
});

describe('what a refused caller is told', () => {
  /** Naming the account would confirm it is worth attacking. */
  it('names no address and no dimension', () => {
    const message = rateLimitMessage(10 * 60_000);
    expect(message).not.toMatch(/address|account|email|caller|subject|IP/i);
  });

  it('rounds the wait rather than handing over a countdown to automate', () => {
    expect(rateLimitMessage(7 * 60_000)).toContain('10 minutes');
    expect(rateLimitMessage(11 * 60_000)).toContain('15 minutes');
  });

  it('is precise while the wait is short, where rounding would mislead', () => {
    expect(rateLimitMessage(2 * 60_000)).toContain('2 minutes');
  });

  it('never says zero, or one minutes', () => {
    expect(rateLimitMessage(0)).toContain('1 minute');
    expect(rateLimitMessage(0)).not.toContain('1 minutes');
  });
});
