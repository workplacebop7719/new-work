import { extendSession } from '@/app/actions/auth';
import { t, type Locale } from '@/lib/i18n';

/**
 * The inactivity warning — ACC-004.
 *
 * The accessibility criterion behind it allows a timeout only if it is at least
 * twenty hours, or the person is warned and can extend it.
 * (northstar-allow-regulatory: an engineering comment about our own conformance
 * target, not a statement rendered to anyone about their obligations.)
 * A client session here is twelve hours, so this is the mechanism that makes it
 * conformant — and a warning with no way to act on it would satisfy neither the
 * criterion nor the person reading it.
 *
 * It is a form, not a script-driven modal. That means it works with JavaScript
 * off, it cannot trap focus, and it cannot steal focus from whatever someone is
 * in the middle of typing. `role="status"` announces it politely rather than
 * interrupting; the deadline is minutes away, not seconds, so an assertive
 * interruption would be alarm without cause.
 */
export function SessionTimeoutWarning({
  locale,
  returnTo,
}: {
  readonly locale: Locale;
  readonly returnTo: string;
}) {
  return (
    <aside className="ns-timeout" role="status" aria-labelledby="timeout-heading">
      <div className="ns-timeout__inner">
        <h2 className="ns-timeout__heading" id="timeout-heading">
          {t(locale, 'auth.timeout.heading')}
        </h2>
        <p className="ns-timeout__body">{t(locale, 'auth.timeout.body')}</p>
        <form action={extendSession}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button className="ns-button ns-button--primary ns-button--compact" type="submit">
            {t(locale, 'auth.timeout.extend')}
          </button>
        </form>
      </div>
    </aside>
  );
}
