/**
 * PRICE HISTORY (PRD §24) — turning our OWN recorded observations into
 * Value Index components.
 *
 * This is the module that makes BARGENATION different from a coupon site:
 * every component below is derived from prices we recorded ourselves. None
 * of it trusts a retailer's "was" price, because a claimed reference price
 * is marketing, not evidence (§01, §45).
 *
 * Every function returns `null` when the recorded history cannot support the
 * measurement. `null` flows through to the Index as an excluded component
 * and lowers Confidence — it is never silently treated as zero.
 */

/** An append-only fact: this retailer showed this price at this moment. */
export interface PriceObservation {
  /** minor units (cents) — money is never a float */
  priceCents: number;
  /** ISO-8601 instant the price was observed */
  observedAt: string;
  /** false when the retailer listed it as unavailable */
  inStock: boolean;
}

/** Below this many observations we decline to characterise a price history. */
export const MIN_OBSERVATIONS = 5;

/** A discount this deep or deeper counts as full Discount Strength. */
export const FULL_DISCOUNT_AT = 0.5;

const median = (sorted: readonly number[]): number => {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid] as number;
  return (((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2);
};

export interface HistorySummary {
  observationCount: number;
  lowCents: number;
  highCents: number;
  typicalCents: number;
  /** true when the current price equals or beats everything we've recorded */
  atRecordedLow: boolean;
}

/** Null when there is not enough recorded history to describe anything. */
export function summarise(
  observations: readonly PriceObservation[],
  currentCents: number,
): HistorySummary | null {
  if (observations.length < MIN_OBSERVATIONS) return null;
  const prices = observations.map((o) => o.priceCents).sort((a, b) => a - b);
  return {
    observationCount: observations.length,
    lowCents: prices[0] as number,
    highCents: prices[prices.length - 1] as number,
    typicalCents: Math.round(median(prices)),
    atRecordedLow: currentCents <= (prices[0] as number),
  };
}

/**
 * DISCOUNT STRENGTH — how far below its TYPICAL recorded price this sits.
 * Measured against our own median, never against a retailer's claim.
 */
export function discountStrength(
  observations: readonly PriceObservation[],
  currentCents: number,
): number | null {
  const s = summarise(observations, currentCents);
  if (!s || s.typicalCents <= 0) return null;
  const off = (s.typicalCents - currentCents) / s.typicalCents;
  if (off <= 0) return 0;
  return Math.min(1, off / FULL_DISCOUNT_AT);
}

/**
 * HISTORICAL PRICE QUALITY — where today's price sits in the recorded range.
 * 1.0 at or below the recorded low, 0.0 at the recorded high.
 */
export function historicalPriceQuality(
  observations: readonly PriceObservation[],
  currentCents: number,
): number | null {
  const s = summarise(observations, currentCents);
  if (!s) return null;
  if (s.highCents === s.lowCents) return null; // a flat price says nothing
  if (currentCents <= s.lowCents) return 1;
  if (currentCents >= s.highCents) return 0;
  return 1 - (currentCents - s.lowCents) / (s.highCents - s.lowCents);
}

/**
 * PROMOTION RARITY — what share of recorded observations were more expensive
 * than today. A price we see constantly scores near zero however large the
 * retailer's advertised discount is.
 */
export function promotionRarity(
  observations: readonly PriceObservation[],
  currentCents: number,
): number | null {
  if (observations.length < MIN_OBSERVATIONS) return null;
  const dearer = observations.filter((o) => o.priceCents > currentCents).length;
  return dearer / observations.length;
}

/**
 * MARKET COMPETITIVENESS — today's price against comparable retailers'
 * current prices for the same product. Null when we have no comparison.
 */
export function marketCompetitiveness(
  currentCents: number,
  competitorCents: readonly number[],
): number | null {
  const others = competitorCents.filter((c) => c > 0);
  if (others.length === 0) return null;
  const beaten = others.filter((c) => c > currentCents).length;
  return beaten / others.length;
}

/** INVENTORY BREADTH — share of recent observations that were in stock. */
export function inventoryBreadth(observations: readonly PriceObservation[]): number | null {
  if (observations.length === 0) return null;
  return observations.filter((o) => o.inStock).length / observations.length;
}

/** Whole days between an ISO instant and a supplied `now` (never Date.now()). */
export function daysBetween(iso: string, now: Date): number {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}
