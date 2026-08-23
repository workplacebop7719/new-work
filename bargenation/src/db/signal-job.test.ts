/**
 * The signal sweep, against a real database.
 *
 * Two things are being proven: that the sweep produces the right signals from
 * real recorded history, and that the job role's grants really are as narrow
 * as migration 0007 claims. The second matters more — a batch job that quietly
 * had BYPASSRLS would be a large hole with no visible symptom.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const JOB_URL = process.env.TEST_JOBS_DATABASE_URL;
const live = Boolean(ADMIN_URL && JOB_URL);
const d = live ? describe : describe.skip;

const OWNER = 'dddddddd-0000-4000-8000-000000000004';
/** This suite's own product, so it never mutates seeded fixture data. */
const OWN_SLUG = 'signal-test-product';
const NOW = new Date('2026-08-20T12:00:00Z');

d('deal signal sweep', () => {
  let admin: pg.Client;
  let sweep: typeof import('@/data/signal-runner').sweepDealSignals;
  let offerId: string;
  let itemId: string;

  /**
   * Appends a price sequence and re-points the offer at its final price.
   *
   * price_observations is append-only by design, so this cannot rewrite
   * history — it extends it. Each appended point lands strictly AFTER
   * everything already recorded, because fixed timestamps produced ties that
   * made "the latest two observations" ambiguous and edge detection
   * non-deterministic.
   */
  async function setHistory(prices: number[], target: number | null) {
    const latest = await admin.query<{ max: Date | null }>(
      'select max(observed_at) as max from price_observations where offer_id = $1',
      [offerId],
    );
    const base = latest.rows[0]!.max ?? new Date(NOW.getTime() - 86_400_000);

    for (const [i, price] of prices.entries()) {
      await admin.query(
        `insert into price_observations (offer_id, price_cents, in_stock, observed_at, source_id)
         values ($1, $2, true, $3, (select id from data_sources limit 1))`,
        [offerId, price, new Date(base.getTime() + (i + 1) * 60_000)],
      );
    }
    await admin.query('update offers set price_cents = $2 where id = $1', [
      offerId, prices[prices.length - 1],
    ]);
    await admin.query('update watchlist_items set target_price_cents = $2 where id = $1', [
      itemId, target,
    ]);
  }

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();

    /**
     * This suite OWNS its catalog row rather than borrowing a seeded one.
     *
     * An earlier version mutated a fixture product's price history, which
     * broke the parity suite — that compares the seeded dataset against the
     * in-memory fixtures and correctly reported the divergence. A test that
     * corrupts data another test depends on is a defect in the test, not a
     * reason to reorder the suites.
     *
     * is_sample_data is false so the parity suite, which filters to sample
     * rows, ignores this product entirely.
     */
    await admin.query('delete from profiles where id = $1', [OWNER]);
    await admin.query(
      `delete from offers where product_id in (select id from products where slug = $1)`,
      [OWN_SLUG],
    ).catch(() => undefined);

    await admin.query(
      `insert into retailers (slug, name) values ('signal-test-retailer', 'Signal Test Retailer')
       on conflict (slug) do nothing`,
    );
    await admin.query(
      `insert into products (slug, name, category_id)
       values ($1, 'Signal Test Product', (select id from categories limit 1))
       on conflict (slug) do nothing`,
      [OWN_SLUG],
    );
    const offer = await admin.query<{ id: string }>(
      `insert into offers (product_id, retailer_id, source_id, price_cents, is_sample_data)
       values (
         (select id from products  where slug = $1),
         (select id from retailers where slug = 'signal-test-retailer'),
         (select id from data_sources limit 1),
         9000, false)
       on conflict (retailer_id, product_id, variant_id)
         do update set price_cents = excluded.price_cents
       returning id`,
      [OWN_SLUG],
    );
    offerId = offer.rows[0]!.id;

    await admin.query(`insert into profiles (id, display_name) values ($1, 'Watcher')`, [OWNER]);
    const list = await admin.query<{ id: string }>(
      `insert into watchlists (profile_id) values ($1) returning id`, [OWNER],
    );
    const item = await admin.query<{ id: string }>(
      `insert into watchlist_items (watchlist_id, product_id)
       values ($1, (select id from products where slug = $2)) returning id`,
      [list.rows[0]!.id, OWN_SLUG],
    );
    itemId = item.rows[0]!.id;

    ({ sweepDealSignals: sweep } = await import('@/data/signal-runner'));
  });

  afterAll(async () => {
    await admin?.query('delete from profiles where id = $1', [OWNER]);
    await admin?.end();
  });

  it('creates a target-reached signal when the price crosses down', async () => {
    await setHistory([9000, 4000], 5000);
    const before = await admin.query('select count(*)::int as n from deal_signals where profile_id = $1', [OWNER]);

    const result = await sweep(JOB_URL!, NOW);
    expect(result.watchesExamined).toBeGreaterThan(0);

    const after = await admin.query<{ kind: string; message: string }>(
      'select kind, message from deal_signals where profile_id = $1 order by created_at desc', [OWNER],
    );
    expect(after.rows.length).toBeGreaterThan(before.rows[0].n);
    expect(after.rows.map((r) => r.kind)).toContain('TARGET_REACHED');
  });

  it('stays silent on a second run — the cooldown holds', async () => {
    const before = await admin.query('select count(*)::int as n from deal_signals where profile_id = $1', [OWNER]);
    await sweep(JOB_URL!, NOW);
    const after = await admin.query('select count(*)::int as n from deal_signals where profile_id = $1', [OWNER]);
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  /**
   * The sweep is global, and other suites leave active watches behind, so
   * counting examined watches proves nothing about THIS one. What matters is
   * that a paused watch yields no signals for its owner.
   */
  it('produces no signals for a paused watch', async () => {
    // Give it something that would certainly fire if it were active.
    await setHistory([9000, 2000], 5000);
    await admin.query('update watchlist_items set paused = true where id = $1', [itemId]);

    const before = await admin.query<{ n: number }>(
      'select count(*)::int as n from deal_signals where profile_id = $1', [OWNER],
    );
    await sweep(JOB_URL!, NOW);
    const after = await admin.query<{ n: number }>(
      'select count(*)::int as n from deal_signals where profile_id = $1', [OWNER],
    );

    await admin.query('update watchlist_items set paused = false where id = $1', [itemId]);
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
  });

  it('excludes the paused watch from the swept set', async () => {
    await admin.query('update watchlist_items set paused = true where id = $1', [itemId]);
    const paused = await sweep(JOB_URL!, NOW);
    await admin.query('update watchlist_items set paused = false where id = $1', [itemId]);
    const active = await sweep(JOB_URL!, NOW);

    expect(active.watchesExamined).toBe(paused.watchesExamined + 1);
  });
});

