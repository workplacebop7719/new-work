#!/usr/bin/env node
/**
 * End-to-end check that resolving an ambiguous match actually sticks.
 *
 * The seam this covers: a queue item can be closed in the UI and still
 * reappear on the next ingest run, which would look like success and be
 * useless. So this resolves through the browser, then runs the pipeline again
 * and asserts the question is not asked a second time.
 *
 *   PGURL=... node scripts/smoke-review.mjs
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import pg from 'pg';

const BASE = process.env.BASE || 'http://localhost:3000';
const PG = process.env.PGURL;
if (!PG) { console.error('PGURL is not set'); process.exit(1); }

/**
 * This script SEEDS ITS OWN ambiguous record.
 *
 * An earlier version resolved a record somebody else had created, which meant
 * it worked exactly once and then failed with a confusing locator timeout —
 * because resolving is precisely the thing that removes the item from the
 * queue. A test whose success destroys its own fixture has to build that
 * fixture itself.
 */
const STAMP = Date.now();
const TITLE = `Smokecrate${STAMP}`;
const RETAILER = 'review-demo';
const REASON = `checked the listing, run ${STAMP}`;

let failures = 0;
const check = (label, ok) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

const db = new pg.Client({ connectionString: PG });
await db.connect();
// Seed: two products similar enough that the matcher must decline to choose.
await db.query(
  `insert into retailers (slug, name) values ($1,'Review Demo') on conflict (slug) do nothing`,
  [RETAILER],
);
await db.query(
  `insert into products (slug, name, category_id)
   values ($1, $2, (select id from categories limit 1)),
          ($3, $4, (select id from categories limit 1))`,
  [`smoke-a-${STAMP}`, `${TITLE} Oak`, `smoke-b-${STAMP}`, `${TITLE} Ash`],
);

const feedFile = '/tmp/smoke-review-feed.json';
const writeFeed = (price) => writeFileSync(feedFile, JSON.stringify([{
  title: TITLE, price, currency: 'USD', availability: 'in stock',
}]));
const runIngest = () => execFileSync(
  'npx', ['tsx', 'scripts/run-ingest.mts', RETAILER, feedFile],
  { env: { ...process.env, DATABASE_URL: PG }, encoding: 'utf8' },
);

writeFeed('$32.00');
const first = runIngest();
if (!/needs review +1/.test(first)) {
  console.error('  setup failed: the record was not treated as ambiguous');
  console.error(first);
  process.exit(1);
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

try {
  console.log('match resolution');

  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.fill('#field-displayName', 'Reviewer');
  await page.fill('#field-email', `rev${Date.now()}@example.com`);
  await page.fill('#field-password', 'correct horse battery');
  await page.click('button[type=submit]');
  await page.waitForTimeout(2500);
  const { rows: who } = await db.query('select id from profiles order by created_at desc limit 1');
  await db.query(`update profiles set role='operator' where id=$1`, [who[0].id]);

  await page.goto(`${BASE}/admin/review`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const body = await page.locator('body').innerText();
  check('the queue lists the ambiguous record', body.includes(TITLE));
  check('candidates are shown with their scores', /0\.\d\d/.test(body));

  await page.screenshot({ path: '/tmp/shots/admin-review.png', fullPage: true });

  const card = page.locator(`li:has-text("${TITLE}")`).first();

  // A reason is mandatory.
  await card.locator('input[value^="product:"]').first().check();
  await card.locator('button:has-text("Resolve")').click();
  await page.waitForTimeout(1500);
  const openAfterEmpty = await db.query(
    `select count(*)::int n from ingest_rejections where raw->>'title'=$1 and resolved_at is null`,
    [TITLE],
  );
  check('resolving without a reason is refused', openAfterEmpty.rows[0].n === 1);

  await card.locator('input[name=reason]').fill(REASON);
  await card.locator('button:has-text("Resolve")').click();
  await page.waitForTimeout(2500);

  const closed = await db.query(
    `select resolution from ingest_rejections where raw->>'title'=$1 and resolved_at is not null`,
    [TITLE],
  );
  check('the item is closed with a recorded resolution', closed.rows.length === 1);

  // Scope these to THIS record. An earlier version counted any alias and any
  // audit row, and passed on leftovers from the unit-test suite while the
  // browser action had silently done nothing.
  const alias = await db.query(
    `select count(*)::int n from product_aliases where reason = $1`, [REASON],
  );
  check('an alias was learned for this record', alias.rows[0].n === 1);

  const audit = await db.query(
    `select count(*)::int n from admin_actions where action='RESOLVE_MATCH' and reason = $1`,
    [REASON],
  );
  check('this decision was audited', audit.rows[0].n === 1);

  /**
   * The actual point. A queue item you can close but that reappears on the
   * next run has not been resolved — it has been postponed. So re-run the
   * real pipeline with the same record and assert it is not asked again.
   */
  writeFeed('$31.00');
  const output = runIngest();
  check('the next run does not ask again', /needs review 0/.test(output));
  check('the next run records the price instead', /accepted +1/.test(output));
} finally {
  await browser.close();
  await db.end();
}

console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
