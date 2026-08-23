/**
 * The valuable tests here are the ones proving we STAY QUIET.
 *
 * A signal engine that fires correctly but too often is a worse product than
 * one that fires rarely and slightly late, because the first one trains people
 * to ignore it.
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateSignals, evaluateRetailerWatch, selectSignal, COOLDOWN_DAYS,
  MIN_DROP_CENTS, MIN_DROP_FRACTION,
  UNUSUALLY_STRONG_INDEX, MIN_QUIET_HOURS,
  type SignalContext, type PriorSignal, type RetailerWatchContext,
} from './deal-signal';
import { scoreOffer } from './score-offer';
import type { Offer, Deal } from './types';
import type { PriceObservation } from './price-history';
import { SOURCE_TIER } from './confidence';

const NOW = new Date('2026-08-20T12:00:00Z');

const obs = (prices: number[], inStock: boolean[] = []): PriceObservation[] =>
  prices.map((p, i) => ({
    priceCents: p,
    inStock: inStock[i] ?? true,
    observedAt: new Date(NOW.getTime() - (prices.length - i) * 86_400_000).toISOString(),
  }));

function makeDeal(
  observations: PriceObservation[],
  overrides: Partial<Offer> = {},
): Deal {
  const priceCents = observations[observations.length - 1]?.priceCents ?? 1000;
  const offer: Offer = {
    id: 'offer-1',
    product: { slug: 'test-shoe', name: 'Trail Runner', brand: 'Calder', category: 'shoes' },
    retailer: { slug: 'calder-kids', name: 'Calder Kids', verifiedPartner: false },
    priceCents,
    currency: 'USD',
    lastVerifiedAt: NOW.toISOString(),
    sourceTier: SOURCE_TIER.AFFILIATE_FEED,
    observations,
    competitorPriceCents: [],
    daysUntilOfferEnds: null,
    limitedStock: null,
    inStock: true,
    dataMode: 'FIXTURE',
    ...overrides,
  };
  return scoreOffer(offer, NOW);
}

const ctx = (over: Partial<SignalContext> & { deal: Deal }): SignalContext => ({
  item: { itemId: 'item-1', targetPriceCents: null, paused: false },
  recentSignals: [],
  now: NOW,
  ...over,
});

const kinds = (c: SignalContext) => evaluateSignals(c).map((s) => s.kind);

describe('a paused watch is completely silent', () => {
  it('produces nothing even when everything else would fire', () => {
    const deal = makeDeal(obs([9000, 3000]), { competitorPriceCents: [1000] });
    const signals = evaluateSignals(
      ctx({ deal, item: { itemId: 'i', targetPriceCents: 5000, paused: true } }),
    );
    expect(signals).toEqual([]);
  });
});

describe('target reached fires on the crossing, not on the state', () => {
  it('fires when the price crosses the target', () => {
    const deal = makeDeal(obs([6000, 4500]));
    expect(kinds(ctx({ deal, item: { itemId: 'i', targetPriceCents: 5000, paused: false } })))
      .toContain('TARGET_REACHED');
  });

  /**
   * The anti-spam test. The price has been under target for days; a
   * state-triggered engine would announce it on every single run.
   */
  it('stays quiet while the price merely REMAINS below target', () => {
    const deal = makeDeal(obs([4400, 4300]));
    expect(kinds(ctx({ deal, item: { itemId: 'i', targetPriceCents: 5000, paused: false } })))
      .not.toContain('TARGET_REACHED');
  });

  it('re-arms only after the price goes back above the target', () => {
    const backAbove = makeDeal(obs([4500, 5600]));
    expect(kinds(ctx({ deal: backAbove, item: { itemId: 'i', targetPriceCents: 5000, paused: false } })))
      .not.toContain('TARGET_REACHED');

    const crossesAgain = makeDeal(obs([5600, 4800]));
    expect(kinds(ctx({ deal: crossesAgain, item: { itemId: 'i', targetPriceCents: 5000, paused: false } })))
      .toContain('TARGET_REACHED');
  });

  it('says nothing when no target was set', () => {
    const deal = makeDeal(obs([6000, 4500]));
    expect(kinds(ctx({ deal }))).not.toContain('TARGET_REACHED');
  });

  it('quotes both the achieved price and the target', () => {
    const deal = makeDeal(obs([6000, 4500]));
    const [signal] = evaluateSignals(
      ctx({ deal, item: { itemId: 'i', targetPriceCents: 5000, paused: false } }),
    );
    expect(signal!.message).toContain('$45.00');
    expect(signal!.message).toContain('$50.00');
  });
});

