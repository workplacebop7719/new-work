'use server';

import { redirect } from 'next/navigation';
import { auth } from './index';
import { AUTH_MESSAGE, isAuthError, isPlausibleEmail } from './types';
import { safeReturnTo } from './return-url';
import { isPlausibleToken } from './token';
import { writeSessionCookie, clearSessionCookie } from './session';
import { ensureProfile, memberFeaturesAvailable } from '@/data/member-repository';
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

  try {
    const { token, session } = await auth().signIn({ email, password });
    await writeSessionCookie(token);
    await provision(session.user);
  } catch (err) {
    return { error: messageFor(err) };
  }

  redirect(returnTo);
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '');
  const returnTo = safeReturnTo(formData.get('returnTo'));

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

  if (!isPlausibleEmail(address)) {
    return { error: 'That doesn’t look like an email address.', notice: null };
  }

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

  try {
    await auth().resetPassword(token, password);
  } catch (err) {
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

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await auth().signOut(token);
  await clearSessionCookie();
  redirect('/');
}
