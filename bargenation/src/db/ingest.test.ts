/**
 * The ingestion pipeline against a real database.
 *
 * The unit tests cover each judgement in isolation. This covers the seam:
 * that a refusal actually prevents a row, that a quarantine actually holds
 * one outside the permanent record, and that corroboration actually releases
 * it. Those are the parts that would silently not work.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { createFakeSource } from '@/ingest/source-port';
import { SOURCE_TIER } from '@/domain/confidence';

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const live = Boolean(ADMIN_URL);
const d = live ? describe : describe.skip;

const NOW = new Date('2026-08-22T12:00:00Z');
const RETAILER = 'ingest-test-retailer';

/**
 * A fresh product per run.
 *
 * price_observations is append-only — DELETE is rejected by trigger — so this
 * suite CANNOT tidy up after itself, and a cascade delete of the product is
 * blocked by the observations hanging off it. An earlier version tried anyway
 * and swallowed the failure in a .catch(), which quietly left every previous
 * run's observations in place and made the assertions drift.
 *
 * Owning a uniquely named product each run is the honest way to get a clean
 * slate against an immutable record.
 */
const STAMP = Date.now();
/**
 * A SINGLE unique token, not "Ingest Test Widget <stamp>". Titles of that
 * shape share three tokens with the previous run's product, so the matcher
 * correctly reported them as ambiguous and refused to decide — which is the
 * matcher working, and the test fixture being careless.
 */
const TITLE = `Ingestfixture${STAMP}`;
const SLUG = `ingestfixture${STAMP}`;

