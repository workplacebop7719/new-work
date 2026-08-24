import pg from 'pg';
import { noticeSomething, type InterestRecord } from '@/domain/interest';
import { deliverableAt, isValidQuietHours, type QuietHours } from '@/domain/quiet-hours';
import {
  evaluateSignals,
  evaluateRetailerWatch,
  selectSignal,
  type PriorSignal,
  type SignalKind,
  type SignalCandidate,
} from '@/domain/deal-signal';
import { scoreOffer } from '@/domain/score-offer';
import type { Deal, Offer, CategorySlug } from '@/domain/types';
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
  /** Members whose interest history was looked at. Free customers are not. */
  membersExamined: number;
  /** Of those, watches whose subject is a whole retailer rather than an item. */
  retailerWatchesExamined: number;
  /** Expired rate-limit counters and spent challenges removed. */
  housekeepingRemoved: number;
  /** Signals recorded but held until the customer's quiet hours end (§36). */
  deferred: number;
  /** Held observations discarded because nobody reviewed them in time. */
  quarantineExpired: number;
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
  retailer_id: string;
  retailer_slug: string;
  retailer_name: string;
  retailer_verified: boolean;
}

/**
 * One offer per watched product: the cheapest currently in stock. A customer
 * watching a product is watching the product, not one retailer's listing.
 */
/**
 * Exported ONLY so a test can ask the real query which watches it returns.
 *
 * The alternative was a test that re-implemented the `paused` predicate and
 * then asserted its own SQL agreed with itself, which proves nothing about
 * this string — the one that actually decides.
 */
export const WATCH_SQL = `
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
    r.id as retailer_id, r.slug as retailer_slug, r.name as retailer_name,
    r.verified_partner as retailer_verified
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

interface RetailerWatchRow {
  item_id: string;
  profile_id: string;
  paused: boolean;
  retailer_id: string;
}

/**
 * Watches whose subject is a whole store (§43).
 *
 * `product_id is null` is not redundant beside `retailer_id is not null`. The
 * schema permits a row carrying both, and such a row is already handled by
 * WATCH_SQL above — without this predicate it would be swept twice and could
 * produce two signals for one watch in a single pass.
 */
const RETAILER_WATCH_SQL = `
  select wi.id as item_id, w.profile_id, wi.paused, wi.retailer_id
  from watchlist_items wi
  join watchlists w on w.id = wi.watchlist_id
  where wi.paused = false
    and wi.product_id is null
    and wi.retailer_id is not null
`;

/** Every offer at a set of retailers, in the same shape a watch row carries. */
const OFFERS_AT_RETAILER_SQL = `
  select
    o.id as offer_id, o.price_cents, o.last_verified_at, o.offer_ends_at,
    o.limited_stock, o.in_stock, o.is_sample_data,
    ds.tier as source_tier,
    p.slug as product_slug, p.name as product_name,
    b.name as brand_name, c.slug as category_slug,
    r.id as retailer_id, r.slug as retailer_slug, r.name as retailer_name,
    r.verified_partner as retailer_verified
  from offers o
  join products p      on p.id = o.product_id
  join categories c    on c.id = p.category_id
  join retailers r     on r.id = o.retailer_id
  join data_sources ds on ds.id = o.source_id
  left join brands b   on b.id = p.brand_id
  where o.retailer_id = any($1::uuid[])
