import { FakeIdentity } from '@northstar/integrations';
import { beginEnrolment, confirmEnrolment } from '@/app/actions/auth';
import { readHandoff } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { usingFakeIdentity } from '@/lib/integrations';

/** The two enrollable methods, as they arrive back from `beginEnrolment`. */
const ENROLLABLE = ['totp', 'passkey'] as const;

export interface EnrolmentOfferView {
  readonly enrolmentId: string;
  readonly method: 'totp' | 'passkey';
  readonly provisioningUri?: string | undefined;
  readonly manualEntrySecret?: string | undefined;
}

/**
 * Recovers the offer `beginEnrolment` just created.
 *
 * The TOTP seed is in a two-minute `httpOnly` hand-off cookie rather than in the
 * URL, so it stays out of browser history and out of access logs. The URL
 * carries only the enrolment id, and it must match the cookie — otherwise a
 * stale cookie from an abandoned enrolment would render a key belonging to a
 * different attempt.
 *
 * Returns undefined for anything unexpected, which renders the method chooser.
 * A caller-supplied id should never be able to produce a half-built offer.
 */
export async function currentEnrolmentOffer(
  enrolmentId: string | undefined,
): Promise<EnrolmentOfferView | undefined> {
  if (!enrolmentId) return undefined;
  const raw = await readHandoff('ns_enrolment');
  if (!raw) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;

  const offer = parsed as Record<string, unknown>;
  const method = ENROLLABLE.find((candidate) => candidate === offer['method']);
  if (offer['enrolmentId'] !== enrolmentId || !method) return undefined;

  return {
    enrolmentId,
    method,
    provisioningUri: typeof offer['provisioningUri'] === 'string' ? offer['provisioningUri'] : undefined,
    manualEntrySecret:
      typeof offer['manualEntrySecret'] === 'string' ? offer['manualEntrySecret'] : undefined,
  };
}

/**
 * Second-factor enrolment — ACC-009.
 *
 * Used from two places (during sign-in, and from the account screen), so it is a
 * component rather than a page. `during` decides only where the actions return
 * to; the markup and the guarantees are identical, because a person setting up
 * their first factor deserves the same screen as a person adding a second one.
 *
 * The accessibility decisions here are the point of the component:
 *
 *   - **No QR code alone.** The setup key is printed as text, grouped in fours,
 *     and the `otpauth:` link is offered separately. Someone enrolling on the
 *     device that is displaying the code cannot scan it, and someone who cannot
 *     see it cannot scan it either.
 *   - **Choice of method, always visible.** Not a "more options" disclosure.
 *   - **Plain inputs.** One code field, paste allowed, autocomplete honoured.
 */
export function MfaEnrolment({
  locale,
  offer,
  during,
  returnTo,
  error,
  currentCode,
}: {
  readonly locale: Locale;
  readonly offer?: EnrolmentOfferView | undefined;
  readonly during: boolean;
  readonly returnTo?: string | undefined;
  readonly error?: string | undefined;
  /** Local builds only: the code the fake provider would accept right now. */
  readonly currentCode?: string | undefined;
}) {
  const context = (
    <>
      <input type="hidden" name="locale" value={locale} />
      {during ? <input type="hidden" name="during" value="sign_in" /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
    </>
  );

  if (!offer) {
    return (
      <div className="ns-enrol">
        {error ? (
          <p className="ns-form-error" role="alert">
            <span className="ns-visually-hidden">{t(locale, 'qualifier.error.prefix')} </span>
            {t(locale, error === 'method' ? 'auth.error.method' : 'auth.error.code')}
          </p>
        ) : null}

        <div className="ns-enrol__choices">
          <form action={beginEnrolment}>
            {context}
            <input type="hidden" name="method" value="totp" />
            <button className="ns-button ns-button--primary" type="submit">
              {t(locale, 'auth.enrol.chooseTotp')}
            </button>
          </form>
          <form action={beginEnrolment}>
            {context}
            <input type="hidden" name="method" value="passkey" />
            <button className="ns-button ns-button--secondary" type="submit">
              {t(locale, 'auth.enrol.choosePasskey')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (offer.method === 'passkey') {
    return (
      <div className="ns-enrol">
        <p>{t(locale, 'auth.enrol.passkeyBody')}</p>
        <form action={confirmEnrolment}>
          {context}
          <input type="hidden" name="method" value="passkey" />
          <input type="hidden" name="enrolment" value={offer.enrolmentId} />
          <input type="hidden" name="code" value={usingFakeIdentity() ? FakeIdentity.PASSKEY_ASSERTION : ''} />
          <button className="ns-button ns-button--primary" type="submit">
            {t(locale, 'auth.enrol.passkeyConfirm')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="ns-enrol">
      <ol className="ns-enrol__steps">
        <li>
          <p>{t(locale, 'auth.enrol.totpStep1')}</p>

          {offer.manualEntrySecret ? (
            <div className="ns-enrol__secret">
              <p className="ns-enrol__secret-label" id="setup-key-label">
                {t(locale, 'auth.enrol.totpManualLabel')}
              </p>
              {/*
                Grouped in fours and set in a monospaced face so it can be read
                aloud, typed, or transcribed without losing the place. The
                grouping is presentational: the value itself has no spaces.
              */}
              <code className="ns-enrol__secret-value" aria-labelledby="setup-key-label">
                {group(offer.manualEntrySecret)}
              </code>
            </div>
          ) : null}

          {offer.provisioningUri ? (
            <p className="ns-enrol__uri">
              {/*
                An `otpauth:` link opens the authenticator app directly on a
                phone. On a desktop it does nothing visible, which is why the
                key above is the primary route rather than this.
              */}
              <a href={offer.provisioningUri}>{t(locale, 'auth.enrol.totpUriLabel')}</a>
            </p>
          ) : null}
        </li>

        <li>
          <p>{t(locale, 'auth.enrol.totpStep2')}</p>

          {currentCode ? (
            <p className="ns-enrol__demo-code">
              {t(locale, 'demo.currentCode')}: <code>{currentCode}</code>
            </p>
          ) : null}

          {error ? (
            <p className="ns-form-error" role="alert">
              <span className="ns-visually-hidden">{t(locale, 'qualifier.error.prefix')} </span>
              {t(locale, 'auth.error.code')}
            </p>
          ) : null}

          <form action={confirmEnrolment} className="ns-form">
            {context}
            <input type="hidden" name="method" value="totp" />
            <input type="hidden" name="enrolment" value={offer.enrolmentId} />
            <div className="ns-field">
              <label className="ns-field__label" htmlFor="enrol-code">
                {t(locale, 'auth.enrol.confirmLabel')}
              </label>
              <input
                className="ns-field__input ns-field__input--code"
                id="enrol-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </div>
            <button className="ns-button ns-button--primary" type="submit">
              {t(locale, 'auth.enrol.confirm')}
            </button>
          </form>
        </li>
      </ol>
    </div>
  );
}

/** Groups a base32 secret into fours, purely for legibility. */
function group(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? [secret]).join(' ');
}
