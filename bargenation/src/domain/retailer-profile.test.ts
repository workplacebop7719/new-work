import { describe, it, expect } from 'vitest';
import { profileRetailer, MIN_OFFERS_FOR_VERDICT } from './retailer-profile';
import { scoreOffer } from './score-offer';
import { SOURCE_TIER } from './confidence';
import type { Deal, Offer } from './types';

const NOW = new Date('2026-08-22T12:00:00Z');

function make(slug: string, prices: number[], competitors: number[] = []): Deal {
  const observations = prices.map((p, i) => ({
    priceCents: p,
    inStock: true,
    observedAt: new Date(NOW.getTime() - (prices.length - i) * 86_400_000).toISOString(),
  }));
  const offer: Offer = {
    id: slug,
    product: { slug, name: slug, brand: 'B', category: 'home' },
    retailer: { slug: 'r', name: 'A Retailer', verifiedPartner: false },
    priceCents: prices[prices.length - 1]!,
    currency: 'USD',
    lastVerifiedAt: NOW.toISOString(),
    sourceTier: SOURCE_TIER.RETAILER_API,
    observations,
    competitorPriceCents: competitors,
    daysUntilOfferEnds: null,
    limitedStock: null,
    inStock: true,
    dataMode: 'FIXTURE',
  };
  return scoreOffer(offer, NOW);
}

/** A long fall to a genuine low. */
const genuine = (slug: string) =>
  make(slug, [...Array.from({ length: 40 }, (_, i) => 9000 - i * 20), 3000]);

/**
 * A "sale" price that is actually ABOVE what this retailer normally charges —
 * the shape the Bento Lunch Set has in the real fixtures, and the clearest
 * case of a discount that is not one.
 *
 * The gap has to clear MEANINGFUL_RANGE_FRACTION for this to be readable at
 * all. It used to be $50.00 rising to $52.00, a 4% move, which the scoring
 * model now declines to judge — correctly, but it made this fixture test the
 * refusal rather than the verdict. $48.00 rising to $54.00 is the same story
 * told loudly enough to be evidence.
 */
const shallow = (slug: string) =>
  make(slug, [...Array.from({ length: 40 }, () => 4800), 5400]);

describe('a retailer we barely know gets no verdict', () => {
  it('declines below the evidence threshold', () => {
    const p = profileRetailer([genuine('a'), genuine('b')]);
    expect(p.verdict).toBe('NOT_ENOUGH_EVIDENCE');
    expect(p.summary).toMatch(/not enough/i);
  });

  it('declines for a retailer with nothing scored at all', () => {
    const thin = make('t', [9000, 4000]); // too little history to publish
    expect(thin.publishable).toBe(false);
    const p = profileRetailer([thin, thin, thin, thin, thin]);
    expect(p.verdict).toBe('NOT_ENOUGH_EVIDENCE');
    expect(p.offersScored).toBe(0);
  });

  it('counts what it tracked even when it will not judge', () => {
    const p = profileRetailer([genuine('a'), genuine('b')]);
    expect(p.offersTracked).toBe(2);
    expect(p.observations).toBeGreaterThan(0);
  });

  it('needs at least the stated number of scored offers', () => {
    const deals = Array.from({ length: MIN_OFFERS_FOR_VERDICT }, (_, i) => genuine(`g${i}`));
    expect(profileRetailer(deals).verdict).not.toBe('NOT_ENOUGH_EVIDENCE');
  });
});

