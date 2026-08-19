import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AccessibilityRecord, ResourceBody } from '@/app/components/resource-body';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { getResource } from '@/lib/resources';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const safe: Locale = isLocale(locale) ? locale : 'en';
  const item = getResource(safe, slug);
  return item ? { title: item.title, description: item.summary } : {};
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const item = getResource(locale, slug);
  if (!item) notFound();

  return (
    <article className="ns-page ns-page--article">
      <p className="ns-eyebrow">
        <Link href={`/${locale}/resources`}>{t(locale, 'resources.backToIndex')}</Link>
      </p>

      <h1>{item.title}</h1>
      <p className="ns-lede">{item.summary}</p>

      <p className="ns-resource__meta">
        <span>{t(locale, 'resources.minutes').replace('{n}', String(item.minutes))}</span>
        <span aria-hidden="true"> · </span>
        <span>
          {t(locale, 'resources.updated')}{' '}
          <time dateTime={item.updatedAt.toISOString().slice(0, 10)}>
            {item.updatedAt.toISOString().slice(0, 10)}
          </time>
        </span>
      </p>

      <ResourceBody blocks={item.body} locale={locale} />

      <AccessibilityRecord
        reviewedBy={item.accessibilityReviewedBy}
        reviewedAt={item.accessibilityReviewedAt}
        locale={locale}
      />

      <p className="ns-alt-path">
        <Link className="ns-button ns-button--primary" href={`/${locale}/check`}>
          {t(locale, 'finalCta.primary')}
        </Link>
      </p>
    </article>
  );
}