describe('a price drop has to be worth the interruption', () => {
  it('fires on a genuine drop', () => {
    expect(kinds(ctx({ deal: makeDeal(obs([10000, 8000])) }))).toContain('PRICE_DROPPED');
  });

  it('ignores a drop that is proportionally trivial', () => {
    // $2.00 off $100 clears the absolute bar but is only 2%
    expect(kinds(ctx({ deal: makeDeal(obs([10000, 9800])) }))).not.toContain('PRICE_DROPPED');
  });

  it('ignores a drop that is absolutely trivial', () => {
    // 20% off a $5 item is only $1
    expect(kinds(ctx({ deal: makeDeal(obs([500, 400])) }))).not.toContain('PRICE_DROPPED');
  });

  it('requires BOTH thresholds, which the constants make explicit', () => {
    expect(MIN_DROP_CENTS).toBeGreaterThan(0);
    expect(MIN_DROP_FRACTION).toBeGreaterThan(0);
  });

  it('never announces a price RISE as a drop', () => {
    expect(kinds(ctx({ deal: makeDeal(obs([4000, 9000])) }))).not.toContain('PRICE_DROPPED');
  });

  it('says nothing about a first sighting, which is not a change', () => {
    expect(kinds(ctx({ deal: makeDeal(obs([4000])) }))).toEqual([]);
  });
});

describe('back in stock', () => {
  it('fires on the transition from out to in', () => {
    expect(kinds(ctx({ deal: makeDeal(obs([4000, 4000], [false, true])) })))
      .toContain('BACK_IN_STOCK');
  });

  it('stays quiet for something that was simply never out of stock', () => {
    expect(kinds(ctx({ deal: makeDeal(obs([4000, 4000], [true, true])) })))
      .not.toContain('BACK_IN_STOCK');
  });

  it('stays quiet when it has just gone OUT of stock', () => {
    expect(kinds(ctx({ deal: makeDeal(obs([4000, 4000], [true, false])) })))
      .not.toContain('BACK_IN_STOCK');
  });
});

describe('a better price elsewhere', () => {
  it('fires when a competitor is materially cheaper', () => {
    const deal = makeDeal(obs([5000, 5000]), { competitorPriceCents: [4000, 5200] });
    expect(kinds(ctx({ deal }))).toContain('BETTER_RETAILER_PRICE');
  });

  it('stays quiet over a negligible difference', () => {
    const deal = makeDeal(obs([5000, 5000]), { competitorPriceCents: [4950] });
    expect(kinds(ctx({ deal }))).not.toContain('BETTER_RETAILER_PRICE');
  });

  it('stays quiet when we have nothing to compare against', () => {
    const deal = makeDeal(obs([5000, 5000]), { competitorPriceCents: [] });
    expect(kinds(ctx({ deal }))).not.toContain('BETTER_RETAILER_PRICE');
  });
});

describe('unusually strong', () => {
  it('never fires on an Index we would not publish', () => {
    // three observations is below the publication threshold
    const thin = makeDeal(obs([9000, 5000, 3000]));
    expect(thin.publishable).toBe(false);
    expect(kinds(ctx({ deal: thin }))).not.toContain('UNUSUALLY_STRONG');
  });

  it('fires on a deep, well-evidenced score', () => {
    const prices = Array.from({ length: 40 }, (_, i) => 9000 - i * 20);
    prices.push(3000);
    const deal = makeDeal(obs(prices), { competitorPriceCents: [5200, 5400] });

    // Assert the preconditions rather than guarding on them: wrapping the
    // real assertion in an `if` would let this test go silent the moment the
    // fixture stopped producing a publishable score.
    expect(deal.publishable).toBe(true);
    expect(deal.index.scorable).toBe(true);
    expect(deal.confidence.level).toBe('HIGH');
    if (!deal.index.scorable) throw new Error('unreachable');
    expect(deal.index.score).toBeGreaterThanOrEqual(UNUSUALLY_STRONG_INDEX);

    expect(kinds(ctx({ deal }))).toContain('UNUSUALLY_STRONG');
  });
});