describe('the verdict follows the figures', () => {
  it('calls out a retailer whose discounts are mostly shallow', () => {
    const deals = Array.from({ length: 6 }, (_, i) => shallow(`s${i}`));
    const p = profileRetailer(deals);
    expect(p.verdict).toBe('SHALLOW_DISCOUNTS');
    // The claim has to be backed by the count it quotes.
    expect(p.summary).toContain(String(p.wouldHold));
  });

  it('credits a retailer whose prices hold up', () => {
    const deals = Array.from({ length: 6 }, (_, i) => genuine(`g${i}`));
    const p = profileRetailer(deals);
    expect(p.verdict).toBe('GENUINE_DISCOUNTS');
    expect(p.medianIndex).toBeGreaterThanOrEqual(8);
  });

  it('says mixed when it is mixed, rather than picking a side', () => {
    // Two of six held: above the 20% that would earn credit, below the 50%
    // that would earn criticism.
    const deals = [
      genuine('a'), genuine('b'), genuine('c'), genuine('d'), shallow('e'), shallow('f'),
    ];
    const p = profileRetailer(deals);
    expect(p.verdict).toBe('MIXED');
  });

  /**
   * A 1% DIP ON AN OTHERWISE FLAT PRICE IS NOT A DEAL, AND WE SAY SO.
   *
   * This test used to pin the opposite. A price flat at $50 for forty days
   * that dipped to $49.50 scored 6.3 — CONSIDER — because three of the four
   * components we could measure rewarded it for being at the recorded low.
   * Discount Strength alone noticed the discount was trivial, and
   * renormalisation diluted even that.
   *
   * It was pinned rather than fixed because whether a 1% dip deserves 6.3 is
   * a product decision. That decision has now been taken: it does not. Being
   * at the bottom of a range that spans one percent is not information about
   * value, so `hasMeaningfulRange` withholds the two components that were
   * reading it as one, coverage falls below the publication gate, and the
   * product declines to publish an Index rather than publishing a flattering
   * one.
   *
   * The refusal is narrow on purpose — the second half of this test proves a
   * genuinely modest discount still scores — and the withheld reason has to
   * name the real cause. Telling somebody we lack history when we hold
   * forty-one observations of their price would be untrue.
   */
  it('declines to score a trivial dip on an otherwise flat price', () => {
    const trivialDip = make('dip', [...Array.from({ length: 40 }, () => 5000), 4950]);
    expect(trivialDip.publishable).toBe(false);
    expect(trivialDip.recommendation.recommendation).toBe('NO_CALL');
    expect(trivialDip.withheldReason).toMatch(/barely moved/i);
    expect(trivialDip.withheldReason).not.toMatch(/enough price history/i);
  });

  it('still scores a modest but real discount rather than refusing everything', () => {
    // An 8% fall: not a headline, but a genuine one, and it clears the bar.
    const modest = make('modest', [...Array.from({ length: 40 }, () => 5000), 4600]);
    expect(modest.publishable).toBe(true);
    if (!modest.index.scorable) throw new Error('expected scorable');
    expect(modest.index.score).toBeGreaterThan(5);
  });

  it('never quotes a median it does not have', () => {
    const p = profileRetailer([]);
    expect(p.medianIndex).toBeNull();
    expect(p.summary).not.toMatch(/median/i);
  });
});

describe('the figures are countable, not opinions', () => {
  it('reports scored offers as a subset of tracked ones', () => {
    const thin = make('t', [9000, 4000]);
    const deals = [...Array.from({ length: 5 }, (_, i) => genuine(`g${i}`)), thin];
    const p = profileRetailer(deals);
    expect(p.offersTracked).toBe(6);
    expect(p.offersScored).toBe(5);
    expect(p.offersScored).toBeLessThanOrEqual(p.offersTracked);
  });

  it('counts offers at their recorded low', () => {
    const deals = Array.from({ length: 5 }, (_, i) => genuine(`g${i}`));
    const p = profileRetailer(deals);
    expect(p.atRecordedLow).toBeGreaterThan(0);
    expect(p.atRecordedLow).toBeLessThanOrEqual(p.offersScored);
  });

  it('is deterministic', () => {
    const deals = Array.from({ length: 5 }, (_, i) => genuine(`g${i}`));
    const runs = Array.from({ length: 10 }, () => JSON.stringify(profileRetailer(deals)));
    expect(new Set(runs).size).toBe(1);
  });
});
