/**
 * Runs one ingestion pass.
 *
 * There is no real source adapter yet — no retailer relationship exists — so
 * this drives the pipeline with a development source built from a local JSON
 * file. That is enough to exercise every stage end to end, including the
 * refusals, which is the point.
 *
 *   node --import tsx scripts/run-ingest.mts <retailer-slug> <records.json>
 *
 * A real adapter implements SourcePort and is passed here instead. Nothing in
 * the pipeline changes.
 */
import { readFileSync } from 'node:fs';
import { ingestFromSource } from '../src/ingest/pipeline';
import { createFakeSource } from '../src/ingest/source-port';
import { SOURCE_TIER } from '../src/domain/confidence';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const [retailerSlug, file] = process.argv.slice(2);
if (!retailerSlug || !file) {
  console.error('usage: run-ingest.mts <retailer-slug> <records.json>');
  process.exit(1);
}

const records = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>[];
if (!Array.isArray(records)) {
  console.error('The records file must contain a JSON array.');
  process.exit(1);
}

const source = createFakeSource({
  slug: `local-file:${file}`,
  tier: SOURCE_TIER.STRUCTURED_PUBLIC,
  records,
});

const result = await ingestFromSource(url, source, retailerSlug);

console.log(`Saw ${result.recordsSeen} record(s).`);
console.log(`  accepted     ${result.accepted}`);
console.log(`  rejected     ${result.rejected}`);
console.log(`  quarantined  ${result.quarantined}`);
console.log(`  released     ${result.released}`);
console.log(`  needs review ${result.needsReview}`);
if (result.rejected > 0 || result.needsReview > 0) {
  console.log('\nReasons are in ingest_rejections for run', result.runId);
}