describe('cooldown stops the same news twice', () => {
  const recent = (kind: PriorSignal['kind'], daysAgo: number): PriorSignal => ({
    kind,
    createdAt: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
  });

  it('suppresses a repeat inside the cooldown window', () => {
    const deal = makeDeal(obs([10000, 8000]));
    const signals = kinds(ctx({ deal, recentSignals: [recent('PRICE_DROPPED', 2)] }));
    expect(signals).not.toContain('PRICE_DROPPED');
  });

  it('allows it again once the window has passed', () => {
    const deal = makeDeal(obs([10000, 8000]));
    const daysAgo = COOLDOWN_DAYS.PRICE_DROPPED + 1;
    const signals = kinds(ctx({ deal, recentSignals: [recent('PRICE_DROPPED', daysAgo)] }));
    expect(signals).toContain('PRICE_DROPPED');
  });

  /**
   * The gap the per-kind cooldowns left open: one movement satisfies several
   * rules, the top one goes into cooldown, and the next takes its place on the
   * following sweep — same news, new heading. Found by running two real sweeps.
   */
  it('stays silent entirely for a day after any signal on that watch', () => {
    const deal = makeDeal(obs([9000, 4000]));
    const signals = kinds(
      ctx({
        deal,
        item: { itemId: 'i', targetPriceCents: 5000, paused: false },
        recentSignals: [recent('TARGET_REACHED', 0)],
      }),
    );
    expect(signals).toEqual([]);
  });

  it('speaks again once the quiet period has passed', () => {
    const deal = makeDeal(obs([9000, 4000]));
    const signals = kinds(
      ctx({
        deal,
        item: { itemId: 'i', targetPriceCents: 5000, paused: false },
        recentSignals: [recent('TARGET_REACHED', MIN_QUIET_HOURS / 24 + 8)],
      }),
    );
    expect(signals.length).toBeGreaterThan(0);
  });

  it('does not let one kind silence a different kind', () => {
    const deal = makeDeal(obs([6000, 4500]));
    const signals = kinds(
      ctx({
        deal,
        item: { itemId: 'i', targetPriceCents: 5000, paused: false },
        // outside the quiet period, but still inside PRICE_DROPPED's cooldown
        recentSignals: [recent('PRICE_DROPPED', 2)],
      }),
    );
    expect(signals).toContain('TARGET_REACHED');
    expect(signals).not.toContain('PRICE_DROPPED');
  });
});

describe('the engine cannot be influenced by money', () => {
  it('takes no tier, advertiser or commission input', () => {
    const deal = makeDeal(obs([10000, 8000]));
    const plain = evaluateSignals(ctx({ deal }));

    // Attach commercial metadata to the offer; output must be identical.
    const sponsored = makeDeal(obs([10000, 8000]));
    (sponsored.offer as unknown as Record<string, unknown>).commissionRate = 0.4;
    (sponsored.offer as unknown as Record<string, unknown>).sponsored = true;
    const withMoney = evaluateSignals(ctx({ deal: sponsored }));

    expect(withMoney).toEqual(plain);
  });

  it('emits nothing that mentions commercial terms', () => {
    const deal = makeDeal(obs([6000, 4500]), { competitorPriceCents: [3800] });
    const serialised = JSON.stringify(
      evaluateSignals(ctx({ deal, item: { itemId: 'i', targetPriceCents: 5000, paused: false } })),
    ).toLowerCase();
    for (const term of ['sponsor', 'commission', 'affiliate', 'promoted', 'partner']) {
      expect(serialised).not.toContain(term);
    }
  });
});

