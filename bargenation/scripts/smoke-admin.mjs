#!/usr/bin/env node
/**
 * End-to-end check of the admin boundary and the quarantine decision.
 *
 * Covers the seam the unit tests cannot: that a signed-in CUSTOMER gets a 404
 * rather than a 403 (a 403 confirms the address is worth attacking), and that
 * releasing a held price actually writes both the observation and its audit row.
 *
 *   BASE=http://localhost:3000 node scripts/smoke-admin.mjs
 */
import { chromium } from 'playwright';
import pg from 'pg';

const BASE = process.env.BASE || 'http://localhost:3000';
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
  await page.waitForTimeout(1200);
  await page.fill('#field-displayName', 'Staffer');
  await page.fill('#field-email', email);
  await page.fill('#field-password', 'correct horse battery');
  await page.click('button[type=submit]');
  await page.waitForTimeout(2500);
}

try {
  console.log('admin boundary');

  // A signed-in CUSTOMER must not be able to tell that /admin exists.
  const customer = await (await browser.newContext()).newPage();
  await signUp(customer, `cust${Date.now()}@example.com`);
  const res = await customer.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
  await customer.waitForTimeout(1200);
  check('a signed-in customer gets 404, not 403', res.status() === 404);

  // Promote a second account and check the surface works.
  const staff = await (await browser.newContext()).newPage();
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
} finally {
  await browser.close();
  await db.end();
}

console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
