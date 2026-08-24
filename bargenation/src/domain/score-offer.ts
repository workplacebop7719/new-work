/**
 * The one place an Offer becomes a scored Deal.
 *
 * Everything downstream (pages, cards, the newsletter, the API) reads the
 * output of this function, so the trust rules hold everywhere at once.
 * `now` is injected rather than read from the clock, keeping the whole
 * pipeline deterministic and testable.
 */
import type { Deal, Offer } from './types';
import { computeValueIndex, type ValueComponents } from './value-index';
import { computeConfidence, canPublishIndex } from './confidence';
import { computeUrgency } from './urgency';
import { recommend } from './buy-hold';
import * as history from './price-history';

export function scoreOffer(offer: Offer, now: Date, shopperRelevance: number | null = null): Deal {
  const obs = offer.observations;

  const components: ValueComponents = {
    discountStrength: history.discountStrength(obs, offer.priceCents),
    historicalPriceQuality: history.historicalPriceQuality(obs, offer.priceCents),
    promotionRarity: history.promotionRarity(obs, offer.priceCents),
    marketCompetitiveness: history.marketCompetitiveness(offer.priceCents, offer.competitorPriceCents),
    shopperRelevance,
    // Stackability and seasonality need retailer-promotion data we do not
    // collect yet. They stay null so they are excluded and lower Confidence,
    // rather than being invented (§45).
    stackability: null,
    seasonality: null,
    inventoryBreadth: history.inventoryBreadth(obs),
  };

  const index = computeValueIndex(components);
  const summary = history.summarise(obs, offer.priceCents);

  const coverage = index.scorable ? index.coverage : 0;
  const excluded = index.excluded;
  // `summary` being non-null means we have enough observations; what may be
  // missing is MOVEMENT. The gate needs both facts to say the true thing.
  const gate = canPublishIndex(coverage, excluded, summary !== null);
  const publishable = index.scorable && gate.publish;

  const confidence = computeConfidence({
    coverage,
    observationCount: obs.length,
    daysSinceVerified: history.daysBetween(offer.lastVerifiedAt, now),
    sourceTier: offer.sourceTier,
    excluded,
  });

  const urgency = computeUrgency({
    daysUntilOfferEnds: offer.daysUntilOfferEnds,
    limitedStock: offer.limitedStock,
    daysUntilCustomerDeadline: null,
  });

  return {
    offer,
    index,
    publishable,
    withheldReason: gate.publish ? null : gate.reason,
    confidence,
    urgency,
    recommendation: recommend({
      band: index.scorable ? index.band : 'SKIP',
      confidence: confidence.level,
      publishable,
      contributions: index.scorable ? index.contributions : [],
    }),
    history: summary
      ? {
          lowCents: summary.lowCents,
          highCents: summary.highCents,
          typicalCents: summary.typicalCents,
          atRecordedLow: summary.atRecordedLow,
          observationCount: summary.observationCount,
        }
      : null,
  };
}
