import { notFound } from 'next/navigation';
import { resolveClaim } from '@northstar/domain';
import { getClaim } from '@/lib/claims';
import { isLocale, t } from '@/lib/i18n';
import { RegulatoryClaimBlock } from '@/app/components/regulatory-claim-block';

export default async function FoundationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const claim = getClaim('on.reporting.deadline');
  const resolved = claim ? resolveClaim(claim, locale, new Date()) : undefined;

  return (
    <div className="ns-page">
      <h1>{t(locale, 'status.foundation.heading')}</h1>
      <p className="ns-lede">{t(locale, 'status.foundation.body')}</p>

      {resolved ? <RegulatoryClaimBlock resolved={resolved} locale={locale} /> : null}
    </div>
  );
}
