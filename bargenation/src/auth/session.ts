import 'server-only';
import { cookies } from 'next/headers';
import { auth } from './index';
import { SESSION_COOKIE } from './cookie-name';
import type { Session } from './types';

/**
 * Session cookie handling (PRD §28, §69).
 *
 * httpOnly     — script cannot read it, so an XSS bug cannot exfiltrate it
 * sameSite lax — survives following a link in from email, blocks cross-site POST
 * secure       — HTTPS only, relaxed in development so localhost works
 * path '/'     — the whole app
 *
 * There is no "remember me" toggle: a single expiry is simpler to reason about
 * and there is nothing here worth a long-lived credential.
 */
export { SESSION_COOKIE } from './cookie-name';

const WEEK_SECONDS = 60 * 60 * 24 * 7;

export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? null;
  if (!token) return null;
  return auth().getSession(token);
}

export async function writeSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: WEEK_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Convenience for surfaces that only need "who is this, if anyone". */
export async function currentUser() {
  return (await readSession())?.user ?? null;
}
