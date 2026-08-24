/**
 * CHANGING AND REVOKING ACCESS (PRD §37).
 *
 * The valuable assertions here are about what must STOP working: the old
 * password after a change, every other device after a change, and the whole
 * identity after a deletion.
 */
import { describe, it, expect } from 'vitest';
import { createDevAuth, type DevAuth } from './dev-adapter';
import { createDevEmail } from '@/email/port';

const CREDS = { email: 'Parent@Example.com', password: 'correct horse battery' };
const NEXT = 'an entirely different passphrase';

const makeAuth = () =>
  createDevAuth({ email: createDevEmail(), baseUrl: 'https://bargenation.test' }) as DevAuth;

describe('changing a password', () => {
  it('requires the current one', async () => {
    const auth = makeAuth();
    const { token } = await auth.signUp(CREDS);

    await expect(auth.changePassword({
      sessionToken: token,
      email: CREDS.email,
      currentPassword: 'not the right one',
      newPassword: NEXT,
    })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });

    // And the password is untouched.
    await expect(auth.signIn(CREDS)).resolves.toBeTruthy();
  });

  it('accepts the new password and refuses the old', async () => {
    const auth = makeAuth();
    const { token } = await auth.signUp(CREDS);

    await auth.changePassword({
      sessionToken: token, email: CREDS.email,
      currentPassword: CREDS.password, newPassword: NEXT,
    });

    await expect(auth.signIn(CREDS)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(auth.signIn({ email: CREDS.email, password: NEXT })).resolves.toBeTruthy();
  });

  /**
   * People change a password because they think somebody else has it. A
   * change that left the other sessions alive would do nothing about that.
   */
  it('signs every other device out', async () => {
    const auth = makeAuth();
    await auth.signUp(CREDS);
    const elsewhere = (await auth.signIn(CREDS)).token;
    const here = (await auth.signIn(CREDS)).token;
    expect(await auth.getSession(elsewhere)).not.toBeNull();

    await auth.changePassword({
      sessionToken: here, email: CREDS.email,
      currentPassword: CREDS.password, newPassword: NEXT,
    });

    expect(await auth.getSession(elsewhere)).toBeNull();
    expect(await auth.getSession(here)).toBeNull();
  });

  /** The caller writes the returned token, which is how this device stays in. */
  it('hands back a working session for the device that made the change', async () => {
    const auth = makeAuth();
    const { token } = await auth.signUp(CREDS);

    const fresh = await auth.changePassword({
      sessionToken: token, email: CREDS.email,
      currentPassword: CREDS.password, newPassword: NEXT,
    });

    expect(fresh.token).not.toBe(token);
    expect(await auth.getSession(fresh.token)).not.toBeNull();
  });

  it('still enforces password strength', async () => {
    const auth = makeAuth();
    const { token } = await auth.signUp(CREDS);
    await expect(auth.changePassword({
      sessionToken: token, email: CREDS.email,
      currentPassword: CREDS.password, newPassword: 'tiny',
    })).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
  });
});

describe('deleting the identity', () => {
  it('makes the account unusable', async () => {
    const auth = makeAuth();
    const { token } = await auth.signUp(CREDS);

    await auth.deleteIdentity({ sessionToken: token, email: CREDS.email });

    await expect(auth.signIn(CREDS)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(await auth.getSession(token)).toBeNull();
  });

  /**
   * A reset token outliving the account would let somebody who had the link
   * walk back into an address that is supposed to be gone.
   */
  it('takes any outstanding reset link with it', async () => {
    const auth = makeAuth();
    const { token } = await auth.signUp(CREDS);
    await auth.requestPasswordReset(CREDS.email);
    const reset = auth.__pendingResetToken(CREDS.email)!;
    expect(reset).toBeTruthy();

    await auth.deleteIdentity({ sessionToken: token, email: CREDS.email });

    await expect(auth.resetPassword(reset, NEXT))
      .rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('frees the address for a genuinely new account', async () => {
    const auth = makeAuth();
    const { token } = await auth.signUp(CREDS);
    const first = (await auth.getSession(token))!.user.id;

    await auth.deleteIdentity({ sessionToken: token, email: CREDS.email });
    const again = await auth.signUp(CREDS);

    // A new account, not a resurrected one — nothing of the old id survives.
    expect(again.session.user.id).not.toBe(first);
    expect(again.session.user.emailVerified).toBe(false);
  });
});

describe('the port is honest about what it can remove', () => {
  it('says the development adapter owns its own users', () => {
    expect(makeAuth().canDeleteIdentity).toBe(true);
  });
});

describe('signing out everywhere', () => {
  it('requires the password', async () => {
    const auth = makeAuth();
    const { token } = await auth.signUp(CREDS);

    await expect(auth.signOutEverywhere({
      sessionToken: token, email: CREDS.email, password: 'not the right one',
    })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });

    // And nothing was ended.
    expect(await auth.getSession(token)).not.toBeNull();
  });

  it('ends every other session', async () => {
    const auth = makeAuth();
    await auth.signUp(CREDS);
    const library = (await auth.signIn(CREDS)).token;
    const phone = (await auth.signIn(CREDS)).token;
    expect(await auth.getSession(library)).not.toBeNull();

    await auth.signOutEverywhere({
      sessionToken: phone, email: CREDS.email, password: CREDS.password,
    });

    expect(await auth.getSession(library)).toBeNull();
  });

  /** Clearing a forgotten computer must not log you out of the one in your hand. */
  it('hands back a working session for the device that asked', async () => {
    const auth = makeAuth();
    const { token } = await auth.signUp(CREDS);

    const fresh = await auth.signOutEverywhere({
      sessionToken: token, email: CREDS.email, password: CREDS.password,
    });

    expect(fresh.token).not.toBe(token);
    expect(await auth.getSession(fresh.token)).not.toBeNull();
    expect(await auth.getSession(token)).toBeNull();
  });

  it('leaves the password alone', async () => {
    const auth = makeAuth();
    const { token } = await auth.signUp(CREDS);
    await auth.signOutEverywhere({
      sessionToken: token, email: CREDS.email, password: CREDS.password,
    });
    await expect(auth.signIn(CREDS)).resolves.toBeTruthy();
  });
});
