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

  describe('deal signals', () => {
    beforeAll(async () => {
      await admin.query(
        `insert into deal_signals (profile_id, offer_id, kind, message)
         values ($1, $2, 'PRICE_DROPPED', 'Alice signal'),
                ($3, $4, 'TARGET_REACHED', 'Bob signal')`,
        [ALICE, offerA, BOB, offerB],
      );
    });

    it('shows each customer only their own signals', async () => {
      const alice = await repo.listDealSignals(ALICE);
      const bob = await repo.listDealSignals(BOB);
      expect(alice.map((s) => s.message)).toEqual(['Alice signal']);
      expect(bob.map((s) => s.message)).toEqual(['Bob signal']);
    });

    it('cannot mark another customer’s signal as read', async () => {
      const [aliceSignal] = await repo.listDealSignals(ALICE);
      await repo.markSignalRead(BOB, aliceSignal!.id);
      expect((await repo.listDealSignals(ALICE))[0]!.readAt).toBeNull();
    });

    it('lets the owner mark their own signal read', async () => {
      const [aliceSignal] = await repo.listDealSignals(ALICE);
      await repo.markSignalRead(ALICE, aliceSignal!.id);
      expect((await repo.listDealSignals(ALICE))[0]!.readAt).not.toBeNull();
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
