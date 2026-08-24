'use server';

import { redirect } from 'next/navigation';
import { auth } from './index';
import { AUTH_MESSAGE, DELETE_CONFIRMATION, isAuthError, isPlausibleEmail } from './types';
import { safeReturnTo } from './return-url';
import { isPlausibleToken } from './token';
import {
  challengeFromForm, verifyChallenge, CHALLENGE_MESSAGE, type ChallengePurpose,
} from '@/security/challenge';
import { rateLimitMessage, type RateLimitBucket } from '@/security/rate-limit';
import {
  checkRateLimit, recordRateLimitHit, spendChallenge,
} from '@/security/rate-limit-store';
import { writeSessionCookie, clearSessionCookie } from './session';
import {
  ensureProfile, eraseAccount, memberFeaturesAvailable, isAccountNotErasable,
} from '@/data/member-repository';
import { readSession } from './session';
import { SESSION_COOKIE } from './cookie-name';
import { cookies } from 'next/headers';

/**
 * Server actions for the auth flows (PRD §28–§31).
 *
 * Every failure path returns a message from AUTH_MESSAGE — a provider string
 * never reaches the customer (§29). Every success path honours the remembered
 * destination through safeReturnTo, so an attacker-supplied `returnTo` cannot
 * turn our sign-in page into an open redirect (§31).
 */

export interface FormState {
  error: string | null;
  /**
   * A neutral confirmation rendered in place, for the flows that must not
   * redirect. Forgot-password is the reason it exists: bouncing somebody to a
   * "check your inbox" page would tell anyone watching the URL bar that the
   * address was accepted, which is exactly the disclosure the flow avoids.
   */
  notice?: string | null;
}

/**
 * Give the authenticated customer a profiles row.
 *
 * This belongs to authentication, not to visiting the portal. An earlier
 * version provisioned only in the /app layout, so someone who signed up and
 * immediately pressed Save on a deal hit a foreign-key violation — they had an
 * identity but nothing for their saved item to hang off. Found by driving the
 * real flow in a browser; no unit test would have caught it.
 */
async function provision(user: Parameters<typeof ensureProfile>[0]): Promise<void> {
  if (!memberFeaturesAvailable) return;
  await ensureProfile(user);
}

/**
 * Never `instanceof` here — see the note on AuthError's brand in types.ts.
 * This file is `'use server'`, which puts it in a different bundle graph from
 * the adapters, so the class object it imported is not the one they threw.
 */
/**
 * Bot resistance on the forms worth automating against (§01).
 *
 * Sign-up and password reset only. NOT sign-in: a challenge there taxes every
 * real customer on every visit to slow down credential stuffing, which rate
 * limiting handles without charging the honest majority.
 *
 * Returns our own single message for every failure. Which check failed is a
 * tuning signal — "too fast" and "bad solution" together describe exactly how
 * to get through — so the caller learns only that it did not work.
 */
async function challengeRefused(
  formData: FormData, purpose: ChallengePurpose,
): Promise<FormState | null> {
  const submission = challengeFromForm(formData);
  const verdict = verifyChallenge(submission, purpose);
  if (!verdict.ok) return { error: CHALLENGE_MESSAGE, notice: null };

  // Spending it is the second half of the check. Without this a solved
  // challenge can be replayed for its whole ten-minute life, so one unit of
  // work buys as many sign-ups as somebody cares to send.
  if (submission.signature && !(await spendChallenge(submission.signature))) {
    return { error: CHALLENGE_MESSAGE, notice: null };
  }
  return null;
}

/**
 * Refuses an attempt that has already had its allowance.
 *
 * One message for both dimensions, naming no account — "too many attempts for
 * THIS address" would confirm the address is worth attacking, which is the
 * enumeration oracle the rest of this file is written to avoid.
 */
async function rateLimited(
  bucket: RateLimitBucket, subject: string,
): Promise<FormState | null> {
  const decision = await checkRateLimit(bucket, subject);
  return decision.allowed
    ? null
    : { error: rateLimitMessage(decision.retryAfterMs), notice: null };
}

