/**
 * DEAL SIGNAL™ engine (PRD §26).
 *
 * Decides whether something that happened to a watched product deserves an
 * interruption. The hard part is not detecting changes — it is declining to
 * mention most of them.
 *
 * THE CENTRAL DESIGN CHOICE: every rule is EDGE-TRIGGERED, not state-triggered.
 * "The price is below your target" is a state, and a state-triggered engine
 * re-announces it every time it runs — which is exactly how notification spam
 * happens. "The price CROSSED your target since we last looked" is an edge,
 * and it can only fire once per crossing. Re-arming is therefore automatic:
 * the price has to go back up before it can cross down again.
 *
 * A cooldown sits on top as a second guard, for the rules where an edge can
 * legitimately recur quickly.
 *
 * What is deliberately absent: any notion of membership tier, advertiser, or
 * commission. A free customer's valid signal is never delayed or downgraded to
 * favour a paying one — there is no parameter here through which that could
 * be expressed, and a test asserts it.
 */
import type { Deal } from './types';
import type { PriceObservation } from './price-history';

export type SignalKind =
  | 'TARGET_REACHED'
  | 'PRICE_DROPPED'
  | 'BETTER_RETAILER_PRICE'
  | 'BACK_IN_STOCK'
  | 'UNUSUALLY_STRONG';

/** A drop must clear BOTH thresholds to be worth an interruption. */
export const MIN_DROP_FRACTION = 0.05;   // 5% off the previous price
export const MIN_DROP_CENTS = 200;       // and at least $2

/** A competitor must beat the watched price by this much to be worth saying. */
export const MIN_COMPETITOR_GAP_FRACTION = 0.07;

/** An Index at or above this, with high confidence, counts as unusual. */
export const UNUSUALLY_STRONG_INDEX = 9;

/**
 * After ANY signal on a watch, that watch stays silent for this long.
 *
 * The per-kind cooldowns below are not sufficient on their own. One price
 * movement can satisfy several rules, and if the highest-priority one is in
 * cooldown the next one simply takes its place on the following sweep — so
 * the customer hears about the same drop twice, a day apart, under a
 * different heading. Found by running two sweeps back to back.
 *
 * This is the blunt guarantee that sits over the top: at most one
 * interruption per watch per day, whatever happened.
 */
export const MIN_QUIET_HOURS = 24;

/** How long a given kind stays quiet for one item after firing. */
export const COOLDOWN_DAYS: Record<SignalKind, number> = {
  TARGET_REACHED: 7,
  PRICE_DROPPED: 3,
  BETTER_RETAILER_PRICE: 7,
  BACK_IN_STOCK: 14,
  UNUSUALLY_STRONG: 14,
};

export interface WatchTarget {
  itemId: string;
  targetPriceCents: number | null;
  paused: boolean;
}

export interface PriorSignal {
  kind: SignalKind;
  createdAt: string;
}

export interface SignalContext {
  item: WatchTarget;
  deal: Deal;
  recentSignals: readonly PriorSignal[];
  /** Injected, never read from the clock, so evaluation is reproducible. */
  now: Date;
}

export interface SignalCandidate {
  kind: SignalKind;
  message: string;
  offerId: string;
  itemId: string;
}

const daysSince = (iso: string, now: Date): number =>
  (now.getTime() - new Date(iso).getTime()) / 86_400_000;

const usd = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

/**
 * The two most recent observations, which is what an edge is measured across.
 * Returns null when there is no previous point to compare against — a first
 * sighting is not a change.
 */
