import type pg from 'pg';

/**
 * Creates catalog rows that a test suite OWNS.
 *
 * Three suites have now been written that reached for `select id from offers
 * limit 1`, mutated a seeded fixture product, and broke the parity suite —
 * which compares the seeded dataset against the in-memory fixtures and is
 * right to notice. Because price_observations is append-only, the damage
 * cannot be undone by a cleanup step either.
 *
 * So: own your data. Rows created here carry `is_sample_data = false`, which
 * is exactly what the parity suite filters on, so they are invisible to it.
 *
 * Nothing is deleted afterwards. Append-only storage means a suite cannot tidy
 * up after itself, and a uniquely-stamped product per run is the honest way to
 * get a clean slate against an immutable record.
 */
export interface OwnedFixture {
  productId: string;
  offerId: string;
  slug: string;
  title: string;
}

export async function createOwnedFixture(
  admin: pg.Client,
  label: string,
  options: { priceCents?: number } = {},
): Promise<OwnedFixture> {
  const stamp = `${label}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = stamp.toLowerCase();
  const title = stamp;

  await admin.query(
    `insert into retailers (slug, name) values ($1, $2) on conflict (slug) do nothing`,
    [`${slug}-retailer`, `${stamp} Retailer`],
  );
  const product = await admin.query<{ id: string }>(
    `insert into products (slug, name, category_id)
     values ($1, $2, (select id from categories order by sort_order limit 1))
     returning id`,
    [slug, title],
  );
  const offer = await admin.query<{ id: string }>(
    `insert into offers (product_id, retailer_id, source_id, price_cents, is_sample_data)
     values ($1, (select id from retailers where slug = $2),
             (select id from data_sources limit 1), $3, false)
     returning id`,
    [product.rows[0]!.id, `${slug}-retailer`, options.priceCents ?? 6000],
  );

  return { productId: product.rows[0]!.id, offerId: offer.rows[0]!.id, slug, title };
}