function messageFor(err: unknown): string {
  if (isAuthError(err)) return AUTH_MESSAGE[err.code];
  return AUTH_MESSAGE.UNAVAILABLE;
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const returnTo = safeReturnTo(formData.get('returnTo'));

  if (!isPlausibleEmail(email) || password.length === 0) {
    return { error: AUTH_MESSAGE.INVALID_CREDENTIALS };
  }

  // Caller-scoped only: an attacker fills their own bucket and nobody else's,
  // so a correct password is never refused however many wrong ones preceded
  // it. See the lockout note in security/rate-limit.ts.
  const limited = await rateLimited('SIGN_IN', email);
  if (limited) return limited;

  try {
    const { token, session } = await auth().signIn({ email, password });
    await writeSessionCookie(token);
    await provision(session.user);
  } catch (err) {
    await recordRateLimitHit('SIGN_IN', email);
    return { error: messageFor(err) };
  }

  redirect(returnTo);
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '');
  const returnTo = safeReturnTo(formData.get('returnTo'));

  const refused = await challengeRefused(formData, 'SIGN_UP');
  if (refused) return refused;

  const limited = await rateLimited('SIGN_UP', email);
  if (limited) return limited;
  await recordRateLimitHit('SIGN_UP', email);

  try {
    const { token, session } = await auth().signUp({ email, password, displayName });
    await writeSessionCookie(token);
    await provision(session.user);
  } catch (err) {
    return { error: messageFor(err) };
  }

  redirect(returnTo);
}

/**
 * FORGOT PASSWORD (§28, §29).
 *
 * Returns the SAME confirmation whether or not the address has an account,
 * and takes the same path through the code to get there. An endpoint that
 * distinguishes the two is an account-enumeration oracle wearing a helpful
 * face — "no account with that email" is precisely the answer somebody
 * checking a leaked address list wants.
 *
 * The one thing it does distinguish is a syntactically impossible address,
 * because that is a mistake the customer can act on and reveals nothing about
 * who has an account.
 */
const RESET_NOTICE =
  'If there’s an account with that address, we’ve sent a link to set a new password. '
  + 'It’s good for a short time.';

export async function requestPasswordResetAction(
  _prev: FormState, formData: FormData,
): Promise<FormState> {
  const address = String(formData.get('email') ?? '');

  const refused = await challengeRefused(formData, 'PASSWORD_RESET');
  if (refused) return refused;

  if (!isPlausibleEmail(address)) {
    return { error: 'That doesn’t look like an email address.', notice: null };
  }

  // Recorded whether or not the address has an account: a counter that only
  // moved for real accounts would answer "does this address exist" through
  // timing and through when the limit trips.
  const limited = await rateLimited('PASSWORD_RESET', address);
  if (limited) return limited;
  await recordRateLimitHit('PASSWORD_RESET', address);

  try {
    await auth().requestPasswordReset(address);
  } catch (err) {
    // A provider failure is worth reporting; a missing account is not, and the
    // adapters are written so this only fires for the former.
    return { error: messageFor(err), notice: null };
  }

  return { error: null, notice: RESET_NOTICE };
}

/**
 * RESET PASSWORD.
 *
 * On success this does NOT sign anybody in. A reset link that grants a session
 * means possession of the link is possession of the account — and links reach
 * inboxes, forwarded mail and browser history. Setting the password and then
 * asking for it is one more step and a materially different threat model.
 *
 * The adapters invalidate every existing session as part of the reset, which
 * is the half that matters when somebody is recovering a compromised account.
 */
export async function resetPasswordAction(
  _prev: FormState, formData: FormData,
): Promise<FormState> {
  const token = formData.get('token');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');

  if (!isPlausibleToken(token)) return { error: AUTH_MESSAGE.INVALID_TOKEN, notice: null };
  if (password !== confirm) {
    return { error: 'Those two passwords don’t match.', notice: null };
  }

  // Keyed on the token, so somebody fumbling their own link cannot exhaust
  // anybody else's allowance — and guessing tokens still meets the caller
  // limit, which is the dimension that matters for a guessing attack.
  const limited = await rateLimited('PASSWORD_RESET_TOKEN', token);
  if (limited) return limited;

  try {
    await auth().resetPassword(token, password);
  } catch (err) {
    await recordRateLimitHit('PASSWORD_RESET_TOKEN', token);
    return { error: messageFor(err), notice: null };
  }

  // Any session the old password had is already gone; clear this browser's
  // cookie too so the next page is honestly signed out.
  await clearSessionCookie();
  redirect('/login?reset=1');
}

/**
 * VERIFY EMAIL.
 *
 * Deliberately a POST behind a button rather than something the page does on
 * load. Mail scanners, link previewers and prefetchers fetch URLs they find in
 * messages; a GET that consumed the token would let a security appliance burn
 * it before the customer ever clicked, and they would be told their link had
 * expired.
 */
export async function verifyEmailAction(
  _prev: FormState, formData: FormData,
): Promise<FormState> {
  const token = formData.get('token');
  if (!isPlausibleToken(token)) return { error: AUTH_MESSAGE.INVALID_TOKEN, notice: null };

  try {
    await auth().verifyEmail(token);
  } catch (err) {
    return { error: messageFor(err), notice: null };
  }

  return { error: null, notice: 'Your email is confirmed. You can sign in now.' };
}

