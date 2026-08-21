/**
 * Database guarantees, verified against a real PostgreSQL.
 *
 * These are the negative tests — each one proves something CANNOT happen:
 * history cannot be rewritten, one customer cannot read another's household,
 * and scoring cannot reach commission data.
 *
 * Skipped when TEST_DATABASE_URL is unset so the unit suite still runs
 * anywhere. Never point it at a database you care about.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const APP_URL = process.env.TEST_APP_DATABASE_URL;
const live = Boolean(ADMIN_URL && APP_URL);

const d = live ? describe : describe.skip;

let admin: pg.Client;
/** Two independent connections, each acting as a different customer. */
let alice: pg.Client;
let bob: pg.Client;

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

/** Impersonate a customer exactly as Supabase does: via the JWT subject GUC. */
async function actAs(c: pg.Client, profileId: string) {
  await c.query('select set_config($1, $2, false)', ['request.jwt.claim.sub', profileId]);
}

d('database guarantees', () => {
  let offerId: string;

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();

    // Start from a clean slate for THIS suite's two customers. Deleting the
    // profiles cascades to their households, watchlists and signals, so the
    // suite is idempotent against a database it has already run on. Seeded
    // catalog data is untouched, and price history is append-only anyway.
    await admin.query('delete from profiles where id = any($1::uuid[])', [[ALICE, BOB]]);

    // Catalog fixtures. Ids are RESOLVED BY SLUG rather than hardcoded: this
    // suite must pass against an empty database and against a seeded one,
    // where 'shoes' already exists under a different generated id.
    // One statement per call — pg refuses multiple commands with parameters.
    const setup: Array<[string, unknown[]]> = [
      [`insert into data_sources (name, tier) values ('test feed',2)
        on conflict (name) do nothing`, []],
      [`insert into retailers (slug, name) values ('test-retailer','Test Retailer')
        on conflict (slug) do nothing`, []],
      [`insert into categories (slug, name) values ('shoes','Shoes')
        on conflict (slug) do nothing`, []],
      [`insert into products (slug, name, category_id)
        values ('test-shoe','Test Shoe', (select id from categories where slug='shoes'))
        on conflict (slug) do nothing`, []],
      [`insert into profiles (id, display_name) values ($1,'Alice'), ($2,'Bob')
        on conflict (id) do nothing`, [ALICE, BOB]],
    ];
    for (const [sql, params] of setup) await admin.query(sql, params);

    const offerRow = await admin.query<{ id: string }>(
      `insert into offers (product_id, retailer_id, source_id, price_cents)
       values (
         (select id from products     where slug = 'test-shoe'),
         (select id from retailers    where slug = 'test-retailer'),
         (select id from data_sources where name = 'test feed'),
         1000)
       on conflict (retailer_id, product_id, variant_id) do update
         set price_cents = excluded.price_cents
       returning id`,
    );
    offerId = offerRow.rows[0]!.id;


    alice = new pg.Client({ connectionString: APP_URL });
    bob = new pg.Client({ connectionString: APP_URL });
    await alice.connect();
    await bob.connect();
    await actAs(alice, ALICE);
    await actAs(bob, BOB);
  });

  afterAll(async () => {
    await Promise.all([alice?.end(), bob?.end(), admin?.end()]);
  });

  // ---------- append-only ----------
  describe('price history cannot be rewritten', () => {
    beforeAll(async () => {
      await admin.query(
        `insert into price_observations (offer_id, price_cents, in_stock, observed_at, source_id)
         values ($1, 2000, true, now() - interval '5 days', (select id from data_sources where name='test feed'))`,
        [offerId],
      );
    });

    it('rejects UPDATE, even as the table owner', async () => {
      await expect(
        admin.query('update price_observations set price_cents = 1 where offer_id = $1', [offerId]),
      ).rejects.toThrow(/append-only/i);
    });

    it('rejects DELETE', async () => {
      await expect(
        admin.query('delete from price_observations where offer_id = $1', [offerId]),
      ).rejects.toThrow(/append-only/i);
    });

    it('rejects TRUNCATE', async () => {
      await expect(admin.query('truncate price_observations')).rejects.toThrow(/append-only/i);
    });

    it('still allows INSERT — a correction is a new observation', async () => {
      const before = await admin.query('select count(*)::int as n from price_observations');
      await admin.query(
        `insert into price_observations (offer_id, price_cents, in_stock, observed_at, source_id)
         values ($1, 1800, true, now(), (select id from data_sources where name='test feed'))`,
        [offerId],
      );
      const after = await admin.query('select count(*)::int as n from price_observations');
      expect(after.rows[0].n).toBe(before.rows[0].n + 1);
    });

    it('protects verification events the same way', async () => {
      await admin.query(
        `insert into verification_events (offer_id, outcome) values ($1,'confirmed')`, [offerId],
      );
      await expect(
        admin.query(`update verification_events set outcome='gone' where offer_id=$1`, [offerId]),
      ).rejects.toThrow(/append-only/i);
    });
  });

  // ---------- row level security ----------
  describe('one customer cannot reach another', () => {
    beforeAll(async () => {
      await alice.query(`insert into watchlists (profile_id, name) values ($1,'Alice list')`, [ALICE]);
      await bob.query(`insert into watchlists (profile_id, name) values ($1,'Bob list')`, [BOB]);
      await alice.query(`insert into households (owner_profile_id, name) values ($1,'Alice home')`, [ALICE]);
      await alice.query(
        `insert into household_members (household_id, nickname, birth_year)
         select id, 'Middle one', 2017 from households where owner_profile_id = $1`, [ALICE],
      );
    });

    it('shows each customer only their own watchlists', async () => {
      const a = await alice.query('select name from watchlists');
      const b = await bob.query('select name from watchlists');
      expect(a.rows.map((r) => r.name)).toEqual(['Alice list']);
      expect(b.rows.map((r) => r.name)).toEqual(['Bob list']);
    });

    it('hides household members through the parent chain', async () => {
      const seen = await bob.query('select * from household_members');
      expect(seen.rows).toHaveLength(0);
      const own = await alice.query('select nickname from household_members');
      expect(own.rows).toHaveLength(1);
    });

    it('returns nothing when Bob names Alice’s row explicitly', async () => {
      const ids = await alice.query('select id from watchlists');
      const aliceListId = ids.rows[0].id;
      const attempt = await bob.query('select * from watchlists where id = $1', [aliceListId]);
      expect(attempt.rows).toHaveLength(0);
    });

    it('refuses an insert that would plant a row under another profile', async () => {
      await expect(
        bob.query(`insert into watchlists (profile_id, name) values ($1,'planted')`, [ALICE]),
      ).rejects.toThrow(/row-level security/i);
    });

    it('cannot update another customer’s row', async () => {
      const before = await alice.query(`select name from watchlists where profile_id = $1`, [ALICE]);
      const res = await bob.query(`update watchlists set name = 'hijacked' where profile_id = $1`, [ALICE]);
      expect(res.rowCount).toBe(0);
      const after = await alice.query(`select name from watchlists where profile_id = $1`, [ALICE]);
      expect(after.rows[0].name).toBe(before.rows[0].name);
    });

    it('has RLS both ENABLED and FORCED on every customer table', async () => {
      const { rows } = await admin.query(`
        select relname, relrowsecurity, relforcerowsecurity
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and relname in
          ('profiles','households','household_members','saved_items',
           'watchlists','watchlist_items','deal_signals','preferences')
      `);
      expect(rows).toHaveLength(8);
      for (const r of rows) {
        expect(r.relrowsecurity, `${r.relname} RLS enabled`).toBe(true);
        // force matters: without it the owner silently bypasses its own policies
        expect(r.relforcerowsecurity, `${r.relname} RLS forced`).toBe(true);
      }
    });
  });

  // ---------- the trust firewall ----------
  describe('commission data is unreachable from the app', () => {
    it('denies the application role access to the commerce schema', async () => {
      await expect(
        alice.query('select commission_rate from commerce.affiliate_links'),
      ).rejects.toThrow(/permission denied/i);
    });

    it('denies it even when the query is disguised as a join onto offers', async () => {
      await expect(
        alice.query(`
          select o.id from offers o
          join commerce.affiliate_links al on al.offer_id = o.id
        `),
      ).rejects.toThrow(/permission denied/i);
    });

    it('grants the scoring role nothing on commerce', async () => {
      const { rows } = await admin.query(`
        select has_schema_privilege('bargenation_scoring','commerce','usage') as usage
      `);
      expect(rows[0].usage).toBe(false);
    });

    it('still lets the app read the catalog it legitimately needs', async () => {
      const { rows } = await alice.query('select count(*)::int as n from offers');
      expect(rows[0].n).toBeGreaterThan(0);
    });
  });

  // ---------- constraints ----------
  describe('constraints refuse incoherent records', () => {
    it('rejects a published score with no number', async () => {
      await expect(admin.query(`
        insert into value_index_scores (offer_id, score, band, coverage, published, components)
        values ($1, null, 'STRONG_BUY', 0.8, true, '{}'::jsonb)
      `, [offerId])).rejects.toThrow(/score_shape/);
    });

    it('rejects a withheld score that still carries a number', async () => {
      await expect(admin.query(`
        insert into value_index_scores (offer_id, score, band, coverage, published, withheld_reason, components)
        values ($1, 9.5, 'WITHHELD', 0.2, false, 'thin history', '{}'::jsonb)
      `, [offerId])).rejects.toThrow(/score_shape/);
    });

    it('accepts a properly withheld score', async () => {
      const res = await admin.query(`
        insert into value_index_scores (offer_id, score, band, coverage, published, withheld_reason, components)
        values ($1, null, 'WITHHELD', 0.2, false, 'not enough price history', '{}'::jsonb)
        returning id
      `, [offerId]);
      expect(res.rows[0].id).toBeTruthy();
    });

    it('rejects a watchlist item that watches nothing', async () => {
      const wl = await alice.query('select id from watchlists limit 1');
      await expect(alice.query(
        `insert into watchlist_items (watchlist_id) values ($1)`, [wl.rows[0].id],
      )).rejects.toThrow(/watchlist_item_has_subject/);
    });

    it('has no column for a child’s legal name or date of birth', async () => {
      const { rows } = await admin.query(`
        select column_name from information_schema.columns
        where table_name = 'household_members'
      `);
      const cols = rows.map((r) => r.column_name);
      for (const forbidden of ['legal_name', 'full_name', 'date_of_birth', 'dob', 'school', 'address']) {
        expect(cols).not.toContain(forbidden);
      }
      expect(cols).toContain('nickname');
      expect(cols).toContain('birth_year');
    });
  });
});
