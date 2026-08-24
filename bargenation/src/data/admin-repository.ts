import 'server-only';
import pg from 'pg';
import { toRole, type Role } from '@/auth/roles';
import { titleSimilarity, aliasKey, NEW_PRODUCT_CONFIDENCE } from '@/ingest/product-match';

/**
 * Operational data for the admin surface (PRD §49).
 *
 * Connects as `bargenation_admin`, whose grants are enumerated in migration
 * 0010. That role can reach the ingestion queue and the catalog and nothing
 * else — no households, saved items, watchlists, preferences or subscribers.
 * Working a product-match queue does not require reading anybody's family.
 *
 * Every mutation writes an `admin_actions` row IN THE SAME TRANSACTION as the
 * change it describes. An audit trail written afterwards is one that can be
 * missing exactly when it matters.
 */

let pool: pg.Pool | undefined;

function adminPool(): pg.Pool {
  const connectionString = process.env.ADMIN_DATABASE_URL;
  if (!connectionString) throw new Error('ADMIN_DATABASE_URL is not set');
  pool ??= new pg.Pool({ connectionString, max: 4 });
  return pool;
}

export const adminFeaturesAvailable = Boolean(process.env.ADMIN_DATABASE_URL);

async function asStaff<T>(actorId: string, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await adminPool().connect();
  try {
    await client.query('begin');
    await client.query('select set_config($1,$2,true)', ['request.jwt.claim.sub', actorId]);
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Reads a staff member's role.
 *
 * Uses the APPLICATION connection, not the admin one: this is called before we
 * know whether the caller is staff at all, so it must work for anybody.
 *
 * It runs AS THE CALLER, through asCustomer. The profiles policy from 0003 is
 * `id = auth.uid()`, so a plain query on the pooled connection — with no JWT
 * subject set — matches no rows and every caller reads back as 'customer'.
 * Deny-by-default meant that failed safe rather than open, but it would have
 * locked every operator out of the admin surface with no error to explain why.
 *
 * Reading your own role as yourself is also the honest framing: `role` lives
 * on the caller's own profile row.
 */
export async function readRole(profileId: string): Promise<Role> {
  const { asCustomer } = await import('@/db/client');
  return asCustomer(profileId, async (client) => {
    const { rows } = await client.query<{ role: string }>(
      'select role from profiles where id = $1',
      [profileId],
    );
    return toRole(rows[0]?.role);
  });
}

/* ============================================================
   THE REVIEW QUEUE
   ============================================================ */

export interface ReviewItem {
  id: string;
  runId: string;
  stage: string;
  reason: string;
  raw: Record<string, unknown>;
  createdAt: string;
  sourceName: string;
  retailerSlug: string | null;
  /** The products the matcher could not choose between. */
  candidates: Array<{ id: string; title: string; confidence: number }>;
}

export async function listReviewQueue(actorId: string, limit = 50): Promise<ReviewItem[]> {
  return asStaff(actorId, async (client) => {
    const { rows } = await client.query<{
      id: string; run_id: string; stage: string; reason: string;
      raw: Record<string, unknown>; created_at: Date; source_name: string;
    }>(
      `select r.id::text, r.run_id::text, r.stage, r.reason, r.raw, r.created_at,
              ds.name as source_name
       from ingest_rejections r
       join source_runs sr on sr.id = r.run_id
       join data_sources ds on ds.id = sr.source_id
       where r.stage = 'MATCH' and r.resolved_at is null
       order by r.created_at desc
       limit $1`,
      [limit],
    );

    // Recompute the candidates rather than storing them: the catalog moves,
    // and a stale list would offer an operator products that no longer exist.
    const { rows: catalog } = await client.query<{
      id: string; slug: string; title: string; brand: string | null;
    }>(`select p.id, p.slug, p.name as title, b.name as brand
        from products p left join brands b on b.id = p.brand_id`);
    const existing = catalog.map((c) => ({
      id: c.id, slug: c.slug, title: c.title, brand: c.brand,
    }));

    return rows.map((r) => {
      const title = typeof r.raw.title === 'string' ? r.raw.title : '';
      const candidates = existing
        .map((p) => ({ id: p.id, title: p.title, confidence: titleSimilarity(p.title, title) }))
        .filter((c) => c.confidence >= NEW_PRODUCT_CONFIDENCE)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 6);

      return {
        id: r.id, runId: r.run_id, stage: r.stage, reason: r.reason,
        raw: r.raw, createdAt: r.created_at.toISOString(), sourceName: r.source_name,
        retailerSlug: typeof r.raw.__retailerSlug === 'string' ? r.raw.__retailerSlug : null,
        candidates,
      };
    });
  });
}

export type MatchDecision =
  | { kind: 'MATCHED'; productId: string }
  | { kind: 'NEW_PRODUCT' }
  | { kind: 'DISMISSED' };

/**
 * Answers an ambiguous match, and teaches the system the answer.
 *
 * The important part is the alias. Fixing only this record would leave the
 * same feed asking the same question on every future run, which is not a
 * resolution — it is a chore that repeats. The alias is keyed on the
 * normalised, stemmed title so trivial rewording does not reopen it.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: it does not backfill the price from the
 * held record. That observation may be days old by the time somebody looks,
 * and inserting a stale price as though it were just seen would corrupt the
 * timeline every Value Index is measured against — permanently, because the
 * record is append-only. The alias makes the NEXT run resolve cleanly, with a
 * price that is actually current.
 */
export async function resolveMatch(
  actorId: string,
  rejectionId: string,
  decision: MatchDecision,
  reason: string,
): Promise<void> {
  await asStaff(actorId, async (client) => {
    const { rows } = await client.query<{
      raw: Record<string, unknown>; resolved_at: Date | null;
    }>(
      `select raw, resolved_at from ingest_rejections where id = $1 for update`,
      [rejectionId],
    );
    const item = rows[0];
    if (!item) throw new Error('That queue item no longer exists.');
    if (item.resolved_at) throw new Error('That queue item has already been resolved.');

    const title = typeof item.raw.title === 'string' ? item.raw.title : '';
    const retailerSlug =
      typeof item.raw.__retailerSlug === 'string' ? item.raw.__retailerSlug : null;

    if (decision.kind !== 'DISMISSED') {
      if (!title.trim()) throw new Error('That record has no title to key an alias on.');
      if (!retailerSlug) throw new Error('That record did not record which retailer it came from.');
    }

    let productId: string | null = null;

    if (decision.kind === 'MATCHED') {
      const exists = await client.query('select 1 from products where id = $1', [decision.productId]);
      if (exists.rowCount === 0) throw new Error('That product no longer exists.');
      productId = decision.productId;
    } else if (decision.kind === 'NEW_PRODUCT') {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      const created = await client.query<{ id: string }>(
        `insert into products (slug, name, category_id)
         values ($1, $2, (select id from categories order by sort_order limit 1))
         on conflict (slug) do update set name = excluded.name
         returning id`,
        [slug, title.trim()],
      );
      productId = created.rows[0]!.id;
    }

    if (productId && retailerSlug) {
      // One answer per question per retailer. Re-answering replaces the
      // previous one rather than failing, and the audit trail keeps both.
      await client.query(
        `insert into product_aliases (retailer_id, normalised_title, product_id, created_by, reason)
         values ((select id from retailers where slug = $1), $2, $3, $4, $5)
         on conflict (retailer_id, normalised_title)
           do update set product_id = excluded.product_id,
                         created_by = excluded.created_by,
                         reason = excluded.reason,
                         created_at = now()`,
        [retailerSlug, aliasKey(title), productId, actorId, reason],
      );
    }

    await client.query(
      `update ingest_rejections
       set resolved_at = now(), resolved_by = $2, resolution = $3
       where id = $1`,
      [rejectionId, actorId, decision.kind],
    );

    await client.query(
      `insert into admin_actions (actor_id, action, target, reason, detail)
       values ($1,'RESOLVE_MATCH',$2,$3,$4)`,
      [actorId, `ingest_rejections:${rejectionId}`, reason,
       JSON.stringify({ decision: decision.kind, productId, retailerSlug, title })],
    );
  });
}

/* ============================================================
   QUARANTINE
   ============================================================ */

export interface HeldObservation {
  id: string;
  offerId: string;
  productName: string;
  retailerName: string;
  priceCents: number;
  /** the most recent price we HAVE recorded, for comparison */
  lastRecordedCents: number | null;
  observedAt: string;
  reason: string;
  sourceName: string;
}

export async function listQuarantine(actorId: string, limit = 50): Promise<HeldObservation[]> {
  return asStaff(actorId, async (client) => {
    const { rows } = await client.query<{
      id: string; offer_id: string; product_name: string; retailer_name: string;
      price_cents: number; last_recorded: number | null; observed_at: Date;
      reason: string; source_name: string;
    }>(
      `select q.id::text, q.offer_id::text, p.name as product_name, r.name as retailer_name,
              q.price_cents, q.observed_at, q.reason, ds.name as source_name,
              (select po.price_cents from price_observations po
                where po.offer_id = q.offer_id
                order by po.observed_at desc limit 1) as last_recorded
       from quarantined_observations q
       join offers o    on o.id = q.offer_id
       join products p  on p.id = o.product_id
       join retailers r on r.id = o.retailer_id
       join data_sources ds on ds.id = q.source_id
       where q.released_at is null and q.discarded_at is null
       order by q.created_at desc
       limit $1`,
      [limit],
    );
    return rows.map((r) => ({
      id: r.id, offerId: r.offer_id, productName: r.product_name,
      retailerName: r.retailer_name, priceCents: r.price_cents,
      lastRecordedCents: r.last_recorded, observedAt: r.observed_at.toISOString(),
      reason: r.reason, sourceName: r.source_name,
    }));
  });
}

/**
 * Releases a held observation into the permanent record.
 *
 * IRREVERSIBLE. `price_observations` is append-only, so once this commits the
 * observation is part of the product's history for good and every future Value
 * Index is measured against it. The audit row is written in the same
 * transaction for that reason — if the release lands, the record of who
 * ordered it lands with it.
 */
export async function releaseQuarantine(
  actorId: string, heldId: string, reason: string,
): Promise<void> {
  await asStaff(actorId, async (client) => {
    const { rows } = await client.query<{
      offer_id: string; price_cents: number; in_stock: boolean;
      observed_at: Date; source_id: string;
    }>(
      `select offer_id, price_cents, in_stock, observed_at, source_id
       from quarantined_observations
       where id = $1 and released_at is null and discarded_at is null
       for update`,
      [heldId],
    );
    const held = rows[0];
    if (!held) throw new Error('That observation is no longer held.');

    await client.query(
      `insert into price_observations (offer_id, price_cents, in_stock, observed_at, source_id)
       values ($1,$2,$3,$4,$5)`,
      [held.offer_id, held.price_cents, held.in_stock, held.observed_at, held.source_id],
    );
    await client.query(
      'update quarantined_observations set released_at = now() where id = $1', [heldId],
    );
    await client.query(
      `insert into admin_actions (actor_id, action, target, reason, detail)
       values ($1,'RELEASE_QUARANTINE',$2,$3,$4)`,
      [actorId, `quarantined_observations:${heldId}`, reason,
       JSON.stringify({ offerId: held.offer_id, priceCents: held.price_cents })],
    );
  });
}

/** Discards a held observation. Reversible in the sense that the price can be seen again. */
export async function discardQuarantine(
  actorId: string, heldId: string, reason: string,
): Promise<void> {
  await asStaff(actorId, async (client) => {
    const { rowCount } = await client.query(
      `update quarantined_observations set discarded_at = now()
       where id = $1 and released_at is null and discarded_at is null`,
      [heldId],
    );
    if (rowCount === 0) throw new Error('That observation is no longer held.');
    await client.query(
      `insert into admin_actions (actor_id, action, target, reason)
       values ($1,'DISCARD_QUARANTINE',$2,$3)`,
      [actorId, `quarantined_observations:${heldId}`, reason],
    );
  });
}

/* ============================================================
   OVERVIEW
   ============================================================ */

export interface OperationsSummary {
  openReviews: number;
  heldObservations: number;
  runsLast24h: number;
  failedRunsLast24h: number;
  rejectionsLast24h: number;
  staleOffers: number;
}

export async function readSummary(actorId: string): Promise<OperationsSummary> {
  return asStaff(actorId, async (client) => {
    const { rows } = await client.query<Record<string, string>>(`
      select
        (select count(*) from ingest_rejections where stage = 'MATCH')            as open_reviews,
        (select count(*) from quarantined_observations
          where released_at is null and discarded_at is null)                     as held,
        (select count(*) from source_runs where started_at > now() - interval '24 hours') as runs,
        (select count(*) from source_runs
          where started_at > now() - interval '24 hours' and status = 'FAILED')   as failed,
        (select count(*) from ingest_rejections
          where created_at > now() - interval '24 hours')                         as rejections,
        (select count(*) from offers where last_verified_at < now() - interval '7 days') as stale
    `);
    const r = rows[0]!;
    return {
      openReviews: Number(r.open_reviews),
      heldObservations: Number(r.held),
      runsLast24h: Number(r.runs),
      failedRunsLast24h: Number(r.failed),
      rejectionsLast24h: Number(r.rejections),
      staleOffers: Number(r.stale),
    };
  });
}

export interface AuditEntry {
  action: string;
  target: string;
  reason: string;
  createdAt: string;
}

export async function listRecentAudit(actorId: string, limit = 20): Promise<AuditEntry[]> {
  return asStaff(actorId, async (client) => {
    const { rows } = await client.query<{
      action: string; target: string; reason: string; created_at: Date;
    }>(
      `select action, target, reason, created_at from admin_actions
       order by created_at desc limit $1`, [limit],
    );
    return rows.map((r) => ({
      action: r.action, target: r.target, reason: r.reason,
      createdAt: r.created_at.toISOString(),
    }));
  });
}

/* ============================================================
   SOURCES AND JOB HEALTH (§49)
   ============================================================ */

export interface SourceRunRow {
  sourceName: string;
  tier: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  recordsSeen: number;
  accepted: number;
  rejected: number;
  quarantined: number;
  note: string | null;
}

export interface SourceRow {
  id: string;
  name: string;
  tier: number;
  lastRunAt: string | null;
  lastStatus: string | null;
  runsLast7d: number;
  acceptedLast7d: number;
  rejectedLast7d: number;
}

/**
 * Every source and how it has been behaving.
 *
 * The columns that matter operationally are the REJECTIONS: a feed that
 * suddenly rejects everything has changed its format, and a feed that
 * suddenly accepts everything has probably stopped validating. Both look fine
 * on a page that only shows "last run: succeeded".
 */
export async function listSources(actorId: string): Promise<SourceRow[]> {
  return asStaff(actorId, async (client) => {
    const { rows } = await client.query<{
      id: string; name: string; tier: number;
      last_run_at: Date | null; last_status: string | null;
      runs_7d: string; accepted_7d: string; rejected_7d: string;
    }>(
      `select s.id, s.name, s.tier,
              max(r.started_at)                                    as last_run_at,
              (array_agg(r.status order by r.started_at desc))[1]  as last_status,
              count(r.id) filter (where r.started_at > now() - interval '7 days') as runs_7d,
              coalesce(sum(r.accepted) filter (where r.started_at > now() - interval '7 days'), 0) as accepted_7d,
              coalesce(sum(r.rejected) filter (where r.started_at > now() - interval '7 days'), 0) as rejected_7d
       from data_sources s
       left join source_runs r on r.source_id = s.id
       group by s.id, s.name, s.tier
       order by s.tier asc, s.name asc`,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      tier: r.tier,
      lastRunAt: r.last_run_at?.toISOString() ?? null,
      lastStatus: r.last_status,
      runsLast7d: Number(r.runs_7d),
      acceptedLast7d: Number(r.accepted_7d),
      rejectedLast7d: Number(r.rejected_7d),
    }));
  });
}

