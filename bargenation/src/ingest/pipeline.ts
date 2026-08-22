/**
 * THE INGESTION PIPELINE (PRD §46).
 *
 * Five separate responsibilities, deliberately not one function:
 *
 *   DISCOVERY   the adapter, behind SourcePort
 *   EXTRACTION  normalise.ts — raw values into facts, or a refusal
 *   MATCHING    product-match.ts — resolve to a product, or ask for review
 *   SCREENING   watchdog.ts — may this enter an immutable record?
 *   HISTORY     this module — write what survived, and record what did not
 *
 * Nothing here decides anything. Every judgement is delegated to a pure module
 * that can be tested without a database, which is why the interesting rules
 * live in files with no imports from `pg`.
 *
 * AI is absent from this path entirely. §46 permits AI to assist, and forbids
 * it from inventing pricing facts — the simplest way to honour that is to keep
 * it out of the code that writes prices.
 */
import pg from 'pg';
import { parsePriceCents, parseCurrency, parseAvailability, parseObservedAt } from './normalise';
import { matchProduct, type ExistingProduct } from './product-match';
import { screenObservation, isConfirmed, type Candidate } from './watchdog';
import type { PriceObservation } from '@/domain/price-history';
import type { SourcePort, RawRecord } from './source-port';

export interface IngestResult {
  runId: string;
  recordsSeen: number;
  accepted: number;
  rejected: number;
  quarantined: number;
  released: number;
  needsReview: number;
}

/** Field names we accept from a feed, in order of preference. */
const FIELD = {
  title: ['title', 'name', 'product_name'],
  brand: ['brand', 'manufacturer'],
  sku: ['sku', 'id', 'product_id'],
  price: ['price', 'current_price', 'sale_price'],
  currency: ['currency', 'currency_code'],
  availability: ['availability', 'stock', 'in_stock'],
  observedAt: ['observed_at', 'timestamp', 'updated_at'],
} as const;

const pick = (record: RawRecord, keys: readonly string[]): unknown => {
  for (const key of keys) if (record[key] !== undefined) return record[key];
  return undefined;
};

