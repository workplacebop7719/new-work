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
  /** Who this watch is for, when the customer said. */
  forMemberId: string | null;
  forNickname: string | null;
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
      for_member_id: string | null; for_nickname: string | null;
      keyword: string | null;
      target_price_cents: number | null; size: string | null; color: string | null;
      state: string; paused: boolean; created_at: Date;
    }>(
      `select w.id, p.slug, p.name,
              rt.slug as retailer_slug, rt.name as retailer_name,
              hm.id as for_member_id, hm.nickname as for_nickname,
              w.keyword, w.target_price_cents,
              w.size, w.color, w.state, w.paused, w.created_at
       from watchlist_items w
       left join products p on p.id = w.product_id
       left join retailers rt on rt.id = w.retailer_id
       left join household_members hm on hm.id = w.household_member_id
       order by w.created_at desc`,
    );
    return rows.map((r) => ({
      id: r.id,
      productSlug: r.slug,
      productName: r.name,
      retailerSlug: r.retailer_slug,
      retailerName: r.retailer_name,
      forMemberId: r.for_member_id,
      forNickname: r.for_nickname,
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

/* ============================================================
   WHAT WE HOLD, AND GIVING IT BACK (§37)
   ============================================================ */

/**
 * Everything this customer's account contains, as plain data.
 *
 * Runs as the customer, so row level security decides the scope rather than a
 * WHERE clause somebody has to remember — an export that accidentally read
 * another household would be the worst possible bug in this function, and the
 * database refuses it before the query author can get it wrong.
 *
 * Deliberately NOT included: price observations, offers and Value Index
 * components. They are our record of what things cost, identical for every
 * customer, and are not personal data — padding an export with them would
 * make it look thorough while burying the four things that are actually
 * about a person.
 */
export interface AccountExport {
  exportedAt: string;
  profile: { id: string; displayName: string | null; createdAt: string };
  household: {
    name: string | null;
    members: Array<{
      nickname: string | null;
      birthYear: number | null;
      clothingSize: string | null;
      shoeSize: string | null;
    }>;
  } | null;
  saved: SavedRow[];
  watchlist: WatchlistItemRow[];
  /** What we noticed, when the customer turned that on. */
  noticed: InterestRow[];
  dealSignals: Array<{ kind: string; message: string; createdAt: string; readAt: string | null }>;
}

export async function exportAccount(profileId: string): Promise<AccountExport> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const profile = await client.query<{ id: string; display_name: string | null; created_at: Date }>(
      'select id, display_name, created_at from profiles',
    );
    const row = profile.rows[0];
    if (!row) throw new Error('no profile for the signed-in customer');

    const households = await client.query<{ id: string; name: string | null }>(
      'select id, name from households order by created_at asc limit 1',
    );
    const house = households.rows[0];

    const members = house
      ? await client.query<{
          nickname: string | null; birth_year: number | null;
          clothing_size: string | null; shoe_size: string | null;
        }>(
          `select nickname, birth_year, clothing_size, shoe_size
           from household_members where household_id = $1 order by created_at asc`,
          [house.id],
        )
      : { rows: [] };

    const signals = await client.query<{
      kind: string; message: string; created_at: Date; read_at: Date | null;
    }>('select kind, message, created_at, read_at from deal_signals order by created_at desc');

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: row.id,
        displayName: row.display_name,
        createdAt: row.created_at.toISOString(),
      },
      household: house
        ? {
            name: house.name,
            members: members.rows.map((m) => ({
              nickname: m.nickname,
              birthYear: m.birth_year,
              clothingSize: m.clothing_size,
              shoeSize: m.shoe_size,
            })),
          }
        : null,
      saved: await listSaved(profileId),
      watchlist: await listWatchlist(profileId),
      noticed: await listInterests(profileId),
      dealSignals: signals.rows.map((sig) => ({
        kind: sig.kind,
        message: sig.message,
        createdAt: sig.created_at.toISOString(),
        readAt: sig.read_at ? sig.read_at.toISOString() : null,
      })),
    };
  });
}

