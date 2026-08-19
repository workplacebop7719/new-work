import { describe, it, expect } from 'vitest';
import {
  WEIGHTS,
  computeValueIndex,
  bandFor,
  toOneDecimal,
  type ValueComponents,
  type ComponentKey,
} from './value-index';

const all = (v: number | null): ValueComponents => ({
  discountStrength: v,
  historicalPriceQuality: v,
  promotionRarity: v,
  marketCompetitiveness: v,
  shopperRelevance: v,
  stackability: v,
  seasonality: v,
  inventoryBreadth: v,
});

describe('weights', () => {
  it('sum to exactly 1.0', () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(toOneDecimal(sum * 100)).toBe(100);
  });

  it('match the PRD §16 table exactly', () => {
    expect(WEIGHTS).toEqual({
      discountStrength: 0.24,
      historicalPriceQuality: 0.22,
      promotionRarity: 0.16,
      marketCompetitiveness: 0.14,
      shopperRelevance: 0.1,
      stackability: 0.07,
      seasonality: 0.04,
      inventoryBreadth: 0.03,
    });
  });

  // The load-bearing negative test for PRD §16 and §52.
  it('contain NO urgency, affiliate, commission or sponsorship input', () => {
    const keys = Object.keys(WEIGHTS);
    expect(keys).toHaveLength(8);
    for (const forbidden of [
      'urgency', 'expiry', 'deadline', 'scarcity',
      'affiliate', 'commission', 'payout', 'sponsored', 'sponsorship', 'revenue', 'epc',
    ]) {
      expect(keys.some((k) => k.toLowerCase().includes(forbidden))).toBe(false);
    }
  });
});

describe('scoring', () => {
  it('perfect evidence scores 10.0 EXCEPTIONAL', () => {
    const r = computeValueIndex(all(1));
    expect(r.scorable).toBe(true);
    if (!r.scorable) return;
    expect(r.score).toBe(10);
    expect(r.band).toBe('EXCEPTIONAL');
    expect(r.coverage).toBe(1);
  });

  it('worst evidence scores 0.0 SKIP', () => {
    const r = computeValueIndex(all(0));
    if (!r.scorable) throw new Error('expected scorable');
    expect(r.score).toBe(0);
    expect(r.band).toBe('SKIP');
  });

  it('is deterministic across repeated calls', () => {
    const input: ValueComponents = {
      discountStrength: 0.82, historicalPriceQuality: 0.91, promotionRarity: 0.44,
      marketCompetitiveness: 0.67, shopperRelevance: 0.5, stackability: 0.2,
      seasonality: 0.75, inventoryBreadth: 0.33,
    };
    const runs = Array.from({ length: 25 }, () => JSON.stringify(computeValueIndex(input)));
    expect(new Set(runs).size).toBe(1);
  });

  it('clamps out-of-range inputs instead of letting them distort the scale', () => {
    const over = computeValueIndex(all(4));
    const under = computeValueIndex(all(-9));
    if (!over.scorable || !under.scorable) throw new Error('expected scorable');
    expect(over.score).toBe(10);
    expect(under.score).toBe(0);
  });

  it('publishes contributions that reconstruct the score', () => {
    const r = computeValueIndex({
      ...all(0.5), discountStrength: 1, inventoryBreadth: 0,
    });
    if (!r.scorable) throw new Error('expected scorable');
    const rebuilt = toOneDecimal(r.contributions.reduce((s, c) => s + c.points, 0));
    expect(rebuilt).toBe(r.score);
  });
});

describe('missing evidence (PRD §16 renormalisation)', () => {
  it('excludes unmeasurable components and renormalises the rest', () => {
    const r = computeValueIndex({ ...all(null), discountStrength: 1, historicalPriceQuality: 1 });
    if (!r.scorable) throw new Error('expected scorable');
    expect(r.excluded).toHaveLength(6);
    expect(r.score).toBe(10);
    // coverage is the honest signal that this 10.0 rests on 46% of the model
    expect(toOneDecimal(r.coverage * 100)).toBe(46);
  });

  it('treats null as unmeasured, NOT as a zero score', () => {
    const nulled = computeValueIndex({ ...all(1), seasonality: null });
    const zeroed = computeValueIndex({ ...all(1), seasonality: 0 });
    if (!nulled.scorable || !zeroed.scorable) throw new Error('expected scorable');
    expect(nulled.score).toBe(10);
    expect(zeroed.score).toBeLessThan(10);
  });

  it('refuses to score when nothing at all is measurable', () => {
    const r = computeValueIndex(all(null));
    expect(r.scorable).toBe(false);
    if (r.scorable) return;
    expect(r.reason).toBe('no-measurable-components');
  });

  it('ignores NaN and Infinity rather than producing a NaN score', () => {
    const r = computeValueIndex({ ...all(0.5), discountStrength: NaN, seasonality: Infinity });
    if (!r.scorable) throw new Error('expected scorable');
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.excluded).toContain<ComponentKey>('discountStrength');
    expect(r.excluded).toContain<ComponentKey>('seasonality');
  });

  /**
   * Documents the known trade-off in renormalisation: dropping a component
   * that scored badly RAISES the Index. That is unavoidable arithmetic, and
   * it is exactly why `coverage` is published and why the publication gate
   * in confidence.ts refuses a headline Index on thin evidence.
   */
  it('shows that hiding a weak component raises the score — hence the coverage gate', () => {
    const withWeak = computeValueIndex({ ...all(1), marketCompetitiveness: 0 });
    const hidden = computeValueIndex({ ...all(1), marketCompetitiveness: null });
    if (!withWeak.scorable || !hidden.scorable) throw new Error('expected scorable');
    expect(hidden.score).toBeGreaterThan(withWeak.score);
    expect(hidden.coverage).toBeLessThan(withWeak.coverage);
  });
});

describe('bands', () => {
  it.each([
    [10, 'EXCEPTIONAL'], [9.0, 'EXCEPTIONAL'], [8.99, 'EXCEPTIONAL'],
    [8.94, 'STRONG_BUY'], [8.0, 'STRONG_BUY'],
    [7.0, 'GOOD_VALUE'], [6.0, 'CONSIDER'],
    [5.9, 'HOLD'], [4.0, 'HOLD'],
    [3.94, 'SKIP'], [0, 'SKIP'],
    // 3.99 displays as 4.0, so it must read HOLD — same rule as 8.96 above.
    [3.99, 'HOLD'],
  ])('%s reads %s', (score, expected) => {
    expect(bandFor(score)).toBe(expected);
  });

  it('never contradicts the displayed number at a rounding boundary', () => {
    // 8.96 prints as 9.0, so it must read EXCEPTIONAL, not STRONG BUY.
    expect(toOneDecimal(8.96)).toBe(9);
    expect(bandFor(8.96)).toBe('EXCEPTIONAL');
  });
});
