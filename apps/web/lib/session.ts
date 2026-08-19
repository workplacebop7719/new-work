/**
 * Qualifier session cookies.
 *
 * Two cookies, both first-party and both essential:
 *
 *   ns_qualifier  — the resume token (CNV-001). httpOnly, so script cannot read
 *                   it and an XSS cannot lift someone's answers.
 *   ns_consent    — the analytics decision, mirrored from the database so the
 *                   server can gate before rendering, without a round trip.
 *
 * No non-essential cookie is set anywhere, and no third-party script is loaded
 * at all in CC-02 (PUB-006, ARC-007).
 */
import { cookies } from 'next/headers';
import { createSession, findSession, type QualifierSession } from '@northstar/db';
import type { ConsentState } from '@northstar/observability';
import type { Locale } from './i18n';

const RESUME_COOKIE = 'ns_qualifier';
const CONSENT_COOKIE = 'ns_consent';

const BASE_COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env['NODE_ENV'] === 'production',
  path: '/',
} as const;

/** 30 days, matching the abandoned-session retention window (A-15). */
const RESUME_MAX_AGE = 60 * 60 * 24 * 30;
/** A year: a recorded "no" should not quietly expire back into a prompt. */
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export async function readResumeToken(): Promise<string | undefined> {
  return (await cookies()).get(RESUME_COOKIE)?.value;
}

export async function getSession(): Promise<QualifierSession | undefined> {
  const token = await readResumeToken();
  return token ? findSession(token) : undefined;
}

/**
 * Returns the existing session, or starts one.
 *
 * A session is created on the first *answer*, not on page view: creating a row
 * because someone looked at a page collects data we do not need (PRD §3
 * "minimum necessary data").
 */
export async function getOrCreateSession(locale: Locale): Promise<{ token: string; session: QualifierSession }> {
  const token = await readResumeToken();
  if (token) {
    const existing = await findSession(token);
    if (existing) return { token, session: existing };
  }
  const created = await createSession(locale);
  (await cookies()).set(RESUME_COOKIE, created.token, { ...BASE_COOKIE, maxAge: RESUME_MAX_AGE });
  return created;
}

export async function writeConsentCookie(granted: boolean): Promise<void> {
  (await cookies()).set(CONSENT_COOKIE, granted ? 'granted' : 'refused', {
    ...BASE_COOKIE,
    httpOnly: false, // Readable by the page so it can show the current choice.
    maxAge: CONSENT_MAX_AGE,
  });
}

/**
 * The consent state used to gate analytics.
 *
 * The absence of a cookie is "no decision", which is **not** consent — that
 * distinction is the whole of PUB-006. A signed-in user's stored decision wins
 * over the cookie once identity exists (CC-03).
 */
export async function readConsent(): Promise<ConsentState & { decided: boolean }> {
  const value = (await cookies()).get(CONSENT_COOKIE)?.value;
  if (value === 'granted') return { analytics: true, decidedAt: new Date(), decided: true };
  if (value === 'refused') return { analytics: false, decidedAt: new Date(), decided: true };
  return { analytics: false, decided: false };
}