describe('ordering and restraint', () => {
  it('puts the thing the customer asked for first', () => {
    const deal = makeDeal(obs([10000, 4000]), { competitorPriceCents: [3000] });
    const signals = kinds(
      ctx({ deal, item: { itemId: 'i', targetPriceCents: 5000, paused: false } }),
    );
    expect(signals[0]).toBe('TARGET_REACHED');
  });

  it('produces nothing at all on an ordinary quiet day', () => {
    const deal = makeDeal(obs([4000, 4010]), { competitorPriceCents: [4050] });
    expect(evaluateSignals(ctx({ deal }))).toEqual([]);
  });

  /**
   * A real sweep emitted 12 signals across 7 watches, telling each customer
   * about one price drop twice. The rules stay independent; the selection
   * step is what keeps the interruption single.
   */
  it('sends at most one signal per watch, even when several rules fire', () => {
    const deal = makeDeal(obs([10000, 2000]), { competitorPriceCents: [1500] });
    const candidates = evaluateSignals(
      ctx({ deal, item: { itemId: 'i', targetPriceCents: 5000, paused: false } }),
    );
    expect(candidates.length).toBeGreaterThan(1);

    const chosen = selectSignal(candidates);
    expect(chosen).not.toBeNull();
    expect(chosen!.kind).toBe('TARGET_REACHED');
  });

  it('selects nothing from nothing', () => {
    expect(selectSignal([])).toBeNull();
  });

  it('falls through the priority order when the target did not fire', () => {
    const deal = makeDeal(obs([10000, 8000]), { competitorPriceCents: [6000] });
    const chosen = selectSignal(evaluateSignals(ctx({ deal })));
    expect(chosen!.kind).toBe('PRICE_DROPPED');
  });

  it('is deterministic', () => {
    const deal = makeDeal(obs([10000, 8000]));
    const runs = Array.from({ length: 20 }, () => JSON.stringify(evaluateSignals(ctx({ deal }))));
    expect(new Set(runs).size).toBe(1);
  });
});

/* ============================================================
   RETAILER WATCHES (§43)
   ============================================================ */

/**
 * The promise on the retailer page is narrower than a product watch's, so
 * these tests are mostly about what a retailer watch REFUSES to say. A store
 * with a rack of mediocre sales must produce silence, or "watch this retailer"
 * becomes the sale-alert email the product exists to replace.
 */
