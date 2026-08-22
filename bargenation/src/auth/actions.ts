'use server';

import { redirect } from 'next/navigation';
import { auth } from './index';
import { AuthError, AUTH_MESSAGE, isPlausibleEmail } from './types';
import { safeReturnTo } from './return-url';
import { writeSessionCookie, clearSessionCookie } from './session';
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
    const { token } = await auth().signIn({ email, password });
    await writeSessionCookie(token);
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
    const { token } = await auth().signUp({ email, password, displayName });
    await writeSessionCookie(token);
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
