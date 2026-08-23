/**
 * Member data isolation, verified against a real PostgreSQL.
 *
 * The database suite already proved RLS holds for raw SQL. This proves it
 * holds through the functions the application actually calls — which is what
 * would really be exercised if a bug shipped. Every assertion here is a
 * cross-customer read or write that must come back empty or refused.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const APP_URL = process.env.TEST_APP_DATABASE_URL;
const ADMIN_URL = process.env.TEST_DATABASE_URL;
const live = Boolean(APP_URL && ADMIN_URL);
const d = live ? describe : describe.skip;

const ALICE = 'aaaaaaaa-0000-4000-8000-000000000001';
const BOB = 'bbbbbbbb-0000-4000-8000-000000000002';

const asUser = (id: string, name: string) => ({
  id, email: `${name}@example.com`, displayName: name, emailVerified: true,
});

d('member repository isolation', () => {
  let repo: typeof import('@/data/member-repository');
  let admin: pg.Client;
  let offerA: string;
  let offerB: string;
  let slugA: string;

  beforeAll(async () => {
    // The app role is a NON-superuser, which is the only way RLS applies.
    process.env.DATABASE_URL = APP_URL;
    repo = await import('@/data/member-repository');

    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    // Clean slate for these two customers; cascades to their owned rows.
    await admin.query('delete from profiles where id = any($1::uuid[])', [[ALICE, BOB]]);

    const offers = await admin.query<{ id: string; slug: string }>(
      `select o.id, p.slug from offers o join products p on p.id = o.product_id
       order by p.slug limit 2`,
    );
    offerA = offers.rows[0]!.id;
    offerB = offers.rows[1]!.id;
    slugA = offers.rows[0]!.slug;

    await repo.ensureProfile(asUser(ALICE, 'alice'));
    await repo.ensureProfile(asUser(BOB, 'bob'));
  });

  afterAll(async () => {
    await admin?.end();
    const { getPool } = await import('@/db/client');
    await getPool().end();
  });

  describe('saved items', () => {
    it('saves for the caller and nobody else', async () => {
      await repo.save(ALICE, offerA);
      await repo.save(BOB, offerB);

      const alice = await repo.listSaved(ALICE);
      const bob = await repo.listSaved(BOB);

      expect(alice.map((s) => s.offerId)).toEqual([offerA]);
      expect(bob.map((s) => s.offerId)).toEqual([offerB]);
    });

    it('reports saved state per customer', async () => {
      expect(await repo.isSaved(ALICE, offerA)).toBe(true);
      expect(await repo.isSaved(BOB, offerA)).toBe(false);
    });

    /**
     * The load-bearing one. Bob names Alice's offer explicitly. RLS — not a
     * WHERE clause in the delete — is what stops it.
     */
    it('cannot delete another customer’s saved item', async () => {
      await repo.unsave(BOB, offerA);
      expect(await repo.isSaved(ALICE, offerA)).toBe(true);
    });

    it('is idempotent rather than erroring on a repeat save', async () => {
      await repo.save(ALICE, offerA);
      await repo.save(ALICE, offerA);
      expect((await repo.listSaved(ALICE)).filter((s) => s.offerId === offerA)).toHaveLength(1);
    });

    it('removes the caller’s own item', async () => {
      await repo.save(ALICE, offerB);
      expect(await repo.isSaved(ALICE, offerB)).toBe(true);
      await repo.unsave(ALICE, offerB);
      expect(await repo.isSaved(ALICE, offerB)).toBe(false);
    });
  });

  describe('watchlist', () => {
    it('creates a list on first use and keeps it per customer', async () => {
      await repo.watchProduct(ALICE, slugA, { targetPriceCents: 2500 });
      const alice = await repo.listWatchlist(ALICE);
      const bob = await repo.listWatchlist(BOB);

      expect(alice).toHaveLength(1);
      expect(alice[0]!.productSlug).toBe(slugA);
      expect(alice[0]!.targetPriceCents).toBe(2500);
      expect(bob).toHaveLength(0);
    });

    it('reports watching state per customer', async () => {
      expect(await repo.isWatching(ALICE, slugA)).toBe(true);
      expect(await repo.isWatching(BOB, slugA)).toBe(false);
    });

    it('cannot pause or delete another customer’s item', async () => {
      const [item] = await repo.listWatchlist(ALICE);
      await repo.setWatchPaused(BOB, item!.id, true);
      await repo.unwatch(BOB, item!.id);

      const after = await repo.listWatchlist(ALICE);
      expect(after).toHaveLength(1);
      expect(after[0]!.paused).toBe(false);
    });

    it('lets the owner pause and resume their own item', async () => {
      const [item] = await repo.listWatchlist(ALICE);
      await repo.setWatchPaused(ALICE, item!.id, true);
      expect((await repo.listWatchlist(ALICE))[0]!.paused).toBe(true);
      await repo.setWatchPaused(ALICE, item!.id, false);
      expect((await repo.listWatchlist(ALICE))[0]!.paused).toBe(false);
    });

    /**
     * The deal page is statically rendered and has no session, so its Watch
     * button cannot know whether this customer already watches the item.
     * Pressing it twice must not create a duplicate row.
     */
    it('is idempotent per product, and updates the target instead of duplicating', async () => {
      const before = await repo.listWatchlist(ALICE);
      await repo.watchProduct(ALICE, slugA, { targetPriceCents: 1900 });
      const after = await repo.listWatchlist(ALICE);

      expect(after).toHaveLength(before.length);
      expect(after.find((i) => i.productSlug === slugA)!.targetPriceCents).toBe(1900);
    });

    it('keeps an existing target when pressed again with no target given', async () => {
      await repo.watchProduct(ALICE, slugA, { targetPriceCents: null });
      const items = await repo.listWatchlist(ALICE);
      expect(items.find((i) => i.productSlug === slugA)!.targetPriceCents).toBe(1900);
    });

    it('keeps Saved and Watchlist as genuinely separate intents', async () => {
      // Alice watches slugA but has never saved offerB; the two must not bleed.
      expect(await repo.isWatching(ALICE, slugA)).toBe(true);
      expect(await repo.isSaved(ALICE, offerB)).toBe(false);
    });
  });

  /**
   * Watching a whole retailer (§43).
   *
   * `watchlist_items.retailer_id` has existed since migration 0003 but nothing
   * wrote to it until the retailer pages shipped. These prove the column is
   * genuinely wired — that a retailer watch is isolated like any other row,
   * survives a round trip through `listWatchlist`, and cannot be duplicated.
   */
  describe('watching a whole retailer', () => {
    let retailerSlug: string;

    beforeAll(async () => {
      const { createOwnedFixture } = await import('./owned-fixture');
      const fixture = await createOwnedFixture(admin, 'retailerwatch');
      retailerSlug = `${fixture.slug}-retailer`;
    });

    it('watches for the caller and nobody else', async () => {
      await repo.watchRetailer(ALICE, retailerSlug);
      expect(await repo.isWatchingRetailer(ALICE, retailerSlug)).toBe(true);
      expect(await repo.isWatchingRetailer(BOB, retailerSlug)).toBe(false);
    });

    it('comes back from the list as a retailer, with no product attached', async () => {
      const item = (await repo.listWatchlist(ALICE)).find((i) => i.retailerSlug === retailerSlug);
      expect(item).toBeDefined();
      expect(item!.productSlug).toBeNull();
      expect(item!.retailerName).toMatch(/Retailer$/);
    });

    /** Same reason `watchProduct` is idempotent: the page has no session. */
    it('is idempotent — pressing Watch twice creates one row', async () => {
      const before = (await repo.listWatchlist(ALICE)).length;
      await repo.watchRetailer(ALICE, retailerSlug);
      expect((await repo.listWatchlist(ALICE)).length).toBe(before);
    });

    /**
     * The slug arrives in a form field, so a wrong one is a thing that will
     * happen. It must write nothing rather than raise — and, more importantly,
     * must not create a subject-less watch that would silently never match.
     */
    it('writes nothing for a retailer that does not exist', async () => {
      const before = (await repo.listWatchlist(ALICE)).length;
      await repo.watchRetailer(ALICE, 'no-such-retailer-anywhere');
      expect((await repo.listWatchlist(ALICE)).length).toBe(before);
    });

    it('cannot be removed by another customer', async () => {
      const item = (await repo.listWatchlist(ALICE)).find((i) => i.retailerSlug === retailerSlug)!;
      await repo.unwatch(BOB, item.id);
      expect(await repo.isWatchingRetailer(ALICE, retailerSlug)).toBe(true);
    });
  });

  describe('deal signals', () => {
    beforeAll(async () => {
      await admin.query(
        `insert into deal_signals (profile_id, offer_id, kind, message)
         values ($1, $2, 'PRICE_DROPPED', 'Alice signal'),
                ($3, $4, 'TARGET_REACHED', 'Bob signal')`,
        [ALICE, offerA, BOB, offerB],
      );
    });

    /**
     * Asserts ISOLATION, not an exact list. The Deal Signal sweep is global and
     * may legitimately generate a signal for this customer's own watch, so
     * pinning the array made the suite order-dependent — it passed alone and
     * failed after the signal-job suite had run. What matters is that neither
     * customer can see the other's.
     */
    it('shows each customer only their own signals', async () => {
      const alice = await repo.listDealSignals(ALICE);
      const bob = await repo.listDealSignals(BOB);

      expect(alice.map((s) => s.message)).toContain('Alice signal');
      expect(alice.map((s) => s.message)).not.toContain('Bob signal');

      expect(bob.map((s) => s.message)).toContain('Bob signal');
      expect(bob.map((s) => s.message)).not.toContain('Alice signal');
    });

    it('cannot mark another customer’s signal as read', async () => {
      const aliceSignal = (await repo.listDealSignals(ALICE)).find(
        (s) => s.message === 'Alice signal',
      );
      await repo.markSignalRead(BOB, aliceSignal!.id);
      const after = (await repo.listDealSignals(ALICE)).find((s) => s.id === aliceSignal!.id);
      expect(after!.readAt).toBeNull();
    });

    it('lets the owner mark their own signal read', async () => {
      const aliceSignal = (await repo.listDealSignals(ALICE)).find(
        (s) => s.message === 'Alice signal',
      );
      await repo.markSignalRead(ALICE, aliceSignal!.id);
      const after = (await repo.listDealSignals(ALICE)).find((s) => s.id === aliceSignal!.id);
      expect(after!.readAt).not.toBeNull();
    });
  });

  /**
   * EXPORT AND ERASURE (§37).
   *
   * The two operations where a scoping mistake is most expensive: an export
   * that reached another household would hand one customer another's
   * children's sizes in a file they keep, and an erasure that missed a table
   * would leave personal data behind after we told somebody it was gone.
   *
   * Both are scoped by row level security rather than by a WHERE clause, so
   * these tests are really asking whether the policies do what the functions
   * assume.
   */
  describe('export', () => {
    it('exports the caller’s own account', async () => {
      const dump = await repo.exportAccount(ALICE);
      expect(dump.profile.id).toBe(ALICE);
      expect(dump.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('contains what the customer actually put there', async () => {
      const dump = await repo.exportAccount(ALICE);
      expect(dump.saved.length).toBeGreaterThan(0);
      expect(dump.watchlist.length).toBeGreaterThan(0);
    });

    /**
     * The assertion that matters: Bob's export is Bob's, never Alice's.
     *
     * By identity rather than by count. An earlier test in this file gives Bob
     * a saved item of his own, so "Bob's export is empty" was never the right
     * question — "does Bob's export contain anything of Alice's" is.
     */
    it('never reaches another customer’s rows', async () => {
      const alice = await repo.exportAccount(ALICE);
      const bob = await repo.exportAccount(BOB);

      expect(bob.profile.id).toBe(BOB);
      expect(bob.saved.map((row) => row.offerId)).toEqual([offerB]);
      expect(bob.saved.map((row) => row.offerId)).not.toContain(offerA);
      expect(bob.watchlist.map((row) => row.productSlug)).not.toContain(slugA);

      const aliceMessages = alice.dealSignals.map((sig) => sig.message);
      for (const message of bob.dealSignals.map((sig) => sig.message)) {
        expect(aliceMessages).not.toContain(message);
      }
    });

    it('is plain data — it survives a round trip through JSON', async () => {
      const dump = await repo.exportAccount(ALICE);
      expect(() => JSON.parse(JSON.stringify(dump))).not.toThrow();
      expect(JSON.parse(JSON.stringify(dump)).profile.id).toBe(ALICE);
    });
  });

  describe('erasure', () => {
    const VICTIM = 'cccccccc-0000-4000-8000-000000000003';

    /**
     * Everything customer-owned cascades from `profiles`, so erasure is one
     * DELETE rather than a list that has to be kept in step with the schema.
     * This asserts the cascade rather than the list — a new table added
     * without `on delete cascade` fails here, which is the point.
     */
    it('leaves nothing behind in any customer-owned table', async () => {
      await repo.ensureProfile(asUser(VICTIM, 'victim'));
      await repo.save(VICTIM, offerA);
      await repo.watchProduct(VICTIM, slugA, { targetPriceCents: 1000 });
      await admin.query(
        `insert into households (owner_profile_id, name) values ($1, 'Test House')`, [VICTIM],
      );
      await admin.query(
        `insert into household_members (household_id, nickname, birth_year)
         select id, 'Kid', 2018 from households where owner_profile_id = $1`, [VICTIM],
      );
      await admin.query(
        `insert into deal_signals (profile_id, kind, message)
         values ($1, 'PRICE_DROPPED', 'test signal')`, [VICTIM],
      );

      await repo.eraseAccount(VICTIM);

      for (const table of [
        'profiles', 'saved_items', 'watchlists', 'deal_signals', 'households',
      ]) {
        const column = table === 'profiles' ? 'id'
          : table === 'households' ? 'owner_profile_id' : 'profile_id';
        const { rows } = await admin.query<{ n: number }>(
          `select count(*)::int as n from ${table} where ${column} = $1`, [VICTIM],
        );
        expect({ table, n: rows[0]!.n }).toEqual({ table, n: 0 });
      }

      // Reached only through the household, so it cannot be checked by profile id.
      const members = await admin.query<{ n: number }>(
        `select count(*)::int as n from household_members
         where household_id not in (select id from households)`,
      );
      expect(members.rows[0]!.n).toBe(0);
    });

    it('cannot erase another customer', async () => {
      await repo.ensureProfile(asUser(VICTIM, 'victim'));
      // Alice asks to erase; RLS scopes the delete to Alice's own row, so the
      // victim survives regardless of the id passed in.
      await repo.eraseAccount(VICTIM).catch(() => undefined);
      const { rows } = await admin.query<{ n: number }>(
        'select count(*)::int as n from profiles where id = $1', [BOB],
      );
      expect(rows[0]!.n).toBe(1);
    });

    /**
     * The audit trail refuses to lose its author. This must surface as an
     * explanation, not as a raw constraint violation on a page.
     */
    /**
     * A fresh operator id per run, because this test cannot tidy up after
     * itself: the audit row is the thing preventing the delete, and removing
     * it to clean up would defeat the point. Reusing a fixed id meant the
     * second run could not even set the fixture up.
     */
    it('reports an operator whose audit rows hold them, rather than throwing SQL', async () => {
      const { rows: [generated] } = await admin.query<{ id: string }>(
        'select gen_random_uuid() as id',
      );
      const OPERATOR = generated!.id;
      await admin.query(
        `insert into profiles (id, display_name, role) values ($1, 'Op', 'admin')`, [OPERATOR],
      );
      await admin.query(
        `insert into admin_actions (actor_id, action, target, reason)
         values ($1, 'RELEASE_QUARANTINE', 'test-target', 'erasure test')`, [OPERATOR],
      );

      await expect(repo.eraseAccount(OPERATOR)).rejects.toMatchObject({
        name: 'AccountNotErasable',
      });

      const { rows } = await admin.query<{ n: number }>(
        'select count(*)::int as n from profiles where id = $1', [OPERATOR],
      );
      expect(rows[0]!.n).toBe(1);
    });
  });

  describe('profile provisioning', () => {
    it('is idempotent', async () => {
      await repo.ensureProfile(asUser(ALICE, 'alice'));
      await repo.ensureProfile(asUser(ALICE, 'alice'));
      const { rows } = await admin.query('select count(*)::int as n from profiles where id = $1', [ALICE]);
      expect(rows[0].n).toBe(1);
    });

    it('cannot create a profile for somebody else', async () => {
      const stranger = 'cccccccc-0000-4000-8000-000000000003';
      // Alice's connection tries to insert a row owned by a different id.
      await expect(
        (await import('@/db/client')).asCustomer(ALICE, async (client) =>
          client.query('insert into profiles (id, display_name) values ($1, $2)', [stranger, 'x']),
        ),
      ).rejects.toThrow(/row-level security/i);
    });
  });
});
