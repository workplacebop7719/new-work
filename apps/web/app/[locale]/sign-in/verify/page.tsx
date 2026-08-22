import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FakeIdentity } from '@northstar/integrations';
import { verifySecondFactor } from '@/app/actions/auth';
import { isLocale, t } from '@/lib/i18n';
import { usingFakeIdentity } from '@/lib/integrations';

/**
 * The second factor — SEC-002, ACC-009.
 *
 * The code field is the accessibility-critical control on this page. It is one
 * ordinary text input, not six single-character boxes: a split field breaks
 * pasting, confuses screen readers about how much has been entered, and is
 * unusable with a switch device. `inputMode="numeric"` gets the numeric keypad
 * on a phone without rejecting anything a person types, and `autoComplete`
 * lets a password manager or the platform fill it.
 *
 * Whitespace is accepted and stripped server-side, because "123 456" is how
 * both authenticator apps and password managers hand a code over.
 */
export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string; method?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { returnTo, method } = await searchParams;
  const usePasskey = method === 'passkey';

  return (
    <div className="ns-page ns-page--form ns-page--narrow">
      <h1>{t(locale, 'auth.verify.title')}</h1>

      {usePasskey ? (
        <>
          <p className="ns-page__lede">{t(locale, 'auth.verify.passkeyBody')}</p>
          <form action={verifySecondFactor} className="ns-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="method" value="passkey" />
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            {/*
              A real WebAuthn assertion is produced by the browser and cannot be
              stood in for honestly in markup. Against the fake provider the
              expected value is a fixed string; against a real adapter this
              branch is replaced by the platform prompt, and the field goes.
            */}
            <input type="hidden" name="code" value={usingFakeIdentity() ? FakeIdentity.PASSKEY_ASSERTION : ''} />
            <div className="ns-step-actions">
              <button className="ns-button ns-button--primary" type="submit">
                {t(locale, 'auth.verify.passkeySubmit')}
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <p className="ns-page__lede">{t(locale, 'auth.verify.lede')}</p>
          <form action={verifySecondFactor} className="ns-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="method" value="totp" />
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

            <div className="ns-field">
              <label className="ns-field__label" htmlFor="code">
                {t(locale, 'auth.verify.codeLabel')}
              </label>
              <p className="ns-field__hint" id="code-hint">
                {t(locale, 'auth.verify.codeHint')}
              </p>
              <input
                className="ns-field__input ns-field__input--code"
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-describedby="code-hint"
                required
              />
            </div>

            <div className="ns-step-actions">
              <button className="ns-button ns-button--primary" type="submit">
                {t(locale, 'auth.verify.submit')}
              </button>
            </div>
          </form>
        </>
      )}

      <div className="ns-alt-path">
        <p>
          {/*
            ACC-009's "alternative verification method". A link rather than a
            script-driven toggle, so it works with scripting off and can be
            opened in a new tab by someone who wants to keep this page.
          */}
          <Link
            href={`/${locale}/sign-in/verify?method=${usePasskey ? 'totp' : 'passkey'}${
              returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''
            }`}
          >
            {usePasskey ? t(locale, 'auth.verify.useApp') : t(locale, 'auth.verify.usePasskey')}
          </Link>
        </p>
        <p>
          <Link href={`/${locale}/sign-in/recover`}>{t(locale, 'auth.verify.lost')}</Link>
        </p>
      </div>
    </div>
  );
}
