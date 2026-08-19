/**
 * DEVELOPMENT FIXTURE DATA — PRD §45.
 *
 * Every retailer below is FICTIONAL and every price is synthetic. Nothing
 * here is attached to a real company, because attaching an invented price to
 * a real retailer is the single most damaging thing this product could do.
 *
 * Each offer carries `dataMode: 'FIXTURE'`, and the UI is required to
 * disclose that on every surface that renders it.
 *
 * Note what is NOT in this file: no Value Index, no recommendation, no
 * "lowest ever" claim. Fixtures supply OBSERVATIONS only; every score is
 * computed from them by the engine, exactly as live data will be.
 */
import type { Offer, Product, Retailer } from '@/domain/types';
import type { PriceObservation } from '@/domain/price-history';
import { SOURCE_TIER } from '@/domain/confidence';

/** Fixtures are anchored to a fixed instant so builds are reproducible. */
export const FIXTURE_NOW = new Date('2026-08-19T09:00:00Z');

/** Deterministic PRNG (mulberry32) — same seed, same history, every run. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RETAILERS: Record<string, Retailer> = {
  harlow:   { slug: 'harlow-finch',      name: 'Harlow & Finch',      verifiedPartner: false },
  meridian: { slug: 'meridian-home',     name: 'Meridian Home',       verifiedPartner: false },
  northaven:{ slug: 'northaven',         name: 'Northaven Outfitters',verifiedPartner: false },
  pell:     { slug: 'pell-and-co',       name: 'Pell & Co',           verifiedPartner: false },
  calder:   { slug: 'calder-kids',       name: 'Calder Kids',         verifiedPartner: false },
  vestry:   { slug: 'vestry-market',     name: 'Vestry Market',       verifiedPartner: false },
};

export const FIXTURE_RETAILERS = Object.values(RETAILERS);

/**
 * Builds a price walk ending at `endCents`.
 * `drift` shapes where the ending price sits inside the recorded range,
 * which is what the Index then measures. We shape the EVIDENCE, never the score.
 */
function walk(
  seed: number, days: number, baseCents: number, endCents: number,
  volatility: number, outOfStockDays: number[] = [],
): PriceObservation[] {
  const rand = rng(seed);
  const out: PriceObservation[] = [];
  for (let i = 0; i < days; i++) {
    const progress = i / (days - 1);
    const noise = (rand() - 0.5) * 2 * volatility * baseCents;
    // ease toward the ending price over the window
    const target = baseCents + (endCents - baseCents) * Math.pow(progress, 2.4);
    const price = Math.max(50, Math.round((target + noise) / 5) * 5);
    const observedAt = new Date(FIXTURE_NOW.getTime() - (days - i) * 86_400_000).toISOString();
    out.push({ priceCents: price, observedAt, inStock: !outOfStockDays.includes(i) });
  }
  // the final observation IS today's listed price
  const last = out[out.length - 1];
  if (last) last.priceCents = endCents;
  return out;
}

const p = (slug: string, name: string, brand: string, category: Product['category']): Product =>
  ({ slug, name, brand, category });

interface Spec {
  id: string;
  product: Product;
  retailer: Retailer;
  seed: number;
  days: number;
  baseCents: number;
  priceCents: number;
  volatility: number;
  competitors: number[];
  endsInDays: number | null;
  limitedStock: boolean | null;
  verifiedDaysAgo: number;
  sourceTier: Offer['sourceTier'];
  outOfStock?: number[];
}

