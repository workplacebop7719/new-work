/**
 * BUY / HOLD™ (PRD §18) and WHY IT'S WORTH IT (PRD §19).
 *
 * The recommendation is a pure function of three things: the Value Index,
 * the Confidence behind it, and whether the Index is publishable at all.
 *
 * There is no parameter here for commission, sponsorship, retailer tier or
 * campaign. A retailer with no affiliate relationship and a retailer paying
 * the highest rate produce identical output from identical evidence — that
 * is enforced by a test, not by convention (§52).
 */
import type { ValueBand, Contribution, ComponentKey } from './value-index';
import type { ConfidenceLevel } from './confidence';

export type Recommendation =
  | 'STRONG_BUY'
  | 'BUY'
  | 'GOOD_VALUE'
  | 'CONSIDER'
  | 'HOLD'
  | 'SKIP'
  | 'NO_CALL';

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  STRONG_BUY: 'Strong Buy',
  BUY: 'Buy',
  GOOD_VALUE: 'Good Value',
  CONSIDER: 'Consider',
  HOLD: 'Hold',
  SKIP: 'Skip',
  NO_CALL: 'No call yet',
};

/** One line each, in BARGENATION's voice: plural, plain, never salesy (§72). */
export const RECOMMENDATION_LINE: Record<Recommendation, string> = {
  STRONG_BUY: "This is materially stronger than this retailer's usual promotion.",
  BUY: 'This price holds up against what we’ve recorded.',
  GOOD_VALUE: 'A fair price, though we’ve seen it move lower.',
  CONSIDER: 'Reasonable, but it depends how much you need it now.',
  HOLD: 'The promotion looks attractive. The price isn’t unusually strong yet.',
  SKIP: 'There are better-value alternatives right now.',
  NO_CALL: 'We haven’t recorded enough to call this one.',
};

const POSITIVE: Record<ComponentKey, string> = {
  historicalPriceQuality: 'Near its recent verified low.',
  promotionRarity: "Stronger than this retailer's usual promotion.",
  marketCompetitiveness: 'Competitive against comparable retailers.',
  discountStrength: 'A real drop from its recorded reference price.',
  seasonality: 'Good timing for this category.',
  shopperRelevance: 'Matches something you’re watching.',
  stackability: 'Can be combined with other savings.',
  inventoryBreadth: 'Widely available across sizes.',
};

const NEGATIVE: Record<ComponentKey, string> = {
  historicalPriceQuality: 'We’ve recorded this cheaper before.',
  promotionRarity: 'This retailer runs this promotion often.',
  marketCompetitiveness: 'Other retailers are close or cheaper.',
  discountStrength: 'The discount is smaller than it looks.',
  seasonality: 'This category usually gets cheaper later.',
  shopperRelevance: 'Not close to anything you’re watching.',
  stackability: 'Can’t be combined with other savings.',
  inventoryBreadth: 'Limited sizes or variants left.',
};

export interface RecommendationInput {
  band: ValueBand;
  confidence: ConfidenceLevel;
  publishable: boolean;
  contributions: readonly Contribution[];
}

export interface RecommendationResult {
  recommendation: Recommendation;
  label: string;
  line: string;
  /** WHY IT'S WORTH IT — at most three, strongest first (§19). */
  worthIt: string[];
  /** what argues against it; drives "what we'd hold off buying" (§39). */
  againstIt: string[];
  /** set when confidence forced a more cautious call than the Index alone */
  moderatedByConfidence: boolean;
}

const FROM_BAND: Record<ValueBand, Recommendation> = {
  EXCEPTIONAL: 'STRONG_BUY',
  STRONG_BUY: 'BUY',
  GOOD_VALUE: 'GOOD_VALUE',
  CONSIDER: 'CONSIDER',
  HOLD: 'HOLD',
  SKIP: 'SKIP',
};

/** Order used only to compare caution, never to average anything. */
const CAUTION_ORDER: Recommendation[] = ['SKIP', 'HOLD', 'CONSIDER', 'GOOD_VALUE', 'BUY', 'STRONG_BUY'];

export function recommend(input: RecommendationInput): RecommendationResult {
  const strong = [...input.contributions]
    .filter((c) => c.value >= 0.7)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((c) => POSITIVE[c.key]);

  const weak = [...input.contributions]
    .filter((c) => c.value <= 0.35)
    .sort((a, b) => b.effectiveWeight - a.effectiveWeight)
    .slice(0, 3)
    .map((c) => NEGATIVE[c.key]);

  if (!input.publishable) {
    return {
      recommendation: 'NO_CALL',
      label: RECOMMENDATION_LABEL.NO_CALL,
      line: RECOMMENDATION_LINE.NO_CALL,
      worthIt: [],
      againstIt: weak,
      moderatedByConfidence: false,
    };
  }

  const fromBand = FROM_BAND[input.band];
  let final = fromBand;

  // Thin evidence may only make us MORE cautious, never less. A LOW-confidence
  // deal cannot carry a Buy call; a MODERATE one cannot carry Strong Buy.
  if (input.confidence === 'LOW') {
    const cap = CAUTION_ORDER.indexOf('CONSIDER');
    if (CAUTION_ORDER.indexOf(final) > cap) final = 'CONSIDER';
  } else if (input.confidence === 'MODERATE') {
    const cap = CAUTION_ORDER.indexOf('BUY');
    if (CAUTION_ORDER.indexOf(final) > cap) final = 'BUY';
  }

  return {
    recommendation: final,
    label: RECOMMENDATION_LABEL[final],
    line: RECOMMENDATION_LINE[final],
    worthIt: strong,
    againstIt: weak,
    moderatedByConfidence: final !== fromBand,
  };
}
