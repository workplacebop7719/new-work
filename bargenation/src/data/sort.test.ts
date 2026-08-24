/**
 * Sorting a browse page.
 *
 * The valuable test is that an unscorable deal never floats above one we can
 * stand behind, whatever order is chosen — and that a query string nobody
 * wrote cannot break the page.
 */
import { describe, it, expect } from 'vitest';
import { sortDeals, toSortKey, SORT_ORDERS, DEFAULT_SORT } from './repository-types';
import { scoreOffer } from '@/domain/score-offer';
import { SOURCE_TIER } from '@/domain/confidence';
import type { Deal, Offer } from '@/domain/types';

const NOW = new Date('2026-08-24T12:00:00Z');

function make(
  slug: string,
  prices: number[],
  opts: { priceCents?: number; verifiedDaysAgo?: number } = {},
): Deal {
  const observations = prices.map((price, i) => ({
    priceCents: price,
    inStock: true,
    observedAt: new Date(NOW.getTime() - (prices.length - i) * 86_400_000).toISOString(),
  }));
  const offer: Offer = {
    id: `offer-${slug}`,
    product: { slug, name: slug, brand: 'B', category: 'home' },
    retailer: { slug: 'r', name: 'R', verifiedPartner: false },
    priceCents: opts.priceCents ?? prices[prices.length - 1]!,
    currency: 'USD',
    lastVerifiedAt: new Date(
      NOW.getTime() - (opts.verifiedDaysAgo ?? 0) * 86_400_000,
    ).toISOString(),
    sourceTier: SOURCE_TIER.RETAILER_API,
    observations,
    competitorPriceCents: [5200, 5400],
    daysUntilOfferEnds: null,
    limitedStock: null,
    inStock: true,
    dataMode: 'FIXTURE',
  };
  return scoreOffer(offer, NOW);
}

/** A long fall to a genuine low — scores highly. */
const strong = (slug: string, end = 3000) =>
  make(slug, [...Array.from({ length: 40 }, (_, i) => 9000 - i * 20), end]);

/** Too little history to publish a score at all. */
const unscorable = (slug: string, priceCents = 100) =>
  make(slug, [9000, 5000, priceCents], { priceCents });

describe('choosing an order', () => {
  it('accepts every order the UI offers', () => {
    for (const order of SORT_ORDERS) {
      expect(toSortKey(order.key)).toBe(order.key);
    }
  });

  it.each([
    ['nothing', undefined],
    ['an empty string', ''],
    ['something invented', 'discount'],
    ['a number', 42],
    ['an object', {}],
  ])('falls back for %s rather than breaking the page', (_label, value) => {
    expect(toSortKey(value)).toBe(DEFAULT_SORT);
  });

  it('defaults to best value, because that is the product', () => {
    expect(DEFAULT_SORT).toBe('value');
  });

  /**
   * There is deliberately no "sort by discount percentage". A big percentage
   * off an invented "was" price is the exact claim this product exists not to
   * repeat.
   */
  it('offers no discount-percentage order', () => {
    expect(SORT_ORDERS.map((o) => o.key)).not.toContain('discount');
  });
});

describe('ordering', () => {
  it('puts the best value first', () => {
    const deals = [strong('weak', 8000), strong('best', 2000), strong('middle', 5000)];
    const order = sortDeals(deals, 'value').map((d) => d.offer.product.slug);
    expect(order[0]).toBe('best');
  });

  it('puts the cheapest first', () => {
    const deals = [strong('mid', 5000), strong('dear', 8000), strong('cheap', 2000)];
    expect(sortDeals(deals, 'price').map((d) => d.offer.product.slug))
      .toEqual(['cheap', 'mid', 'dear']);
  });

  it('puts the most recently checked first', () => {
    const deals = [
      make('stale', [5000, 4000], { verifiedDaysAgo: 10 }),
      make('fresh', [5000, 4000], { verifiedDaysAgo: 0 }),
      make('middling', [5000, 4000], { verifiedDaysAgo: 3 }),
    ];
    expect(sortDeals(deals, 'recent').map((d) => d.offer.product.slug))
      .toEqual(['fresh', 'middling', 'stale']);
  });

  /**
   * THE ONE THAT MATTERS. A deal we cannot score is still a real offer and is
   * not hidden — but it must never sit above one we can stand behind, in any
   * order. Sorting by price is where this bites: an unscorable offer at one
   * dollar would otherwise lead the page.
   */
  it('never floats an unscorable deal above a scored one when sorting by value', () => {
    const deals = [unscorable('mystery'), strong('known')];
    expect(sortDeals(deals, 'value')[0]!.offer.product.slug).toBe('known');
  });

  it('does not hide unscorable deals — they are still real offers', () => {
    const deals = [unscorable('mystery'), strong('known')];
    expect(sortDeals(deals, 'value')).toHaveLength(2);
    expect(sortDeals(deals, 'price')).toHaveLength(2);
  });

  it('sorts a copy, leaving the caller’s list alone', () => {
    const deals = [strong('b', 8000), strong('a', 2000)];
    const before = deals.map((d) => d.offer.product.slug);
    sortDeals(deals, 'price');
    expect(deals.map((d) => d.offer.product.slug)).toEqual(before);
  });

  /** Two renders of the same page must not disagree about the order. */
  it('is deterministic when two deals tie', () => {
    const deals = [strong('bravo', 3000), strong('alpha', 3000)];
    const first = sortDeals(deals, 'value').map((d) => d.offer.product.slug);
    const second = sortDeals([...deals].reverse(), 'value').map((d) => d.offer.product.slug);
    expect(first).toEqual(second);
    expect(first).toEqual(['alpha', 'bravo']);
  });

  it('handles an empty list', () => {
    for (const order of SORT_ORDERS) {
      expect(sortDeals([], order.key)).toEqual([]);
    }
  });
});