d('ingestion pipeline', () => {
  let admin: pg.Client;
  let ingest: typeof import('@/ingest/pipeline').ingestFromSource;

  const row = (over: Record<string, unknown> = {}) => ({
    title: TITLE,
    brand: 'IngestBrand',
    sku: 'IT-1',
    price: '$40.00',
    currency: 'USD',
    availability: 'in stock',
    observed_at: NOW.toISOString(),
    ...over,
  });

  const run = (records: Record<string, unknown>[], slug = 'feed-a', at = NOW) =>
    ingest(
      ADMIN_URL!,
      createFakeSource({ slug, tier: SOURCE_TIER.AFFILIATE_FEED, records }),
      RETAILER,
      at,
    );

  const observations = async (): Promise<number[]> => {
    const { rows } = await admin.query<{ price_cents: number }>(
      `select po.price_cents from price_observations po
       join offers o on o.id = po.offer_id
       join products p on p.id = o.product_id
       where p.slug = $1
       order by po.observed_at asc`,
      [SLUG],
    );
    return rows.map((r) => r.price_cents);
  };

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    // This suite owns its retailer and product, so it never disturbs the
    // seeded fixtures the parity suite compares against. Nothing is deleted:
    // see the note on STAMP above.
    await admin.query(
      `insert into retailers (slug, name) values ($1, 'Ingest Test Retailer')
       on conflict (slug) do nothing`, [RETAILER],
    );
    ({ ingestFromSource: ingest } = await import('@/ingest/pipeline'));
  });

  afterAll(async () => {
    await admin?.end();
  });

  it('records a well-formed offer and its first observation', async () => {
    const result = await run([row()]);
    expect(result.accepted).toBe(1);
    expect(result.rejected).toBe(0);
    expect(await observations()).toEqual([4000]);
  });

  it('accepts ordinary subsequent movement', async () => {
    const later = new Date(NOW.getTime() + 3_600_000);
    const result = await run([row({ price: '$34.00', observed_at: later.toISOString() })], 'feed-a', later);
    expect(result.accepted).toBe(1);
    expect(await observations()).toEqual([4000, 3400]);
  });

  describe('refusals actually prevent rows', () => {
    it.each([
      ['an ambiguous thousands separator', { price: '1,234' }],
      ['a range instead of a price', { price: 'from $20' }],
      ['an unsupported currency', { currency: 'GBP' }],
      ['an unmodelled availability state', { availability: 'preorder' }],
      ['a future timestamp', { observed_at: '2030-01-01T00:00:00Z' }],
      ['a missing title', { title: '' }],
      ['a placeholder price', { price: '$9999.99' }],
    ])('refuses %s and writes no observation', async (_label, override) => {
      const before = await observations();
      const at = new Date(NOW.getTime() + 7_200_000);
      const result = await run([row({ ...override, observed_at: (override as Record<string, unknown>).observed_at ?? at.toISOString() })], 'feed-a', at);

      expect(result.accepted).toBe(0);
      expect(result.rejected).toBe(1);
      expect(await observations()).toEqual(before);
    });

    it('records why, so an operator can tell a broken feed from a quiet one', async () => {
      const { rows } = await admin.query<{ stage: string; reason: string }>(
        `select stage, reason from ingest_rejections order by created_at desc limit 20`,
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.reason.trim().length > 0)).toBe(true);
      expect(rows.map((r) => r.stage)).toContain('EXTRACT');
    });
  });

  describe('quarantine holds doubt outside the permanent record', () => {
    const crashAt = new Date(NOW.getTime() + 10_800_000);

    it('does not record an extraordinary collapse on one sighting', async () => {
      const before = await observations();
      const result = await run([row({ price: '$2.00', observed_at: crashAt.toISOString() })], 'feed-a', crashAt);

      expect(result.quarantined).toBe(1);
      expect(result.accepted).toBe(0);
      // The crucial part: price_observations is unchanged, so no false
      // "recorded low" now exists to poison every future Value Index.
      expect(await observations()).toEqual(before);
    });

    it('holds it in quarantine with a stated reason', async () => {
      const { rows } = await admin.query<{ price_cents: number; reason: string }>(
        `select q.price_cents, q.reason from quarantined_observations q
         join offers o on o.id = q.offer_id
         join products p on p.id = o.product_id
         where p.slug = $1 and q.released_at is null and q.discarded_at is null`,
        [SLUG],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.price_cents).toBe(200);
      expect(rows[0]!.reason).toMatch(/fell \d+%/);
    });

    it('the same source repeating itself does NOT release it', async () => {
      const again = new Date(crashAt.getTime() + 600_000);
      const before = await observations();
      const result = await run([row({ price: '$2.00', observed_at: again.toISOString() })], 'feed-a', again);

      expect(result.released).toBe(0);
      expect(await observations()).toEqual(before);
    });

    it('a DIFFERENT source agreeing releases both', async () => {
      const confirmAt = new Date(crashAt.getTime() + 1_200_000);
      const before = await observations();
      const result = await run(
        [row({ price: '$2.00', observed_at: confirmAt.toISOString() })],
        'feed-b',
        confirmAt,
      );

      expect(result.released).toBeGreaterThan(0);
      const after = await observations();
      expect(after.length).toBeGreaterThan(before.length);
      expect(after).toContain(200);
    });
  });

  describe('ambiguous matches become questions, not guesses', () => {
    it('does not silently merge two similar products', async () => {
      await admin.query(
        `insert into products (slug, name, category_id)
         values ($1, $2, (select id from categories limit 1)),
                ($3, $4, (select id from categories limit 1))
         on conflict (slug) do nothing`,
        [`ingest-twin-a-${STAMP}`, `Ambigufixture${STAMP} Blue`,
         `ingest-twin-b-${STAMP}`, `Ambigufixture${STAMP} Green`],
      );
      const at = new Date(NOW.getTime() + 20_000_000);
      const result = await run(
        [row({ title: `Ambigufixture${STAMP}`, brand: null, sku: null, observed_at: at.toISOString() })],
        'feed-a', at,
      );

      expect(result.needsReview).toBe(1);
      expect(result.accepted).toBe(0);

      // Left in place: they carry no observations, and deleting is not the
      // point of this test.
    });
  });

  /**
   * Scoped to THIS suite's own feed.
   *
   * It used to read `order by started_at desc limit 1` — the latest row in the
   * whole table — and source_runs is written by the match-resolution suite
   * too. Vitest runs files in parallel, so this intermittently asserted on
   * somebody else's run, which was sometimes still RUNNING. It failed roughly
   * once in ten and hid behind however many clean runs you happened to do
   * first.
   *
   * Same lesson as owned-fixture.ts: own your data, or at least ask only about
   * it.
   */
  it('records what each run did', async () => {
    const { rows } = await admin.query<{ status: string; records_seen: number }>(
      `select r.status, r.records_seen
       from source_runs r
       join data_sources s on s.id = r.source_id
       where s.name = 'feed-a'
       order by r.started_at desc limit 1`,
    );
    expect(rows[0]!.status).toBe('COMPLETED');
    expect(rows[0]!.records_seen).toBeGreaterThan(0);
  });
});
