/**
 * RETAILER PROMOTION CONTEXT (PRD §43).
 *
 * A scorecard for one retailer, computed entirely from prices we recorded
 * ourselves. This is the thing only this product can say: not "they have
 * sales", which every site says, but "here is how their sales have actually
 * behaved against our own record".
 *
 * Two constraints shaped it:
 *
 *   It is a judgement about a named business, so it must be defensible. Every
 *   figure below is a count or a share of offers WE tracked, never an opinion
 *   dressed as data, and the verdict is derived from those figures rather than
 *   written separately.
 *
 *   It must refuse to speak on thin evidence. A retailer we have watched twice
 *   gets no verdict at all — characterising a business from two data points
 *   would be exactly the kind of confident guess this product exists to avoid.
 */
import type { Deal } from './types';

/** Below this many scored offers we decline to characterise a retailer. */
export const MIN_OFFERS_FOR_VERDICT = 4;

export type RetailerVerdict =
  | 'GENUINE_DISCOUNTS'
  | 'MIXED'
  | 'SHALLOW_DISCOUNTS'
  | 'NOT_ENOUGH_EVIDENCE';

export interface RetailerProfile {
  offersTracked: number;
  /** Offers we currently publish a score for. */
  offersScored: number;
  /** Of those, how many sit at or near the lowest price we have recorded. */
  atRecordedLow: number;
  /** Of those, how many we would currently tell somebody to hold or skip. */
  wouldHold: number;
  /** Median Value Index across scored offers, or null when there are none. */
  medianIndex: number | null;
  /** Total observations behind everything above — the weight of the evidence. */
  observations: number;
  verdict: RetailerVerdict;
  /** One sentence, derived from the figures rather than written about them. */
  summary: string;
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
};

export function profileRetailer(deals: readonly Deal[]): RetailerProfile {
  const scored = deals.filter((d) => d.publishable && d.index.scorable);
  const indexes = scored.map((d) => (d.index.scorable ? d.index.score : 0));

  const atLow = scored.filter((d) => d.history?.atRecordedLow).length;
  const hold = scored.filter((d) =>
    ['HOLD', 'SKIP'].includes(d.recommendation.recommendation),
  ).length;
  const observations = deals.reduce((sum, d) => sum + d.offer.observations.length, 0);
  const med = median(indexes);

  const profile = {
    offersTracked: deals.length,
    offersScored: scored.length,
    atRecordedLow: atLow,
    wouldHold: hold,
    medianIndex: med === null ? null : Math.round(med * 10) / 10,
    observations,
  };

  if (scored.length < MIN_OFFERS_FOR_VERDICT) {
    return {
      ...profile,
      verdict: 'NOT_ENOUGH_EVIDENCE',
      summary:
        `We have only scored ${scored.length} ${scored.length === 1 ? 'offer' : 'offers'} here, ` +
        'which is not enough to say anything about how this retailer prices.',
    };
  }

  const holdShare = hold / scored.length;

  if (holdShare >= 0.5) {
    return {
      ...profile,
      verdict: 'SHALLOW_DISCOUNTS',
      summary:
        `Of the ${scored.length} offers we score here, we would currently hold off on ` +
        `${hold}. Against our own record their promotions tend to be shallower than they look.`,
    };
  }

  if (holdShare <= 0.2 && med !== null && med >= 8) {
    return {
      ...profile,
      verdict: 'GENUINE_DISCOUNTS',
      summary:
        `Prices here have generally held up against what we have recorded — a median Value ` +
        `Index of ${profile.medianIndex} across ${scored.length} offers.`,
    };
  }

  return {
    ...profile,
    verdict: 'MIXED',
    summary:
      `A mixed picture: ${scored.length - hold} of ${scored.length} offers we score here are ` +
      'worth considering, and the rest we would hold off on.',
  };
}
