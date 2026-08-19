'use server';

/**
 * Qualifier server actions.
 *
 * Every one is a plain form POST target, so the whole journey works with
 * JavaScript disabled (ARC-006). Nothing here depends on hydration; the
 * `no-javascript` Playwright project proves it on every run.
 *
 * Rules are evaluated server-side (assumption A-02) so a stored answer set can
 * reproduce its recommendation exactly (CNV-002).
 */
import { redirect } from 'next/navigation';
import { completeSession, recordConsent, recordContactEmail, saveAnswers } from '@northstar/db';
import { answers as answersSchema, evaluate, type Answers } from '@northstar/domain';
import { track } from '@/lib/analytics';
import { getClaim } from '@/lib/claims';
import { isLocale, type Locale } from '@/lib/i18n';
import { enforceRateLimit } from '@/lib/rate-limit';
import { QUESTIONS, TOTAL_STEPS } from '@/lib/questions';
import { getOrCreateSession, readResumeToken, writeConsentCookie } from '@/lib/session';

function safeLocale(value: FormDataEntryValue | null): Locale {
  const raw = typeof value === 'string' ? value : 'en';
  return isLocale(raw) ? raw : 'en';
}

/**
 * Validates a caller-supplied return path.
 *
 * A `startsWith('/' + locale)` check is not enough on its own: browsers
 * normalise backslashes to slashes in some positions, so `/en\\evil.com` can be
 * read as a host. The path must therefore look like a locale route and contain
 * no backslash and no scheme. Anything else falls back to the locale home —
 * silently, because a visitor tampering with this field is not someone to show
 * an error to.
 */
function safeReturnTo(value: FormDataEntryValue | null, locale: Locale): string {
  const home = `/${locale}`;
  if (typeof value !== 'string') return home;
  if (value.includes('\\') || value.includes(':')) return home;
  return /^\/(en|fr)(\/|\?|$)/.test(value) ? value : home;
}

export async function submitAnswer(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const step = Number(formData.get('step') ?? 1);
  const question = QUESTIONS[step - 1];
  if (!question) redirect(`/${locale}/check`);

  await enforceRateLimit('qualifier_answer', locale);

  const { token, session } = await getOrCreateSession(locale);

  const submitted = question.multiple
    ? formData.getAll(question.key).map(String).filter(Boolean)
    : formData.get(question.key);

  // Validation is server-side and the error is rendered on the question page
  // with the field, not as a banner (accessible validation, PRD §9).
  const isEmpty = question.multiple
    ? (submitted as string[]).length === 0
    : submitted === null || submitted === '';
  if (isEmpty) {
    redirect(`/${locale}/check/${step}?error=required`);
  }

  const candidate: Answers = { ...session.answers, [question.key]: submitted };
  const parsed = answersSchema.safeParse(candidate);
  if (!parsed.success) {
    redirect(`/${locale}/check/${step}?error=invalid`);
  }

  await saveAnswers(token, parsed.data);
  await track('qualifier_answered', { locale, questionKey: question.key, answered: true });

  if (step >= TOTAL_STEPS) {
    const result = evaluate(parsed.data);
    await completeSession(token, result.category, result.ruleVersion);
    await track('qualifier_completed', { locale, questionCount: TOTAL_STEPS });
    redirect(`/${locale}/check/result`);
  }

  redirect(`/${locale}/check/${step + 1}`);
}

export async function startQualifier(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  await enforceRateLimit('qualifier_start', locale);
  await getOrCreateSession(locale);
  await track('qualifier_started', { locale });
  redirect(`/${locale}/check/1`);
}

/**
 * Records the analytics decision. Both answers are recorded — a durable "no" is
 * what makes opt-out persistent (PUB-006), and it is not the same thing as never
 * having been asked.
 */
export async function setConsent(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  await enforceRateLimit('consent', locale);
  const granted = formData.get('decision') === 'grant';
  await writeConsentCookie(granted);

  const token = await readResumeToken();
  if (token) await recordConsent(token, granted);

  redirect(safeReturnTo(formData.get('returnTo'), locale));
}

/**
 * Emails a resume link. Requires an explicitly ticked consent box (CNV-001) —
 * the box is never pre-ticked, and the address is not stored without it.
 */
export async function requestResumeLink(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const email = String(formData.get('email') ?? '').trim();
  const consented = formData.get('email_consent') === 'on';
  const step = Number(formData.get('step') ?? 1);

  // The tightest limit of the three: this endpoint accepts an email address, so
  // it is the one an attacker would use to enumerate or to send mail elsewhere.
  await enforceRateLimit('resume_email', locale);

  if (!consented || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/${locale}/check/${step}?error=resume`);
  }

  const token = await readResumeToken();
  if (token) await recordContactEmail(token, email);

  // The email itself is sent by the CC-03 email adapter; CC-02 records the
  // consented address and confirms on screen rather than pretending to send.
  redirect(`/${locale}/check/${step}?saved=1`);
}

/**
 * Records that a visitor left for the official Ontario resource, then forwards
 * them (PRD §2, ADR-0007: this is a headline Gate 0 metric, deliberately
 * measured rather than discouraged).
 *
 * The destination is resolved from the claim, never taken from the form. A
 * redirect target supplied by the caller is an open redirect, and an open
 * redirect on a site whose whole proposition is trustworthiness is worse than
 * the usual phishing risk.
 */
export async function recordSourceOpened(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const claimKey = String(formData.get('claimKey') ?? '');
  const claim = getClaim(claimKey);
  if (!claim) redirect(`/${locale}`);

  await track('official_source_opened', { locale, claimKey });
  redirect(claim.sourceUrl);
}
