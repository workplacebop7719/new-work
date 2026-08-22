/**
 * The admin surface against a real database.
 *
 * Two things are being proven: that operator actions work and are audited, and
 * that the operator role's reach is genuinely as narrow as migration 0010
 * claims. The second matters more — an admin role that quietly had access to
 * customer households would be a serious privacy failure with no symptom.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { createOwnedFixture } from './owned-fixture';

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const APP_URL = process.env.TEST_APP_DATABASE_URL;
const STAFF_URL = process.env.TEST_ADMIN_DATABASE_URL;
const live = Boolean(ADMIN_URL && APP_URL && STAFF_URL);
const d = live ? describe : describe.skip;

const OPERATOR = 'eeeeeeee-0000-4000-8000-000000000005';
const CUSTOMER = 'ffffffff-0000-4000-8000-000000000006';

d('privilege escalation is impossible from the application', () => {
  let app: pg.Client;
  let admin: pg.Client;

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query('delete from profiles where id = $1', [CUSTOMER]);
    await admin.query(`insert into profiles (id, display_name) values ($1,'Customer')`, [CUSTOMER]);

    app = new pg.Client({ connectionString: APP_URL });
    await app.connect();
    await app.query('select set_config($1,$2,false)', ['request.jwt.claim.sub', CUSTOMER]);
  });

  afterAll(async () => {
    await app?.end();
    await admin?.query('delete from profiles where id = $1', [CUSTOMER]).catch(() => undefined);
    await admin?.end();
  });

  /**
   * RLS answers "which rows", never "which columns". The profile policy from
   * 0003 lets a customer update their own row, which is right for a display
   * name and catastrophic for a role column — so the table-level UPDATE grant
   * is withdrawn and replaced with a column grant on display_name alone.
   */
  it('a customer cannot promote themselves', async () => {
    await expect(
      app.query(`update profiles set role = 'admin' where id = $1`, [CUSTOMER]),
    ).rejects.toThrow(/permission denied/i);

    const { rows } = await admin.query<{ role: string }>(
      'select role from profiles where id = $1', [CUSTOMER],
    );
    expect(rows[0]!.role).toBe('customer');
  });

  it('a customer still cannot promote themselves via a partial update', async () => {
    await expect(
      app.query(`update profiles set display_name = 'x', role = 'operator' where id = $1`, [CUSTOMER]),
    ).rejects.toThrow(/permission denied/i);
  });

  it('but can still change their display name', async () => {
    await app.query(`update profiles set display_name = 'Renamed' where id = $1`, [CUSTOMER]);
    const { rows } = await admin.query<{ display_name: string; role: string }>(
      'select display_name, role from profiles where id = $1', [CUSTOMER],
    );
    expect(rows[0]!.display_name).toBe('Renamed');
    expect(rows[0]!.role).toBe('customer');
  });
});

d('the operator role reaches operations and nothing else', () => {
  let staff: pg.Client;

  beforeAll(async () => {
    staff = new pg.Client({ connectionString: STAFF_URL });
    await staff.connect();
  });
  afterAll(async () => {
    await staff?.end();
  });

  it('does not have bypassrls', async () => {
    const { rows } = await staff.query<{ rolbypassrls: boolean }>(
      `select rolbypassrls from pg_roles where rolname = 'bargenation_admin'`,
    );
    expect(rows[0]!.rolbypassrls).toBe(false);
  });

  it('can read the operational tables it needs', async () => {
    for (const table of [
      'ingest_rejections', 'quarantined_observations', 'source_runs',
      'offers', 'products', 'price_observations',
    ]) {
      await expect(staff.query(`select 1 from ${table} limit 1`), table).resolves.toBeTruthy();
    }
  });

  /** Working a product-match queue does not require reading anybody's family. */
  it('cannot read any customer personal data', async () => {
    for (const table of [
      'households', 'household_members', 'saved_items', 'watchlists',
      'watchlist_items', 'deal_signals', 'preferences', 'newsletter_subscribers',
    ]) {
      await expect(staff.query(`select * from ${table} limit 1`), table)
        .rejects.toThrow(/permission denied/i);
    }
  });

  it('cannot reach commission data', async () => {
    await expect(staff.query('select * from commerce.affiliate_links'))
      .rejects.toThrow(/permission denied/i);
  });

  it('cannot rewrite price history', async () => {
    await expect(staff.query('update price_observations set price_cents = 1'))
      .rejects.toThrow(/permission denied|append-only/i);
  });

  it('cannot edit or erase the audit trail', async () => {
    await expect(staff.query(`update admin_actions set reason = 'x'`))
      .rejects.toThrow(/permission denied|append-only/i);
    await expect(staff.query('delete from admin_actions'))
      .rejects.toThrow(/permission denied|append-only/i);
  });
});

