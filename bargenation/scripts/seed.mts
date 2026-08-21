/**
 * Seeds the fictional development dataset into PostgreSQL.
 *
 * Reads the SAME fixture module the in-memory adapter uses, so the two data
 * paths are backed by identical evidence and can be compared directly.
 *
 * Refuses to run against anything that is not obviously a local database:
 * this inserts sample data, and sample data must never reach production (§45).
 */
import pg from 'pg';
import { FIXTURE_OFFERS } from '../src/data/fixtures';
import { CATEGORIES } from '../src/domain/types';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
if (!/localhost|127\.0\.0\.1/.test(url) && process.env.ALLOW_REMOTE_SEED !== 'yes') {
  console.error('Refusing to seed sample data into a non-local database.');
  console.error('Set ALLOW_REMOTE_SEED=yes only if you are certain.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const tierNames: Record<number, string> = {
  1: 'retailer api', 2: 'affiliate feed', 3: 'merchant feed',
  4: 'structured public', 5: 'permitted monitoring',
};

try {
  await client.query('begin');

  // price_observations is append-only, so a reseed cannot delete it.
  // Start from a clean database instead (see npm run db:reset).
  const existing = await client.query('select count(*)::int as n from price_observations');
  if (existing.rows[0].n > 0) {
    console.log('Price history already present; nothing to seed.');
    console.log('History is append-only by design — use `npm run db:reset` to start over.');
    await client.query('rollback');
    await client.end();
    process.exit(0);
  }

  for (const [tier, name] of Object.entries(tierNames)) {
    await client.query(
      `insert into data_sources (name, tier) values ($1,$2) on conflict (name) do nothing`,
      [name, Number(tier)],
    );
  }
  for (const c of CATEGORIES) {
    await client.query(
      `insert into categories (slug, name) values ($1,$2) on conflict (slug) do nothing`,
      [c.slug, c.name],
    );
  }

  for (const offer of FIXTURE_OFFERS) {
    await client.query(
      `insert into retailers (slug, name, verified_partner) values ($1,$2,$3)
       on conflict (slug) do nothing`,
      [offer.retailer.slug, offer.retailer.name, offer.retailer.verifiedPartner],
    );
    const brandSlug = offer.product.brand.toLowerCase().replace(/\W+/g, '-');
    await client.query(
      `insert into brands (slug, name) values ($1,$2) on conflict (slug) do nothing`,
      [brandSlug, offer.product.brand],
    );
    await client.query(
      `insert into products (slug, name, brand_id, category_id)
       values ($1,$2,
         (select id from brands where slug=$3),
         (select id from categories where slug=$4))
       on conflict (slug) do nothing`,
      [offer.product.slug, offer.product.name, brandSlug, offer.product.category],
    );

    const endsAt =
      offer.daysUntilOfferEnds === null
        ? null
        : new Date(Date.now() + offer.daysUntilOfferEnds * 86_400_000);

    const inserted = await client.query<{ id: string }>(
      `insert into offers
         (product_id, retailer_id, source_id, price_cents, in_stock,
          offer_ends_at, limited_stock, last_verified_at, is_sample_data)
       values (
         (select id from products where slug=$1),
         (select id from retailers where slug=$2),
         (select id from data_sources where tier=$3 limit 1),
         $4,$5,$6,$7,$8,true)
       returning id`,
      [
        offer.product.slug, offer.retailer.slug, offer.sourceTier,
        offer.priceCents, offer.inStock, endsAt, offer.limitedStock,
        offer.lastVerifiedAt,
      ],
    );
    const offerId = inserted.rows[0]!.id;

    // Bulk-insert the recorded history in one statement per offer.
    const values: unknown[] = [];
    const tuples = offer.observations.map((o, i) => {
      values.push(offerId, o.priceCents, o.inStock, o.observedAt);
      const b = i * 4;
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},
               (select id from data_sources where tier=${offer.sourceTier} limit 1))`;
    });
    await client.query(
      `insert into price_observations (offer_id, price_cents, in_stock, observed_at, source_id)
       values ${tuples.join(',')}`,
      values,
    );
  }

  await client.query('commit');

  const counts = await client.query(`
    select
      (select count(*) from offers)             as offers,
      (select count(*) from price_observations) as observations,
      (select count(*) from retailers)          as retailers
  `);
  const c = counts.rows[0];
  console.log(`Seeded ${c.offers} offers, ${c.observations} observations, ${c.retailers} retailers.`);
} catch (err) {
  await client.query('rollback');
  console.error('Seed failed:', (err as Error).message);
  process.exit(1);
} finally {
  await client.end();
}
