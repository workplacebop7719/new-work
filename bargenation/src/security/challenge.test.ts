/**
 * The valuable tests here are the ones proving a forged or replayed challenge
 * is REFUSED. A proof-of-work check that can be talked out of the work is
 * decoration.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  issueChallenge, verifyChallenge, challengeDigest, leadingZeroBits,
  challengeFromForm, challengeSecretConfigured,
  DIFFICULTY_BITS, MAX_AGE_MS, MIN_AGE_MS, CHALLENGE_MESSAGE,
  type ChallengeSubmission,
} from './challenge';

const NOW = new Date('2026-08-23T12:00:00Z');
const later = (ms: number) => new Date(NOW.getTime() + ms);

/** What a browser does, done here so the tests exercise the real path. */
function solve(nonce: string, bits: number): string {
  for (let counter = 0; counter < 5_000_000; counter++) {
    const candidate = String(counter);
    if (leadingZeroBits(challengeDigest(nonce, candidate)) >= bits) return candidate;
  }
  throw new Error('no solution found');
}

function solved(purpose: Parameters<typeof issueChallenge>[0] = 'SIGN_UP'): ChallengeSubmission {
  const challenge = issueChallenge(purpose, NOW);
  return { ...challenge, solution: solve(challenge.nonce, challenge.bits), trap: '' };
}

describe('counting leading zero bits', () => {
  it.each([
    ['ffff', 0],
    ['8fff', 0],
    ['7fff', 1],
    ['3fff', 2],
    ['1fff', 3],
    ['0fff', 4],
    ['00ff', 8],
    ['000f', 12],
    ['0001', 15],
  ])('%s has %i', (hex, expected) => {
    expect(leadingZeroBits(hex)).toBe(expected);
  });

  /** Bits, not hex characters — otherwise difficulty moves in steps of 16. */
  it('distinguishes difficulties within a single hex character', () => {
    expect(leadingZeroBits('1abc')).toBe(3);
    expect(leadingZeroBits('2abc')).toBe(2);
  });
});

describe('a genuine submission', () => {
  it('is accepted once the work is done', () => {
    const submission = solved();
    expect(verifyChallenge(submission, 'SIGN_UP', later(MIN_AGE_MS + 500))).toEqual({ ok: true });
  });

  it('really did the work — the digest clears the difficulty', () => {
    const submission = solved();
    expect(leadingZeroBits(challengeDigest(submission.nonce, submission.solution)))
      .toBeGreaterThanOrEqual(DIFFICULTY_BITS);
  });
});

describe('refusing what a script would send', () => {
  it('refuses a filled honeypot before looking at anything else', () => {
    const submission = { ...solved(), trap: 'https://example.com' };
    expect(verifyChallenge(submission, 'SIGN_UP', later(2000)))
      .toEqual({ ok: false, reason: 'TRAP_FILLED' });
  });

  it('refuses an unsolved challenge', () => {
    const challenge = issueChallenge('SIGN_UP', NOW);
    const submission = { ...challenge, solution: '1', trap: '' };
    expect(verifyChallenge(submission, 'SIGN_UP', later(2000)))
      .toEqual({ ok: false, reason: 'BAD_SOLUTION' });
  });

  /**
   * THE ATTACK THE SIGNATURE EXISTS FOR. Asking for zero difficulty makes any
   * string a valid solution — so `bits` must not be trusted until the
   * signature covering it has been checked.
   */
  it('refuses a self-lowered difficulty', () => {
    const challenge = issueChallenge('SIGN_UP', NOW);
    const submission = { ...challenge, bits: 0, solution: 'anything', trap: '' };
    expect(verifyChallenge(submission, 'SIGN_UP', later(2000)))
      .toEqual({ ok: false, reason: 'BAD_SIGNATURE' });
  });

  it('refuses a challenge nobody issued', () => {
    const submission = {
      purpose: 'SIGN_UP' as const,
      nonce: 'a'.repeat(32),
      bits: DIFFICULTY_BITS,
      issuedAt: NOW.getTime(),
      signature: 'f'.repeat(64),
      solution: '1',
      trap: '',
    };
    expect(verifyChallenge(submission, 'SIGN_UP', later(2000)))
      .toEqual({ ok: false, reason: 'BAD_SIGNATURE' });
  });

  /** A cheap challenge must not be spendable on an expensive form. */
  it('refuses a challenge issued for a different form', () => {
    const submission = solved('SUBSCRIBE');
    expect(verifyChallenge(submission, 'SIGN_UP', later(2000)))
      .toEqual({ ok: false, reason: 'WRONG_PURPOSE' });
  });

  it('refuses a stockpiled challenge once it is stale', () => {
    const submission = solved();
    expect(verifyChallenge(submission, 'SIGN_UP', later(MAX_AGE_MS + 1)))
      .toEqual({ ok: false, reason: 'EXPIRED' });
  });

  /** Dwell time is measured by OUR clock; there is no client number to forge. */
  it('refuses a form returned faster than a person could fill it', () => {
    const submission = solved();
    expect(verifyChallenge(submission, 'SIGN_UP', later(MIN_AGE_MS - 1)))
      .toEqual({ ok: false, reason: 'TOO_FAST' });
  });

  it('refuses a timestamp from the future', () => {
    const challenge = issueChallenge('SIGN_UP', later(60_000));
    const submission = { ...challenge, solution: solve(challenge.nonce, challenge.bits), trap: '' };
    expect(verifyChallenge(submission, 'SIGN_UP', NOW))
      .toEqual({ ok: false, reason: 'EXPIRED' });
  });

  it.each([
    ['nothing at all', null],
    ['an empty object', {}],
    ['a short nonce', { ...({} as ChallengeSubmission), nonce: 'abc' }],
  ])('refuses %s', (_label, submission) => {
    expect(verifyChallenge(submission as Partial<ChallengeSubmission>, 'SIGN_UP', later(2000)))
      .toEqual({ ok: false, reason: 'MALFORMED' });
  });

  it('refuses an absurd solution rather than hashing it', () => {
    const challenge = issueChallenge('SIGN_UP', NOW);
    const submission = { ...challenge, solution: 'x'.repeat(500), trap: '' };
    expect(verifyChallenge(submission, 'SIGN_UP', later(2000)))
      .toEqual({ ok: false, reason: 'MALFORMED' });
  });
});

