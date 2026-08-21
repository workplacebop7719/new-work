/**
 * PostgreSQL adapter.
 *
 * Loads offers and their recorded observations, then hands them to the exact
 * same `scoreOffer` the fixture adapter uses. The database supplies evidence;
 * it never supplies a score. There is deliberately no query here that reads a
 * stored Value Index for display — scores are recomputed from observations,
 * so a stale or tampered score row cannot reach a customer.
 *
 * Note what is absent: no join to `commerce`. The app role has no grant on
 * that schema, so a query reaching for a commission rate fails loudly rather
 * than quietly influencing anything.
 */
import type { Deal, CategorySlug, Retailer, Offer } from '@/domain/types';
import type { PriceObservation } from '@/domain/price-history';
import type { SourceTier } from '@/domain/confidence';
import { scoreOffer } from '@/domain/score-offer';
import { getPool } from '@/db/client';
import { selectors, type DealRepository } from './repository-types';

interface OfferRow {
  id: string;
  price_cents: number;
  last_verified_at: Date;
  offer_ends_at: Date | null;
  limited_stock: boolean | null;
  in_stock: boolean;
  is_sample_data: boolean;
  source_tier: number;
  product_slug: string;
  product_name: string;
  brand_name: string | null;
  category_slug: string;
  retailer_slug: string;
  retailer_name: string;
  retailer_verified: boolean;
}

const OFFER_SELECT = `
  select
    o.id, o.price_cents, o.last_verified_at, o.offer_ends_at, o.limited_stock,
    o.in_stock, o.is_sample_data,
    ds.tier                as source_tier,
    p.slug                 as product_slug,
    p.name                 as product_name,
    b.name                 as brand_name,
    c.slug                 as category_slug,
    r.slug                 as retailer_slug,
    r.name                 as retailer_name,
    r.verified_partner     as retailer_verified
  from offers o
  join products    p  on p.id  = o.product_id
  join categories  c  on c.id  = p.category_id
  join retailers   r  on r.id  = o.retailer_id
  join data_sources ds on ds.id = o.source_id
  left join brands b  on b.id  = p.brand_id
`;

const daysUntil = (date: Date | null, now: Date): number | null =>
  date === null ? null : Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 86_400_000));

async function loadDeals(where = '', params: unknown[] = []): Promise<Deal[]> {
  const pool = getPool();
  const now = new Date();

  const offers = await pool.query<OfferRow>(`${OFFER_SELECT} ${where}`, params);
  if (offers.rows.length === 0) return [];

  const ids = offers.rows.map((r) => r.id);

  // One round trip for all history rather than one per offer.
  const obs = await pool.query<{
    offer_id: string; price_cents: number; in_stock: boolean; observed_at: Date;
  }>(
    `select offer_id, price_cents, in_stock, observed_at
     from price_observations
     where offer_id = any($1::uuid[])
     order by observed_at asc`,
    [ids],
  );

  const history = new Map<string, PriceObservation[]>();
  for (const row of obs.rows) {
    const list = history.get(row.offer_id) ?? [];
    list.push({
      priceCents: row.price_cents,
      inStock: row.in_stock,
      observedAt: row.observed_at.toISOString(),
    });
    history.set(row.offer_id, list);
  }

  // Current prices at other retailers for the same product — the comparison
  // that Market Competitiveness is measured from.
  const competitors = await pool.query<{ offer_id: string; prices: number[] }>(
    `select o.id as offer_id,
            coalesce(array_agg(other.price_cents) filter (where other.id is not null), '{}') as prices
     from offers o
     left join offers other
       on other.product_id = o.product_id and other.id <> o.id
     where o.id = any($1::uuid[])
     group by o.id`,
    [ids],
  );
  const compare = new Map(competitors.rows.map((r) => [r.offer_id, r.prices]));

  return offers.rows
    .map((row) => {
      const offer: Offer = {
        id: row.id,
        product: {
          slug: row.product_slug,
          name: row.product_name,
          brand: row.brand_name ?? '',
          category: row.category_slug as CategorySlug,
        },
        retailer: {
          slug: row.retailer_slug,
          name: row.retailer_name,
          verifiedPartner: row.retailer_verified,
        },
        priceCents: row.price_cents,
        currency: 'USD',
        lastVerifiedAt: row.last_verified_at.toISOString(),
        sourceTier: row.source_tier as SourceTier,
        observations: history.get(row.id) ?? [],
        competitorPriceCents: compare.get(row.id) ?? [],
        daysUntilOfferEnds: daysUntil(row.offer_ends_at, now),
        limitedStock: row.limited_stock,
        inStock: row.in_stock,
        dataMode: row.is_sample_data ? 'FIXTURE' : 'LIVE',
      };
      return scoreOffer(offer, now);
    })
    .sort(selectors.byScoreDesc);
}

export const postgresRepository: DealRepository = {
  async getDeals(category) {
    return category ? loadDeals('where c.slug = $1', [category]) : loadDeals();
  },
  async getDeal(slug) {
    const [deal] = await loadDeals('where p.slug = $1', [slug]);
    return deal ?? null;
  },
  async getStandout() {
    return (await loadDeals()).find(selectors.isStandout) ?? null;
  },
  async getMadeTheCut() {
    return (await loadDeals()).filter(selectors.madeTheCut);
  },
  async getWeWouldHold() {
    return (await loadDeals()).filter(selectors.weWouldHold);
  },
  async getWithheld() {
    return (await loadDeals()).filter(selectors.withheld);
  },
  async getRetailers(): Promise<Retailer[]> {
    const { rows } = await getPool().query<{
      slug: string; name: string; verified_partner: boolean;
    }>('select slug, name, verified_partner from retailers order by name');
    return rows.map((r) => ({
      slug: r.slug, name: r.name, verifiedPartner: r.verified_partner,
    }));
  },
  async searchDeals(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (await loadDeals()).filter((d) => selectors.matchesQuery(d, q));
  },
};