const SPECS: Spec[] = [
  // Deep history, price at the bottom of a wide recorded range → should score high.
  {
    id: 'calder-trail-sneaker', product: p('calder-trail-sneaker', 'Trail Runner Kids Sneaker', 'Calder', 'shoes'),
    retailer: RETAILERS.calder as Retailer, seed: 101, days: 92, baseCents: 6800, priceCents: 3400,
    volatility: 0.04, competitors: [4200, 4599, 3999], endsInDays: 4, limitedStock: null,
    verifiedDaysAgo: 0, sourceTier: SOURCE_TIER.AFFILIATE_FEED,
  },
  {
    id: 'northaven-puffer', product: p('northaven-puffer', 'Insulated Winter Puffer, Youth', 'Northaven', 'kids'),
    retailer: RETAILERS.northaven as Retailer, seed: 202, days: 120, baseCents: 12000, priceCents: 6600,
    volatility: 0.05, competitors: [7900, 8400, 7250], endsInDays: 11, limitedStock: null,
    verifiedDaysAgo: 1, sourceTier: SOURCE_TIER.RETAILER_API,
  },
  // Permanently "on sale" — big claimed discount, no real movement → should read HOLD/SKIP.
  {
    id: 'harlow-storage-bin', product: p('harlow-storage-bin', 'Stacking Storage Bin, Set of 4', 'Harlow', 'home'),
    retailer: RETAILERS.harlow as Retailer, seed: 303, days: 88, baseCents: 3200, priceCents: 3150,
    volatility: 0.012, competitors: [2999, 3050], endsInDays: 2, limitedStock: true,
    verifiedDaysAgo: 0, sourceTier: SOURCE_TIER.MERCHANT_FEED,
  },
  {
    id: 'vestry-nappies', product: p('vestry-nappies', 'Overnight Nappies, 96 Count', 'Vestry', 'baby'),
    retailer: RETAILERS.vestry as Retailer, seed: 404, days: 76, baseCents: 4400, priceCents: 3300,
    volatility: 0.03, competitors: [3599, 3450, 3800], endsInDays: null, limitedStock: null,
    verifiedDaysAgo: 2, sourceTier: SOURCE_TIER.AFFILIATE_FEED,
  },
  {
    id: 'meridian-vacuum', product: p('meridian-vacuum', 'Cordless Stick Vacuum', 'Meridian', 'home'),
    retailer: RETAILERS.meridian as Retailer, seed: 505, days: 140, baseCents: 24900, priceCents: 15900,
    volatility: 0.045, competitors: [17900, 18500, 16400], endsInDays: 6, limitedStock: null,
    verifiedDaysAgo: 0, sourceTier: SOURCE_TIER.RETAILER_API,
  },
  {
    id: 'pell-backpack', product: p('pell-backpack', 'Reinforced School Backpack', 'Pell', 'school'),
    retailer: RETAILERS.pell as Retailer, seed: 606, days: 64, baseCents: 5400, priceCents: 4100,
    volatility: 0.035, competitors: [4200, 4350], endsInDays: 9, limitedStock: null,
    verifiedDaysAgo: 3, sourceTier: SOURCE_TIER.MERCHANT_FEED,
  },
  // Priced ABOVE its own recorded typical → must not be recommended at all.
  {
    id: 'harlow-lunch-set', product: p('harlow-lunch-set', 'Bento Lunch Set', 'Harlow', 'school'),
    retailer: RETAILERS.harlow as Retailer, seed: 707, days: 70, baseCents: 2200, priceCents: 2600,
    volatility: 0.03, competitors: [2100, 1999, 2250], endsInDays: 3, limitedStock: true,
    verifiedDaysAgo: 1, sourceTier: SOURCE_TIER.STRUCTURED_PUBLIC,
  },
  {
    id: 'calder-blocks', product: p('calder-blocks', 'Hardwood Block Set, 100 Piece', 'Calder', 'toys'),
    retailer: RETAILERS.calder as Retailer, seed: 808, days: 110, baseCents: 8900, priceCents: 5300,
    volatility: 0.04, competitors: [6400, 6900], endsInDays: null, limitedStock: null,
    verifiedDaysAgo: 1, sourceTier: SOURCE_TIER.AFFILIATE_FEED,
  },
  {
    id: 'vestry-olive-oil', product: p('vestry-olive-oil', 'Cold Pressed Olive Oil, 1L', 'Vestry', 'groceries'),
    retailer: RETAILERS.vestry as Retailer, seed: 909, days: 96, baseCents: 2400, priceCents: 1850,
    volatility: 0.05, competitors: [1999, 2100, 1875], endsInDays: 5, limitedStock: null,
    verifiedDaysAgo: 4, sourceTier: SOURCE_TIER.MERCHANT_FEED,
    outOfStock: [40, 41, 42, 43],
  },
  // Deliberately thin history: the publication gate must withhold the Index.
  // This is the "fail safe, visibly" path, and it ships on purpose.
  {
    id: 'meridian-duvet', product: p('meridian-duvet', 'Brushed Cotton Duvet Set', 'Meridian', 'home'),
    retailer: RETAILERS.meridian as Retailer, seed: 1010, days: 3, baseCents: 7900, priceCents: 5900,
    volatility: 0.02, competitors: [], endsInDays: 8, limitedStock: null,
    verifiedDaysAgo: 6, sourceTier: SOURCE_TIER.PERMITTED_MONITORING,
  },
];

export const FIXTURE_OFFERS: Offer[] = SPECS.map((s) => ({
  id: s.id,
  product: s.product,
  retailer: s.retailer,
  priceCents: s.priceCents,
  currency: 'USD' as const,
  lastVerifiedAt: new Date(FIXTURE_NOW.getTime() - s.verifiedDaysAgo * 86_400_000).toISOString(),
  sourceTier: s.sourceTier,
  observations: walk(s.seed, s.days, s.baseCents, s.priceCents, s.volatility, s.outOfStock ?? []),
  competitorPriceCents: s.competitors,
  daysUntilOfferEnds: s.endsInDays,
  limitedStock: s.limitedStock,
  inStock: true,
  dataMode: 'FIXTURE' as const,
}));