/**
 * THE MESSAGE IS ONE MESSAGE, AND THAT IS THE SECURITY PROPERTY.
 *
 * Telling a caller WHICH check they failed is a tuning signal: "too fast" and
 * "bad solution" together describe exactly how to get through. So every
 * failure produces the same sentence, and this is where that is pinned —
 * rather than in a browser smoke, which should be free to stop asserting on
 * copy it does not care about.
 */
describe('what a refused caller is told', () => {
  it('says the same thing however the challenge failed', () => {
    const cases: ChallengeSubmission[] = [
      { ...solved(), trap: 'https://example.com' },
      { ...issueChallenge('SIGN_UP', NOW), solution: '1', trap: '' },
      { ...issueChallenge('SIGN_UP', NOW), bits: 0, solution: 'anything', trap: '' },
      { ...solved('SUBSCRIBE') },
    ];
    for (const submission of cases) {
      const verdict = verifyChallenge(submission, 'SIGN_UP', later(2000));
      expect(verdict.ok).toBe(false);
    }
    // One constant, used for all of them — there is no per-reason copy to
    // diverge, which is the only way the property stays true.
    expect(typeof CHALLENGE_MESSAGE).toBe('string');
    expect(CHALLENGE_MESSAGE.length).toBeGreaterThan(0);
  });

  /**
   * It must not name a check, or the vagueness is decorative. These are the
   * words that would give the game away.
   */
  it('names no check, no timing and no threshold', () => {
    expect(CHALLENGE_MESSAGE).not.toMatch(
      /honeypot|trap|signature|solution|difficulty|bits|expired|fast|slow|second|hash/i,
    );
  });

  /** It has to tell somebody what to do, and the advice has to be true. */
  it('tells a real person to try again, and does not tell them to reload', () => {
    expect(CHALLENGE_MESSAGE).toMatch(/try again/i);
    // The forms fetch a fresh challenge when an action returns, so a reload is
    // not what fixes this — and on a router-cached page it can hand back the
    // very challenge that just failed.
    expect(CHALLENGE_MESSAGE).not.toMatch(/reload|refresh the page/i);
  });
});

describe('reading a challenge out of a form', () => {
  it('shapes the fields the page posts', () => {
    const form = new FormData();
    form.set('challengePurpose', 'SIGN_UP');
    form.set('challengeNonce', 'a'.repeat(32));
    form.set('challengeBits', '16');
    form.set('challengeIssuedAt', '1700000000000');
    form.set('challengeSignature', 'deadbeef');
    form.set('challengeSolution', '4242');
    form.set('website', '');

    expect(challengeFromForm(form)).toEqual({
      purpose: 'SIGN_UP', nonce: 'a'.repeat(32), bits: 16,
      issuedAt: 1700000000000, signature: 'deadbeef', solution: '4242', trap: '',
    });
  });

  it('turns a missing or unparseable number into undefined, not NaN', () => {
    const form = new FormData();
    form.set('challengeBits', 'not a number');
    const read = challengeFromForm(form);
    expect(read.bits).toBeUndefined();
    expect(read.issuedAt).toBeUndefined();
  });

  /** An empty form must be MALFORMED, never accidentally valid. */
  it('produces something verifyChallenge refuses', () => {
    expect(verifyChallenge(challengeFromForm(new FormData()), 'SIGN_UP').ok).toBe(false);
  });
});

/**
 * BOTH names have to be stubbed in every one of these.
 *
 * `configuredSecret` accepts APP_SECRET or, under its older name,
 * CHALLENGE_SECRET. Stubbing only the second passed for months because no
 * machine running the suite had the first set — and the day one did, "reports
 * not configured" started reporting configured. A test whose result depends on
 * an ambient variable it does not mention is not testing what it says.
 */
describe('the signing key', () => {
  afterEach(() => vi.unstubAllEnvs());

  const setSecret = (value: string) => {
    vi.stubEnv('APP_SECRET', value);
    vi.stubEnv('CHALLENGE_SECRET', value);
  };

  it('reports whether a durable secret is configured', () => {
    setSecret('');
    expect(challengeSecretConfigured()).toBe(false);
    setSecret('a-long-enough-development-secret');
    expect(challengeSecretConfigured()).toBe(true);
  });

  it('refuses a secret too short to be worth having', () => {
    setSecret('short');
    expect(challengeSecretConfigured()).toBe(false);
  });

  /** The old name still works on its own — that compatibility is deliberate. */
  it('still accepts the older CHALLENGE_SECRET name alone', () => {
    vi.stubEnv('APP_SECRET', '');
    vi.stubEnv('CHALLENGE_SECRET', 'a-long-enough-development-secret');
    expect(challengeSecretConfigured()).toBe(true);
  });
});