export async function listRecentRuns(actorId: string, limit = 30): Promise<SourceRunRow[]> {
  return asStaff(actorId, async (client) => {
    const { rows } = await client.query<{
      name: string; tier: number; status: string;
      started_at: Date; finished_at: Date | null;
      records_seen: number; accepted: number; rejected: number; quarantined: number;
      note: string | null;
    }>(
      `select s.name, s.tier, r.status, r.started_at, r.finished_at,
              r.records_seen, r.accepted, r.rejected, r.quarantined, r.note
       from source_runs r
       join data_sources s on s.id = r.source_id
       order by r.started_at desc
       limit $1`,
      [limit],
    );
    return rows.map((r) => ({
      sourceName: r.name,
      tier: r.tier,
      status: r.status,
      startedAt: r.started_at.toISOString(),
      finishedAt: r.finished_at?.toISOString() ?? null,
      recordsSeen: r.records_seen,
      accepted: r.accepted,
      rejected: r.rejected,
      quarantined: r.quarantined,
      note: r.note,
    }));
  });
}

export interface RejectionRow {
  sourceName: string;
  reason: string;
  occurrences: number;
  lastSeenAt: string;
}

/** Grouped by reason, because one broken feed produces a thousand identical rows. */
export async function listRejectionReasons(actorId: string): Promise<RejectionRow[]> {
  return asStaff(actorId, async (client) => {
    const { rows } = await client.query<{
      name: string; reason: string; occurrences: string; last_seen: Date;
    }>(
      `select s.name, j.reason, count(*) as occurrences, max(j.created_at) as last_seen
       from ingest_rejections j
       join source_runs r on r.id = j.run_id
       join data_sources s on s.id = r.source_id
       where j.created_at > now() - interval '30 days'
       group by s.name, j.reason
       order by count(*) desc
       limit 40`,
    );
    return rows.map((r) => ({
      sourceName: r.name,
      reason: r.reason,
      occurrences: Number(r.occurrences),
      lastSeenAt: r.last_seen.toISOString(),
    }));
  });
}

/* ============================================================
   THE AUDIENCE, AS NUMBERS ONLY (§49)
   ============================================================ */

/**
 * Counts, and nothing that could identify anybody.
 *
 * Staff cannot read profiles, watchlists, deal signals or subscribers —
 * migration 0010 revokes all four and 0012 withholds read-by-email
 * specifically. This asks a question instead (migration 0020) and gets back
 * numbers: enough to answer "is the product being used and is anything
 * stuck", not enough to look somebody up.
 */
export type AudienceSummary = Record<string, number>;

export async function readAudienceSummary(actorId: string): Promise<AudienceSummary> {
  return asStaff(actorId, async (client) => {
    const { rows } = await client.query<{ metric: string; value: string }>(
      'select metric, value from operations_summary()',
    );
    return Object.fromEntries(rows.map((r) => [r.metric, Number(r.value)]));
  });
}

/** Whether commission data is reachable at all from this process. */
export async function commerceReachable(actorId: string): Promise<boolean> {
  return asStaff(actorId, async (client) => {
    try {
      await client.query('select 1 from commerce.affiliate_links limit 1');
      return true;
    } catch {
      // Expected: migration 0005 revokes schema commerce from this role.
      return false;
    }
  });
}