/**
 * CHANGE PASSWORD, while signed in (§37).
 *
 * The current password is required, and that is the whole security of this
 * form. Without it an unattended browser is a complete takeover: the attacker
 * sets a new password and the owner is the one locked out.
 *
 * Succeeding invalidates every other session and writes the fresh token this
 * device was issued, so the change takes effect everywhere immediately and
 * this browser does not have to sign in again.
 */
export async function changePasswordAction(
  _prev: FormState, formData: FormData,
): Promise<FormState> {
  const session = await readSession();
  if (!session) return { error: AUTH_MESSAGE.NOT_CONFIGURED, notice: null };

  const jar = await cookies();
  const sessionToken = jar.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return { error: AUTH_MESSAGE.INVALID_CREDENTIALS, notice: null };

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');

  if (newPassword !== confirm) return { error: 'Those two passwords don’t match.', notice: null };
  if (newPassword === currentPassword) {
    return { error: 'That is the password you already have.', notice: null };
  }

  try {
    const { token } = await auth().changePassword({
      sessionToken,
      email: session.user.email,
      currentPassword,
      newPassword,
    });
    await writeSessionCookie(token);
  } catch (err) {
    return { error: messageFor(err), notice: null };
  }

  return {
    error: null,
    notice: 'Your password is changed. Every other device has been signed out.',
  };
}

/**
 * SIGN OUT EVERYWHERE (§37).
 *
 * For the library computer you forgot to close, or the phone you no longer
 * have. Every session ends, including this one — and a fresh one is issued
 * for the device that asked, so clearing the others does not sign you out of
 * the one in your hand.
 *
 * The password is required. Without it, an unattended browser could be used
 * to kick the owner off everything they own: a nuisance attack with no upside
 * for anybody.
 */
export async function signOutEverywhereAction(
  _prev: FormState, formData: FormData,
): Promise<FormState> {
  const session = await readSession();
  if (!session) return { error: AUTH_MESSAGE.NOT_CONFIGURED, notice: null };

  const jar = await cookies();
  const sessionToken = jar.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return { error: AUTH_MESSAGE.INVALID_CREDENTIALS, notice: null };

  const password = String(formData.get('password') ?? '');

  try {
    const { token } = await auth().signOutEverywhere({
      sessionToken,
      email: session.user.email,
      password,
    });
    await writeSessionCookie(token);
  } catch (err) {
    return { error: messageFor(err), notice: null };
  }

  return {
    error: null,
    notice: 'Every other device has been signed out. This one is still signed in.',
  };
}

/**
 * DELETE ACCOUNT (§37).
 *
 * Two gates, because this cannot be undone: the current password, and typing
 * the word. The password stops an unattended browser; the typed word stops a
 * misplaced click, which is the far more likely way somebody loses their
 * Watchlist.
 *
 * Order matters. Our data goes first and the login identity second, so a
 * failure halfway leaves an account that can still sign in and try again —
 * the opposite order would strand a live pile of data with no way to reach
 * it.
 */
export async function deleteAccountAction(
  _prev: FormState, formData: FormData,
): Promise<FormState> {
  const session = await readSession();
  if (!session) return { error: AUTH_MESSAGE.NOT_CONFIGURED, notice: null };

  const jar = await cookies();
  const sessionToken = jar.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return { error: AUTH_MESSAGE.INVALID_CREDENTIALS, notice: null };

  const password = String(formData.get('password') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '').trim().toLowerCase();

  if (confirmation !== DELETE_CONFIRMATION) {
    return { error: `Type ${DELETE_CONFIRMATION} to confirm.`, notice: null };
  }

  const port = auth();

  try {
    // Verified through the ordinary sign-in path, so a wrong password fails
    // here exactly as it would anywhere else — no second password check to
    // drift out of step with the first.
    await port.signIn({ email: session.user.email, password });
  } catch (err) {
    return { error: messageFor(err), notice: null };
  }

  try {
    if (memberFeaturesAvailable) await eraseAccount(session.user.id);
    if (port.canDeleteIdentity) {
      await port.deleteIdentity({ sessionToken, email: session.user.email });
    }
  } catch (err) {
    // Branded, not instanceof — see the note on the class.
    if (isAccountNotErasable(err)) return { error: err.why, notice: null };
    return { error: messageFor(err), notice: null };
  }

  await port.signOut(sessionToken);
  await clearSessionCookie();
  redirect('/?deleted=1');
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await auth().signOut(token);
  await clearSessionCookie();
  redirect('/');
}