/**
 * Why an account could not be erased, when it could not.
 *
 * Branded rather than identified by `instanceof`, for the same reason
 * AuthError is: this class is read from a `'use server'` module, which Next
 * bundles into a different graph, so the class object there is not this one.
 * That exact mistake made every auth error render the wrong message for
 * weeks — see docs/AUTH.md.
 */
const NOT_ERASABLE_BRAND = 'bargenation.AccountNotErasable';

export class AccountNotErasable extends Error {
  readonly brand = NOT_ERASABLE_BRAND;

  constructor(readonly why: string) {
    super(why);
    this.name = 'AccountNotErasable';
  }
}

export function isAccountNotErasable(err: unknown): err is AccountNotErasable {
  if (typeof err !== 'object' || err === null) return false;
  const candidate = err as { brand?: unknown; why?: unknown };
  return candidate.brand === NOT_ERASABLE_BRAND && typeof candidate.why === 'string';
}

/**
 * Erases the profile row, and with it everything that hangs off it.
 *
 * Households, household members, watchlists, watchlist items, saved items,
 * Deal Signals and preferences all cascade from `profiles`, so this is one
 * DELETE rather than a list somebody has to keep in step with the schema. A
 * new customer-owned table added without `on delete cascade` would be a leak,
 * and a test asserts nothing survives.
 *
 * Two things deliberately do NOT go, and the UI says both:
 *
 *   A newsletter subscription. `newsletter_subscribers.profile_id` is
 *   `on delete set null`, because subscribing was a separate act of consent
 *   with its own evidentiary record (§41). Deleting an account must not
 *   silently revoke a consent the customer gave elsewhere — nor keep it
 *   secretly. The account page links to the unsubscribe page.
 *
 *   Staff audit rows. `admin_actions.actor_id` is `on delete restrict`, so an
 *   operator who has released or discarded a price cannot be erased. That is
 *   the audit trail refusing to lose its author, which is correct, and this
 *   reports it as a reason rather than a database error.
 */
export async function eraseAccount(profileId: string): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    try {
      await client.query('delete from profiles where id = $1', [profileId]);
    } catch (err) {
      const code = (err as { code?: string }).code;
      // 23503 = foreign_key_violation, which here means an audit row holds it.
      if (code === '23503') {
        throw new AccountNotErasable(
          'This account has taken recorded operator actions, and the audit trail cannot lose its author.',
        );
      }
      throw err;
    }
  });
}

/* ============================================================
   INTEREST — WHAT WE NOTICED (§26, §37, §52)
   ============================================================ */

/**
 * Recording interest is OPT IN, and this is the only door to it.
 *
 * Nothing is written for a signed-out visitor, and nothing is written for a
 * signed-in customer who has not turned it on. The check lives here rather
 * than at the call site so that a new surface which forgets to ask still
 * records nothing — the safe default is the one you get by not thinking about
 * it.
 *
 * What is stored is a COUNT PER DAY, never an instant. No IP, no user agent,
 * no referrer, no session id, no dwell time. Enough to tell "came back four
 * times" from "glanced once", and not enough to reconstruct an afternoon.
 */
export type InterestKind = 'VIEWED' | 'SEARCHED' | 'CONSIDERED';

export const BEHAVIOUR_ALERTS_KEY = 'behaviourAlerts';

export async function behaviourAlertsEnabled(profileId: string): Promise<boolean> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const { rows } = await client.query<{ settings: Record<string, unknown> }>(
      'select settings from preferences limit 1',
    );
    return rows[0]?.settings?.[BEHAVIOUR_ALERTS_KEY] === true;
  });
}

export async function setBehaviourAlerts(profileId: string, enabled: boolean): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    await client.query(
      `insert into preferences (profile_id, settings)
       values ($1, jsonb_build_object($2::text, $3::boolean))
       on conflict (profile_id) do update
         set settings = preferences.settings || jsonb_build_object($2::text, $3::boolean),
             updated_at = now()`,
      [profileId, BEHAVIOUR_ALERTS_KEY, enabled],
    );

    // Turning it off is not a promise to stop collecting — it is a promise
    // that what was collected is gone. Anything less makes the switch a
    // setting rather than a decision.
    if (!enabled) await client.query('delete from interest_events');
  });
}

