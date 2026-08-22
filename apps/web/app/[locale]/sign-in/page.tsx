import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusMessage } from '@northstar/ui';
import { signIn } from '@/app/actions/auth';
import { DemoAccounts } from '@/app/components/demo-accounts';
import { isLocale, t, type Locale } from '@/lib/i18n';

/**
 * Sign in — ADR-0002, SEC-002, ACC-009.
 *
 * A plain form with a plain POST target. There is no client-side validation,
 * no disabled submit button waiting on JavaScript, and no hidden field that
 * hydration fills in — the whole screen works with scripting off, which the
 * `no-javascript` Playwright project checks on every run.
 *
 * Every failure says the same thing. A wrong password, an unknown address and a
 * disabled account are indistinguishable from here (threat model T-13), and the
 * lockout message is the only one that differs — because a person who is locked
 * out needs to know that waiting is the fix.
 */
export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    error?: string;
    returnTo?: string;
    created?: string;
    joined?: string;
    enrolled?: string;
    recovered?: string;
    ended?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;

  const errorText = signInError(locale, query.error);
  const noticeText = signInNotice(locale, query);

  return (
    <div className="ns-page ns-page--form ns-page--narrow">
      <h1>{t(locale, 'auth.signIn.title')}</h1>
      <p className="ns-page__lede">{t(locale, 'auth.signIn.lede')}</p>

      {noticeText ? <StatusMessage>{noticeText}</StatusMessage> : null}

      {errorText ? (
        /*
         * `role="alert"` rather than `status`: this is a failure the person must
         * act on, and it appears after a page load, so a polite region would be
         * announced only if the reader happened to be listening.
         */
        <p className="ns-form-error" role="alert">
          <span className="ns-visually-hidden">{t(locale, 'qualifier.error.prefix')} </span>
          {errorText}
        </p>
      ) : null}

      <form action={signIn} className="ns-form">
        <input type="hidden" name="locale" value={locale} />
        {query.returnTo ? <input type="hidden" name="returnTo" value={query.returnTo} /> : null}

        <div className="ns-field">
          <label className="ns-field__label" htmlFor="email">
            {t(locale, 'auth.signIn.emailLabel')}
          </label>
          <input
            className="ns-field__input"
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
          />
        </div>

        <div className="ns-field">
          <label className="ns-field__label" htmlFor="password">
            {t(locale, 'auth.signIn.passwordLabel')}
          </label>
          <p className="ns-field__hint" id="password-hint">
            {t(locale, 'auth.signIn.passwordHint')}
          </p>
          <input
            className="ns-field__input"
            id="password"
            name="password"
            type="password"
            // ACC-009: a password manager must be able to fill this, and paste
            // must work. Both are the browser's default behaviour — the way to
            // get them is to not interfere.
            autoComplete="current-password"
            aria-describedby="password-hint"
            required
          />
        </div>

        <div className="ns-step-actions">
          <button className="ns-button ns-button--primary" type="submit">
            {t(locale, 'auth.signIn.submit')}
          </button>
        </div>
      </form>

      <div className="ns-alt-path">
        <p>
          <Link href={`/${locale}/sign-in/recover`}>{t(locale, 'auth.signIn.forgot')}</Link>
        </p>
        <p>
          {t(locale, 'auth.signIn.noAccount')}{' '}
          <Link href={`/${locale}/sign-up`}>{t(locale, 'auth.signIn.createAccount')}</Link>
        </p>
      </div>

      <DemoAccounts locale={locale} />
    </div>
  );
}

function signInError(locale: Locale, error: string | undefined): string | undefined {
  switch (error) {
    case 'credentials':
      return t(locale, 'auth.error.credentials');
    case 'locked':
      return t(locale, 'auth.error.locked');
    case 'expired':
      return t(locale, 'auth.error.expired');
    case 'code':
      return t(locale, 'auth.error.code');
    default:
      return undefined;
  }
}

function signInNotice(
  locale: Locale,
  query: { created?: string; joined?: string; enrolled?: string; recovered?: string; ended?: string },
): string | undefined {
  if (query.created) return t(locale, 'auth.notice.created');
  if (query.joined) return t(locale, 'auth.notice.joined');
  if (query.enrolled) return t(locale, 'auth.notice.enrolled');
  if (query.recovered) return t(locale, 'auth.notice.recovered');
  switch (query.ended) {
    case 'idle':
      return t(locale, 'auth.notice.ended.idle');
    case 'absolute':
      return t(locale, 'auth.notice.ended.absolute');
    case 'revoked':
      return t(locale, 'auth.notice.ended.revoked');
    default:
      return undefined;
  }
}
