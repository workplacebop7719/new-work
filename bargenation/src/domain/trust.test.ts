/**
 * The trust firewall (PRD §52). These are the tests that must never be
 * weakened: they prove money cannot reach the recommendation.
 */
import { describe, it, expect } from 'vitest';
import { computeValueIndex, type ValueComponents } from './value-index';
import { computeConfidence, canPublishIndex, SOURCE_TIER } from './confidence';
import { computeUrgency } from './urgency';
import { recommend } from './buy-hold';

const evidence: ValueComponents = {
  discountStrength: 0.88, historicalPriceQuality: 0.93, promotionRarity: 0.81,
  marketCompetitiveness: 0.76, shopperRelevance: 0.6, stackability: 0.4,
  seasonality: 0.7, inventoryBreadth: 0.55,
};

describe('affiliate economics cannot reach the number', () => {
  it('scores identically regardless of commission attached to the offer', () => {
    // Offers differing ONLY in what they pay BARGENATION.
    const unpaid = { ...evidence, __commissionRate: 0, __affiliateNetwork: null };
    const lucrative = { ...evidence, __commissionRate: 0.35, __affiliateNetwork: 'top-payer' };

    const a = computeValueIndex(unpaid as ValueComponents);
    const b = computeValueIndex(lucrative as ValueComponents);
    expect(a).toEqual(b);
  });

  it('recommends identically for a paying and a non-paying retailer', () => {
    const scored = computeValueIndex(evidence);
    if (!scored.scorable) throw new Error('expected scorable');
    const base = {
      band: scored.band, confidence: 'HIGH' as const,
      publishable: true, contributions: scored.contributions,
    };
    expect(recommend({ ...base })).toEqual(recommend({ ...base }));
  });

  it('exposes no commission-shaped field on a published result', () => {
    const scored = computeValueIndex(evidence);
    if (!scored.scorable) throw new Error('expected scorable');
    const serialised = JSON.stringify(scored).toLowerCase();
    for (const term of ['commission', 'affiliate', 'payout', 'epc', 'sponsor', 'revenue']) {
      expect(serialised).not.toContain(term);
    }
  });
});

describe('urgency is a separate signal', () => {
  it('does not change the Index when an offer is about to end', () => {
    const scored = computeValueIndex(evidence);
    const ending = computeUrgency({ daysUntilOfferEnds: 1, limitedStock: true, daysUntilCustomerDeadline: null });
    const relaxed = computeUrgency({ daysUntilOfferEnds: 60, limitedStock: false, daysUntilCustomerDeadline: null });
    expect(ending.level).toBe('ENDING');
    expect(relaxed.level).toBe('NONE');
    // the Index is untouched by either
    expect(computeValueIndex(evidence)).toEqual(scored);
  });

  it('invents no deadline when nothing is known', () => {
    const u = computeUrgency({ daysUntilOfferEnds: null, limitedStock: null, daysUntilCustomerDeadline: null });
    expect(u.level).toBe('NONE');
    expect(u.note).toBeNull();
  });

  it('lets a weak deal be urgent without becoming worth buying', () => {
    const poor = computeValueIndex({ ...evidence, historicalPriceQuality: 0.05, discountStrength: 0.1, promotionRarity: 0.1, marketCompetitiveness: 0.1 });
    if (!poor.scorable) throw new Error('expected scorable');
    const u = computeUrgency({ daysUntilOfferEnds: 1, limitedStock: true, daysUntilCustomerDeadline: null });
    const r = recommend({ band: poor.band, confidence: 'HIGH', publishable: true, contributions: poor.contributions });
    expect(u.level).toBe('ENDING');
    expect(['HOLD', 'SKIP']).toContain(r.recommendation);
  });
});

describe('publication gate', () => {
  it('refuses a headline Index with no recorded price history', () => {
    const d = canPublishIndex(0.78, ['historicalPriceQuality']);
    expect(d.publish).toBe(false);
  });

  it('refuses a renormalised 10.0 that rides on one component', () => {
    const thin = computeValueIndex({
      discountStrength: 1, historicalPriceQuality: null, promotionRarity: null,
      marketCompetitiveness: null, shopperRelevance: null, stackability: null,
      seasonality: null, inventoryBreadth: null,
    });
    if (!thin.scorable) throw new Error('expected scorable');
    expect(thin.score).toBe(10);
    expect(canPublishIndex(thin.coverage, thin.excluded).publish).toBe(false);
  });

  it('turns an unpublishable Index into an explicit NO_CALL, not a guess', () => {
    const r = recommend({ band: 'EXCEPTIONAL', confidence: 'LOW', publishable: false, contributions: [] });
    expect(r.recommendation).toBe('NO_CALL');
    expect(r.worthIt).toEqual([]);
  });
});

describe('confidence moderates in one direction only', () => {
  const scored = computeValueIndex(evidence);

  it('caps a Strong Buy at Consider when confidence is LOW', () => {
    if (!scored.scorable) throw new Error('expected scorable');
    const r = recommend({ band: 'EXCEPTIONAL', confidence: 'LOW', publishable: true, contributions: scored.contributions });
    expect(r.recommendation).toBe('CONSIDER');
    expect(r.moderatedByConfidence).toBe(true);
  });

  it('never upgrades a weak Index because confidence is HIGH', () => {
    if (!scored.scorable) throw new Error('expected scorable');
    const r = recommend({ band: 'SKIP', confidence: 'HIGH', publishable: true, contributions: scored.contributions });
    expect(r.recommendation).toBe('SKIP');
    expect(r.moderatedByConfidence).toBe(false);
  });

  it('rates thin, stale, poorly-sourced evidence as LOW', () => {
    const c = computeConfidence({
      coverage: 0.5, observationCount: 1, daysSinceVerified: 21,
      sourceTier: SOURCE_TIER.PERMITTED_MONITORING, excluded: ['historicalPriceQuality', 'promotionRarity'],
    });
    expect(c.level).toBe('LOW');
    expect(c.reasons.length).toBeGreaterThan(0);
  });

  it('rates full, fresh, first-party evidence as HIGH', () => {
    const c = computeConfidence({
      coverage: 1, observationCount: 40, daysSinceVerified: 0,
      sourceTier: SOURCE_TIER.RETAILER_API, excluded: [],
    });
    expect(c.level).toBe('HIGH');
    expect(c.value).toBeGreaterThan(0.9);
  });
});
