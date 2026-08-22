import type { ResolvedClaim } from '@northstar/domain';
import { t, type Locale } from '@/lib/i18n';

/**
 * Renders a regulatory claim, or its hold state — ENG-007, PUB-004, CNT-005.
 *
 * There is no code path in this component that prints a regulatory sentence from
 * a literal. The statement always arrives resolved from a versioned content
 * object, and when that object is on hold the component structurally cannot
 * render it: the `hold` branch of the union has no `text` field.
 */
export function RegulatoryClaimBlock({
  resolved,
  locale,
}: {
  resolved: ResolvedClaim;
  locale: Locale;
}) {
  if (resolved.kind === 'hold') {
    return (
      <section className="ns-claim ns-claim--hold" aria-labelledby="claim-hold-heading">
        <h2 id="claim-hold-heading">{t(locale, 'claim.hold.heading')}</h2>
        <p>{t(locale, 'claim.hold.body')}</p>
        <p className="ns-claim__provenance">
          {t(locale, 'claim.source')}:{' '}
          <a href={resolved.sourceUrl} rel="noreferrer">
            {resolved.sourceTitle}
          </a>
        </p>
      </section>
    );
  }

  return (
    <section className="ns-claim" aria-labelledby="claim-heading">
      <h2 className="ns-visually-hidden" id="claim-heading">
        {resolved.sourceTitle}
      </h2>

      {resolved.translationMissing ? (
        // PUB-001: a missing translation is stated, not silently filled with English.
        <div className="ns-translation-gap" lang={locale}>
          <h3>{t(locale, 'translation.missing.heading')}</h3>
          <p>{t(locale, 'translation.missing.body')}</p>
        </div>
      ) : null}

      <p lang={resolved.locale}>{resolved.text}</p>

      <p className="ns-claim__provenance">
        {t(locale, 'claim.source')}:{' '}
        <a href={resolved.sourceUrl} rel="noreferrer">
          {resolved.sourceTitle}
        </a>
        {' · '}
        {t(locale, 'claim.lastReviewed')}:{' '}
        <time dateTime={resolved.lastVerifiedAt.toISOString().slice(0, 10)}>
          {resolved.lastVerifiedAt.toISOString().slice(0, 10)}
        </time>
        {' · '}
        {resolved.jurisdiction} · v{resolved.version}
      </p>
    </section>
  );
}
