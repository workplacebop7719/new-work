import { notFound } from 'next/navigation';
import { listFactors, listUserSessions } from '@northstar/db';
import { MIN_ENROLLED_FACTORS } from '@northstar/domain';
import { StatusMessage } from '@northstar/ui';
import { issueRecoveryCodes, signOut } from '@/app/actions/auth';
import { currentEnrolmentOffer, MfaEnrolment } from '@/app/components/mfa-enrolment';
import { readHandoff, requireViewer } from '@/lib/auth';
import { demoTotpFor } from '@/lib/demo';
import { isLocale, t, type Locale } from '@/lib/i18n';

/**
 * Sign-in and security — ACC-009, SEC-002, SEC-003.
 *
 * Three things a person needs to be able to do without asking anyone: add a
 * second way in, get a fresh set of recovery codes, and end sessions they no
 * longer recognize. All three are here, all three are plain forms.
 *
 * The recovery codes are rendered from the URL after being issued and are never
 * stored by this platform — only the date. That is why the page says they cannot
 * be shown again: it is a statement about the data model, not a UI limitation.
 */
export default async function SecurityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ enrolment?: string; codes?: string; enrolled?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;

  const viewer = await requireViewer(locale, `/${locale}/account/security`);
  const factors = await listFactors(viewer.user.id);
  const sessions = await listUserSessions(viewer.user.id);
  // The codes arrive in a two-minute hand-off cookie, not in the URL. The query
  // flag only says a set was just issued; without the cookie there is nothing to
  // show, which is the correct behaviour on a reload two minutes later.
  const codes = query.codes ? ((await readHandoff('ns_recovery_codes')) ?? '').split(',').filter(Boolean) : [];
  const offer = await currentEnrolmentOffer(query.enrolment);

  return (
    <div className="ns-page ns-page--form">
      <h1>{t(locale, 'account.security.title')}</h1>
      <p className="ns-page__lede">{t(locale, 'account.security.lede')}</p>

      {query.enrolled ? <StatusMessage>{t(locale, 'auth.notice.enrolled')}</StatusMessage> : null}

      <section className="ns-panel" aria-labelledby="factors-heading">
        <h2 className="ns-panel__heading" id="factors-heading">
          {t(locale, 'account.factors.heading')}
        </h2>

        {factors.length === 0 ? (
          <p>{t(locale, 'account.factors.none')}</p>
        ) : (
          <ul className="ns-plain-list">
            {factors.map((factor) => (
              <li className="ns-record" key={factor.method}>
                <span className="ns-record__primary">
                  {t(locale, `account.factors.${factor.method}` as 'account.factors.totp')}
                </span>
                <span className="ns-record__secondary">
                  {t(locale, 'account.factors.enrolledAt')} {formatDate(factor.enrolledAt, locale)}
                  {' · '}
                  {factor.lastUsedAt
                    ? `${t(locale, 'account.factors.lastUsed')} ${formatDate(factor.lastUsedAt, locale)}`
                    : t(locale, 'account.factors.neverUsed')}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/*
          ACC-009 asks for an alternative verification method, so one factor is a
          half-finished enrolment. The prompt is a plain sentence rather than a
          warning icon: it is an invitation to finish, not a failure.
        */}
        {factors.length > 0 && factors.length < MIN_ENROLLED_FACTORS ? (
          <p>{t(locale, 'account.factors.one')}</p>
        ) : null}

        <MfaEnrolment
          locale={locale}
          offer={offer}
          during={false}
          error={query.error}
          currentCode={await demoTotpFor(offer?.manualEntrySecret)}
        />
      </section>

      <section className="ns-panel" aria-labelledby="recovery-heading">
        <h2 className="ns-panel__heading" id="recovery-heading">
          {t(locale, 'account.recovery.heading')}
        </h2>
        <p>{t(locale, 'account.recovery.body')}</p>

        {codes.length > 0 ? (
          <div className="ns-recovery">
            <p className="ns-recovery__warning">{t(locale, 'account.recovery.shownOnce')}</p>
            <ul className="ns-recovery__codes">
              {codes.map((code) => (
                <li key={code}>
                  <code>{code}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>
            {viewer.user.recoveryCodesIssuedAt
              ? t(locale, 'account.recovery.issuedOn').replace(
                  '{date}',
                  formatDate(viewer.user.recoveryCodesIssuedAt, locale),
                )
              : t(locale, 'account.recovery.never')}
          </p>
        )}

        <form action={issueRecoveryCodes}>
          <input type="hidden" name="locale" value={locale} />
          <button className="ns-button ns-button--secondary" type="submit">
            {t(locale, 'account.recovery.issue')}
          </button>
        </form>
      </section>

      <section className="ns-panel" aria-labelledby="sessions-heading">
        <h2 className="ns-panel__heading" id="sessions-heading">
          {t(locale, 'account.sessions.heading')}
        </h2>
        <ul className="ns-plain-list">
          {sessions.map((session) => (
            <li className="ns-record" key={session.id}>
              <span className="ns-record__primary">
                {session.userAgentFamily ?? t(locale, 'account.sessions.unknownClient')}
                {session.id === viewer.session.id ? ` · ${t(locale, 'account.sessions.current')}` : ''}
              </span>
              <span className="ns-record__secondary">
                {t(locale, 'account.sessions.startedAt')} {formatDate(session.createdAt, locale)}
                {' · '}
                {t(locale, 'account.sessions.lastSeen')} {formatDate(session.lastSeenAt, locale)}
              </span>
            </li>
          ))}
        </ul>

        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="scope" value="everywhere" />
          <button className="ns-button ns-button--secondary" type="submit">
            {t(locale, 'auth.signOutEverywhere')}
          </button>
        </form>
      </section>
    </div>
  );
}

/**
 * Dates are formatted on the server in the page's locale.
 *
 * Deliberately not the viewer's browser locale: the page is already committed to
 * one language, and a French page showing American date order is the kind of
 * detail that makes a translation feel machine-made.
 */
function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
