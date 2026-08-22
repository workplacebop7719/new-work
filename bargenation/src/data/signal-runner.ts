import pg from 'pg';
import { evaluateSignals, selectSignal, type PriorSignal, type SignalKind, type SignalCandidate } from '@/domain/deal-signal';
import { scoreOffer } from '@/domain/score-offer';
import type { Offer, CategorySlug } from '@/domain/types';
import type { PriceObservation } from '@/domain/price-history';
import type { SourceTier } from '@/domain/confidence';

/**
 * Sweeps every active watch and records the signals it has earned.
 *
 * Connects as `bargenation_jobs`, whose grants are narrow and enumerated in
 * migration 0007 — it can read watches, catalog and recent signals, and insert
 * new signals, and nothing else. It cannot read saved items, households or
 * preferences, cannot update or delete a signal, and has no access to schema
 * commerce.
 *
 * All decisions are made by the pure engine in domain/deal-signal.ts. This
 * module only fetches evidence and writes results, so the rules about when to
 * stay quiet live in one testable place rather than being spread through SQL.
 *
 * Deliberately NOT marked `server-only`: that guard throws outside a React
 * Server Component, and this is a batch job run from a CLI. It takes its
 * connection string as an argument rather than reading the environment, so it
 * has no ambient dependency on the web app at all.
 */

export interface SweepResult {
  watchesExamined: number;
  signalsCreated: number;
  byKind: Partial<Record<SignalKind, number>>;
}

interface WatchRow {
  item_id: string;
  profile_id: string;
  target_price_cents: number | null;
  paused: boolean;
  offer_id: string;
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

/**
 * One offer per watched product: the cheapest currently in stock. A customer
 * watching a product is watching the product, not one retailer's listing.
 */
const WATCH_SQL = `
  select distinct on (wi.id)
    wi.id as item_id,
    w.profile_id,
    wi.target_price_cents,
    wi.paused,
    o.id as offer_id, o.price_cents, o.last_verified_at, o.offer_ends_at,
    o.limited_stock, o.in_stock, o.is_sample_data,
    ds.tier as source_tier,
    p.slug as product_slug, p.name as product_name,
    b.name as brand_name, c.slug as category_slug,
    r.slug as retailer_slug, r.name as retailer_name, r.verified_partner as retailer_verified
  from watchlist_items wi
  join watchlists w   on w.id = wi.watchlist_id
  join products p     on p.id = wi.product_id
  join offers o       on o.product_id = p.id
  join categories c   on c.id = p.category_id
  join retailers r    on r.id = o.retailer_id
  join data_sources ds on ds.id = o.source_id
  left join brands b  on b.id = p.brand_id
  where wi.paused = false
    and wi.product_id is not null
  order by wi.id, o.in_stock desc, o.price_cents asc
`;

export async function sweepDealSignals(
  connectionString: string,
  now: Date = new Date(),
): Promise<SweepResult> {
  const client = new pg.Client({ connectionString });
  await client.connect();

  const result: SweepResult = { watchesExamined: 0, signalsCreated: 0, byKind: {} };

  try {
    const { rows: watches } = await client.query<WatchRow>(WATCH_SQL);
    result.watchesExamined = watches.length;
    if (watches.length === 0) return result;

    const offerIds = [...new Set(watches.map((w) => w.offer_id))];

    // History for every watched offer, in one round trip.
    const { rows: obsRows } = await client.query<{
      offer_id: string; price_cents: number; in_stock: boolean; observed_at: Date;
    }>(
      `select offer_id, price_cents, in_stock, observed_at
       from price_observations where offer_id = any($1::uuid[])
       order by observed_at asc`,
      [offerIds],
    );
    const history = new Map<string, PriceObservation[]>();
    for (const r of obsRows) {
      const list = history.get(r.offer_id) ?? [];
      list.push({
        priceCents: r.price_cents,
        inStock: r.in_stock,
        observedAt: r.observed_at.toISOString(),
      });
      history.set(r.offer_id, list);
    }

    // Competitor prices: other retailers' current offers on the same product.
    const { rows: compRows } = await client.query<{ offer_id: string; prices: number[] }>(
      `select o.id as offer_id,
              coalesce(array_agg(other.price_cents) filter (where other.id is not null), '{}') as prices
       from offers o
       left join offers other on other.product_id = o.product_id and other.id <> o.id
       where o.id = any($1::uuid[])
       group by o.id`,
      [offerIds],
    );
    const competitors = new Map(compRows.map((r) => [r.offer_id, r.prices]));

    // Recent signals per watch item, for the cooldown check.
    const { rows: priorRows } = await client.query<{
      watchlist_item_id: string; kind: string; created_at: Date;
    }>(
      `select watchlist_item_id, kind, created_at
       from deal_signals
       where watchlist_item_id = any($1::uuid[])
         and created_at > now() - interval '30 days'`,
      [watches.map((w) => w.item_id)],
    );
    const priors = new Map<string, PriorSignal[]>();
    for (const r of priorRows) {
      const list = priors.get(r.watchlist_item_id) ?? [];
      list.push({ kind: r.kind as SignalKind, createdAt: r.created_at.toISOString() });
      priors.set(r.watchlist_item_id, list);
    }

    const pending: Array<SignalCandidate & { profileId: string }> = [];

    for (const w of watches) {
      const offer: Offer = {
        id: w.offer_id,
        product: {
          slug: w.product_slug, name: w.product_name,
          brand: w.brand_name ?? '', category: w.category_slug as CategorySlug,
        },
        retailer: {
          slug: w.retailer_slug, name: w.retailer_name, verifiedPartner: w.retailer_verified,
        },
        priceCents: w.price_cents,
        currency: 'USD',
        lastVerifiedAt: w.last_verified_at.toISOString(),
        sourceTier: w.source_tier as SourceTier,
        observations: history.get(w.offer_id) ?? [],
        competitorPriceCents: competitors.get(w.offer_id) ?? [],
        daysUntilOfferEnds: w.offer_ends_at
          ? Math.max(0, Math.ceil((w.offer_ends_at.getTime() - now.getTime()) / 86_400_000))
          : null,
        limitedStock: w.limited_stock,
        inStock: w.in_stock,
        dataMode: w.is_sample_data ? 'FIXTURE' : 'LIVE',
      };

      const candidates = evaluateSignals({
        item: {
          itemId: w.item_id,
          targetPriceCents: w.target_price_cents,
          paused: w.paused,
        },
        deal: scoreOffer(offer, now),
        recentSignals: priors.get(w.item_id) ?? [],
        now,
      });

      // One signal per watch per sweep. A single drop can satisfy several
      // rules at once, and sending all of them tells the customer the same
      // news three times over — see selectSignal().
      const chosen = selectSignal(candidates);
      if (chosen) pending.push({ ...chosen, profileId: w.profile_id });
    }

    for (const signal of pending) {
      await client.query(
        `insert into deal_signals (profile_id, watchlist_item_id, offer_id, kind, message)
         values ($1, $2, $3, $4, $5)`,
        [signal.profileId, signal.itemId, signal.offerId, signal.kind, signal.message],
      );
      result.signalsCreated++;
      result.byKind[signal.kind] = (result.byKind[signal.kind] ?? 0) + 1;
    }

    return result;
  } finally {
    await client.end();
  }
}
