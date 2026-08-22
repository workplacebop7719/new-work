'use server';

import { redirect } from 'next/navigation';
import { auth } from './index';
import { AuthError, AUTH_MESSAGE, isPlausibleEmail } from './types';
import { safeReturnTo } from './return-url';
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

function messageFor(err: unknown): string {
  if (err instanceof AuthError) return AUTH_MESSAGE[err.code];
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

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await auth().signOut(token);
  await clearSessionCookie();
  redirect('/');
}
