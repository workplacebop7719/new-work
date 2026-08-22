import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDevAuth, type DevAuth } from './dev-adapter';
import { AuthError } from './types';

const CREDS = { email: 'Parent@Example.com', password: 'correct horse battery' };

describe('the development adapter refuses to exist in production', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when NODE_ENV is production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => createDevAuth()).toThrow(/cannot run in production/i);
  });

  it('names the environment variables a real provider needs', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => createDevAuth()).toThrow(/SUPABASE/);
  });

  it('is available outside production', () => {
    vi.stubEnv('NODE_ENV', 'test');
    expect(() => createDevAuth()).not.toThrow();
  });
});

describe('sign up and sign in', () => {
  let auth: DevAuth;
  beforeEach(() => {
    auth = createDevAuth() as DevAuth;
  });

  it('creates an account and returns a live session with its token', async () => {
    const { session, token } = await auth.signUp({ ...CREDS, displayName: '  Sam  ' });
    expect(session.user.email).toBe('parent@example.com');
    expect(session.user.displayName).toBe('Sam');
    expect(session.user.emailVerified).toBe(false);
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(token).toBeTruthy();
  });

  it('treats email as case-insensitive on the way back in', async () => {
    await auth.signUp(CREDS);
    const { session } = await auth.signIn({ email: 'PARENT@EXAMPLE.COM', password: CREDS.password });
    expect(session.user.email).toBe('parent@example.com');
  });

  it('refuses a second account on the same address', async () => {
    await auth.signUp(CREDS);
    await expect(auth.signUp(CREDS)).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('refuses a short password', async () => {
    await expect(
      auth.signUp({ email: 'a@b.com', password: 'short' }),
    ).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
  });

  it('refuses an implausible address', async () => {
    await expect(
      auth.signUp({ email: 'not-an-email', password: CREDS.password }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  /**
   * The load-bearing privacy test. If a wrong password and an unknown address
   * produced different errors, this form would tell anyone who has an account
   * with us — which for a family shopping product is a real disclosure.
   */
  it('gives the same answer for a wrong password and an unknown account', async () => {
    await auth.signUp(CREDS);

    const wrongPassword = await auth
      .signIn({ email: CREDS.email, password: 'wrong but long enough' })
      .catch((e: AuthError) => e);
    const noSuchUser = await auth
      .signIn({ email: 'nobody@example.com', password: CREDS.password })
      .catch((e: AuthError) => e);

    expect((wrongPassword as AuthError).code).toBe('INVALID_CREDENTIALS');
    expect((noSuchUser as AuthError).code).toBe('INVALID_CREDENTIALS');
    expect((wrongPassword as AuthError).code).toBe((noSuchUser as AuthError).code);
  });

  it('never stores the password itself', async () => {
    await auth.signUp(CREDS);
    const dumped = JSON.stringify(auth);
    expect(dumped).not.toContain(CREDS.password);
  });
});

describe('sessions', () => {
  it('resolves a token to the signed-in customer', async () => {
    const auth = createDevAuth() as DevAuth;
    const { session, token } = await auth.signUp(CREDS);
    const resolved = await auth.getSession(token);
    expect(resolved?.user.id).toBe(session.user.id);
  });

  it('returns null for an absent, unknown or empty token', async () => {
    const auth = createDevAuth() as DevAuth;
    expect(await auth.getSession(null)).toBeNull();
    expect(await auth.getSession('')).toBeNull();
    expect(await auth.getSession('not-a-real-token')).toBeNull();
  });

  it('stops accepting a token once it has expired', async () => {
    let clock = new Date('2026-01-01T00:00:00Z');
    const auth = createDevAuth({ now: () => clock }) as DevAuth;
    const { token } = await auth.signUp(CREDS);

    expect(await auth.getSession(token)).not.toBeNull();
    clock = new Date('2026-01-09T00:00:00Z'); // eight days later
    expect(await auth.getSession(token)).toBeNull();
  });

  it('drops the session on sign out', async () => {
    const auth = createDevAuth() as DevAuth;
    const { token } = await auth.signUp(CREDS);
    await auth.signOut(token);
    expect(await auth.getSession(token)).toBeNull();
  });
});

describe('password reset', () => {
  it('does not reveal whether an address has an account', async () => {
    const auth = createDevAuth() as DevAuth;
    await auth.signUp(CREDS);
    await expect(auth.requestPasswordReset(CREDS.email)).resolves.toBeUndefined();
    await expect(auth.requestPasswordReset('stranger@example.com')).resolves.toBeUndefined();
    expect(auth.__pendingResetToken('stranger@example.com')).toBeUndefined();
  });

  it('changes the password and accepts the new one', async () => {
    const auth = createDevAuth() as DevAuth;
    await auth.signUp(CREDS);
    await auth.requestPasswordReset(CREDS.email);
    const token = auth.__pendingResetToken(CREDS.email)!;

    await auth.resetPassword(token, 'a brand new passphrase');
    await expect(auth.signIn(CREDS)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(
      auth.signIn({ email: CREDS.email, password: 'a brand new passphrase' }),
    ).resolves.toBeTruthy();
  });

  /** Reset is how someone recovers a stolen account; the thief's session must die. */
  it('invalidates every existing session', async () => {
    const auth = createDevAuth() as DevAuth;
    const { token: stolenToken } = await auth.signUp(CREDS);
    expect(await auth.getSession(stolenToken)).not.toBeNull();

    await auth.requestPasswordReset(CREDS.email);
    await auth.resetPassword(auth.__pendingResetToken(CREDS.email)!, 'a brand new passphrase');

    expect(await auth.getSession(stolenToken)).toBeNull();
  });

  it('rejects a reused or unknown token', async () => {
    const auth = createDevAuth() as DevAuth;
    await auth.signUp(CREDS);
    await auth.requestPasswordReset(CREDS.email);
    const token = auth.__pendingResetToken(CREDS.email)!;

    await auth.resetPassword(token, 'a brand new passphrase');
    await expect(auth.resetPassword(token, 'another passphrase entirely'))
      .rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('still enforces password strength on reset', async () => {
    const auth = createDevAuth() as DevAuth;
    await auth.signUp(CREDS);
    await auth.requestPasswordReset(CREDS.email);
    await expect(
      auth.resetPassword(auth.__pendingResetToken(CREDS.email)!, 'tiny'),
    ).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
  });
});

describe('email verification', () => {
  it('marks the address verified', async () => {
    const auth = createDevAuth() as DevAuth;
    const { session, token } = await auth.signUp(CREDS);
    expect(session.user.emailVerified).toBe(false);

    await auth.verifyEmail(auth.__pendingVerifyToken(CREDS.email)!);
    const resolved = await auth.getSession(token);
    expect(resolved?.user.emailVerified).toBe(true);
  });

  it('rejects an unknown token', async () => {
    const auth = createDevAuth() as DevAuth;
    await expect(auth.verifyEmail('made-up')).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });
});