function edge(observations: readonly PriceObservation[]): {
  previous: PriceObservation;
  current: PriceObservation;
} | null {
  if (observations.length < 2) return null;
  const sorted = [...observations].sort(
    (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
  );
  return {
    previous: sorted[sorted.length - 2] as PriceObservation,
    current: sorted[sorted.length - 1] as PriceObservation,
  };
}

function inCooldown(kind: SignalKind, recent: readonly PriorSignal[], now: Date): boolean {
  const last = recent
    .filter((s) => s.kind === kind)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  if (!last) return false;
  return daysSince(last.createdAt, now) < COOLDOWN_DAYS[kind];
}

/**
 * Returns every signal this watch has earned right now — usually none.
 *
 * Ordered by how much the customer is likely to care, so a caller that only
 * wants to send one can take the first.
 */
export function evaluateSignals(ctx: SignalContext): SignalCandidate[] {
  const { item, deal, recentSignals, now } = ctx;

  // A paused watch is silent. No exceptions, no "important" override.
  if (item.paused) return [];

  // At most one interruption per watch per quiet period, whatever fired.
  const mostRecent = [...recentSignals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
  if (mostRecent && daysSince(mostRecent.createdAt, now) * 24 < MIN_QUIET_HOURS) {
    return [];
  }

  const offerId = deal.offer.id;
  const itemId = item.itemId;
  const out: SignalCandidate[] = [];
  const add = (kind: SignalKind, message: string) => {
    if (inCooldown(kind, recentSignals, now)) return;
    out.push({ kind, message, offerId, itemId });
  };

  const transition = edge(deal.offer.observations);
  const price = deal.offer.priceCents;
  const name = deal.offer.product.name;

  if (transition) {
    const { previous, current } = transition;

    // TARGET REACHED — only on the crossing, so it cannot repeat while the
    // price sits below the target.
    if (
      item.targetPriceCents !== null &&
      previous.priceCents > item.targetPriceCents &&
      current.priceCents <= item.targetPriceCents
    ) {
      add(
        'TARGET_REACHED',
        `${name} reached ${usd(current.priceCents)} — your target was ${usd(item.targetPriceCents)}.`,
      );
    }

    // PRICE DROPPED — must clear both a proportional and an absolute bar, so
    // pennies off a cheap item never interrupts anyone.
    const drop = previous.priceCents - current.priceCents;
    if (
      drop >= MIN_DROP_CENTS &&
      previous.priceCents > 0 &&
      drop / previous.priceCents >= MIN_DROP_FRACTION
    ) {
      add(
        'PRICE_DROPPED',
        `${name} dropped to ${usd(current.priceCents)}, from ${usd(previous.priceCents)}.`,
      );
    }

    // BACK IN STOCK — again an edge, not the state of being in stock.
    if (!previous.inStock && current.inStock) {
      add('BACK_IN_STOCK', `${name} is available again at ${usd(current.priceCents)}.`);
    }
  }

  // BETTER RETAILER PRICE — someone else is materially cheaper right now.
  const competitors = deal.offer.competitorPriceCents.filter((c) => c > 0);
  const cheapest = competitors.length > 0 ? Math.min(...competitors) : null;
  if (cheapest !== null && price > 0) {
    const gap = (price - cheapest) / price;
    if (gap >= MIN_COMPETITOR_GAP_FRACTION) {
      add(
        'BETTER_RETAILER_PRICE',
        `${name} is ${usd(cheapest)} elsewhere, against ${usd(price)} at ${deal.offer.retailer.name}.`,
      );
    }
  }

  // UNUSUALLY STRONG — only when we are willing to publish the Index and
  // stand behind it. An unpublishable score never becomes a notification.
  if (deal.publishable && deal.index.scorable && deal.confidence.level === 'HIGH') {
    if (deal.index.score >= UNUSUALLY_STRONG_INDEX) {
      add(
        'UNUSUALLY_STRONG',
        `${name} is scoring ${deal.index.score.toFixed(1)} — stronger than we usually see.`,
      );
    }
  }

  return out.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
}

/** Most important first. What the customer explicitly asked for wins. */
const PRIORITY: SignalKind[] = [
  'TARGET_REACHED', 'BACK_IN_STOCK', 'PRICE_DROPPED',
  'BETTER_RETAILER_PRICE', 'UNUSUALLY_STRONG',
];

/**
 * At most ONE signal per watch, per sweep.
 *
 * A single price drop can legitimately satisfy several rules at once — it
 * crosses the target AND is a material drop AND now undercuts other
 * retailers. Sending all of them means telling somebody three times about one
 * event, which is the spam §26 exists to prevent.
 *
 * So the rules stay independent and honest, and this picks the one worth
 * saying: the one the customer explicitly asked for, if it fired. The others
 * are still true, and the deal page shows them; they just do not each earn an
 * interruption.
 *
 * Found by running a real sweep — the engine emitted 12 signals across 7
 * watches, with the same drop reported twice per customer.
 */
export function selectSignal(candidates: readonly SignalCandidate[]): SignalCandidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind),
  )[0] as SignalCandidate;
}

/* ============================================================
   RETAILER WATCHES (PRD §25, §43)
   ============================================================ */

/**
 * A watch whose subject is a whole store rather than one item.
 *
 * The promise on the retailer page is narrow and deliberately so: "we'll tell
 * you when something here is genuinely worth buying — not when they run a
 * sale." So this evaluates exactly one rule, UNUSUALLY_STRONG, against the
 * same threshold a product watch uses. There is no second definition of
 * "unusual" anywhere in the product.
 *
 * The rules above are edge-triggered against a price. A retailer watch has no
 * single price to take an edge across, so the edge here is a different one:
 * WHICH OFFER is strong. An offer this watch has already announced cannot
 * announce itself again, which is what stops a catalogue item that sits at 9.2
 * for two months from being reported every time its cooldown lapses.
 *
 * Returns at most one candidate, for the same reason `selectSignal` exists:
 * a store with four strong offers is still one interruption.
 */
export interface RetailerWatchContext {
  item: WatchTarget;
  /** Every offer we currently track at this retailer, already scored. */
  deals: readonly Deal[];
  recentSignals: readonly PriorSignal[];
  /** Offers this watch has already told the customer about. */
  announcedOfferIds: readonly string[];
  now: Date;
}

export function evaluateRetailerWatch(ctx: RetailerWatchContext): SignalCandidate | null {
  const { item, deals, recentSignals, announcedOfferIds, now } = ctx;

  if (item.paused) return null;

  const mostRecent = [...recentSignals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
  if (mostRecent && daysSince(mostRecent.createdAt, now) * 24 < MIN_QUIET_HOURS) return null;
  if (inCooldown('UNUSUALLY_STRONG', recentSignals, now)) return null;

  const already = new Set(announcedOfferIds);

  const strong = deals.filter(
    (d) =>
      !already.has(d.offer.id) &&
      d.publishable &&
      d.index.scorable &&
      d.confidence.level === 'HIGH' &&
      d.index.score >= UNUSUALLY_STRONG_INDEX,
  );
  if (strong.length === 0) return null;

  // Highest score wins; offer id breaks ties so two runs of the same sweep
  // never disagree about which one to send.
  const best = [...strong].sort((a, b) => {
    const byScore =
      (b.index.scorable ? b.index.score : 0) - (a.index.scorable ? a.index.score : 0);
    return byScore !== 0 ? byScore : a.offer.id.localeCompare(b.offer.id);
  })[0] as Deal;

  const score = best.index.scorable ? best.index.score : 0;
  return {
    kind: 'UNUSUALLY_STRONG',
    itemId: item.itemId,
    offerId: best.offer.id,
    message:
      `${best.offer.product.name} at ${best.offer.retailer.name} is scoring ` +
      `${score.toFixed(1)} — stronger than we usually see.`,
  };
}
