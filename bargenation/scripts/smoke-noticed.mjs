#!/usr/bin/env node
/**
 * Behaviour alerts, driven in a real browser (PRD §26, §37, §52).
 *
 * The checks that matter are about consent: nothing recorded until it is on,
 * and turning it off erases rather than merely stopping.
 *
 *   BASE=http://localhost:3210 PGURL=... node scripts/smoke-noticed.mjs
 */
import { chromium } from 'playwright';
import pg from 'pg';

const BASE = process.env.BASE || 'http://localhost:3210';
const PG = process.env.PGURL;
if (!PG) { console.error('PGURL is not set'); process.exit(1); }

let failures = 0;
const check = (label, ok, extra = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${extra ? `  (${extra})` : ''}`);
  if (!ok) failures++;
};

const db = new pg.Client({ connectionString: PG });
await db.connect();
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

const countFor = async (profileId) => {
  const { rows } = await db.query(
    'select coalesce(sum(occurrences), 0)::int n from interest_events where profile_id = $1',
    [profileId],
  );
  return rows[0].n;
};

try {
  console.log('behaviour alerts');
  const page = await (await browser.newContext()).newPage();
  const email = `noticed${Date.now()}@example.com`;

  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.querySelector('input[name=challengeSolution]')?.value !== '',
    { timeout: 30_000 },
  ).catch(() => undefined);
  await page.waitForTimeout(1400);
  await page.fill('#field-displayName', 'Noticed');
  await page.fill('#field-email', email);
  await page.fill('#field-password', 'correct horse battery');
  await page.locator('form:has(#field-email) button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/signup'), { timeout: 20_000 })
    .catch(() => undefined);
  check('signed up', !page.url().includes('/signup'));

  const { rows: who } = await db.query(
    'select id from profiles order by created_at desc limit 1',
  );
  const profileId = who[0].id;

  // ---- nothing recorded before consent ----
  for (const slug of ['calder-trail-sneaker', 'northaven-puffer']) {
    await page.goto(`${BASE}/deals/${slug}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1600);
  }
  check('nothing is recorded before consent', (await countFor(profileId)) === 0);

  // ---- the page is honest about what it would keep ----
  await page.goto(`${BASE}/app/noticed`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  const body = await page.textContent('body');
  check('it says it is off', /\bOff\b/.test(body ?? ''));
  check('it lists what it would keep', /counted by day/i.test(body ?? ''));
  check('and what it would not', /no IP address/i.test(body ?? ''));
  check('and states the §52 rule plainly',
    /never changes a Value Index/i.test(body ?? '') || /same moment/i.test(body ?? ''));

  // ---- turn it on ----
  await page.locator('form button:has-text("Turn this on")').click();
  await page.waitForTimeout(2200);
  check('it turns on', /Turn this off/i.test((await page.textContent('body')) ?? ''));

  for (const slug of ['calder-trail-sneaker', 'calder-trail-sneaker', 'northaven-puffer']) {
    await page.goto(`${BASE}/deals/${slug}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1600);
  }
  const recorded = await countFor(profileId);
  check('views are counted once it is on', recorded >= 3, `${recorded} views`);

  await page.goto(`${BASE}/app/noticed`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  const listed = await page.textContent('body');
  check('the customer can see exactly what we hold', /views/i.test(listed ?? ''));

  // ---- one row per day, not per visit ----
  const { rows: shape } = await db.query(
    'select count(*)::int rows from interest_events where profile_id = $1', [profileId],
  );
  check('stored as counts per day, not one row per page view',
    shape[0].rows <= 2, `${shape[0].rows} rows for ${recorded} views`);

  // ---- no clickstream columns exist at all ----
  const { rows: cols } = await db.query(
    `select column_name from information_schema.columns where table_name = 'interest_events'`,
  );
  const names = cols.map((c) => c.column_name);
  check('there is nowhere to put an IP, agent or session id',
    !names.some((n) => /ip|agent|session|referr|dwell/i.test(n)), names.join(', '));

  // ---- off means erased ----
  await page.locator('form button:has-text("Turn this off")').click();
  await page.waitForTimeout(2200);
  check('turning it off erases everything', (await countFor(profileId)) === 0);

  // ---- and stays off for new views ----
  await page.goto(`${BASE}/deals/calder-trail-sneaker`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  check('and nothing is recorded afterwards', (await countFor(profileId)) === 0);
} finally {
  await browser.close();
  await db.end();
}

console.log(failures === 0 ? '\nPASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
