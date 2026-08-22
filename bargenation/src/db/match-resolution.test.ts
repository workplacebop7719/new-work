/**
 * Resolving an ambiguous match, against a real database.
 *
 * The claim being tested is not "the button works" — it is that a resolution
 * STICKS. A queue item you can close but that reappears on the next run is not
 * a resolution, it is a chore that repeats.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { createFakeSource } from '@/ingest/source-port';
import { SOURCE_TIER } from '@/domain/confidence';

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const STAFF_URL = process.env.TEST_ADMIN_DATABASE_URL;
const live = Boolean(ADMIN_URL && STAFF_URL);
const d = live ? describe : describe.skip;

const OPERATOR = 'abcdabcd-0000-4000-8000-00000000000a';
const STAMP = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const RETAILER = `resolve-retailer-${STAMP}`;
const AMBIGUOUS = `Resolvefixture${STAMP}`;

d('resolving an ambiguous match', () => {
  let admin: pg.Client;
  let repo: typeof import('@/data/admin-repository');
  let ingest: typeof import('@/ingest/pipeline').ingestFromSource;
  let blueId: string;
  let greenId: string;

  const record = () => ({
    title: AMBIGUOUS,
    price: '$40.00',
    currency: 'USD',
    availability: 'in stock',
    observed_at: new Date().toISOString(),
  });

  const run = () =>
    ingest(
      ADMIN_URL!,
      createFakeSource({ slug: `resolve-feed-${STAMP}`, tier: SOURCE_TIER.AFFILIATE_FEED, records: [record()] }),
      RETAILER,
    );

  const openItems = async () => {
    const { rows } = await admin.query<{ id: string }>(
      `select r.id::text from ingest_rejections r
       where r.stage = 'MATCH' and r.resolved_at is null
         and r.raw->>'title' = $1`,
      [AMBIGUOUS],
    );
    return rows.map((r) => r.id);
  };

  beforeAll(async () => {
    process.env.ADMIN_DATABASE_URL = STAFF_URL;
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();

    await admin.query(
      `insert into profiles (id, display_name, role) values ($1,'Resolver','operator')
       on conflict (id) do update set role = 'operator'`,
      [OPERATOR],
    );
    await admin.query(
      `insert into retailers (slug, name) values ($1, $2) on conflict (slug) do nothing`,
      [RETAILER, `Resolve Retailer ${STAMP}`],
    );

    // Two products similar enough that the matcher must decline to choose.
    const blue = await admin.query<{ id: string }>(
      `insert into products (slug, name, category_id)
       values ($1, $2, (select id from categories limit 1)) returning id`,
      [`resolve-blue-${STAMP}`, `${AMBIGUOUS} Blue`],
    );
    const green = await admin.query<{ id: string }>(
      `insert into products (slug, name, category_id)
       values ($1, $2, (select id from categories limit 1)) returning id`,
      [`resolve-green-${STAMP}`, `${AMBIGUOUS} Green`],
    );
    blueId = blue.rows[0]!.id;
    greenId = green.rows[0]!.id;

    ({ ingestFromSource: ingest } = await import('@/ingest/pipeline'));
    repo = await import('@/data/admin-repository');
  });

  afterAll(async () => {
    await admin?.end();
  });

  it('the matcher declines, and the record lands in the queue', async () => {
    const result = await run();
    expect(result.needsReview).toBe(1);
    expect(result.accepted).toBe(0);
    expect(await openItems()).toHaveLength(1);
  });

  it('asks again on the next run, because nobody has answered', async () => {
    const result = await run();
    expect(result.needsReview).toBe(1);
    expect(await openItems()).toHaveLength(2);
  });

  it('the queue item carries the candidates and their scores', async () => {
    const queue = await repo.listReviewQueue(OPERATOR);
    const mine = queue.find((q) => q.raw.title === AMBIGUOUS);
    expect(mine).toBeDefined();
    expect(mine!.retailerSlug).toBe(RETAILER);
    expect(mine!.candidates.length).toBeGreaterThanOrEqual(2);
    // The scores are close, which is exactly why it could not be decided.
    const [a, b] = mine!.candidates;
    expect(Math.abs(a!.confidence - b!.confidence)).toBeLessThan(0.05);
  });

  it('resolving closes the item and records why', async () => {
    const [first] = await openItems();
    await repo.resolveMatch(
      OPERATOR, first!, { kind: 'MATCHED', productId: greenId },
      'checked the retailer listing: this is the green one',
    );

    const { rows } = await admin.query<{ resolution: string; resolved_by: string }>(
      `select resolution, resolved_by::text from ingest_rejections where id = $1`, [first],
    );
    expect(rows[0]!.resolution).toBe('MATCHED');
    expect(rows[0]!.resolved_by).toBe(OPERATOR);

    const audit = await admin.query<{ action: string; reason: string }>(
      `select action, reason from admin_actions where actor_id = $1 order by created_at desc limit 1`,
      [OPERATOR],
    );
    expect(audit.rows[0]!.action).toBe('RESOLVE_MATCH');
    expect(audit.rows[0]!.reason).toMatch(/green one/);
  });

  it('will not resolve the same item twice', async () => {
    const { rows } = await admin.query<{ id: string }>(
      `select id::text from ingest_rejections
       where raw->>'title' = $1 and resolved_at is not null limit 1`, [AMBIGUOUS],
    );
    await expect(
      repo.resolveMatch(OPERATOR, rows[0]!.id, { kind: 'DISMISSED' }, 'trying again'),
    ).rejects.toThrow(/already been resolved/i);
  });

  /**
   * The load-bearing test. A resolution that does not stop the question
   * recurring has not resolved anything.
   */
  it('the next run matches silently, and never asks again', async () => {
    const before = (await openItems()).length;
    const result = await run();

    expect(result.needsReview).toBe(0);
    expect(result.accepted).toBe(1);
    expect(await openItems()).toHaveLength(before);
  });

  it('the observation landed against the product the operator chose', async () => {
    const { rows } = await admin.query<{ n: number }>(
      `select count(*)::int as n
       from price_observations po
       join offers o on o.id = po.offer_id
       where o.product_id = $1`,
      [greenId],
    );
    expect(rows[0]!.n).toBeGreaterThan(0);

    const other = await admin.query<{ n: number }>(
      `select count(*)::int as n
       from price_observations po
       join offers o on o.id = po.offer_id
       where o.product_id = $1`,
      [blueId],
    );
    expect(other.rows[0]!.n).toBe(0);
  });

  it('survives the feed rewording the title', async () => {
    const reworded = createFakeSource({
      slug: `resolve-feed-${STAMP}`,
      tier: SOURCE_TIER.AFFILIATE_FEED,
      records: [{ ...record(), title: `  ${AMBIGUOUS.toUpperCase()}!  ` }],
    });
    const result = await ingest(ADMIN_URL!, reworded, RETAILER);
    expect(result.needsReview).toBe(0);
  });

  it('a dismissal records no alias, and says so by asking again', async () => {
    const other = `Dismissfixture${STAMP}`;
    await admin.query(
      `insert into products (slug, name, category_id)
       values ($1, $2, (select id from categories limit 1)), ($3, $4, (select id from categories limit 1))`,
      [`dismiss-a-${STAMP}`, `${other} Blue`, `dismiss-b-${STAMP}`, `${other} Green`],
    );
    const src = () => createFakeSource({
      slug: `resolve-feed-${STAMP}`, tier: SOURCE_TIER.AFFILIATE_FEED,
      records: [{ ...record(), title: other }],
    });

    await ingest(ADMIN_URL!, src(), RETAILER);
    const { rows } = await admin.query<{ id: string }>(
      `select id::text from ingest_rejections
       where raw->>'title' = $1 and resolved_at is null limit 1`, [other],
    );
    await repo.resolveMatch(OPERATOR, rows[0]!.id, { kind: 'DISMISSED' }, 'not sure, leaving it');

    const again = await ingest(ADMIN_URL!, src(), RETAILER);
    expect(again.needsReview).toBe(1);
  });
});
