/**
 * Contract tests for the identity port, run against the fake.
 *
 * These are written against `IdentityPort`, not against `FakeIdentity`, so that
 * the adapter chosen under Q-13 can be dropped into `subject` and must pass the
 * same suite. That is the whole claim ADR-0006 makes about replaceability, and
 * an interface nobody tests twice is not replaceable, it is just abstract.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { RECOVERY_CODE_COUNT } from '@northstar/domain';
import { FakeIdentity } from './fakes';

const NOW = new Date('2026-08-21T12:00:00Z');
const PASSWORD = 'correct horse battery staple';

let identity: FakeIdentity;
let subjectId: string;

async function enrolTotp(): Promise<string> {
  const offer = await identity.beginEnrolment({
    subjectId,
    method: 'totp',
    accountLabel: 'dana@example.org',
  });
  const secret = offer.manualEntrySecret!;
  const { totp } = await import('./totp');
  const result = await identity.confirmEnrolment({
    enrolmentId: offer.enrolmentId,
    code: totp(secret, NOW),
  });
  expect(result.enrolled).toBe(true);
  return secret;
}

beforeEach(async () => {
  identity = new FakeIdentity();
  identity.now = () => NOW;
  const created = await identity.createSubject(
    { email: 'Dana@Example.org', displayName: 'Dana Okonkwo', locale: 'en' },
    { idempotencyKey: 'signup-1' },
  );
  subjectId = created.externalId;
  await identity.setPassword({ subjectId, password: PASSWORD });
});

describe('subject creation', () => {
  it('is idempotent, so a retried sign-up makes one account', async () => {
    const again = await identity.createSubject(
      { email: 'dana@example.org', displayName: 'Dana Okonkwo', locale: 'en' },
      { idempotencyKey: 'signup-1' },
    );
    expect(again.externalId).toBe(subjectId);
  });

  it('matches an existing address regardless of how it was capitalized', async () => {
    const again = await identity.createSubject(
      { email: 'DANA@EXAMPLE.ORG', displayName: 'Dana O', locale: 'fr' },
      { idempotencyKey: 'signup-2' },
    );
    expect(again.externalId).toBe(subjectId);
  });

  it('refuses an outbound write with no idempotency key (ARC-004)', async () => {
    await expect(
      identity.createSubject(
        { email: 'new@example.org', displayName: 'New', locale: 'en' },
        { idempotencyKey: '' },
      ),
    ).rejects.toThrow(/idempotency/i);
  });
});

describe('password policy', () => {
  it('refuses a password below the minimum length', async () => {
    await expect(identity.setPassword({ subjectId, password: 'short' })).rejects.toThrow(
      /too_short/,
    );
  });

  it('accepts a long passphrase with no symbols or digits', async () => {
    await expect(
      identity.setPassword({ subjectId, password: 'seventeen syllables about a heron' }),
    ).resolves.toBeUndefined();
  });
});

describe('sign-in', () => {
  it('never reports a first factor as sufficient (SEC-002)', async () => {
    await enrolTotp();
    const challenge = await identity.beginSignIn({ email: 'dana@example.org', password: PASSWORD });
    // There is no `authenticated` outcome in the union at all. This asserts the
    // runtime agrees with the type: a correct password yields a challenge.
    expect(challenge.outcome).toBe('mfa_required');
  });

  it('routes an account with no factor to enrolment rather than to a session', async () => {
    const challenge = await identity.beginSignIn({ email: 'dana@example.org', password: PASSWORD });
    expect(challenge.outcome).toBe('enrolment_required');
  });

  it('gives the same answer for a wrong password and an unknown address (T-13)', async () => {
    const wrongPassword = await identity.beginSignIn({
      email: 'dana@example.org',
      password: 'not the right passphrase',
    });
    const unknownAddress = await identity.beginSignIn({
      email: 'nobody@example.org',
      password: PASSWORD,
    });
    expect(wrongPassword).toEqual({ outcome: 'rejected' });
    expect(unknownAddress).toEqual({ outcome: 'rejected' });
  });

  it('rejects a disabled subject even with the right password (SEC-013)', async () => {
    await enrolTotp();
    await identity.setSubjectEnabled({ subjectId, enabled: false });
    expect(await identity.beginSignIn({ email: 'dana@example.org', password: PASSWORD })).toEqual({
      outcome: 'rejected',
    });
  });
});

describe('second factor', () => {
  it('verifies a valid time-based code', async () => {
    const secret = await enrolTotp();
    const { totp } = await import('./totp');
    const challenge = await identity.beginSignIn({ email: 'dana@example.org', password: PASSWORD });
    if (challenge.outcome !== 'mfa_required') throw new Error('expected a challenge');

    const result = await identity.verifySecondFactor({
      challengeId: challenge.challengeId,
      method: 'totp',
      code: totp(secret, NOW),
    });
    expect(result).toEqual({ outcome: 'verified', subjectId, method: 'totp' });
  });

  it('refuses to reuse a challenge, so a captured code cannot be replayed', async () => {
    const secret = await enrolTotp();
    const { totp } = await import('./totp');
    const challenge = await identity.beginSignIn({ email: 'dana@example.org', password: PASSWORD });
    if (challenge.outcome !== 'mfa_required') throw new Error('expected a challenge');

    const code = totp(secret, NOW);
    await identity.verifySecondFactor({ challengeId: challenge.challengeId, method: 'totp', code });
    const replay = await identity.verifySecondFactor({
      challengeId: challenge.challengeId,
      method: 'totp',
      code,
    });
    expect(replay).toEqual({ outcome: 'rejected' });
  });

  it('reports an expired challenge distinctly, so the interface can say what to do', async () => {
    await enrolTotp();
    const challenge = await identity.beginSignIn({ email: 'dana@example.org', password: PASSWORD });
    if (challenge.outcome !== 'mfa_required') throw new Error('expected a challenge');

    identity.now = () => new Date(NOW.getTime() + FakeIdentity.CHALLENGE_TTL_MS + 1000);
    const result = await identity.verifySecondFactor({
      challengeId: challenge.challengeId,
      method: 'totp',
      code: '000000',
    });
    expect(result).toEqual({ outcome: 'challenge_expired' });
  });

  it('refuses a method the subject has not enrolled', async () => {
    await enrolTotp();
    const challenge = await identity.beginSignIn({ email: 'dana@example.org', password: PASSWORD });
    if (challenge.outcome !== 'mfa_required') throw new Error('expected a challenge');

    const result = await identity.verifySecondFactor({
      challengeId: challenge.challengeId,
      method: 'passkey',
      code: FakeIdentity.PASSKEY_ASSERTION,
    });
    expect(result).toEqual({ outcome: 'rejected' });
  });
});

describe('enrolment (ACC-009)', () => {
  it('offers the secret in text as well as a scannable URI', async () => {
    const offer = await identity.beginEnrolment({
      subjectId,
      method: 'totp',
      accountLabel: 'dana@example.org',
    });
    // A QR code alone excludes anyone who cannot see it, and anyone enrolling on
    // the same device that is displaying it.
    expect(offer.manualEntrySecret).toMatch(/^[A-Z2-7]+$/);
    expect(offer.provisioningUri).toContain('otpauth://totp/');
  });

  it('does not enrol the factor when the confirmation code is wrong', async () => {
    const offer = await identity.beginEnrolment({
      subjectId,
      method: 'totp',
      accountLabel: 'dana@example.org',
    });
    const result = await identity.confirmEnrolment({ enrolmentId: offer.enrolmentId, code: '000000' });
    expect(result.enrolled).toBe(false);
    expect(await identity.enrolledMethods(subjectId)).toEqual([]);
  });

  it('refuses to treat recovery codes as an enrollable factor', async () => {
    await expect(
      identity.beginEnrolment({ subjectId, method: 'recovery_code', accountLabel: 'x' }),
    ).rejects.toThrow(/issued, not enrolled/);
  });
});

describe('recovery codes', () => {
  it('issues a full set once', async () => {
    const codes = await identity.issueRecoveryCodes(subjectId);
    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    expect(new Set(codes).size).toBe(RECOVERY_CODE_COUNT);
  });

  it('invalidates the previous set when a new one is issued', async () => {
    const first = await identity.issueRecoveryCodes(subjectId);
    await identity.issueRecoveryCodes(subjectId);
    const result = await identity.redeemRecoveryCode({
      email: 'dana@example.org',
      code: first[0]!,
    });
    expect(result.redeemed).toBe(false);
  });

  it('accepts a code once and never again', async () => {
    const codes = await identity.issueRecoveryCodes(subjectId);
    expect((await identity.redeemRecoveryCode({ email: 'dana@example.org', code: codes[0]! })).redeemed).toBe(
      true,
    );
    expect((await identity.redeemRecoveryCode({ email: 'dana@example.org', code: codes[0]! })).redeemed).toBe(
      false,
    );
  });

  it('returns the account to enrolment rather than signing anyone in', async () => {
    await enrolTotp();
    const codes = await identity.issueRecoveryCodes(subjectId);
    await identity.redeemRecoveryCode({ email: 'dana@example.org', code: codes[0]! });

    expect(await identity.enrolledMethods(subjectId)).toEqual([]);
    const challenge = await identity.beginSignIn({ email: 'dana@example.org', password: PASSWORD });
    expect(challenge.outcome).toBe('enrolment_required');
  });

  it('tolerates the spacing and case someone types from a printed sheet', async () => {
    const codes = await identity.issueRecoveryCodes(subjectId);
    const typed = ` ${codes[0]!.toUpperCase()} `;
    expect((await identity.redeemRecoveryCode({ email: 'dana@example.org', code: typed })).redeemed).toBe(
      true,
    );
  });

  it('refuses a code for a disabled account', async () => {
    const codes = await identity.issueRecoveryCodes(subjectId);
    await identity.setSubjectEnabled({ subjectId, enabled: false });
    expect((await identity.redeemRecoveryCode({ email: 'dana@example.org', code: codes[0]! })).redeemed).toBe(
      false,
    );
  });
});
