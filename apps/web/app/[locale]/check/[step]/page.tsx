import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Progress } from '@northstar/ui';
import { requestResumeLink, submitAnswer } from '@/app/actions/qualifier';
import { isLocale, t } from '@/lib/i18n';
import { questionAt, TOTAL_STEPS } from '@/lib/questions';
import { getSession } from '@/lib/session';

/**
 * One question per page.
 *
 * Chosen over a single long form because §7 asks for a progress indicator and
 * save-and-resume, and because a screen-reader or cognitively fatigued user is
 * better served by one decision at a time than by a wall of fieldsets. The cost
 * is more round trips; with server rendering that cost is small.
 */
export default async function QualifierStep({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; step: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { locale, step: rawStep } = await params;
  if (!isLocale(locale)) notFound();

  const step = Number(rawStep);
  const question = questionAt(step);
  if (!Number.isInteger(step) || !question) redirect(`/${locale}/check`);

  const { error, saved } = await searchParams;
  const session = await getSession();
  const existing = session?.answers[question.key];
  const selected = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];

  const errorText =
    error === 'required'
      ? t(locale, 'qualifier.error.required')
      : error === 'invalid'
        ? t(locale, 'qualifier.error.invalid')
        : error === 'resume'
          ? t(locale, 'qualifier.error.resume')
          : undefined;

  const errorId = errorText ? `${question.key}-error` : undefined;
  const hintId = question.hint ? `${question.key}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ns-page ns-page--form">
      <Progress current={step} total={TOTAL_STEPS} label={t(locale, 'qualifier.progressLabel')} />

      <form action={submitAnswer}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="step" value={step} />

        <fieldset className="ns-radio-group" aria-describedby={describedBy}>
          <legend className="ns-radio-group__legend">
            <h1 className="ns-question">{question.legend[locale]}</h1>
          </legend>

          {question.hint ? (
            <p className="ns-field__hint" id={hintId}>
              {question.hint[locale]}
            </p>
          ) : null}

          {errorText ? (
            <p className="ns-field__error" id={errorId}>
              <span className="ns-visually-hidden">{t(locale, 'qualifier.error.prefix')} </span>
              {errorText}
            </p>
          ) : null}

          {question.options.map((option) => {
            const id = `${question.key}-${option.value}`;
            return (
              <div className="ns-radio" key={option.value}>
                <input
                  // No option is preselected unless the visitor previously chose
                  // it: a default answer would shape the recommendation (CNV-003).
                  type={question.multiple ? 'checkbox' : 'radio'}
                  id={id}
                  name={question.key}
                  value={option.value}
                  defaultChecked={selected.includes(option.value)}
                />
                <label htmlFor={id}>{option.label[locale]}</label>
              </div>
            );
          })}
        </fieldset>

        <div className="ns-step-actions">
          {step > 1 ? (
            <Link className="ns-button ns-button--secondary" href={`/${locale}/check/${step - 1}`}>
              {t(locale, 'qualifier.back')}
            </Link>
          ) : null}
          <button className="ns-button ns-button--primary" type="submit">
            {step === TOTAL_STEPS ? t(locale, 'qualifier.finish') : t(locale, 'qualifier.next')}
          </button>
        </div>
      </form>

      {/* CNV-001: save and resume, with consent asked for separately and never pre-ticked. */}
      <details className="ns-disclosure ns-resume">
        <summary className="ns-disclosure__summary">{t(locale, 'qualifier.resume.summary')}</summary>
        <div className="ns-disclosure__content">
          <p>{t(locale, 'qualifier.resume.body')}</p>
          {saved ? <p role="status">{t(locale, 'qualifier.resume.saved')}</p> : null}
          <form action={requestResumeLink}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="step" value={step} />
            <div className="ns-field">
              <label className="ns-field__label" htmlFor="resume-email">
                {t(locale, 'qualifier.resume.emailLabel')}
              </label>
              <input className="ns-field__input" id="resume-email" name="email" type="email" autoComplete="email" />
            </div>
            <div className="ns-radio">
              <input type="checkbox" id="email-consent" name="email_consent" />
              <label htmlFor="email-consent">{t(locale, 'qualifier.resume.consent')}</label>
            </div>
            <button className="ns-button ns-button--secondary" type="submit">
              {t(locale, 'qualifier.resume.cta')}
            </button>
          </form>
        </div>
      </details>

      <p className="ns-alt-path">
        <Link href={`/${locale}/contact`}>{t(locale, 'qualifier.start.humanPath')}</Link>
      </p>
    </div>
  );
}
