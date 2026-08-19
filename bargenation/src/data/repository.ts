/**
 * THE ONLY MODULE THAT KNOWS WHERE DEALS COME FROM.
 *
 * Today it serves fixtures. When Supabase credentials exist it will serve
 * Postgres. Both paths feed the identical scoring pipeline, so no surface
 * above this line can tell them apart — and no surface can accidentally
 * bypass scoring to render a raw price.
 */
import type { Deal, CategorySlug } from '@/domain/types';
import { scoreOffer } from '@/domain/score-offer';
import { FIXTURE_OFFERS, FIXTURE_NOW, FIXTURE_RETAILERS } from './fixtures';

/** Live data requires a configured database. Until then, fixtures. */
export const dataMode = process.env.DATABASE_URL ? 'LIVE' : 'FIXTURE';

/** Fixtures are scored at their anchor instant so output is reproducible. */
const clock = (): Date => (dataMode === 'FIXTURE' ? FIXTURE_NOW : new Date());

function allDeals(): Deal[] {
  return FIXTURE_OFFERS.map((o) => scoreOffer(o, clock()));
}

const byScore = (a: Deal, b: Deal): number => {
  const sa = a.publishable && a.index.scorable ? a.index.score : -1;
  const sb = b.publishable && b.index.scorable ? b.index.score : -1;
  return sb - sa;
};

export function getDeals(category?: CategorySlug): Deal[] {
  const deals = allDeals();
  const filtered = category ? deals.filter((d) => d.offer.product.category === category) : deals;
  return filtered.sort(byScore);
}

export function getDeal(slug: string): Deal | null {
  return allDeals().find((d) => d.offer.product.slug === slug) ?? null;
}

/**
 * TODAY'S STANDOUT™ (§20) — reserved for genuinely exceptional value.
 * Returns null when nothing qualifies. We do not lower the bar to fill a slot.
 */
export function getStandout(): Deal | null {
  const best = getDeals().find(
    (d) => d.publishable && d.index.scorable && d.index.band === 'EXCEPTIONAL' && d.confidence.level === 'HIGH',
  );
  return best ?? null;
}

/** Deals that cleared the publication gate and are worth surfacing. */
export function getMadeTheCut(): Deal[] {
  return getDeals().filter(
    (d) => d.publishable && d.index.scorable && d.index.score >= 6,
  );
}

/** What we would NOT buy right now (§39). Being useful means saying so. */
export function getWeWouldHold(): Deal[] {
  return getDeals().filter(
    (d) => d.publishable && ['HOLD', 'SKIP'].includes(d.recommendation.recommendation),
  );
}

/** Offers we are deliberately not scoring yet, shown as such (§45). */
export function getWithheld(): Deal[] {
  return allDeals().filter((d) => !d.publishable);
}

export function getRetailers() {
  return FIXTURE_RETAILERS;
}

export function searchDeals(query: string): Deal[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getDeals().filter((d) => {
    const haystack = [
      d.offer.product.name, d.offer.product.brand,
      d.offer.retailer.name, d.offer.product.category,
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}
