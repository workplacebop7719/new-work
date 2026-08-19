import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, t, type StringKey } from '@/lib/i18n';

const SECTIONS: readonly { heading: StringKey; body: StringKey }[] = [
  { heading: 'howItWorks.network.heading', body: 'howItWorks.network.body' },
  { heading: 'howItWorks.quality.heading', body: 'howItWorks.quality.body' },
  { heading: 'howItWorks.security.heading', body: 'howItWorks.security.body' },
  { heading: 'howItWorks.accessibility.heading', body: 'howItWorks.accessibility.body' },
  { heading: 'howItWorks.responsibilities.heading', body: 'howItWorks.responsibilities.body' },
  { heading: 'howItWorks.limits.heading', body: 'howItWorks.limits.body' },
];

/**
 * The hero's secondary CTA target — PRD §13 "How it works".
 *
 * Written to be genuinely useful to someone deciding whether to engage,
 * including the last section, which exists to disqualify people we are wrong
 * for. §7 names "reduce sales friction and mismatched leads" as the job.
 */
export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <>
      <section className="ns-section">
        <div className="ns-container">
          <p className="ns-eyebrow">{t(locale, 'method.eyebrow')}</p>
          <h1 className="ns-hero__title">{t(locale, 'howItWorks.title')}</h1>
          <p className="ns-hero__lede">{t(locale, 'howItWorks.lede')}</p>
        </div>
      </section>

      <section className="ns-section ns-section--muted">
        <div className="ns-container">
          <div className="ns-ruled ns-how">
            {SECTIONS.map((section) => (
              <article key={section.heading}>
                <h2 className="ns-how__heading">{t(locale, section.heading)}</h2>
                <p className="ns-prose">{t(locale, section.body)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ns-section">
        <div className="ns-container ns-container--narrow">
          <div className="ns-cta-row">
            <Link className="ns-button ns-button--primary" href={`/${locale}/check`}>
              {t(locale, 'finalCta.primary')}
            </Link>
            <Link className="ns-button ns-button--secondary" href={`/${locale}/contact`}>
              {t(locale, 'finalCta.secondary')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