d('the job role is as narrow as migration 0007 claims', () => {
  let job: pg.Client;

  beforeAll(async () => {
    job = new pg.Client({ connectionString: JOB_URL });
    await job.connect();
  });
  afterAll(async () => {
    await job?.end();
  });

  it('does NOT have bypassrls', async () => {
    const { rows } = await job.query<{ rolbypassrls: boolean }>(
      `select rolbypassrls from pg_roles where rolname = 'bargenation_jobs'`,
    );
    expect(rows[0]!.rolbypassrls).toBe(false);
  });

  it('can read the watches it needs to sweep', async () => {
    await expect(job.query('select count(*) from watchlist_items')).resolves.toBeTruthy();
  });

  it('cannot read saved items, households or preferences', async () => {
    for (const table of ['saved_items', 'households', 'household_members', 'preferences']) {
      await expect(job.query(`select * from ${table} limit 1`), table).rejects.toThrow(/permission denied/i);
    }
  });

  it('cannot update or delete a signal it created', async () => {
    await expect(job.query(`update deal_signals set message = 'x'`)).rejects.toThrow(/permission denied/i);
    await expect(job.query('delete from deal_signals')).rejects.toThrow(/permission denied/i);
  });

  it('cannot reach commission data', async () => {
    await expect(job.query('select * from commerce.affiliate_links')).rejects.toThrow(/permission denied/i);
  });

  it('cannot rewrite price history', async () => {
    await expect(job.query('update price_observations set price_cents = 1')).rejects.toThrow(/permission denied/i);
  });
});

/**
 * A watch whose subject is a whole store (§43).
 *
 * `watchlist_items.retailer_id` was in the schema from migration 0003 and the
 * sweep explicitly skipped it (`and wi.product_id is not null`). These prove
 * the retailer path is really wired end to end — that the sweep finds such a
 * watch, scores the store's shelf, and stays quiet about everything that is
 * merely on sale.
 */
