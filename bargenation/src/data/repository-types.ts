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

/* ============================================================
   SORTING A LIST OF DEALS
   ============================================================ */

/**
 * The orders a browse page offers.
 *
 * Deliberately three, not eight. Every extra option is one more thing to read
 * before you can start looking, and these cover the three questions people
 * actually arrive with: what is worth buying, what is cheap, and what is new.
 *
 * There is no "sort by discount percentage", which is the one every other
 * deals site leads with. A big percentage off an invented "was" price is
 * exactly the claim this product exists not to repeat.
 */
export const SORT_ORDERS = [
  { key: 'value', label: 'Best value first' },
  { key: 'price', label: 'Cheapest first' },
  { key: 'recent', label: 'Most recently checked' },
] as const;

export type SortKey = (typeof SORT_ORDERS)[number]['key'];

export const DEFAULT_SORT: SortKey = 'value';

/** Anything unrecognised falls back rather than erroring — it is a query string. */
export const toSortKey = (value: unknown): SortKey =>
  SORT_ORDERS.some((order) => order.key === value) ? (value as SortKey) : DEFAULT_SORT;

/**
 * Sorts a copy, never in place.
 *
 * Unscorable deals sink to the bottom of every order rather than being hidden.
 * They are still real offers and somebody may want them; what they must not do
 * is sit above a deal we can actually stand behind.
 */
export function sortDeals(deals: readonly Deal[], key: SortKey): Deal[] {
  const scored = (deal: Deal) =>
    deal.publishable && deal.index.scorable ? deal.index.score : -1;

  const compare: Record<SortKey, (a: Deal, b: Deal) => number> = {
    value: (a, b) => scored(b) - scored(a),
    price: (a, b) => a.offer.priceCents - b.offer.priceCents,
    recent: (a, b) =>
      new Date(b.offer.lastVerifiedAt).getTime() - new Date(a.offer.lastVerifiedAt).getTime(),
  };

  // Product slug breaks every tie, so the same list never comes back in a
  // different order between two renders of the same page.
  return [...deals].sort(
    (a, b) => compare[key](a, b) || a.offer.product.slug.localeCompare(b.offer.product.slug),
  );
}
