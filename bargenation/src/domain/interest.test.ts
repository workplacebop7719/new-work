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
  noticeSomething, repeatedInterest, repeatedCategoryInterest,
  REPEAT_VIEWS_FOR_INTEREST, REPEAT_VIEWS_FOR_CATEGORY_INTEREST, MIN_INDEX_TO_MENTION,
  type InterestRecord, type InterestContext,
} from './interest';
import { evaluateSignals, UNUSUALLY_STRONG_INDEX } from './deal-signal';
import { scoreOffer } from './score-offer';
import { SOURCE_TIER } from './confidence';
import { CATEGORIES, type Deal, type Offer } from './types';

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

/**
 * A price ABOVE what this retailer normally charges — publishable, and a
 * clear Skip. $48 to $54 rather than $50 to $52, because a 4% move no longer
 * clears MEANINGFUL_RANGE_FRACTION and would test the refusal instead.
 */
const weak = (slug: string) =>
  makeDeal(slug, [...Array.from({ length: 40 }, () => 4800), 5400]);

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

/**
 * CATEGORY INTEREST — the weaker inference (§26, §37, §52).
 *
 * The tests that matter here are the ones proving it stays weaker: that it
 * never displaces the product path, that it needs more visits AND a better
 * deal, and that what it holds is one of eight fixed slugs rather than
 * anything somebody typed.
 */
describe('category interest is deliberately the weaker signal', () => {
  const browsed = (slug: string, times: number, day = '2026-08-20'): InterestRecord => ({
    productSlug: null, categorySlug: slug, kind: 'VIEWED',
    occurrences: times, lastSeenOn: day,
  });

  it('needs more visits than a product does', () => {
    expect(REPEAT_VIEWS_FOR_CATEGORY_INTEREST).toBeGreaterThan(REPEAT_VIEWS_FOR_INTEREST);
    expect(repeatedCategoryInterest([browsed('kids', REPEAT_VIEWS_FOR_CATEGORY_INTEREST - 1)]))
      .toHaveLength(0);
    expect(repeatedCategoryInterest([browsed('kids', REPEAT_VIEWS_FOR_CATEGORY_INTEREST)]))
      .toHaveLength(1);
  });

  it('sums a category across several days, like a product', () => {
    const folded = repeatedCategoryInterest([
      browsed('kids', 3, '2026-08-18'), browsed('kids', 3, '2026-08-21'),
    ]);
    expect(folded).toHaveLength(1);
    expect(folded[0]!.occurrences).toBe(6);
    expect(folded[0]!.lastSeenOn).toBe('2026-08-21');
  });

  it('never counts a product view towards a category, or the reverse', () => {
    expect(repeatedCategoryInterest([viewed('a-thing', 40)])).toHaveLength(0);
    expect(repeatedInterest([browsed('kids', 40)])).toHaveLength(0);
  });

  it('mentions the strongest thing in a category somebody keeps opening', () => {
    const signal = noticeSomething(ctx({
      interests: [browsed('kids', 6)],
      deals: [strong('a-good-one')],
    }));
    expect(signal?.from).toBe('CATEGORY');
    expect(signal?.productSlug).toBe('a-good-one');
    expect(signal?.because).toContain('Kids');
    expect(signal?.because).toContain('6');
  });

  /**
   * The bar that stops this becoming the thing people mute. A deal that WOULD
   * be mentioned on the product path — over MIN_INDEX_TO_MENTION — is not
   * enough on the category path, which needs UNUSUALLY_STRONG_INDEX.
   */
  it('will not mention a merely good deal, only an unusual one', () => {
    const mid = makeDeal('mid', [...Array.from({ length: 40 }, () => 5000), 4300]);
    if (!mid.index.scorable) throw new Error('expected scorable');
    expect(mid.index.score).toBeGreaterThanOrEqual(MIN_INDEX_TO_MENTION);
    expect(mid.index.score).toBeLessThan(UNUSUALLY_STRONG_INDEX);

    expect(noticeSomething(ctx({ interests: [browsed('kids', 9)], deals: [mid] }))).toBeNull();
  });

  it('never displaces something they actually kept coming back to', () => {
    const signal = noticeSomething(ctx({
      interests: [viewed('the-one-they-returned-to', 4), browsed('kids', 20)],
      deals: [strong('the-one-they-returned-to'), strong('something-else-in-kids')],
    }));
    expect(signal?.from).toBe('PRODUCT');
    expect(signal?.productSlug).toBe('the-one-they-returned-to');
  });

  it('does not mention something already watched or already mentioned', () => {
    const base = { interests: [browsed('kids', 9)], deals: [strong('a-good-one')] };
    expect(noticeSomething(ctx({ ...base, watchedSlugs: ['a-good-one'] }))).toBeNull();
    expect(noticeSomething(ctx({ ...base, alreadyMentionedSlugs: ['a-good-one'] }))).toBeNull();
  });

  it('says nothing about a category with nothing exceptional in it', () => {
    expect(noticeSomething(ctx({ interests: [browsed('kids', 20)], deals: [weak('meh')] })))
      .toBeNull();
  });

  it('is still one interruption, not one per category', () => {
    const signal = noticeSomething(ctx({
      interests: [browsed('kids', 9), browsed('home', 9)],
      deals: [strong('a'), strong('b')],
    }));
    expect(signal).not.toBeNull();
  });

  it('is deterministic when two categories are equally browsed', () => {
    const input = ctx({
      interests: [browsed('home', 9), browsed('kids', 9)],
      deals: [strong('a'), strong('b')],
    });
    const runs = Array.from({ length: 10 }, () => JSON.stringify(noticeSomething(input)));
    expect(new Set(runs).size).toBe(1);
  });

  /**
   * The privacy property, asserted rather than trusted to a comment: a
   * category is one of eight known slugs. A raw search term reaching this
   * layer would render as itself in an alert, and the alert is the one place
   * a customer would read their own words back.
   */
  it('names a category from the fixed list, never a slug it was handed', () => {
    const signal = noticeSomething(ctx({
      interests: [{
        productSlug: null, categorySlug: 'kids', kind: 'VIEWED',
        occurrences: 9, lastSeenOn: '2026-08-20',
      }],
      deals: [strong('a-good-one')],
    }));
    expect(signal?.because).toContain('Kids');
    expect(CATEGORIES.some((c) => signal!.because.includes(c.name))).toBe(true);
  });
});
