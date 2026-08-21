import type { Deal, CategorySlug, Retailer } from '@/domain/types';

/**
 * The contract both adapters satisfy.
 *
 * Asynchronous even for the in-memory adapter, so no surface above this line
 * can tell which one is serving — and swapping to Postgres never becomes a
 * refactor of every page.
 */
export interface DealRepository {
  getDeals(category?: CategorySlug): Promise<Deal[]>;
  getDeal(slug: string): Promise<Deal | null>;
  getStandout(): Promise<Deal | null>;
  getMadeTheCut(): Promise<Deal[]>;
  getWeWouldHold(): Promise<Deal[]>;
  getWithheld(): Promise<Deal[]>;
  getRetailers(): Promise<Retailer[]>;
  searchDeals(query: string): Promise<Deal[]>;
}

/** Shared selection rules, so both adapters classify a deal identically. */
export const selectors = {
  /** Reserved for genuinely exceptional value. Never filled to fill a slot. */
  isStandout: (d: Deal): boolean =>
    d.publishable && d.index.scorable && d.index.band === 'EXCEPTIONAL' && d.confidence.level === 'HIGH',

  madeTheCut: (d: Deal): boolean => d.publishable && d.index.scorable && d.index.score >= 6,

  weWouldHold: (d: Deal): boolean =>
    d.publishable && ['HOLD', 'SKIP'].includes(d.recommendation.recommendation),

  withheld: (d: Deal): boolean => !d.publishable,

  byScoreDesc: (a: Deal, b: Deal): number => {
    const sa = a.publishable && a.index.scorable ? a.index.score : -1;
    const sb = b.publishable && b.index.scorable ? b.index.score : -1;
    return sb - sa;
  },

  matchesQuery: (d: Deal, q: string): boolean =>
    [d.offer.product.name, d.offer.product.brand, d.offer.retailer.name, d.offer.product.category]
      .join(' ')
      .toLowerCase()
      .includes(q),
};
