import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SkipLink } from '@northstar/ui';
import '@northstar/ui/tokens.css';
import '../globals.css';
import { isLocale, t, type Locale } from '@/lib/i18n';

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'fr' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safe: Locale = isLocale(locale) ? locale : 'en';
  return {
    title: t(safe, 'site.name'),
    description: t(safe, 'site.tagline'),
    // CNT-007: no personalized page is indexed. CC-01 has no public content to
    // index at all, so the whole app is noindex until CC-02 ships real pages.
    robots: { index: false, follow: false },
    alternates: {
      languages: { en: '/en', fr: '/fr' },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const other: Locale = locale === 'en' ? 'fr' : 'en';

  return (
    // `lang` is set from the route so assistive technology announces the page in
    // the right language (WCAG 3.1.1, ACC-006).
    <html lang={locale}>
      <body>
        <SkipLink targetId="main">{t(locale, 'nav.skipToContent')}</SkipLink>
        <header className="ns-header">
          <p className="ns-header__brand">{t(locale, 'site.name')}</p>
          <nav aria-label={t(locale, 'nav.languageLabel')}>
            <a href={`/${other}`} lang={other} hrefLang={other}>
              {t(locale, other === 'fr' ? 'nav.switchToFrench' : 'nav.switchToEnglish')}
            </a>
          </nav>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="ns-footer">
          <p>{t(locale, 'footer.legal')}</p>
        </footer>
      </body>
    </html>
  );
}
