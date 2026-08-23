import 'server-only';
import { asCustomer } from '@/db/client';
import type { AuthUser } from '@/auth/types';

/**
 * Everything a signed-in customer owns: Saved, Watchlist, Deal Signals.
 *
 * Every query here runs through `asCustomer`, which opens a transaction and
 * sets the JWT subject GUC that migration 0003's policies read. That means
 * isolation is enforced by PostgreSQL, not by a WHERE clause somebody has to
 * remember to write — a query that forgets to filter by profile simply
 * returns the caller's own rows anyway.
 *
 * Note there is no `profileId` parameter on the read functions for that
 * reason: "whose rows are these" is not something this layer gets to decide.
 */

/** Member features need a database. Fixtures cannot store anything. */
export const memberFeaturesAvailable = Boolean(process.env.DATABASE_URL);

export class MemberFeaturesUnavailable extends Error {
  constructor() {
    super('Member features require DATABASE_URL. No database is configured.');
    this.name = 'MemberFeaturesUnavailable';
  }
}

function assertAvailable(): void {
  if (!memberFeaturesAvailable) throw new MemberFeaturesUnavailable();
}

/* ============================================================
   PROFILE
   ============================================================ */

/**
 * Ensures the signed-in customer has a profiles row.
 *
 * The auth provider owns identity; this table owns everything that hangs off
 * it. A customer who has authenticated but has no profile row would hit a
 * foreign-key error the first time they saved anything, so this runs on entry
 * to the portal.
 *
 * It inserts as the customer, not with elevated privileges: the RLS policy's
 * WITH CHECK (id = auth.uid()) means you can only ever create your own.
 */
export async function ensureProfile(user: AuthUser): Promise<void> {
  assertAvailable();
  await asCustomer(user.id, async (client) => {
    await client.query(
      `insert into profiles (id, display_name) values ($1, $2)
       on conflict (id) do update set display_name = coalesce(excluded.display_name, profiles.display_name)`,
      [user.id, user.displayName],
    );
  });
}

/* ============================================================
   SAVED — "I want to remember this" (§27)
   ============================================================ */

export interface SavedRow {
  offerId: string;
  productSlug: string;
  productName: string;
  retailerName: string;
  priceCents: number;
  savedAt: string;
}

export async function listSaved(profileId: string): Promise<SavedRow[]> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const { rows } = await client.query<{
      offer_id: string; product_slug: string; product_name: string;
      retailer_name: string; price_cents: number; created_at: Date;
    }>(
      `select s.offer_id, p.slug as product_slug, p.name as product_name,
              r.name as retailer_name, o.price_cents, s.created_at
       from saved_items s
       join offers o    on o.id = s.offer_id
       join products p  on p.id = o.product_id
       join retailers r on r.id = o.retailer_id
       order by s.created_at desc`,
    );
    return rows.map((r) => ({
      offerId: r.offer_id,
      productSlug: r.product_slug,
      productName: r.product_name,
      retailerName: r.retailer_name,
      priceCents: r.price_cents,
      savedAt: r.created_at.toISOString(),
    }));
  });
}

export async function save(profileId: string, offerId: string): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    await client.query(
      `insert into saved_items (profile_id, offer_id) values ($1, $2)
       on conflict (profile_id, offer_id) do nothing`,
      [profileId, offerId],
    );
  });
}

export async function unsave(profileId: string, offerId: string): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    // No profile_id predicate needed: RLS restricts this to the caller's rows.
    await client.query('delete from saved_items where offer_id = $1', [offerId]);
  });
}

export async function isSaved(profileId: string, offerId: string): Promise<boolean> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const { rows } = await client.query(
      'select 1 from saved_items where offer_id = $1 limit 1',
      [offerId],
    );
    return rows.length > 0;
  });
}

/* ============================================================
   WATCHLIST — "I want Bargenation monitoring this" (§25)
   ============================================================ */

export interface WatchlistItemRow {
  id: string;
  productSlug: string | null;
  productName: string | null;
  /** Set when the subject of the watch is a whole retailer rather than an item. */
  retailerSlug: string | null;
  retailerName: string | null;
  keyword: string | null;
  targetPriceCents: number | null;
  size: string | null;
  color: string | null;
  state: string;
  paused: boolean;
  createdAt: string;
}

/** Every customer has exactly one list until multiple lists are a feature. */
async function defaultWatchlistId(
  client: Parameters<Parameters<typeof asCustomer>[1]>[0],
  profileId: string,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    'select id from watchlists order by created_at asc limit 1',
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await client.query<{ id: string }>(
    'insert into watchlists (profile_id) values ($1) returning id',
    [profileId],
  );
  return created.rows[0]!.id;
}

