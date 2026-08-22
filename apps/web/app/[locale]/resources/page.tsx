import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, t, type Locale, type StringKey } from '@/lib/i18n';
import { listResources } from '@/lib/resources';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safe: Locale = isLocale(locale) ? locale : 'en';
  return { title: t(safe, 'resources.title') };
}

const KIND_LABEL: Record<string, StringKey> = {
  guide: 'resources.kind.guide',
  checklist: 'resources.kind.checklist',
  explainer: 'resources.kind.explainer',
};

/**
 * Resource index — PRD §7 "Editorial resources", §23 search/editorial channel.
 *
 * §13 warns against mass-produced keyword pages, so this is a short list of
 * things we actually know rather than a content mill. Three useful articles beat
 * thirty thin ones, and the index is honest about how few there are.
 */
export default async function ResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const resources = listResources(locale);

  return (
    <>
      <section className="ns-section">
        <div className="ns-container">
          <p className="ns-eyebrow">{t(locale, 'resources.eyebrow')}</p>
          <h1 className="ns-hero__title">{t(locale, 'resources.title')}</h1>
          <p className="ns-hero__lede">{t(locale, 'resources.lede')}</p>
        </div>
      </section>

      <section className="ns-section ns-section--muted">
        <div className="ns-container">
          <ul className="ns-resource-list">
            {resources.map((item) => (
              <li key={item.slug}>
                <article className="ns-resource">
                  <p className="ns-resource__meta">
                    <span className="ns-resource__kind">{t(locale, KIND_LABEL[item.kind]!)}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{t(locale, 'resources.minutes').replace('{n}', String(item.minutes))}</span>
                  </p>
                  <h2 className="ns-resource__title">
                    <Link href={`/${locale}/resources/${item.slug}`}>{item.title}</Link>
                  </h2>
                  <p className="ns-resource__summary">{item.summary}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
