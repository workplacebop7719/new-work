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
import { QUESTIONS, TOTAL_STEPS } from '@/lib/questions';
import { getOrCreateSession, readResumeToken, writeConsentCookie } from '@/lib/session';

function safeLocale(value: FormDataEntryValue | null): Locale {
  const raw = typeof value === 'string' ? value : 'en';
  return isLocale(raw) ? raw : 'en';
}

export async function submitAnswer(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const step = Number(formData.get('step') ?? 1);
  const question = QUESTIONS[step - 1];
  if (!question) redirect(`/${locale}/check`);

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
  const granted = formData.get('decision') === 'grant';
  await writeConsentCookie(granted);

  const token = await readResumeToken();
  if (token) await recordConsent(token, granted);

  const returnTo = formData.get('returnTo');
  redirect(typeof returnTo === 'string' && returnTo.startsWith(`/${locale}`) ? returnTo : `/${locale}`);
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
