/**
 * WHAT REACHES AN INBOX (PRD §01, §28, §29).
 *
 * The recovery flow's job is to be useful to the person who owns the account
 * and useless to everybody else. These tests are about the second half: what
 * the flow declines to send, and what a message that IS sent must not contain.
 */
import { describe, it, expect } from 'vitest';
import { createDevAuth, type DevAuth } from './dev-adapter';
import { createDevEmail } from '@/email/port';

const CREDS = { email: 'Parent@Example.com', password: 'correct horse battery' };
const BASE = 'https://bargenation.test';

function makeAuth() {
  const mail = createDevEmail();
  const auth = createDevAuth({ email: mail, baseUrl: BASE }) as DevAuth;
  return { auth, mail };
}

/** The link a message carries, so a test exercises the same token a human would. */
const linkIn = (body: string): string => body.match(/https:[^\s]+/)?.[0] ?? '';
const tokenIn = (body: string): string =>
  new URL(linkIn(body)).searchParams.get('token') ?? '';

describe('a reset request for an address with no account', () => {
  /**
   * THE POINT OF THE FLOW. Returning quietly is only half of it: sending
   * "you have no account here" would move exactly the same disclosure out of
   * our response and into somebody's inbox, where it is just as readable to
   * whoever is checking a leaked address list.
   */
  it('sends nothing at all', async () => {
    const { auth, mail } = makeAuth();
    await auth.signUp(CREDS);
    mail.sent.length = 0;

    await auth.requestPasswordReset('stranger@example.com');

    expect(mail.sent).toHaveLength(0);
  });

  it('is indistinguishable from a request that worked, to the caller', async () => {
    const { auth } = makeAuth();
    await auth.signUp(CREDS);

    const known = await auth.requestPasswordReset(CREDS.email);
    const unknown = await auth.requestPasswordReset('stranger@example.com');

    expect(known).toBe(unknown);
  });
});

describe('a reset request for a real account', () => {
  it('sends exactly one message, to that address', async () => {
    const { auth, mail } = makeAuth();
    await auth.signUp(CREDS);
    mail.sent.length = 0;

    await auth.requestPasswordReset(CREDS.email);

    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]!.kind).toBe('PASSWORD_RESET');
    // Normalised, so a message never goes to a differently-cased address.
    expect(mail.sent[0]!.to).toBe('parent@example.com');
  });

  /**
   * The token in the message must be the one that works. A test that reached
   * for __pendingResetToken instead would pass even if the link were built
   * from something else entirely.
   */
  it('carries a link whose token actually resets the password', async () => {
    const { auth, mail } = makeAuth();
    await auth.signUp(CREDS);
    mail.sent.length = 0;
    await auth.requestPasswordReset(CREDS.email);

    const link = linkIn(mail.sent[0]!.body);
    expect(link).toContain(`${BASE}/reset-password`);

    await auth.resetPassword(tokenIn(mail.sent[0]!.body), 'a brand new passphrase');
    await expect(
      auth.signIn({ email: CREDS.email, password: 'a brand new passphrase' }),
    ).resolves.toBeTruthy();
  });

  it('never puts a password in the message', async () => {
    const { auth, mail } = makeAuth();
    await auth.signUp(CREDS);
    await auth.requestPasswordReset(CREDS.email);

    for (const message of mail.sent) {
      expect(message.body).not.toContain(CREDS.password);
      expect(message.subject).not.toContain(CREDS.password);
    }
  });

  /** Requesting twice is something people do; the newer link must work. */
  it('issues a fresh working link on a second request', async () => {
    const { auth, mail } = makeAuth();
    await auth.signUp(CREDS);
    mail.sent.length = 0;

    await auth.requestPasswordReset(CREDS.email);
    await auth.requestPasswordReset(CREDS.email);

    expect(mail.sent).toHaveLength(2);
    const second = tokenIn(mail.sent[1]!.body);
    expect(second).not.toBe(tokenIn(mail.sent[0]!.body));
    await expect(auth.resetPassword(second, 'a brand new passphrase')).resolves.toBeUndefined();
  });
});

describe('sign-up confirmation', () => {
  it('sends a verification link that confirms the address', async () => {
    const { auth, mail } = makeAuth();
    const { session, token } = await auth.signUp(CREDS);
    expect(session.user.emailVerified).toBe(false);

    const message = mail.sent.find((m) => m.kind === 'EMAIL_VERIFICATION');
    expect(message).toBeDefined();
    expect(linkIn(message!.body)).toContain(`${BASE}/verify-email`);

    await auth.verifyEmail(tokenIn(message!.body));
    expect((await auth.getSession(token))?.user.emailVerified).toBe(true);
  });

  it('is single use — the same link cannot confirm twice', async () => {
    const { auth, mail } = makeAuth();
    await auth.signUp(CREDS);
    const message = mail.sent.find((m) => m.kind === 'EMAIL_VERIFICATION')!;
    const token = tokenIn(message.body);

    await auth.verifyEmail(token);
    await expect(auth.verifyEmail(token)).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });
});

describe('the port says whether a link will arrive', () => {
  /**
   * This is what the recovery pages read to decide whether to warn somebody
   * that nothing is coming. If it ever reported true here, the pages would
   * quietly start lying (§01).
   */
  it('reports that the development adapter cannot deliver', () => {
    const { auth } = makeAuth();
    expect(auth.deliversEmail).toBe(false);
  });
});