d('quarantine decisions are recorded and audited', () => {
  let admin: pg.Client;
  let repo: typeof import('@/data/admin-repository');
  let heldId: string;
  let offerId: string;

  beforeAll(async () => {
    process.env.ADMIN_DATABASE_URL = STAFF_URL;
    process.env.DATABASE_URL = APP_URL;
    repo = await import('@/data/admin-repository');

    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    /**
     * Upserted, never deleted. admin_actions.actor_id is ON DELETE RESTRICT,
     * so once this operator has done anything their profile cannot be removed
     * — you must not be able to erase who authorised a release by deleting the
     * account. That is the audit trail working, so the test adapts to it.
     */
    await admin.query(
      `insert into profiles (id, display_name, role) values ($1,'Operator','admin')
       on conflict (id) do update set role = 'admin'`,
      [OPERATOR],
    );

    // Owns its offer rather than borrowing a seeded one: releasing a
    // quarantined price writes permanent history, and doing that to a fixture
    // product diverges the database from the in-memory fixtures the parity
    // suite compares against. See owned-fixture.ts.
    const owned = await createOwnedFixture(admin, 'adminfixture');
    offerId = owned.offerId;
    await admin.query(
      `insert into price_observations (offer_id, price_cents, in_stock, observed_at, source_id)
       values ($1, 6000, true, now() - interval '1 day', (select id from data_sources limit 1))`,
      [offerId],
    );
    const held = await admin.query<{ id: string }>(
      `insert into quarantined_observations
         (offer_id, price_cents, in_stock, observed_at, source_id, reason)
       values ($1, 199, true, now(), (select id from data_sources limit 1), 'fell 97% in one step')
       returning id::text`,
      [offerId],
    );
    heldId = held.rows[0]!.id;
  });

  afterAll(async () => {
    // The operator profile is left in place; see the note in beforeAll.
    await admin?.end();
  });

  it('reads the role the database holds', async () => {
    expect(await repo.readRole(OPERATOR)).toBe('admin');
  });

  it('lists what is held, with the last recorded price for comparison', async () => {
    const held = await repo.listQuarantine(OPERATOR);
    const mine = held.find((h) => h.id === heldId);
    expect(mine).toBeDefined();
    expect(mine!.priceCents).toBe(199);
    expect(mine!.lastRecordedCents).toBeGreaterThan(0);
  });

  it('releasing writes the observation AND the audit row together', async () => {
    const before = await admin.query<{ n: number }>(
      'select count(*)::int as n from price_observations where offer_id = $1', [offerId],
    );

    await repo.releaseQuarantine(OPERATOR, heldId, 'confirmed against the retailer site');

    const after = await admin.query<{ n: number }>(
      'select count(*)::int as n from price_observations where offer_id = $1', [offerId],
    );
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n + 1);

    const audit = await admin.query<{ action: string; reason: string }>(
      `select action, reason from admin_actions where actor_id = $1 order by created_at desc limit 1`,
      [OPERATOR],
    );
    expect(audit.rows[0]!.action).toBe('RELEASE_QUARANTINE');
    expect(audit.rows[0]!.reason).toMatch(/retailer site/);
  });

  it('will not release the same observation twice', async () => {
    await expect(repo.releaseQuarantine(OPERATOR, heldId, 'again'))
      .rejects.toThrow(/no longer held/i);
  });

  it('discarding is recorded too', async () => {
    const held = await admin.query<{ id: string }>(
      `insert into quarantined_observations
         (offer_id, price_cents, in_stock, observed_at, source_id, reason)
       values ($1, 1, true, now(), (select id from data_sources limit 1), 'looks like a placeholder')
       returning id::text`,
      [offerId],
    );
    const id = held.rows[0]!.id;

    await repo.discardQuarantine(OPERATOR, id, 'feed placeholder, not a real price');

    const { rows } = await admin.query<{ discarded_at: Date | null }>(
      'select discarded_at from quarantined_observations where id = $1', [id],
    );
    expect(rows[0]!.discarded_at).not.toBeNull();

    const audit = await admin.query<{ action: string }>(
      `select action from admin_actions where actor_id = $1 order by created_at desc limit 1`,
      [OPERATOR],
    );
    expect(audit.rows[0]!.action).toBe('DISCARD_QUARANTINE');
  });

  it('summarises what needs attention', async () => {
    const summary = await repo.readSummary(OPERATOR);
    expect(summary.heldObservations).toBeGreaterThanOrEqual(0);
    expect(summary.runsLast24h).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(summary.staleOffers)).toBe(true);
  });
});
