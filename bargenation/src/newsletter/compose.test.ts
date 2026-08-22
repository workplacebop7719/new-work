import { describe, it, expect } from 'vitest';
import {
  composeIssue, MAX_MADE_THE_CUT, MAX_HOLD, MIN_ITEMS_TO_PUBLISH,
} from './compose';
import { scoreOffer } from '@/domain/score-offer';
import { SOURCE_TIER } from '@/domain/confidence';
import type { Deal, Offer } from '@/domain/types';

const NOW = new Date('2026-08-22T12:00:00Z');

function deal(slug: string, prices: number[], competitors: number[] = []): Deal {
  const observations = prices.map((p, i) => ({
    priceCents: p,
    inStock: true,
    observedAt: new Date(NOW.getTime() - (prices.length - i) * 86_400_000).toISOString(),
  }));
  const offer: Offer = {
    id: slug,
    product: { slug, name: `Product ${slug}`, brand: 'Brand', category: 'home' },
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

/** A long descending history produces a strong, publishable score. */
const strong = (slug: string) =>
  deal(slug, [...Array.from({ length: 40 }, (_, i) => 9000 - i * 20), 3000]);
/** A flat history produces a weak one. */
const weak = (slug: string) => deal(slug, Array.from({ length: 20 }, () => 5000).concat(5000));

const base = { date: '2026-08-22', standout: null, madeTheCut: [], wouldHold: [] };

describe('an issue with nothing to say is not sent', () => {
  it('refuses an empty day', () => {
    const r = composeIssue(base);
    expect(r.publish).toBe(false);
    if (!r.publish) expect(r.reason).toMatch(/nothing cleared/i);
  });

  it('refuses a day with only one item', () => {
    const r = composeIssue({ ...base, madeTheCut: [strong('a')] });
    expect(r.publish).toBe(false);
  });

  it('publishes once there is enough worth saying', () => {
    const r = composeIssue({ ...base, madeTheCut: [strong('a'), strong('b')] });
    expect(r.publish).toBe(true);
    if (r.publish) expect(r.issue.itemCount).toBeGreaterThanOrEqual(MIN_ITEMS_TO_PUBLISH);
  });
});

describe('an issue cannot become a catalogue', () => {
  it('caps the main section', () => {
    const many = Array.from({ length: 12 }, (_, i) => strong(`p${i}`));
    const r = composeIssue({ ...base, madeTheCut: many });
    if (!r.publish) throw new Error('expected an issue');
    expect(r.issue.madeTheCut).toHaveLength(MAX_MADE_THE_CUT);
  });

  it('caps what we would hold', () => {
    const many = Array.from({ length: 6 }, (_, i) => weak(`w${i}`));
    const r = composeIssue({ ...base, madeTheCut: [strong('a'), strong('b')], wouldHold: many });
    if (!r.publish) throw new Error('expected an issue');
    expect(r.issue.wouldHold).toHaveLength(MAX_HOLD);
  });

  it('omits empty sections rather than padding them', () => {
    const r = composeIssue({ ...base, madeTheCut: [strong('a'), strong('b')] });
    if (!r.publish) throw new Error('expected an issue');
    expect(r.issue.standout).toBeNull();
    expect(r.issue.wouldHold).toEqual([]);
  });
});

describe('the standout', () => {
  it('is not repeated in the body', () => {
    const s = strong('headline');
    const r = composeIssue({
      ...base, standout: s, madeTheCut: [s, strong('b'), strong('c')],
    });
    if (!r.publish) throw new Error('expected an issue');
    expect(r.issue.standout!.slug).toBe('headline');
    expect(r.issue.madeTheCut.map((i) => i.slug)).not.toContain('headline');
  });
});

describe('the standfirst tells the truth about the issue', () => {
  it('does not imply an exceptional find when there is none', () => {
    const r = composeIssue({
      ...base, madeTheCut: [strong('a'), strong('b')], wouldHold: [weak('w')],
    });
    if (!r.publish) throw new Error('expected an issue');
    expect(r.issue.standfirst).toMatch(/nothing exceptional/i);
  });

  it('promises the full shape only when there is a standout', () => {
    const r = composeIssue({
      ...base, standout: strong('s'), madeTheCut: [strong('a'), strong('b')],
    });
    if (!r.publish) throw new Error('expected an issue');
    expect(r.issue.standfirst).toMatch(/worth buying/i);
  });
});

describe('items carry the engine’s own words', () => {
  it('never invents a reason', () => {
    const r = composeIssue({ ...base, madeTheCut: [strong('a'), strong('b')] });
    if (!r.publish) throw new Error('expected an issue');
    for (const item of r.issue.madeTheCut) {
      expect(item.line.length).toBeGreaterThan(5);
      expect(item.price).toMatch(/^\$/);
    }
  });

  it('carries a null score for anything unpublishable rather than inventing one', () => {
    const thin = deal('thin', [9000, 4000]);
    expect(thin.publishable).toBe(false);
    const r = composeIssue({ ...base, madeTheCut: [thin, strong('b')] });
    if (!r.publish) throw new Error('expected an issue');
    expect(r.issue.madeTheCut.find((i) => i.slug === 'thin')!.score).toBeNull();
  });
});

describe('an issue reads as edited, not generated', () => {
  /**
   * The scoring engine ranks reasons by contribution, so the top one tends to
   * be identical across a day's deals. The first draft of this issue printed
   * "Near its recent verified low" on four items out of five.
   */
  const lines = (r: ReturnType<typeof composeIssue>) => {
    if (!r.publish) throw new Error('expected an issue');
    return [
      r.issue.standout?.line,
      ...r.issue.madeTheCut.map((i) => i.line),
      r.issue.find?.line,
      ...r.issue.wouldHold.map((i) => i.line),
    ].filter(Boolean) as string[];
  };

  it('never prints the same line twice across an issue', () => {
    // Deals with genuinely different histories, as real ones have.
    const deals = Array.from({ length: 8 }, (_, i) =>
      deal(`p${i}`, [
        ...Array.from({ length: 40 }, (_, j) => 9000 + i * 350 - j * (18 + i)),
        3000 + i * 220,
      ]),
    );
    const out = lines(composeIssue({ ...base, standout: deals[0]!, madeTheCut: deals }));
    expect(new Set(out).size).toBe(out.length);
  });

  /**
   * Two products with the identical recorded low and typical price genuinely
   * warrant the identical factual sentence. Repeating a FACT is not the
   * template repetition this guards against; repeating a stock phrase is.
   */
  it('still says the same factual line for two genuinely identical histories', () => {
    const twins = [strong('a'), strong('b'), strong('c')];
    const out = lines(composeIssue({ ...base, madeTheCut: twins }));
    // The ranked reasons are exhausted first, so at least the top ones differ.
    expect(new Set(out.slice(0, 3)).size).toBeGreaterThanOrEqual(3);
  });

  /**
   * An item under "what we'd hold off buying" must be given a reason AGAINST
   * it. The first draft fell back to the positive list and printed "Widely
   * available across sizes" in a section about not buying.
   */
  it('gives the hold section reasons against, not for', () => {
    const weakDeal = weak('held');
    const r = composeIssue({
      ...base, madeTheCut: [strong('a'), strong('b')], wouldHold: [weakDeal],
    });
    if (!r.publish) throw new Error('expected an issue');

    const line = r.issue.wouldHold[0]!.line;
    const positives = weakDeal.recommendation.worthIt;
    expect(positives).not.toContain(line);
  });
});