`;

type OfferRow = Omit<WatchRow, 'item_id' | 'profile_id' | 'target_price_cents' | 'paused'>;

/**
 * Assembles the domain Offer both sweeps score.
 *
 * Extracted so a retailer watch and a product watch cannot drift into
 * evaluating subtly different offers — a difference there would show up as
 * two different Value Indexes for the same listing depending on how the
 * customer happened to be watching it.
 */
function toOffer(
  row: OfferRow,
  history: Map<string, PriceObservation[]>,
  competitors: Map<string, number[]>,
  now: Date,
): Offer {
  return {
    id: row.offer_id,
    product: {
      slug: row.product_slug, name: row.product_name,
      brand: row.brand_name ?? '', category: row.category_slug as CategorySlug,
    },
    retailer: {
      slug: row.retailer_slug, name: row.retailer_name, verifiedPartner: row.retailer_verified,
    },
    priceCents: row.price_cents,
    currency: 'USD',
    lastVerifiedAt: row.last_verified_at.toISOString(),
    sourceTier: row.source_tier as SourceTier,
    observations: history.get(row.offer_id) ?? [],
    competitorPriceCents: competitors.get(row.offer_id) ?? [],
    daysUntilOfferEnds: row.offer_ends_at
      ? Math.max(0, Math.ceil((row.offer_ends_at.getTime() - now.getTime()) / 86_400_000))
      : null,
    limitedStock: row.limited_stock,
    inStock: row.in_stock,
    dataMode: row.is_sample_data ? 'FIXTURE' : 'LIVE',
  };
}

export async function sweepDealSignals(
  connectionString: string,
  now: Date = new Date(),
): Promise<SweepResult> {
  const client = new pg.Client({ connectionString });
  await client.connect();

  const result: SweepResult = {
    watchesExamined: 0,
    membersExamined: 0,
    retailerWatchesExamined: 0,
    housekeepingRemoved: 0,
    deferred: 0,
    quarantineExpired: 0,
    signalsCreated: 0,
    byKind: {},
  };

  try {
    /**
     * Housekeeping first, and unconditionally.
     *
     * Rate-limit counters and spent challenge signatures are short-lived by
     * design, and nothing else in the system is scheduled. Putting this behind
     * "if there are watches to sweep" would mean an installation with no
     * watches never prunes anything — the rows would accumulate forever
     * precisely where nobody was looking.
     */
    const { rows: pruned } = await client.query<{ prune_rate_limits: number }>(
      'select prune_rate_limits()',
    );
    result.housekeepingRemoved = pruned[0]?.prune_rate_limits ?? 0;

    // A held price nobody reviewed is DISCARDED, never released: time does not
    // confirm an observation we could not confirm. See migration 0019.
    const { rows: expired } = await client.query<{ expire_quarantine: number }>(
      'select expire_quarantine()',
    );
    result.quarantineExpired = expired[0]?.expire_quarantine ?? 0;

    const [{ rows: watches }, { rows: retailerWatches }] = await Promise.all([
      client.query<WatchRow>(WATCH_SQL),
      client.query<RetailerWatchRow>(RETAILER_WATCH_SQL),
    ]);
    result.watchesExamined = watches.length;
    result.retailerWatchesExamined = retailerWatches.length;

    /*
     * THERE IS NO EARLY RETURN HERE, AND THAT IS THE FIX FOR A REAL BUG.
     *
     * This used to be `if (watches.length === 0 && retailerWatches.length === 0)
     * return result;` — a sensible-looking optimisation that silently turned
     * off interest alerts. The interest sweep lives below and has nothing to
     * do with watchlists: a member with behaviour alerts on and a history of
     * returning to the same product got NOTHING, from a job that reported
     * success, whenever nobody in the entire installation happened to hold a
     * watchlist item.
     *
     * That is not a rare state. It is the state at launch, and it is the state
     * of any quiet week — precisely when the paid-for half of membership is
     * the only thing running.
     *
     * It surfaced as an intermittent test failure rather than a bug report,
     * because on a database with leftover rows from other suites there was
     * always a watch, and on a freshly reset one there was not.
     *
     * Every query below is `= any($1::uuid[])` and answers instantly on an
     * empty array, so the cost of removing the shortcut is a handful of
     * trivial round trips on an idle installation. The cost of keeping it was
     * a feature that did not run.
     */

    // Every offer at a watched store, so a retailer watch can look across the
    // whole shelf rather than at one listing.
    const retailerIds = [...new Set(retailerWatches.map((w) => w.retailer_id))];
    const { rows: retailerOffers } = retailerIds.length
      ? await client.query<OfferRow>(OFFERS_AT_RETAILER_SQL, [retailerIds])
      : { rows: [] as OfferRow[] };

    const offerIds = [
      ...new Set([...watches.map((w) => w.offer_id), ...retailerOffers.map((o) => o.offer_id)]),
    ];
    const itemIds = [
      ...watches.map((w) => w.item_id),
      ...retailerWatches.map((w) => w.item_id),
    ];

    // History for every offer in play, in one round trip.
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

    // Recent signals per watch item, for the cooldown check — and, for
    // retailer watches, for which offers this watch has already announced.
    // The window is wider than any cooldown because that second question has
    // a longer memory: a store's flagship item should not be re-announced
    // every fortnight for as long as it stays strong. Widening it cannot
    // affect cooldown or the quiet period, both of which read only the most
    // recent row.
    const { rows: priorRows } = await client.query<{
      watchlist_item_id: string; kind: string; created_at: Date; offer_id: string | null;
    }>(
      `select watchlist_item_id, kind, created_at, offer_id
       from deal_signals
       where watchlist_item_id = any($1::uuid[])
         and created_at > now() - interval '180 days'`,
      [itemIds],
    );
    const priors = new Map<string, PriorSignal[]>();
    const announced = new Map<string, string[]>();
    for (const r of priorRows) {
      const list = priors.get(r.watchlist_item_id) ?? [];
      list.push({ kind: r.kind as SignalKind, createdAt: r.created_at.toISOString() });
      priors.set(r.watchlist_item_id, list);

      if (r.offer_id) {
        const seen = announced.get(r.watchlist_item_id) ?? [];
        seen.push(r.offer_id);
        announced.set(r.watchlist_item_id, seen);
      }
    }

    const pending: Array<SignalCandidate & { profileId: string }> = [];

    for (const w of watches) {
      const offer = toOffer(w, history, competitors, now);

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

    // Score every retailer's shelf once, not once per customer watching it.
    const shelves = new Map<string, Deal[]>();
    for (const row of retailerOffers) {
      const list = shelves.get(row.retailer_id) ?? [];
      list.push(scoreOffer(toOffer(row, history, competitors, now), now));
      shelves.set(row.retailer_id, list);
    }

    for (const w of retailerWatches) {
      const chosen = evaluateRetailerWatch({
        item: { itemId: w.item_id, targetPriceCents: null, paused: w.paused },
        deals: shelves.get(w.retailer_id) ?? [],
        recentSignals: priors.get(w.item_id) ?? [],
        announcedOfferIds: announced.get(w.item_id) ?? [],
        now,
      });
      if (chosen) pending.push({ ...chosen, profileId: w.profile_id });
    }

    /* ------------------------------------------------------------
       INTEREST (§26, §52)

       Membership adds INFERENCE. It never subtracts SERVICE — every watch
       above was evaluated before this block runs, with no knowledge of who is
       paying, and nothing here can change or delay one of them. This looks at
       the things a member never got round to adding.

       Interest is read only for customers who turned it on AND are members.
       A free customer's interest history is never read here at all, which is
       both the honest reading of consent and the cheapest way to be sure the
       distinction cannot leak into the paths above.
       ------------------------------------------------------------ */
    // Asks a question rather than reading a table. Migration 0007 denies this
    // role `profiles` and `preferences` outright, and it was right to — the
    // first version of this block read both and was refused. The function
    // returns ids and nothing else; see migration 0015.
    const { rows: members } = await client.query<{ profile_id: string }>(
      'select interest_alert_recipients() as profile_id',
    );
    result.membersExamined = members.length;

    if (members.length > 0) {
      const memberIds = members.map((m) => m.profile_id);

      // Both subjects, in one pass. An inner join on products used to be here,
      // which silently dropped every category interest before the domain layer
      // could see it — the weaker inference existed in the schema and could
      // never fire.
      const { rows: interestRows } = await client.query<{
        profile_id: string; slug: string | null; category_slug: string | null; kind: string;
        occurrences: string; last_seen: Date;
      }>(
        `select i.profile_id, p.slug, c.slug as category_slug, i.kind,
                sum(i.occurrences) as occurrences, max(i.observed_on) as last_seen
         from interest_events i
         left join products p on p.id = i.product_id
         left join categories c on c.id = i.category_id
         where i.profile_id = any($1::uuid[])
         group by i.profile_id, p.slug, c.slug, i.kind`,
        [memberIds],
      );

      // What they already watch, and what we have already mentioned: both are
      // "do not say this twice" rather than "do not say this".
      const { rows: watchedRows } = await client.query<{ profile_id: string; slug: string }>(
        `select w.profile_id, p.slug
         from watchlist_items wi
         join watchlists w on w.id = wi.watchlist_id
         join products p on p.id = wi.product_id
         where w.profile_id = any($1::uuid[])`,
        [memberIds],
      );
      const { rows: toldRows } = await client.query<{ profile_id: string; slug: string }>(
        `select s.profile_id, p.slug
         from deal_signals s
         join offers o on o.id = s.offer_id
         join products p on p.id = o.product_id
         where s.profile_id = any($1::uuid[])
           and s.kind = 'NOTICED'
           and s.created_at > now() - interval '90 days'`,
        [memberIds],
      );

      const group = <T extends { profile_id: string }>(rows: T[], pick: (row: T) => string) => {
        const out = new Map<string, string[]>();
        for (const row of rows) {
          const list = out.get(row.profile_id) ?? [];
          list.push(pick(row));
          out.set(row.profile_id, list);
        }
        return out;
      };
      const watchedByProfile = group(watchedRows, (r) => r.slug);
      const toldByProfile = group(toldRows, (r) => r.slug);

      const interestByProfile = new Map<string, InterestRecord[]>();
      for (const row of interestRows) {
        // Exactly one is set, enforced by the check constraint in 0014.
        if (!row.slug && !row.category_slug) continue;
        const list = interestByProfile.get(row.profile_id) ?? [];
        list.push({
          productSlug: row.slug,
          categorySlug: row.category_slug,
          kind: row.kind as InterestRecord['kind'],
          occurrences: Number(row.occurrences),
          lastSeenOn: row.last_seen.toISOString().slice(0, 10),
        });
        interestByProfile.set(row.profile_id, list);
      }

      // Every offer we currently score, so inference reads the same pipeline
      // output as everything else rather than a second, divergent view.
      const { rows: catalogue } = await client.query<OfferRow>(
        OFFERS_AT_RETAILER_SQL.replace(
          'where o.retailer_id = any($1::uuid[])', 'where o.in_stock = true',
        ),
      );
      const catalogueOfferIds = catalogue.map((row) => row.offer_id);

      const { rows: catObs } = await client.query<{
        offer_id: string; price_cents: number; in_stock: boolean; observed_at: Date;
      }>(
        `select offer_id, price_cents, in_stock, observed_at
         from price_observations where offer_id = any($1::uuid[]) order by observed_at asc`,
        [catalogueOfferIds],
      );
      const catHistory = new Map<string, PriceObservation[]>();
      for (const r of catObs) {
        const list = catHistory.get(r.offer_id) ?? [];
        list.push({
          priceCents: r.price_cents, inStock: r.in_stock,
          observedAt: r.observed_at.toISOString(),
        });
        catHistory.set(r.offer_id, list);
      }

      const scored: Deal[] = catalogue.map((row) =>
        scoreOffer(toOffer(row, catHistory, competitors, now), now),
      );

      for (const { profile_id: profileId } of members) {
        const noticed = noticeSomething({
          interests: interestByProfile.get(profileId) ?? [],
          deals: scored,
          watchedSlugs: watchedByProfile.get(profileId) ?? [],
          alreadyMentionedSlugs: toldByProfile.get(profileId) ?? [],
        });
        if (!noticed) continue;

        pending.push({
          kind: 'NOTICED',
          itemId: '',
          offerId: noticed.offerId,
          message: `${noticed.message} ${noticed.because}`,
          profileId,
        });
      }
    }

    /**
     * Quiet hours (§36), read once for everybody about to be told something.
     *
     * Through a function rather than a table read, for the same reason the
     * interest sweep does: migration 0007 denies this role `preferences`
     * outright, and needing one field is not a reason to hand a batch job
     * everybody's settings.
     */
    const quietByProfile = new Map<string, QuietHours>();
    if (pending.length > 0) {
      const { rows: quietRows } = await client.query<{
        profile_id: string; quiet_hours: unknown;
      }>(
        'select * from quiet_hours_for($1::uuid[])',
        [[...new Set(pending.map((signal) => signal.profileId))]],
      );
      for (const row of quietRows) {
        if (isValidQuietHours(row.quiet_hours)) {
          quietByProfile.set(row.profile_id, row.quiet_hours);
        }
      }
    }

    for (const signal of pending) {
      // Deferred, never suppressed: the signal is recorded either way and the
      // portal shows it. Only the moment it may be SENT moves.
      const quiet = quietByProfile.get(signal.profileId) ?? null;
      const sendableAt = deliverableAt(now, quiet);
      const deliverAfter = sendableAt.getTime() === now.getTime() ? null : sendableAt;

      await client.query(
        `insert into deal_signals
           (profile_id, watchlist_item_id, offer_id, kind, message, deliver_after)
         values ($1, $2, $3, $4, $5, $6)`,
        // A noticed-signal has no watchlist item: nobody asked for it, which
        // is the whole point, so the column is null rather than invented.
        [
          signal.profileId, signal.itemId || null, signal.offerId,
          signal.kind, signal.message, deliverAfter,
        ],
      );
      result.signalsCreated++;
      if (deliverAfter) result.deferred++;
      result.byKind[signal.kind] = (result.byKind[signal.kind] ?? 0) + 1;
    }

    return result;
  } finally {
    await client.end();
  }
}
