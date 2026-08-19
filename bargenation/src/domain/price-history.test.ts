import { describe, it, expect } from 'vitest';
import {
  summarise, discountStrength, historicalPriceQuality, promotionRarity,
  marketCompetitiveness, inventoryBreadth, daysBetween, MIN_OBSERVATIONS,
  type PriceObservation,
} from './price-history';

const obs = (prices: number[], inStock = true): PriceObservation[] =>
  prices.map((p, i) => ({
    priceCents: p,
    observedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
    inStock,
  }));

describe('thin history refuses to characterise itself', () => {
  const few = obs([1000, 1100, 1050, 990]); // 4 < MIN_OBSERVATIONS
  it('has fewer than the minimum observations', () => {
    expect(few.length).toBeLessThan(MIN_OBSERVATIONS);
  });
  it.each([
    ['summarise', () => summarise(few, 900)],
    ['discountStrength', () => discountStrength(few, 900)],
    ['historicalPriceQuality', () => historicalPriceQuality(few, 900)],
    ['promotionRarity', () => promotionRarity(few, 900)],
  ])('%s returns null rather than guessing', (_n, fn) => {
    expect(fn()).toBeNull();
  });
});

describe('discountStrength measures against our own median, not a claim', () => {
  const history = obs([2000, 2000, 2000, 2000, 2000, 2000]);
  it('is 0 when today matches the typical recorded price', () => {
    expect(discountStrength(history, 2000)).toBe(0);
  });
  it('is 0 when today is ABOVE typical — never negative', () => {
    expect(discountStrength(history, 2600)).toBe(0);
  });
  it('reaches 1.0 at half the typical price', () => {
    expect(discountStrength(history, 1000)).toBe(1);
  });
  it('is 0.5 at a quarter off', () => {
    expect(discountStrength(history, 1500)).toBeCloseTo(0.5, 5);
  });
  it('ignores a retailer inflating its own "was" price', () => {
    // The retailer claims $80 was $200. Our record says it is always $80.
    const alwaysEighty = obs([8000, 8000, 8000, 8000, 8000, 8000]);
    expect(discountStrength(alwaysEighty, 8000)).toBe(0);
  });
});

describe('historicalPriceQuality places today in the recorded range', () => {
  const history = obs([1000, 1200, 1400, 1600, 1800, 2000]);
  it('is 1.0 at or below the recorded low', () => {
    expect(historicalPriceQuality(history, 1000)).toBe(1);
    expect(historicalPriceQuality(history, 800)).toBe(1);
  });
  it('is 0 at or above the recorded high', () => {
    expect(historicalPriceQuality(history, 2000)).toBe(0);
    expect(historicalPriceQuality(history, 2500)).toBe(0);
  });
  it('is 0.5 at the midpoint of the range', () => {
    expect(historicalPriceQuality(history, 1500)).toBeCloseTo(0.5, 5);
  });
  it('returns null for a price that has never moved', () => {
    expect(historicalPriceQuality(obs([500, 500, 500, 500, 500, 500]), 500)).toBeNull();
  });
});

describe('promotionRarity punishes a permanent sale', () => {
  it('is near zero when this price is the retailer’s normal price', () => {
    const alwaysOnSale = obs([1000, 1000, 1000, 1000, 1000, 1000]);
    expect(promotionRarity(alwaysOnSale, 1000)).toBe(0);
  });
  it('is 1.0 when today undercuts everything recorded', () => {
    expect(promotionRarity(obs([2000, 2100, 2200, 2300, 2400, 2500]), 1500)).toBe(1);
  });
  it('is the share of observations that were dearer', () => {
    // 3 of 6 recorded prices are above 1500
    expect(promotionRarity(obs([1000, 1200, 1400, 1600, 1800, 2000]), 1500)).toBeCloseTo(0.5, 5);
  });
});

describe('other components', () => {
  it('marketCompetitiveness is null without comparisons', () => {
    expect(marketCompetitiveness(1000, [])).toBeNull();
  });
  it('marketCompetitiveness is 1.0 when we beat every comparable retailer', () => {
    expect(marketCompetitiveness(900, [1000, 1100, 1200])).toBe(1);
  });
  it('marketCompetitiveness is 0 when everyone else is cheaper', () => {
    expect(marketCompetitiveness(1300, [1000, 1100, 1200])).toBe(0);
  });
  it('inventoryBreadth reflects recorded stock', () => {
    expect(inventoryBreadth([...obs([1, 1, 1], true), ...obs([1], false)])).toBeCloseTo(0.75, 5);
  });
  it('daysBetween uses the supplied clock, never Date.now()', () => {
    const now = new Date('2026-01-11T00:00:00Z');
    expect(daysBetween('2026-01-01T00:00:00Z', now)).toBe(10);
    expect(daysBetween('not-a-date', now)).toBe(Number.POSITIVE_INFINITY);
  });
});