d('a watch on a whole retailer', () => {
  const OWNER = 'dddddddd-0000-4000-8000-000000000005';
  const NOW = new Date('2026-08-20T12:00:00Z');

  let admin: pg.Client;
  let sweep: typeof import('@/data/signal-runner').sweepDealSignals;
  let retailerSlug: string;
  let itemId: string;
  let strongOfferId: string;

  /** Appends an ascending, strictly-ordered price walk to an offer. */
  async function walk(offerId: string, prices: number[]) {
    for (const [i, price] of prices.entries()) {
      await admin.query(
        `insert into price_observations (offer_id, price_cents, in_stock, observed_at, source_id)
         values ($1, $2, true, $3, (select id from data_sources where tier = 1 limit 1))`,
        [offerId, price, new Date(NOW.getTime() - (prices.length - i) * 86_400_000)],
      );
    }
    await admin.query(
      'update offers set price_cents = $2, last_verified_at = $3 where id = $1',
      [offerId, prices[prices.length - 1], NOW],
    );
  }

  async function makeOffer(productSlug: string, name: string): Promise<string> {
    await admin.query(
      `insert into products (slug, name, category_id)
       values ($1, $2, (select id from categories order by sort_order limit 1))
       on conflict (slug) do nothing`,
      [productSlug, name],
    );
    const offer = await admin.query<{ id: string }>(
      `insert into offers (product_id, retailer_id, source_id, price_cents, is_sample_data,
                           last_verified_at)
       values ((select id from products  where slug = $1),
               (select id from retailers where slug = $2),
               (select id from data_sources where tier = 1 limit 1),
               9000, false, $3)
       returning id`,
      [productSlug, retailerSlug, NOW],
    );
    return offer.rows[0]!.id;
  }

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query('delete from profiles where id = $1', [OWNER]);

    // Owned catalog, uniquely stamped — price history is append-only, so a
    // suite cannot tidy up after itself and must not borrow seeded rows.
    const stamp = `retailer-sweep-${Date.now()}`;
    retailerSlug = stamp;
    await admin.query(
      `insert into retailers (slug, name) values ($1, 'Retailer Sweep Test')`,
      [retailerSlug],
    );

    // One offer that is genuinely exceptional, one that is merely on sale.
    strongOfferId = await makeOffer(`${stamp}-strong`, 'Sweep Strong Item');
    const ordinaryOfferId = await makeOffer(`${stamp}-ordinary`, 'Sweep Ordinary Item');

    const long = Array.from({ length: 40 }, (_, i) => 9000 - i * 20);
    await walk(strongOfferId, [...long, 3000]);
    await walk(ordinaryOfferId, [...Array.from({ length: 40 }, () => 5000), 4400]);

    await admin.query(`insert into profiles (id, display_name) values ($1, 'Store Watcher')`, [OWNER]);
    const list = await admin.query<{ id: string }>(
      `insert into watchlists (profile_id) values ($1) returning id`, [OWNER],
    );
    const item = await admin.query<{ id: string }>(
      `insert into watchlist_items (watchlist_id, retailer_id)
       values ($1, (select id from retailers where slug = $2)) returning id`,
      [list.rows[0]!.id, retailerSlug],
    );
    itemId = item.rows[0]!.id;

    ({ sweepDealSignals: sweep } = await import('@/data/signal-runner'));
  });

  afterAll(async () => {
    await admin?.query('delete from profiles where id = $1', [OWNER]);
    await admin?.end();
  });

  it('finds the watch at all — it is counted as a retailer watch', async () => {
    const result = await sweep(JOB_URL!, NOW);
    expect(result.retailerWatchesExamined).toBeGreaterThan(0);
  });

  /**
   * The one signal it produces must be about the exceptional offer, not the
   * ordinary one — which would have earned PRICE_DROPPED on a product watch.
   */
  it('reports the exceptional offer and ignores the ordinary sale', async () => {
    const { rows } = await admin.query<{ kind: string; offer_id: string; message: string }>(
      `select kind, offer_id, message from deal_signals
       where profile_id = $1 order by created_at desc`,
      [OWNER],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe('UNUSUALLY_STRONG');
    expect(rows[0]!.offer_id).toBe(strongOfferId);
    expect(rows[0]!.message).toContain('Retailer Sweep Test');
  });

  it('does not repeat itself on the next sweep', async () => {
    await sweep(JOB_URL!, NOW);
    const { rows } = await admin.query<{ n: number }>(
      'select count(*)::int as n from deal_signals where profile_id = $1', [OWNER],
    );
    expect(rows[0]!.n).toBe(1);
  });

  it('is silent while paused', async () => {
    await admin.query('update watchlist_items set paused = true where id = $1', [itemId]);
    const paused = await sweep(JOB_URL!, NOW);
    await admin.query('update watchlist_items set paused = false where id = $1', [itemId]);
    const active = await sweep(JOB_URL!, NOW);
    expect(active.retailerWatchesExamined).toBe(paused.retailerWatchesExamined + 1);
  });
});
