import { notFound } from 'next/navigation';
import { redeemRecoveryCode } from '@/app/actions/auth';
import { isLocale, t } from '@/lib/i18n';

/**
 * Recovery — ACC-009's "accessible recovery".
 *
 * The whole flow is one form and one field. There is no phone call, no support
 * ticket and no identity-verification quiz: each of those is a barrier that
 * lands hardest on the people this product is built for, and PRD §21 is honest
 * that the support function is fractional.
 *
 * Redeeming a code does not sign anyone in. It removes the second factors and
 * returns the account to enrolment, which is the correct answer to "I no longer
 * have the device" — and it ends every session the account already has, because
 * a lost device may be holding one.
 */
export default async function RecoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { error } = await searchParams;

  const errorText =
    error === 'locked'
      ? t(locale, 'auth.recover.error.locked')
      : error
        ? t(locale, 'auth.recover.error.code')
        : undefined;

  return (
    <div className="ns-page ns-page--form ns-page--narrow">
      <h1>{t(locale, 'auth.recover.title')}</h1>
      <p className="ns-page__lede">{t(locale, 'auth.recover.lede')}</p>

      {errorText ? (
        <p className="ns-form-error" role="alert">
          <span className="ns-visually-hidden">{t(locale, 'qualifier.error.prefix')} </span>
          {errorText}
        </p>
      ) : null}

      <form action={redeemRecoveryCode} className="ns-form">
        <input type="hidden" name="locale" value={locale} />

        <div className="ns-field">
          <label className="ns-field__label" htmlFor="recover-email">
            {t(locale, 'auth.recover.emailLabel')}
          </label>
          <input
            className="ns-field__input"
            id="recover-email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
        </div>

        <div className="ns-field">
          <label className="ns-field__label" htmlFor="recover-code">
            {t(locale, 'auth.recover.codeLabel')}
          </label>
          <input
            className="ns-field__input ns-field__input--code"
            id="recover-code"
            name="code"
            type="text"
            // Not `one-time-code`: a recovery code comes off a saved sheet, not
            // from the platform's SMS heuristics, and offering the wrong
            // autofill is worse than offering none.
            autoComplete="off"
            required
          />
        </div>

        <div className="ns-step-actions">
          <button className="ns-button ns-button--primary" type="submit">
            {t(locale, 'auth.recover.submit')}
          </button>
        </div>
      </form>

      <div className="ns-alt-path">
        <p>{t(locale, 'auth.recover.noCodes')}</p>
      </div>
    </div>
  );
}
