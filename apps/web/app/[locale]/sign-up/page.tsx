import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EMPLOYEE_BANDS, ORGANIZATION_TYPES } from '@northstar/domain';
import { signUp } from '@/app/actions/account';
import { isLocale, t, type Locale } from '@/lib/i18n';

/**
 * Create an organization — CLP-001, PUB-003.
 *
 * The form asks for six things and no more. There is no phone number, no job
 * title, no "how did you hear about us" and no industry dropdown, because each
 * would be data held before the relationship exists (PRD §3, minimum necessary
 * data) and each is one more field between a person and the product.
 *
 * Employee count is a band, as it is everywhere else in the platform (A-03).
 * The exact figure is never asked for and has nowhere to be stored.
 *
 * Marketing consent is a separate, unticked checkbox with its own wording. A
 * combined "by signing up you agree" would not be consent (CNV-004).
 */
export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { error } = await searchParams;

  const passwordError = error?.startsWith('password_')
    ? t(locale, `signUp.error.${error}` as 'signUp.error.password_too_short')
    : undefined;
  const generalError = error && !passwordError ? t(locale, 'signUp.error.details') : undefined;

  return (
    <div className="ns-page ns-page--form">
      <h1>{t(locale, 'signUp.title')}</h1>
      <p className="ns-page__lede">{t(locale, 'signUp.lede')}</p>

      {generalError ? (
        <p className="ns-form-error" role="alert">
          <span className="ns-visually-hidden">{t(locale, 'qualifier.error.prefix')} </span>
          {generalError}
        </p>
      ) : null}

      <form action={signUp} className="ns-form">
        <input type="hidden" name="locale" value={locale} />

        <fieldset className="ns-fieldset">
          <legend className="ns-fieldset__legend">{t(locale, 'signUp.orgSection')}</legend>

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="organizationLegalName">
              {t(locale, 'signUp.orgName')}
            </label>
            <p className="ns-field__hint" id="orgname-hint">
              {t(locale, 'signUp.orgNameHint')}
            </p>
            <input
              className="ns-field__input"
              id="organizationLegalName"
              name="organizationLegalName"
              type="text"
              autoComplete="organization"
              aria-describedby="orgname-hint"
              required
            />
          </div>

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="organizationType">
              {t(locale, 'signUp.orgType')}
            </label>
            <select className="ns-field__select" id="organizationType" name="organizationType" required>
              {ORGANIZATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(locale, `orgType.${type}` as 'orgType.other')}
                </option>
              ))}
            </select>
          </div>

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="employeeBand">
              {t(locale, 'signUp.band')}
            </label>
            <p className="ns-field__hint" id="band-hint">
              {t(locale, 'signUp.bandHint')}
            </p>
            <select
              className="ns-field__select"
              id="employeeBand"
              name="employeeBand"
              aria-describedby="band-hint"
              required
            >
              {EMPLOYEE_BANDS.map((band) => (
                <option key={band} value={band}>
                  {t(locale, `band.${band}` as 'band.under_20')}
                </option>
              ))}
            </select>
          </div>

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="jurisdiction">
              {t(locale, 'signUp.jurisdiction')}
            </label>
            {/*
              Jurisdiction is first-class from CC-01 (A-01). Ontario is the only
              option the product can currently serve, so it is the only one
              offered — an empty dropdown of provinces we cannot advise on would
              be a promise the service does not keep.
            */}
            <select className="ns-field__select" id="jurisdiction" name="jurisdiction" required>
              <option value="CA-ON">Ontario</option>
            </select>
          </div>
        </fieldset>

        <fieldset className="ns-fieldset">
          <legend className="ns-fieldset__legend">{t(locale, 'signUp.personSection')}</legend>

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="displayName">
              {t(locale, 'signUp.yourName')}
            </label>
            <input
              className="ns-field__input"
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              required
            />
          </div>

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="signup-email">
              {t(locale, 'signUp.email')}
            </label>
            <input
              className="ns-field__input"
              id="signup-email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </div>

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="signup-password">
              {t(locale, 'signUp.password')}
            </label>
            <p className="ns-field__hint" id="signup-password-hint">
              {t(locale, 'signUp.passwordHint')}
            </p>
            <input
              className="ns-field__input"
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              aria-describedby={
                passwordError ? 'signup-password-hint signup-password-error' : 'signup-password-hint'
              }
              aria-invalid={passwordError ? true : undefined}
              required
            />
            {passwordError ? (
              <p className="ns-field__error" id="signup-password-error">
                <span className="ns-visually-hidden">{t(locale, 'qualifier.error.prefix')} </span>
                {passwordError}
              </p>
            ) : null}
          </div>

          <div className="ns-checkbox">
            {/* Never pre-ticked, and separate from account creation (CNV-004). */}
            <input type="checkbox" id="marketingConsent" name="marketingConsent" />
            <label htmlFor="marketingConsent">{t(locale, 'signUp.marketing')}</label>
          </div>
        </fieldset>

        <div className="ns-step-actions">
          <button className="ns-button ns-button--primary" type="submit">
            {t(locale, 'signUp.submit')}
          </button>
        </div>
      </form>

      <div className="ns-alt-path">
        <p>
          {t(locale, 'signUp.haveAccount')}{' '}
          <Link href={`/${locale}/sign-in`}>{t(locale, 'nav.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safe: Locale = isLocale(locale) ? locale : 'en';
  return { title: t(safe, 'signUp.title') };
}