export async function recordInterest(
  profileId: string, subject: { productSlug: string }, kind: InterestKind = 'VIEWED',
): Promise<void> {
  if (!memberFeaturesAvailable) return;
  if (!(await behaviourAlertsEnabled(profileId))) return;

  await asCustomer(profileId, async (client) => {
    await client.query(
      `insert into interest_events (profile_id, product_id, kind)
       select $1, p.id, $3 from products p where p.slug = $2
       on conflict (profile_id, product_id, category_id, kind, observed_on)
         do update set occurrences = interest_events.occurrences + 1`,
      [profileId, subject.productSlug, kind],
    );
  });
}

export interface InterestRow {
  productSlug: string | null;
  productName: string | null;
  kind: string;
  occurrences: number;
  lastSeenOn: string;
}

/** Summed per product, which is the shape the domain layer reasons about. */
export async function listInterests(profileId: string): Promise<InterestRow[]> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const { rows } = await client.query<{
      slug: string | null; name: string | null; kind: string;
      occurrences: string; last_seen: Date;
    }>(
      `select p.slug, p.name, i.kind,
              sum(i.occurrences) as occurrences,
              max(i.observed_on) as last_seen
       from interest_events i
       left join products p on p.id = i.product_id
       group by p.slug, p.name, i.kind
       order by sum(i.occurrences) desc, p.slug asc`,
    );
    return rows.map((r) => ({
      productSlug: r.slug,
      productName: r.name,
      kind: r.kind,
      occurrences: Number(r.occurrences),
      lastSeenOn: r.last_seen.toISOString().slice(0, 10),
    }));
  });
}

export async function clearInterests(profileId: string): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    // No predicate: RLS scopes it to the caller's own rows.
    await client.query('delete from interest_events');
  });
}

/**
 * Membership, which is a flag and not a payments integration.
 *
 * There is no way to buy this — no provider is configured and the price is
 * not decided. An operator sets it for a real member once both exist. The
 * account page says exactly that rather than showing an upgrade button that
 * goes nowhere (§01).
 */
export async function readMembership(profileId: string): Promise<'FREE' | 'MEMBER'> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const { rows } = await client.query<{ membership: string }>(
      'select membership from profiles limit 1',
    );
    return rows[0]?.membership === 'MEMBER' ? 'MEMBER' : 'FREE';
  });
}

/* ============================================================
   HOUSEHOLD (§35, §37)
   ============================================================ */

/**
 * Who you are shopping for.
 *
 * The reason this exists at all: a coat in the wrong size is not a bargain,
 * however good the Value Index. A household turns "this is 60% off" into
 * "this is 60% off and it is the size your eldest actually wears".
 *
 * READ THE ABSENCES AS THE DESIGN. There is no legal name, no date of birth,
 * no school, no address, no medical field and no government identifier — and
 * not because we chose not to ask. The columns do not exist, so there is
 * nothing to lose, nothing to be compelled to produce and nothing to
 * mis-sell. A nickname is enough to size a coat and a birth year is enough to
 * judge whether a toy suits.
 *
 * Everything here runs as the customer, so a household is reachable only by
 * the profile that owns it — enforced by the policy in migration 0003, not by
 * a WHERE clause somebody has to remember.
 */
export interface HouseholdMemberRow {
  id: string;
  nickname: string | null;
  birthYear: number | null;
  clothingSize: string | null;
  shoeSize: string | null;
}

export interface HouseholdRow {
  id: string;
  name: string | null;
  members: HouseholdMemberRow[];
}

/** Nothing about a person should be longer than this, and a size never is. */
export const MAX_HOUSEHOLD_FIELD = 40;

/**
 * A birth year we will accept.
 *
 * The lower bound is not a guess at longevity — it is the point below which a
 * value is far more likely to be a typo or a date pasted into the wrong box
 * than a real answer, and a wrong year quietly produces wrong size advice.
 */
export const EARLIEST_BIRTH_YEAR = 1900;

const trimmed = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const clean = value.trim().slice(0, MAX_HOUSEHOLD_FIELD);
  return clean.length > 0 ? clean : null;
};

