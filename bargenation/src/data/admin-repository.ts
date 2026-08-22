import 'server-only';
import pg from 'pg';
import { toRole, type Role } from '@/auth/roles';

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
       where r.stage = 'MATCH'
       order by r.created_at desc
       limit $1`,
      [limit],
    );
    return rows.map((r) => ({
      id: r.id, runId: r.run_id, stage: r.stage, reason: r.reason,
      raw: r.raw, createdAt: r.created_at.toISOString(), sourceName: r.source_name,
    }));
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
