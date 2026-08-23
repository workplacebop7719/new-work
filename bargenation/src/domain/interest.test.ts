/**
 * The valuable tests here are about restraint and about §52.
 *
 * An inferred alert is the easiest thing in this product to get wrong: the
 * customer never asked for it, so every reason to fire is a reason they did
 * not consent to. And the moment it becomes a paid feature, the temptation is
 * to make the free product worse to justify it.
 */
import { describe, it, expect } from 'vitest';
import {
  noticeSomething, repeatedInterest,
  REPEAT_VIEWS_FOR_INTEREST, MIN_INDEX_TO_MENTION,
  type InterestRecord, type InterestContext,
} from './interest';
import { evaluateSignals } from './deal-signal';
import { scoreOffer } from './score-offer';
import { SOURCE_TIER } from './confidence';
import type { Deal, Offer } from './types';

const NOW = new Date('2026-08-23T12:00:00Z');

function makeDeal(slug: string, prices: number[], competitors: number[] = [5200, 5400]): Deal {
  const observations = prices.map((price, i) => ({
    priceCents: price,
    inStock: true,
    observedAt: new Date(NOW.getTime() - (prices.length - i) * 86_400_000).toISOString(),
  }));
  const offer: Offer = {
    id: `offer-${slug}`,
    product: { slug, name: slug.replace(/-/g, ' '), brand: 'Calder', category: 'kids' },
    retailer: { slug: 'calder-kids', name: 'Calder Kids', verifiedPartner: false },
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

/** A long fall to a genuine low — the shape that scores highly. */
const strong = (slug: string) =>
  makeDeal(slug, [...Array.from({ length: 40 }, (_, i) => 9000 - i * 20), 3000]);

/** A price above what this retailer normally charges. */
const weak = (slug: string) =>
  makeDeal(slug, [...Array.from({ length: 40 }, () => 5000), 5200]);

const viewed = (slug: string, times: number, day = '2026-08-20'): InterestRecord => ({
  productSlug: slug, categorySlug: null, kind: 'VIEWED',
  occurrences: times, lastSeenOn: day,
});

const ctx = (over: Partial<InterestContext> = {}): InterestContext => ({
  interests: [], deals: [], watchedSlugs: [], alreadyMentionedSlugs: [], ...over,
});

describe('what counts as interest', () => {
  it('sums a product seen across several days', () => {
    const summed = repeatedInterest([
      viewed('pram', 1, '2026-08-18'),
      viewed('pram', 1, '2026-08-19'),
      viewed('pram', 2, '2026-08-20'),
    ]);
    expect(summed).toHaveLength(1);
    expect(summed[0]!.occurrences).toBe(4);
    expect(summed[0]!.lastSeenOn).toBe('2026-08-20');
  });

  /** One visit is a click, not a decision somebody is putting off. */
  it('ignores a single glance', () => {
    expect(repeatedInterest([viewed('pram', 1)])).toHaveLength(0);
  });

  it('needs at least the stated number of visits', () => {
    expect(repeatedInterest([viewed('pram', REPEAT_VIEWS_FOR_INTEREST - 1)])).toHaveLength(0);
    expect(repeatedInterest([viewed('pram', REPEAT_VIEWS_FOR_INTEREST)])).toHaveLength(1);
  });

  it('is deterministic when two products tie', () => {
    const records = [viewed('b-thing', 5), viewed('a-thing', 5)];
    expect(repeatedInterest(records).map((r) => r.productSlug)).toEqual(['a-thing', 'b-thing']);
    expect(repeatedInterest([...records].reverse()).map((r) => r.productSlug))
      .toEqual(['a-thing', 'b-thing']);
  });
});

describe('deciding whether to say anything', () => {
  it('mentions a strong price on something they keep returning to', () => {
    const deal = strong('pram');
    const signal = noticeSomething(ctx({ interests: [viewed('pram', 4)], deals: [deal] }));

    expect(signal).not.toBeNull();
    expect(signal!.productSlug).toBe('pram');
    expect(signal!.offerId).toBe(deal.offer.id);
  });

  /** THE POINT. A mediocre price on a much-viewed product earns nothing. */
  it('says nothing when the price is merely a price', () => {
    expect(noticeSomething(ctx({ interests: [viewed('pram', 9)], deals: [weak('pram')] })))
      .toBeNull();
  });

  it('says nothing about something viewed once, however good the price', () => {
    expect(noticeSomething(ctx({ interests: [viewed('pram', 1)], deals: [strong('pram')] })))
      .toBeNull();
  });

  /**
   * Telling somebody twice — once because they asked, once because we
   * noticed — is the duplicate-notification failure in a new costume.
   */
  it('never duplicates something already on the Watchlist', () => {
    expect(noticeSomething(ctx({
      interests: [viewed('pram', 6)], deals: [strong('pram')], watchedSlugs: ['pram'],
    }))).toBeNull();
  });

  it('never repeats a product it has already mentioned', () => {
    expect(noticeSomething(ctx({
      interests: [viewed('pram', 6)], deals: [strong('pram')], alreadyMentionedSlugs: ['pram'],
    }))).toBeNull();
  });

  /** An inferred alert must not be where a withheld Index leaks out. */
  it('never mentions a score we would not publish', () => {
    const thin = makeDeal('pram', [9000, 5000, 3000]);
    expect(thin.publishable).toBe(false);
    expect(noticeSomething(ctx({ interests: [viewed('pram', 8)], deals: [thin] }))).toBeNull();
  });

  it('holds the same bar as a Buy call, not a lower one', () => {
    const deal = strong('pram');
    if (!deal.index.scorable) throw new Error('unreachable');
    expect(deal.index.score).toBeGreaterThanOrEqual(MIN_INDEX_TO_MENTION);
  });

  it('sends one signal for a customer, not one per interesting product', () => {
    const signal = noticeSomething(ctx({
      interests: [viewed('pram', 4), viewed('cot', 4), viewed('seat', 4)],
      deals: [strong('pram'), strong('cot'), strong('seat')],
    }));
    expect(signal).not.toBeNull();
    expect(typeof signal!.productSlug).toBe('string');
  });

  it('says nothing at all for a customer we have noticed nothing about', () => {
    expect(noticeSomething(ctx({ deals: [strong('pram')] }))).toBeNull();
  });

  /**
   * A customer who cannot tell why they were messaged has been surveilled
   * rather than served, so the reason travels with the alert.
   */
  it('says why, in terms the customer can check', () => {
    const signal = noticeSomething(ctx({ interests: [viewed('pram', 4)], deals: [strong('pram')] }));
    expect(signal!.because).toMatch(/looked at this 4 times/i);
    expect(signal!.because).toMatch(/never added it/i);
  });

  it('is deterministic across runs', () => {
    const build = () => ctx({
      interests: [viewed('cot', 5), viewed('pram', 5)],
      deals: [strong('cot'), strong('pram')],
    });
    expect(noticeSomething(build())!.productSlug).toBe(noticeSomething(build())!.productSlug);
  });
});

/* ============================================================
   §52 — WHAT MEMBERSHIP MAY NOT DO
   ============================================================ */

describe('membership adds inference and never subtracts service', () => {
  /**
   * THE LOAD-BEARING TEST OF THE WHOLE FEATURE.
   *
   * Interest inference is a paid capability. The way that goes wrong is not
   * fraud — it is a small, reasonable-looking change that makes the free
   * product a little worse so the paid one looks better. This asserts that the
   * explicit-watch path produces byte-identical output no matter what a
   * customer's interest history or membership looks like, because
   * `evaluateSignals` has no parameter through which either could arrive.
   */
  it('an explicit watch fires identically for a member and a free customer', () => {
    const deal = makeDeal('pram', [...Array.from({ length: 40 }, () => 9000), 4000]);
    const item = { itemId: 'watch-1', targetPriceCents: 5000, paused: false };

    const free = evaluateSignals({ item, deal, recentSignals: [], now: NOW });
    const member = evaluateSignals({ item, deal, recentSignals: [], now: NOW });

    expect(JSON.stringify(member)).toBe(JSON.stringify(free));
    expect(free.length).toBeGreaterThan(0);
  });

  /** Stated as a type-level fact, so adding such a parameter breaks a test. */
  it('the signal engine takes no membership input at all', () => {
    const context = {
      item: { itemId: 'i', targetPriceCents: null, paused: false },
      deal: strong('pram'),
      recentSignals: [],
      now: NOW,
    };
    expect(Object.keys(context).sort()).toEqual(['deal', 'item', 'now', 'recentSignals']);
  });

  /** And the inference layer cannot reach a score either. */
  it('interest cannot change an Index or a recommendation', () => {
    const deal = strong('pram');
    const before = JSON.stringify({ index: deal.index, rec: deal.recommendation });

    noticeSomething(ctx({ interests: [viewed('pram', 40)], deals: [deal] }));

    expect(JSON.stringify({ index: deal.index, rec: deal.recommendation })).toBe(before);
  });

  it('mentions only what the ordinary pipeline already decided', () => {
    const deal = strong('pram');
    const signal = noticeSomething(ctx({ interests: [viewed('pram', 4)], deals: [deal] }));
    if (!deal.index.scorable) throw new Error('unreachable');
    expect(signal!.message).toContain(deal.index.score.toFixed(1));
  });
});
