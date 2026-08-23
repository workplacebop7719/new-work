import Link from 'next/link';
import type { Deal } from '@/domain/types';
import { formatUsd } from '@/domain/types';
import { CategoryPlate } from './CategoryPlate';
import { RecommendationMark } from './RecommendationMark';

/**
 * DEAL CARD (PRD §22).
 *
 * Hierarchy: plate → product → price → Index → recommendation → retailer.
 * Secondary intelligence (recorded low, verification age) is present but
 * typographically subordinate rather than hidden behind an interaction,
 * because on mobile there is no hover to reveal it.
 */
export function DealCard({
  deal,
  priority = false,
  showRetailer = true,
}: {
  deal: Deal;
  priority?: boolean;
  /** Off on a retailer's own page, where every card would name the same store. */
  showRetailer?: boolean;
}) {
  const { offer } = deal;
  // Narrow the discriminated union once, so the union — not a boolean — drives rendering.
  const index = deal.publishable && deal.index.scorable ? deal.index : null;

  return (
    <article className="group relative flex flex-col">
      <Link href={`/deals/${offer.product.slug}`} className="flex flex-col focus-visible:outline-none">
        <span className="absolute inset-0 z-10" aria-hidden="true" />
        <CategoryPlate
          category={offer.product.category}
          label={offer.product.brand}
          className={priority ? 'aspect-[16/10]' : ''}
        />

        <div className="mt-4 flex flex-1 flex-col">
          <p className="eyebrow text-ink-50">
            {showRetailer ? offer.retailer.name : offer.product.category}
          </p>

          <h3 className="display display-sm mt-2 text-ink group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
            {offer.product.name}
          </h3>

          <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <p className="numeral text-[1.75rem] leading-none text-ink">{formatUsd(offer.priceCents)}</p>
            {index ? (
              <p className="text-right">
                <span className="numeral text-[1.5rem] leading-none text-ink">
                  {index.score.toFixed(1)}
                </span>
                <span className="eyebrow ml-1 text-ink-50">Index</span>
              </p>
            ) : (
              <p className="eyebrow text-ink-50">Not scored</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <RecommendationMark deal={deal} />
            {deal.history?.atRecordedLow && (
              <span className="eyebrow border border-ink px-2 py-1 text-ink">At recorded low</span>
            )}
          </div>

          {/* Concrete recorded evidence, which differs per deal, rather than
              the same top-ranked stock phrase on every card (§77). */}
          <p className="mt-3 text-[0.8125rem] leading-snug text-ink-70">
            {index && deal.history
              ? `We've recorded it as low as ${formatUsd(deal.history.lowCents)}, typically ${formatUsd(deal.history.typicalCents)}, across ${deal.history.observationCount} checks.`
              : deal.withheldReason}
          </p>
        </div>
      </Link>
    </article>
  );
}