export async function listWatchlist(profileId: string): Promise<WatchlistItemRow[]> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const { rows } = await client.query<{
      id: string; slug: string | null; name: string | null;
      retailer_slug: string | null; retailer_name: string | null;
      keyword: string | null;
      target_price_cents: number | null; size: string | null; color: string | null;
      state: string; paused: boolean; created_at: Date;
    }>(
      `select w.id, p.slug, p.name,
              rt.slug as retailer_slug, rt.name as retailer_name,
              w.keyword, w.target_price_cents,
              w.size, w.color, w.state, w.paused, w.created_at
       from watchlist_items w
       left join products p on p.id = w.product_id
       left join retailers rt on rt.id = w.retailer_id
       order by w.created_at desc`,
    );
    return rows.map((r) => ({
      id: r.id,
      productSlug: r.slug,
      productName: r.name,
      retailerSlug: r.retailer_slug,
      retailerName: r.retailer_name,
      keyword: r.keyword,
      targetPriceCents: r.target_price_cents,
      size: r.size,
      color: r.color,
      state: r.state,
      paused: r.paused,
      createdAt: r.created_at.toISOString(),
    }));
  });
}

export async function watchProduct(
  profileId: string,
  productSlug: string,
  options: { targetPriceCents?: number | null; size?: string | null } = {},
): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    const listId = await defaultWatchlistId(client, profileId);
    // Idempotent by product: the deal page is statically rendered and cannot
    // know whether this customer already watches the item, so pressing Watch
    // twice must update the target rather than create a duplicate row.
    await client.query(
      `insert into watchlist_items (watchlist_id, product_id, target_price_cents, size)
       select $1, p.id, $3, $4
       from products p
       where p.slug = $2
         and not exists (
           select 1 from watchlist_items existing
           where existing.watchlist_id = $1 and existing.product_id = p.id
         )`,
      [listId, productSlug, options.targetPriceCents ?? null, options.size ?? null],
    );
    await client.query(
      `update watchlist_items w set target_price_cents = coalesce($3, w.target_price_cents)
       from products p
       where p.slug = $2 and w.product_id = p.id and w.watchlist_id = $1`,
      [listId, productSlug, options.targetPriceCents ?? null],
    );
  });
}

/**
 * Watch a whole retailer (§25, §43).
 *
 * `watchlist_items` has carried `retailer_id` since migration 0003 and its
 * `watchlist_item_has_subject` check already accepts it as a subject on its
 * own, so nothing about the schema changes here — this is the surface that
 * finally uses it.
 *
 * Idempotent by retailer for the same reason `watchProduct` is: the retailer
 * page is statically rendered and cannot know whether this customer already
 * watches the store, so pressing Watch twice must not create a second row.
 *
 * Note the insert selects the retailer id from `retailers` rather than
 * accepting one from the caller. A slug that does not exist inserts nothing
 * instead of failing loudly, which matters because the slug arrives in a form
 * field.
 */
export async function watchRetailer(profileId: string, retailerSlug: string): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    const listId = await defaultWatchlistId(client, profileId);
    await client.query(
      `insert into watchlist_items (watchlist_id, retailer_id)
       select $1, r.id
       from retailers r
       where r.slug = $2
         and not exists (
           select 1 from watchlist_items existing
           where existing.watchlist_id = $1 and existing.retailer_id = r.id
         )`,
      [listId, retailerSlug],
    );
  });
}

export async function isWatchingRetailer(
  profileId: string, retailerSlug: string,
): Promise<boolean> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const { rows } = await client.query(
      `select 1 from watchlist_items w
       join retailers r on r.id = w.retailer_id
       where r.slug = $1 limit 1`,
      [retailerSlug],
    );
    return rows.length > 0;
  });
}

export async function unwatch(profileId: string, itemId: string): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    await client.query('delete from watchlist_items where id = $1', [itemId]);
  });
}

export async function setWatchPaused(
  profileId: string, itemId: string, paused: boolean,
): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    await client.query('update watchlist_items set paused = $2 where id = $1', [itemId, paused]);
  });
}

export async function isWatching(profileId: string, productSlug: string): Promise<boolean> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const { rows } = await client.query(
      `select 1 from watchlist_items w
       join products p on p.id = w.product_id
       where p.slug = $1 limit 1`,
      [productSlug],
    );
    return rows.length > 0;
  });
}

/* ============================================================
   DEAL SIGNALS (§26)
   ============================================================ */

export interface DealSignalRow {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  productSlug: string | null;
}

export async function listDealSignals(profileId: string): Promise<DealSignalRow[]> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const { rows } = await client.query<{
      id: string; kind: string; message: string;
      created_at: Date; read_at: Date | null; slug: string | null;
    }>(
      `select d.id, d.kind, d.message, d.created_at, d.read_at, p.slug
       from deal_signals d
       left join offers o   on o.id = d.offer_id
       left join products p on p.id = o.product_id
       order by d.created_at desc
       limit 100`,
    );
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      message: r.message,
      createdAt: r.created_at.toISOString(),
      readAt: r.read_at?.toISOString() ?? null,
      productSlug: r.slug,
    }));
  });
}

export async function markSignalRead(profileId: string, signalId: string): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    await client.query('update deal_signals set read_at = now() where id = $1', [signalId]);
  });
}
