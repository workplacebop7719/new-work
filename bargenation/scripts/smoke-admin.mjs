#!/usr/bin/env node
/**
 * End-to-end check of the admin boundary and the quarantine decision.
 *
 * Covers the seam the unit tests cannot: that a signed-in CUSTOMER gets a 404
 * rather than a 403 (a 403 confirms the address is worth attacking), and that
 * releasing a held price actually writes both the observation and its audit row.
 *
 *   BASE=http://localhost:3210 node scripts/smoke-admin.mjs
 */
import { chromium } from 'playwright';
import pg from 'pg';

/**
 * This script's own caller identity.
 *
 * Rate limiting counts by caller, and every Playwright context here
 * shares one source address — so without this, smoke-rate-limit burning
 * the sign-in allowance on purpose silently broke every script that ran
 * after it for the next fifteen minutes. One connection per script is
 * also what the real world looks like.
 */
const SMOKE_CALLER = '198.51.100.19';
const CALLER_HEADERS = { 'x-forwarded-for': SMOKE_CALLER };


const BASE = process.env.BASE || 'http://localhost:3210';
const PG = process.env.PGURL;
if (!PG) { console.error('PGURL is not set'); process.exit(1); }

let failures = 0;
const check = (label, ok) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

const db = new pg.Client({ connectionString: PG });
await db.connect();

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

async function signUp(page, email) {
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });

  /*
   * Wait for the SOLUTION, not for a number of milliseconds. The proof of
   * work takes about four seconds on a modest machine and the submit button
   * stays disabled until it finishes, so a flat wait shorter than that clicks
   * a dead control and every later assertion describes a page that is working
   * perfectly. Then the dwell time, which the server measures by its own clock.
   */
  await page.waitForFunction(
    () => {
      const field = document.querySelector('input[name=challengeSolution]');
      return field === null || field.value !== '';
    },
    { timeout: 30_000 },
  ).catch(() => undefined);
  await page.waitForTimeout(1400);

  await page.fill('#field-displayName', 'Staffer');
  await page.fill('#field-email', email);
  await page.fill('#field-password', 'correct horse battery');
  await page.click('button[type=submit]');
  await page.waitForTimeout(2500);
}

/**
 * A cold dev server compiles a route on its first request, which is long
 * enough to race a locator. Not the product being slow — but enough to make
 * this fail on a cold start and pass on a re-run, which is the worst kind of
 * test to leave behind.
 */
async function warm(page, paths) {
  for (const path of paths) {
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60_000 })
      .catch(() => undefined);
  }
}

try {
  console.log('admin boundary');

  // A signed-in CUSTOMER must not be able to tell that /admin exists.
  const customer = await (await browser.newContext({ extraHTTPHeaders: CALLER_HEADERS })).newPage();
  await warm(customer, ['/today', '/login', '/signup', '/admin', '/admin/quarantine']);
  await signUp(customer, `cust${Date.now()}@example.com`);
  const res = await customer.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
  await customer.waitForTimeout(1200);
  check('a signed-in customer gets 404, not 403', res.status() === 404);

  // Promote a second account and check the surface works.
  const staff = await (await browser.newContext({ extraHTTPHeaders: CALLER_HEADERS })).newPage();
  const staffEmail = `staff${Date.now()}@example.com`;
  await signUp(staff, staffEmail);
  const { rows } = await db.query(
    `select id from profiles order by created_at desc limit 1`,
  );
  await db.query(`update profiles set role='admin' where id=$1`, [rows[0].id]);

  await staff.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
  await staff.waitForTimeout(1800);
  // innerText returns RENDERED text, and .eyebrow applies text-transform:
  // uppercase, so headings come back shouting. Compare case-insensitively.
  const overview = await staff.locator('body').innerText();
  check('an admin sees the overview', /state of the queue/i.test(overview));
  check('the overview reports held observations', /Held in quarantine/.test(overview));

  await staff.goto(`${BASE}/admin/quarantine`, { waitUntil: 'domcontentloaded' });
  await staff.waitForTimeout(1500);
  const q = await staff.locator('body').innerText();
  check('the held observation is listed', q.includes('Held for confirmation'));

  const before = await db.query('select count(*)::int n from price_observations');
  const auditBefore = await db.query('select count(*)::int n from admin_actions');

  // A reason is mandatory: submitting without one must be refused.
  const releaseForm = staff.locator('form:has(button:has-text("Release"))').first();
  await releaseForm.locator('button:has-text("Release")').click();
  await staff.waitForTimeout(1500);
  const afterEmpty = await db.query('select count(*)::int n from price_observations');
  check('releasing without a reason is refused', afterEmpty.rows[0].n === before.rows[0].n);

  // Now with a reason.
  await releaseForm.locator('input[name=reason]').fill('confirmed against the retailer site');
  await releaseForm.locator('button:has-text("Release")').click();
  await staff.waitForTimeout(2500);

  const after = await db.query('select count(*)::int n from price_observations');
  const auditAfter = await db.query('select count(*)::int n from admin_actions');
  check('releasing records the observation', after.rows[0].n === before.rows[0].n + 1);
  check('releasing records the audit row', auditAfter.rows[0].n === auditBefore.rows[0].n + 1);

  /* ---- abuse: the shape of an attack, and none of the people in it ----
   *
   * The property under test is a privacy one, so it is asserted against the
   * rendered page rather than against the query: whatever an operator can read
   * here, none of it may be a token. A 64-character hex string on this page
   * would mean staff had been handed a per-caller activity log by accident.
   */
  const TOKEN = 'ab'.repeat(32);
  await db.query(
    `insert into rate_limit_hits (bucket, dimension, token)
     select 'SIGN_IN', 'caller', $1 from generate_series(1, 30)`, [TOKEN],
  );

  await staff.goto(`${BASE}/admin/abuse`, { waitUntil: 'domcontentloaded' });
  // The route streams behind a loading shell on first compile, so reading the
  // body immediately captures the fallback and every assertion below then
  // describes a page that rendered perfectly a second later.
  await staff.waitForFunction(
    () => /Last hour/i.test(document.body.innerText), null, { timeout: 30_000 },
  ).catch(() => undefined);
  const abuse = await staff.locator('body').innerText();

  check('the abuse page reports the attempts', /\b30\b/.test(abuse));
  check('and says how concentrated they are', /Busiest one/i.test(abuse));
  check('and flags what is past the allowance', /past the allowance/i.test(abuse));
  check('and reads the figures back in a sentence', /being refused/i.test(abuse));
  check('shows no token, to anybody, ever', !/[0-9a-f]{64}/.test(abuse));
  check('offers no way to search for one caller',
    (await staff.locator('input[type=search], input[name*=token], input[name*=search]').count()) === 0);
  check('names the allowances it is applying', /per source/i.test(abuse));
  check('and explains why sign in is not limited by address',
    /lock you out of your own account/i.test(abuse));

  await db.query('delete from rate_limit_hits where token = $1', [TOKEN]);
} finally {
  await browser.close();
  await db.end();
}

console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
