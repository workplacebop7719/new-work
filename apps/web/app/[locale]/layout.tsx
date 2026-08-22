import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SkipLink } from '@northstar/ui';
import '@northstar/ui/tokens.css';
import '../globals.css';
import { ConsentBanner } from '@/app/components/consent-banner';
import { SessionTimeoutWarning } from '@/app/components/session-timeout';
import { SiteFooter, SiteHeader } from '@/app/components/site-chrome';
import { display, sans } from '@/lib/fonts';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { currentViewer } from '@/lib/auth';
import { readConsent } from '@/lib/session';

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
    title: {
      default: `${t(safe, 'site.name')} — ${t(safe, 'site.tagline')}`,
      template: `%s — ${t(safe, 'site.name')}`,
    },
    description: t(safe, 'hero.lede'),
    // CNT-007: personalized result pages are never indexed. The whole site stays
    // noindex until the brand and regulatory copy clear review (Q-04, ORG-005) —
    // publishing unreviewed regulatory content to a search index is the one
    // mistake that is genuinely hard to take back.
    robots: { index: false, follow: false },
    alternates: { languages: { en: '/en', fr: '/fr' } },
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

  const consent = await readConsent();
  // Costs a cookie read for an anonymous visitor and a session lookup for a
  // signed-in one. The header needs to know either way, and ACC-004's warning
  // has to be able to appear on whatever page the person is actually on.
  const viewer = await currentViewer();

  return (
    <html lang={locale} className={`${sans.variable} ${display.variable}`}>
      <body>
        <SkipLink targetId="main">{t(locale, 'nav.skipToContent')}</SkipLink>
        <SiteHeader locale={locale} signedIn={viewer.status === 'active'} />
        {viewer.status === 'active' && viewer.warnAboutTimeout ? (
          <SessionTimeoutWarning locale={locale} returnTo={`/${locale}/account`} />
        ) : null}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter locale={locale} />
        {consent.decided ? null : <ConsentBanner locale={locale} returnTo={`/${locale}`} />}
      </body>
    </html>
  );
}
