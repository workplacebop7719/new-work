/**
 * CONFIDENCE — how much evidence stands behind a Value Index.
 *
 * Deliberately a SEPARATE signal (PRD §16/§17). Confidence never adjusts the
 * Index; a thinly-evidenced deal keeps its arithmetic score and carries a
 * visible low-confidence state instead. Merging the two would let weak
 * evidence quietly move a published number.
 */
import type { ComponentKey } from './value-index';

/** Source priority ladder from PRD §44, best first. */
export const SOURCE_TIER = {
  RETAILER_API: 1,
  AFFILIATE_FEED: 2,
  MERCHANT_FEED: 3,
  STRUCTURED_PUBLIC: 4,
  PERMITTED_MONITORING: 5,
} as const;

export type SourceTier = (typeof SOURCE_TIER)[keyof typeof SOURCE_TIER];

export interface ConfidenceEvidence {
  /** share of Value Index weight actually measured, 0..1 */
  coverage: number;
  /** how many distinct price observations back the history */
  observationCount: number;
  /** age of the most recent verification, in whole days */
  daysSinceVerified: number;
  sourceTier: SourceTier;
  /** components we could not measure at all */
  excluded: ComponentKey[];
}

export type ConfidenceLevel = 'HIGH' | 'MODERATE' | 'LOW';

export interface ConfidenceResult {
  /** 0..1 */
  value: number;
  level: ConfidenceLevel;
  /** plain-language, customer-safe reasons — never raw analytics */
  reasons: string[];
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export function computeConfidence(e: ConfidenceEvidence): ConfidenceResult {
  const reasons: string[] = [];

  // Depth of history. 24+ observations is treated as a full record.
  const depth = clamp01(e.observationCount / 24);
  if (e.observationCount === 0) reasons.push('No recorded price history yet.');
  else if (e.observationCount < 6) reasons.push('Short price history so far.');

  // Freshness. Full marks inside 2 days, nothing beyond 14.
  const freshness =
    e.daysSinceVerified <= 2 ? 1 : e.daysSinceVerified >= 14 ? 0 : 1 - (e.daysSinceVerified - 2) / 12;
  if (e.daysSinceVerified > 7) reasons.push('Last verified over a week ago.');

  // Source quality: tier 1 → 1.0, tier 5 → 0.2.
  const source = clamp01((6 - e.sourceTier) / 5);
  if (e.sourceTier >= SOURCE_TIER.STRUCTURED_PUBLIC) reasons.push('Sourced from public listings rather than a retailer feed.');

  const coverage = clamp01(e.coverage);
  if (coverage < 0.8) reasons.push(`${e.excluded.length} of 8 value components could not be measured.`);

  const value = clamp01(0.34 * coverage + 0.26 * depth + 0.22 * freshness + 0.18 * source);
  const level: ConfidenceLevel = value >= 0.72 ? 'HIGH' : value >= 0.45 ? 'MODERATE' : 'LOW';

  return { value, level, reasons };
}

/* ============================================================
   PUBLICATION GATE
   ============================================================ */

/** A headline Index needs at least this much of the model measured. */
export const MIN_COVERAGE_TO_PUBLISH = 0.6;

export type PublishDecision =
  | { publish: true }
  | { publish: false; reason: string };

/**
 * Whether a Value Index may be shown as a headline number.
 *
 * Two hard conditions:
 *
 *  - Historical price quality MUST be measured. Without our own recorded
 *    history we would only be restating the retailer's discount claim,
 *    which is precisely the thing BARGENATION exists not to do (§01).
 *  - At least MIN_COVERAGE_TO_PUBLISH of the model must be measured, so a
 *    renormalised 10.0 cannot ride on one lucky component.
 *
 * When this returns false the product says so plainly rather than printing
 * a number it cannot stand behind.
 */
export function canPublishIndex(
  coverage: number,
  excluded: readonly ComponentKey[],
  /**
   * Whether we have enough OBSERVATIONS, as opposed to enough movement.
   *
   * Both cases exclude historical price quality, and they need different
   * sentences. Telling somebody "we haven't recorded enough history" when we
   * have forty-one observations of a price that simply never moved is not
   * true, and it is the kind of small untruth that teaches people to stop
   * believing the rest.
   */
  hasHistory = false,
): PublishDecision {
  if (excluded.includes('historicalPriceQuality')) {
    return {
      publish: false,
      reason: hasHistory
        // We watched. It just did not move enough to say anything about.
        ? 'This price has barely moved since we started watching, so there is nothing to judge it against yet.'
        : "We haven't recorded enough price history for this yet.",
    };
  }
  if (coverage < MIN_COVERAGE_TO_PUBLISH) {
    return { publish: false, reason: "We can't measure enough about this offer to score it." };
  }
  return { publish: true };
}