function parseBirthYear(value: unknown, now: Date): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const year = Number(value.trim());
  if (!Number.isInteger(year)) return null;
  // A year in the future is not a person who exists yet.
  if (year < EARLIEST_BIRTH_YEAR || year > now.getUTCFullYear()) return null;
  return year;
}

/** One household per customer until sharing is a feature, same as watchlists. */
async function householdId(
  client: Parameters<Parameters<typeof asCustomer>[1]>[0],
  profileId: string,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    'select id from households order by created_at asc limit 1',
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await client.query<{ id: string }>(
    'insert into households (owner_profile_id) values ($1) returning id',
    [profileId],
  );
  return created.rows[0]!.id;
}

export async function readHousehold(profileId: string): Promise<HouseholdRow | null> {
  assertAvailable();
  return asCustomer(profileId, async (client) => {
    const houses = await client.query<{ id: string; name: string | null }>(
      'select id, name from households order by created_at asc limit 1',
    );
    const house = houses.rows[0];
    if (!house) return null;

    const members = await client.query<{
      id: string; nickname: string | null; birth_year: number | null;
      clothing_size: string | null; shoe_size: string | null;
    }>(
      `select id, nickname, birth_year, clothing_size, shoe_size
       from household_members where household_id = $1 order by created_at asc`,
      [house.id],
    );

    return {
      id: house.id,
      name: house.name,
      members: members.rows.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        birthYear: m.birth_year,
        clothingSize: m.clothing_size,
        shoeSize: m.shoe_size,
      })),
    };
  });
}

export interface HouseholdMemberInput {
  nickname?: string | null;
  birthYear?: string | null;
  clothingSize?: string | null;
  shoeSize?: string | null;
}

/**
 * Every field is optional, including the nickname.
 *
 * Somebody who only knows their child's shoe size should be able to say that
 * and nothing else. Requiring a name to record a size would be asking for
 * more about a child than the feature needs, which is the exact failure this
 * table's shape exists to prevent.
 */
export async function addHouseholdMember(
  profileId: string, input: HouseholdMemberInput, now: Date = new Date(),
): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    const id = await householdId(client, profileId);
    await client.query(
      `insert into household_members
         (household_id, nickname, birth_year, clothing_size, shoe_size)
       values ($1, $2, $3, $4, $5)`,
      [
        id,
        trimmed(input.nickname),
        parseBirthYear(input.birthYear, now),
        trimmed(input.clothingSize),
        trimmed(input.shoeSize),
      ],
    );
  });
}

export async function updateHouseholdMember(
  profileId: string, memberId: string, input: HouseholdMemberInput, now: Date = new Date(),
): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    // No household predicate: RLS on household_members already restricts this
    // to households the caller owns, so naming somebody else's member id
    // updates nothing rather than updating theirs.
    await client.query(
      `update household_members
         set nickname = $2, birth_year = $3, clothing_size = $4, shoe_size = $5
       where id = $1`,
      [
        memberId,
        trimmed(input.nickname),
        parseBirthYear(input.birthYear, now),
        trimmed(input.clothingSize),
        trimmed(input.shoeSize),
      ],
    );
  });
}

/**
 * Removing somebody removes them, and leaves their watches alone.
 *
 * `watchlist_items.household_member_id` is `on delete set null`, so a watch
 * that was "coat for the eldest" becomes simply "coat". Deleting the child
 * must not silently delete the shopping — and the watch losing a name is the
 * honest outcome, rather than pointing at somebody who is gone.
 */
export async function removeHouseholdMember(profileId: string, memberId: string): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    await client.query('delete from household_members where id = $1', [memberId]);
  });
}

/** Attaches a watch to a person, or detaches it when memberId is null. */
export async function setWatchFor(
  profileId: string, itemId: string, memberId: string | null,
): Promise<void> {
  assertAvailable();
  await asCustomer(profileId, async (client) => {
    // The subquery is the guard: naming another household's member id sets
    // null rather than borrowing them, because that select returns nothing.
    await client.query(
      `update watchlist_items
         set household_member_id = (select id from household_members where id = $2)
       where id = $1`,
      [itemId, memberId],
    );
  });
}