describe('watching a whole retailer', () => {
  /** Deep, long, well-evidenced fall — scores above the unusual threshold. */
  const strongDeal = (id: string, endCents = 3000): Deal => {
    const prices = Array.from({ length: 40 }, (_, i) => 9000 - i * 20);
    prices.push(endCents);
    return makeDeal(obs(prices), { id, competitorPriceCents: [5200, 5400] });
  };

  /** A real, material price drop that is nonetheless nothing special. */
  const ordinaryDeal = (id: string): Deal => {
    const prices = Array.from({ length: 40 }, () => 5000);
    prices.push(4400);
    return makeDeal(obs(prices), { id });
  };

  const rctx = (over: Partial<RetailerWatchContext> = {}): RetailerWatchContext => ({
    item: { itemId: 'retailer-watch', targetPriceCents: null, paused: false },
    deals: [],
    recentSignals: [],
    announcedOfferIds: [],
    now: NOW,
    ...over,
  });

  it('fires on a genuinely exceptional offer at the store', () => {
    const deal = strongDeal('offer-strong');
    expect(deal.publishable).toBe(true);
    expect(deal.confidence.level).toBe('HIGH');

    const signal = evaluateRetailerWatch(rctx({ deals: [deal] }));
    expect(signal?.kind).toBe('UNUSUALLY_STRONG');
    expect(signal?.offerId).toBe('offer-strong');
    expect(signal?.itemId).toBe('retailer-watch');
  });

  /**
   * THE POINT OF THE FEATURE. A price drop that would earn PRICE_DROPPED on a
   * product watch earns nothing here: the customer asked to hear when
   * something is worth buying, not when the store discounted something.
   */
  it('says nothing about an ordinary sale, however real the drop', () => {
    const deal = ordinaryDeal('offer-ordinary');
    expect(evaluateSignals(ctx({ deal })).map((s) => s.kind)).toContain('PRICE_DROPPED');
    expect(evaluateRetailerWatch(rctx({ deals: [deal] }))).toBeNull();
  });

  it('stays silent for a store where we track nothing', () => {
    expect(evaluateRetailerWatch(rctx({ deals: [] }))).toBeNull();
  });

  it('is silent while paused', () => {
    const paused = { itemId: 'retailer-watch', targetPriceCents: null, paused: true };
    expect(evaluateRetailerWatch(rctx({ deals: [strongDeal('x')], item: paused }))).toBeNull();
  });

  it('never announces an Index we would not publish', () => {
    const thin = makeDeal(obs([9000, 5000, 3000]), { id: 'offer-thin' });
    expect(thin.publishable).toBe(false);
    expect(evaluateRetailerWatch(rctx({ deals: [thin] }))).toBeNull();
  });

  /**
   * A shelf of strong offers is still one interruption, and it is the
   * strongest one that earns it.
   *
   * The two end prices below are chosen because they score differently — 9.5
   * and 10.0. An earlier version of this test used two much deeper falls,
   * both of which hit the ceiling of 10, so it could not tell "picks the
   * strongest" apart from "picks the first alphabetically".
   */
  it('sends one signal for a store, and it is the strongest offer', () => {
    const deals = [strongDeal('offer-a', 5000), strongDeal('offer-b', 4000)];
    const [a, b] = deals as [Deal, Deal];
    if (!a.index.scorable || !b.index.scorable) throw new Error('unreachable');
    expect(b.index.score).toBeGreaterThan(a.index.score);

    const signal = evaluateRetailerWatch(rctx({ deals }));
    expect(signal?.offerId).toBe('offer-b');
  });

  /**
   * The edge a retailer watch takes is "which offer", not "which price". An
   * item that sits at 9.2 for two months must not be re-announced every time
   * its cooldown lapses.
   */
  it('does not re-announce an offer it has already sent', () => {
    const deal = strongDeal('offer-strong');
    const already = rctx({ deals: [deal], announcedOfferIds: ['offer-strong'] });
    expect(evaluateRetailerWatch(already)).toBeNull();
  });

  it('still reports a different strong offer that appears later', () => {
    const deals = [strongDeal('offer-old', 3000), strongDeal('offer-new', 2600)];
    const signal = evaluateRetailerWatch(
      rctx({ deals, announcedOfferIds: ['offer-old'] }),
    );
    expect(signal?.offerId).toBe('offer-new');
  });

  it('respects the quiet period that sits over every watch', () => {
    const recent: PriorSignal = {
      kind: 'PRICE_DROPPED',
      createdAt: new Date(NOW.getTime() - (MIN_QUIET_HOURS - 1) * 3_600_000).toISOString(),
    };
    expect(
      evaluateRetailerWatch(rctx({ deals: [strongDeal('x')], recentSignals: [recent] })),
    ).toBeNull();
  });

  it('respects the unusually-strong cooldown', () => {
    const recent: PriorSignal = {
      kind: 'UNUSUALLY_STRONG',
      createdAt: new Date(
        NOW.getTime() - (COOLDOWN_DAYS.UNUSUALLY_STRONG - 1) * 86_400_000,
      ).toISOString(),
    };
    expect(
      evaluateRetailerWatch(rctx({ deals: [strongDeal('x')], recentSignals: [recent] })),
    ).toBeNull();
  });

  /** Two runs of the same sweep must not disagree about what to send. */
  it('is deterministic when two offers tie', () => {
    const a = strongDeal('offer-a');
    const b = strongDeal('offer-b');
    expect(evaluateRetailerWatch(rctx({ deals: [a, b] }))?.offerId).toBe('offer-a');
    expect(evaluateRetailerWatch(rctx({ deals: [b, a] }))?.offerId).toBe('offer-a');
  });

  it('names the retailer in the message, since the customer watched a store', () => {
    const signal = evaluateRetailerWatch(rctx({ deals: [strongDeal('x')] }));
    expect(signal?.message).toContain('Calder Kids');
  });
});