export async function ingestFromSource(
  connectionString: string,
  source: SourcePort,
  retailerSlug: string,
  now: Date = new Date(),
): Promise<IngestResult> {
  const client = new pg.Client({ connectionString });
  await client.connect();

  const result: IngestResult = {
    runId: '', recordsSeen: 0, accepted: 0, rejected: 0,
    quarantined: 0, released: 0, needsReview: 0,
  };

  try {
    const sourceRow = await client.query<{ id: string }>(
      `insert into data_sources (name, tier) values ($1, $2)
       on conflict (name) do update set tier = excluded.tier
       returning id`,
      [source.slug, source.tier],
    );
    const sourceId = sourceRow.rows[0]!.id;

    const run = await client.query<{ id: string }>(
      `insert into source_runs (source_id) values ($1) returning id`, [sourceId],
    );
    result.runId = run.rows[0]!.id;

    const records = await source.fetch();
    result.recordsSeen = records.length;

    const reject = async (stage: string, reason: string, raw: RawRecord) => {
      await client.query(
        `insert into ingest_rejections (run_id, stage, reason, raw) values ($1,$2,$3,$4)`,
        [result.runId, stage, reason, JSON.stringify(raw)],
      );
      result.rejected++;
    };

    /**
     * KNOWN GAP: `skus` is not populated here, so matchProduct's SKU fast path
     * — its most reliable signal — is unreachable from this pipeline and every
     * match falls through to title similarity.
     *
     * Populating it needs the pipeline to write product_variants rows, which
     * it does not do yet. The consequence is more NEEDS_REVIEW than necessary,
     * which is the safe direction to be wrong in, so this is a limitation
     * rather than a defect. Recorded here rather than left to be rediscovered.
     */
    const { rows: catalog } = await client.query<{
      id: string; slug: string; title: string; brand: string | null;
    }>(`select p.id, p.slug, p.name as title, b.name as brand
        from products p left join brands b on b.id = p.brand_id`);
    const existing: ExistingProduct[] = catalog.map((c) => ({
      id: c.id, slug: c.slug, title: c.title, brand: c.brand,
    }));

    /**
     * Answers an operator has already given for this retailer. Consulted
     * before similarity, so a question resolved once is never asked again —
     * which is the whole point of the review queue having an outcome.
     */
    const { rows: aliasRows } = await client.query<{ normalised_title: string; product_id: string }>(
      `select a.normalised_title, a.product_id
       from product_aliases a
       join retailers r on r.id = a.retailer_id
       where r.slug = $1`,
      [retailerSlug],
    );
    const aliases = new Map(aliasRows.map((a) => [a.normalised_title, a.product_id]));

    for (const raw of records) {
      // ---- EXTRACT ----
      const title = pick(raw, FIELD.title);
      if (typeof title !== 'string' || title.trim() === '') {
        await reject('EXTRACT', 'record has no usable title', raw);
        continue;
      }

      const price = parsePriceCents(pick(raw, FIELD.price));
      if (!price.ok) { await reject('EXTRACT', price.reason, raw); continue; }

      const currency = parseCurrency(pick(raw, FIELD.currency));
      if (!currency.ok) { await reject('EXTRACT', currency.reason, raw); continue; }

      const availability = parseAvailability(pick(raw, FIELD.availability));
      if (!availability.ok) { await reject('EXTRACT', availability.reason, raw); continue; }

      const observedAt = parseObservedAt(pick(raw, FIELD.observedAt) ?? now.toISOString(), now);
      if (!observedAt.ok) { await reject('EXTRACT', observedAt.reason, raw); continue; }

      // ---- MATCH ----
      const brandValue = pick(raw, FIELD.brand);
      const skuValue = pick(raw, FIELD.sku);
      const match = matchProduct(
        {
          title,
          brand: typeof brandValue === 'string' ? brandValue : null,
          retailerSlug,
          sku: typeof skuValue === 'string' ? skuValue : null,
        },
        existing,
        aliases,
      );

      if (match.kind === 'NEEDS_REVIEW') {
        // Not a failure — a question. Recorded so somebody can answer it,
        // never resolved by picking the highest score.
        await client.query(
          `insert into ingest_rejections (run_id, stage, reason, raw) values ($1,'MATCH',$2,$3)`,
          [result.runId,
           `ambiguous match against ${match.candidates.length} candidate(s); needs review`,
           // The retailer is recorded alongside the raw row because an alias
           // is per-retailer, and resolving needs to know which one.
           JSON.stringify({ ...raw, __retailerSlug: retailerSlug })],
        );
        result.needsReview++;
        continue;
      }

      let productId: string;
      if (match.kind === 'NEW') {
        const created = await client.query<{ id: string }>(
          `insert into products (slug, name, category_id)
           values ($1, $2, (select id from categories order by sort_order limit 1))
           on conflict (slug) do update set name = excluded.name
           returning id`,
          [slugify(title), title.trim()],
        );
        productId = created.rows[0]!.id;
        existing.push({
          id: productId, slug: slugify(title), title: title.trim(),
          brand: typeof brandValue === 'string' ? brandValue : null,
        });
      } else {
        productId = match.product.id;
      }

      // ---- the offer this observation belongs to ----
      const offer = await client.query<{ id: string }>(
        `insert into offers (product_id, retailer_id, source_id, price_cents, in_stock, last_verified_at)
         values ($1, (select id from retailers where slug = $2), $3, $4, $5, $6)
         on conflict (retailer_id, product_id, variant_id) do update
           set price_cents = excluded.price_cents,
               in_stock = excluded.in_stock,
               last_verified_at = excluded.last_verified_at
         returning id`,
        [productId, retailerSlug, sourceId, price.value, availability.value, observedAt.value],
      );
      const offerId = offer.rows[0]!.id;

      // ---- SCREEN ----
      const { rows: historyRows } = await client.query<{
        price_cents: number; in_stock: boolean; observed_at: Date;
      }>(
        `select price_cents, in_stock, observed_at from price_observations
         where offer_id = $1 order by observed_at desc limit 50`,
        [offerId],
      );
      const history: PriceObservation[] = historyRows.map((r) => ({
        priceCents: r.price_cents,
        inStock: r.in_stock,
        observedAt: r.observed_at.toISOString(),
      }));

      const candidate: Candidate = {
        priceCents: price.value,
        inStock: availability.value,
        observedAt: observedAt.value,
        sourceId,
      };
      const verdict = screenObservation({ candidate, history, now });

      if (verdict.decision === 'REJECT') {
        await reject('SCREEN', verdict.reason, raw);
        continue;
      }

      if (verdict.decision === 'QUARANTINE') {
        // Does an existing held observation from ANOTHER source corroborate
        // this one? If so both are real and may be released.
        const { rows: held } = await client.query<{
          id: string; price_cents: number; in_stock: boolean; observed_at: Date; source_id: string;
        }>(
          `select id, price_cents, in_stock, observed_at, source_id
           from quarantined_observations
           where offer_id = $1 and released_at is null and discarded_at is null`,
          [offerId],
        );

        const corroborated = held.filter((h) =>
          isConfirmed(
            { priceCents: h.price_cents, inStock: h.in_stock,
              observedAt: h.observed_at.toISOString(), sourceId: h.source_id },
            [candidate],
          ),
        );

        if (corroborated.length > 0) {
          for (const h of corroborated) {
            await client.query(
              `insert into price_observations (offer_id, price_cents, in_stock, observed_at, source_id)
               values ($1,$2,$3,$4,$5)`,
              [offerId, h.price_cents, h.in_stock, h.observed_at, h.source_id],
            );
            await client.query(
              'update quarantined_observations set released_at = now() where id = $1', [h.id],
            );
            result.released++;
          }
          await client.query(
            `insert into price_observations (offer_id, price_cents, in_stock, observed_at, source_id)
             values ($1,$2,$3,$4,$5)`,
            [offerId, candidate.priceCents, candidate.inStock, candidate.observedAt, sourceId],
          );
          result.accepted++;
        } else {
          await client.query(
            `insert into quarantined_observations
               (offer_id, price_cents, in_stock, observed_at, source_id, reason)
             values ($1,$2,$3,$4,$5,$6)`,
            [offerId, candidate.priceCents, candidate.inStock, candidate.observedAt,
             sourceId, verdict.reason],
          );
          result.quarantined++;
        }
        continue;
      }

      // ---- HISTORY ----
      await client.query(
        `insert into price_observations (offer_id, price_cents, in_stock, observed_at, source_id)
         values ($1,$2,$3,$4,$5)`,
        [offerId, candidate.priceCents, candidate.inStock, candidate.observedAt, sourceId],
      );
      await client.query(
        `insert into verification_events (offer_id, outcome) values ($1, 'confirmed')`, [offerId],
      );
      result.accepted++;
    }

    await client.query(
      `update source_runs set finished_at = now(), status = 'COMPLETED',
         records_seen = $2, accepted = $3, rejected = $4, quarantined = $5
       where id = $1`,
      [result.runId, result.recordsSeen, result.accepted, result.rejected, result.quarantined],
    );

    return result;
  } catch (err) {
    if (result.runId) {
      await client.query(
        `update source_runs set finished_at = now(), status = 'FAILED', note = $2 where id = $1`,
        [result.runId, (err as Error).message.slice(0, 500)],
      ).catch(() => undefined);
    }
    throw err;
  } finally {
    await client.end();
  }
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
