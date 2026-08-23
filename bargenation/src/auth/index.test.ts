import { describe, it, expect, afterEach, vi } from 'vitest';
import { createAuth } from './index';
import { translateSupabaseError } from './supabase-adapter';
import { AUTH_MESSAGE, type AuthErrorCode } from './types';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('adapter selection', () => {
  it('uses the development adapter outside production when nothing is configured', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const port = createAuth();
    expect(port.name).toContain('development');
    expect(port.configured).toBe(true);
  });

  /**
   * The single most important test in this module.
   *
   * The development adapter stores users in memory with no verification. If it
   * were ever selected in production, anyone could create an account as
   * anyone. Production without credentials must degrade to a port that refuses
   * everything — never to the fake.
   */
  it('NEVER falls back to the development adapter in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const port = createAuth();
    expect(port.name).toBe('unconfigured');
    expect(port.configured).toBe(false);
    expect(port.name).not.toContain('development');
  });

  it('an unconfigured port refuses every operation identically', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const port = createAuth();

    for (const call of [
      () => port.signIn({ email: 'a@b.com', password: 'long enough password' }),
      () => port.signUp({ email: 'a@b.com', password: 'long enough password' }),
      () => port.requestPasswordReset('a@b.com'),
      () => port.resetPassword('t', 'long enough password'),
      () => port.verifyEmail('t'),
      () => port.changePassword({
        sessionToken: 't', email: 'a@b.com',
        currentPassword: 'long enough password', newPassword: 'another long password',
      }),
      () => port.deleteIdentity({ sessionToken: 't', email: 'a@b.com' }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
    }
    // reading a session simply finds nobody, rather than erroring on every page
    expect(await port.getSession('anything')).toBeNull();
  });

  it('prefers the real provider whenever credentials exist', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    expect(createAuth().name).toBe('supabase');
  });
});

/**
 * A capability the port must not overstate (§37, §69).
 *
 * Deleting a Supabase user needs the service-role key, which bypasses row
 * level security entirely and is deliberately absent from this process. If
 * `canDeleteIdentity` ever reported true here, the delete-account page would
 * stop telling customers that the sign-in itself outlives their data — and
 * would start claiming an erasure that never happened.
 */
describe('what each adapter admits it cannot do', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('the real provider cannot remove a login identity', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    const port = createAuth();

    expect(port.canDeleteIdentity).toBe(false);
    await expect(port.deleteIdentity({ sessionToken: 't', email: 'a@b.com' }))
      .rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });

  it('and delivers its own mail, which we therefore must not warn about', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    expect(createAuth().deliversEmail).toBe(true);
  });
});

describe('provider errors never reach a customer verbatim', () => {
  it.each([
    ['Invalid login credentials', 'INVALID_CREDENTIALS'],
    ['User already registered', 'EMAIL_TAKEN'],
    ['Email not confirmed', 'EMAIL_NOT_VERIFIED'],
    ['Password should be at least 6 characters', 'WEAK_PASSWORD'],
    ['Token has expired or is invalid', 'INVALID_TOKEN'],
  ])('%s becomes %s', (message, code) => {
    expect(translateSupabaseError({ message }).code).toBe(code);
  });

  it('maps a 429 to rate limiting whatever the wording', () => {
    expect(translateSupabaseError({ message: 'anything', status: 429 }).code).toBe('RATE_LIMITED');
  });

  it('turns anything unrecognised into a generic failure', () => {
    for (const raw of [
      { message: 'pgbouncer: connection pool exhausted on db-3.internal' },
      { message: '' },
      null,
      undefined,
      'a bare string',
    ]) {
      expect(translateSupabaseError(raw).code).toBe('UNAVAILABLE');
    }
  });

  it('keeps the raw detail off the customer-facing copy', () => {
    const internal = 'pgbouncer: connection pool exhausted on db-3.internal';
    const err = translateSupabaseError({ message: internal });
    // the detail is retained for logs...
    expect(err.message).toContain('pgbouncer');
    // ...but what we render comes from our own table
    expect(AUTH_MESSAGE[err.code]).not.toContain('pgbouncer');
  });

  it('has customer-facing copy for every error code', () => {
    const codes: AuthErrorCode[] = [
      'INVALID_CREDENTIALS', 'EMAIL_TAKEN', 'WEAK_PASSWORD', 'EMAIL_NOT_VERIFIED',
      'RATE_LIMITED', 'INVALID_TOKEN', 'NOT_CONFIGURED', 'UNAVAILABLE',
    ];
    for (const code of codes) {
      expect(AUTH_MESSAGE[code], code).toBeTruthy();
      expect(AUTH_MESSAGE[code].length, code).toBeGreaterThan(10);
    }
  });

  /** Sign-in must not distinguish "no such account" from "wrong password". */
  it('does not let the provider reveal that an account exists', () => {
    const wrongPassword = translateSupabaseError({ message: 'Invalid login credentials' });
    const noSuchUser = translateSupabaseError({ message: 'Invalid login credentials' });
    expect(AUTH_MESSAGE[wrongPassword.code]).toBe(AUTH_MESSAGE[noSuchUser.code]);
    expect(AUTH_MESSAGE[wrongPassword.code]).not.toMatch(/no account|not found|doesn.t exist/i);
  });
});
