import { setConsent } from '@/app/actions/qualifier';
import { t, type Locale } from '@/lib/i18n';

/**
 * Consent banner — PUB-006, CNV-003.
 *
 * Design constraints that are requirements, not taste:
 *
 *  - It is rendered *after* the main content in the DOM and does not trap focus.
 *    A consent prompt that blocks the page is an inaccessible urgency pattern.
 *  - Accept and decline are the same kind of control, the same size, in a
 *    predictable order. A styled-down "decline" is a dark pattern (CNV-003).
 *  - Nothing is loaded before a decision, so the page is fully usable while the
 *    banner is still showing — no "by continuing you agree".
 */
export function ConsentBanner({ locale, returnTo }: { locale: Locale; returnTo: string }) {
  return (
    <aside className="ns-consent" aria-labelledby="consent-heading">
      <h2 id="consent-heading">{t(locale, 'consent.heading')}</h2>
      <p>{t(locale, 'consent.body')}</p>
      <div className="ns-consent__actions">
        <form action={setConsent}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="decision" value="grant" />
          <button className="ns-button ns-button--secondary" type="submit">
            {t(locale, 'consent.accept')}
          </button>
        </form>
        <form action={setConsent}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="decision" value="refuse" />
          <button className="ns-button ns-button--secondary" type="submit">
            {t(locale, 'consent.decline')}
          </button>
        </form>
      </div>
    </aside>
  );
}
