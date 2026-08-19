import { notFound } from 'next/navigation';
import { resolveClaim } from '@northstar/domain';
import { NoticeBand } from '@northstar/ui';
import { BandSelector } from '@/app/components/band-selector';
import {
  FinalCta,
  Hero,
  Method,
  OfferArchitecture,
  ProofPending,
  Resources,
  TrustLayer,
} from '@/app/components/home-sections';
import { getClaim } from '@/lib/claims';
import { isLocale, t } from '@/lib/i18n';
import { readBand } from '@/lib/profile';
import { listResources } from '@/lib/resources';

export const dynamic = 'force-dynamic';

/**
 * The homepage — PRD §7 module composition.
 *
 * Order matters and follows the section: a source-stamped notice, then the
 * promise, then who it is for, then what it costs, then how it is done, then why
 * to believe it, then the way in. Nothing here is behind an interaction — a
 * visitor who never clicks still sees the whole proposition.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const claim = getClaim('on.reporting.deadline');
  const resolved = claim ? resolveClaim(claim, locale, new Date()) : undefined;
  const band = await readBand();
  const resources = listResources(locale);

  return (
    <>
      {/*
        The notice band renders the regulatory claim through the content model.
        The seeded claim is unreviewed pending counsel (question Q-04), so what
        appears is the hold state — which is the behaviour worth demonstrating.
      */}
      {resolved ? (
        <div className="ns-notice-slot">
          <NoticeBand
            sourceUrl={resolved.sourceUrl}
            sourceLabel={resolved.sourceTitle}
            {...(resolved.kind === 'statement'
              ? { lastReviewed: resolved.lastVerifiedAt.toISOString().slice(0, 10) }
              : {})}
          >
            {resolved.kind === 'statement' ? resolved.text : t(locale, 'claim.hold.heading')}
          </NoticeBand>
        </div>
      ) : null}

      <Hero locale={locale} band={band} />
      <BandSelector locale={locale} selected={band} />
      <OfferArchitecture locale={locale} />
      <Method locale={locale} />
      <TrustLayer locale={locale} />
      <ProofPending locale={locale} />
      <Resources locale={locale} items={resources} />

      <FinalCta locale={locale} />
    </>
  );
}
