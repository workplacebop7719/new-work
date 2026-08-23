#!/usr/bin/env node
/**
 * Account self-service, driven in a real browser.
 *
 * Change password, export, delete. The valuable checks are the ones about
 * what must STOP working — the old password, the other device, the account.
 *
 *   BASE=http://localhost:3210 PGURL=... node scripts/smoke-account.mjs
 */
import { chromium } from 'playwright';
import pg from 'pg';

const BASE = process.env.BASE || 'http://localhost:3210';
const PG = process.env.PGURL;
if (!PG) { console.error('PGURL is not set'); process.exit(1); }

let failures = 0;
const check = (label, ok) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

/**
 * Submits the form containing a given field.
 *
 * Never `click('button[type=submit]')` inside the portal: the layout renders
 * a Sign out button, which is the FIRST submit button on every page there.
 * An unscoped click signed the customer out and bounced them to the homepage,
 * which looked exactly like a broken change-password form.
 */
const submitFormWith = (page, field) =>
  page.locator(`form:has(${field}) button[type=submit]`).click();

/**
 * Fills a field and makes sure the value survived.
 *
 * React resets uncontrolled inputs when a form action returns, and that reset
 * lands slightly after the error message it came with. Filling the instant
 * the message appears means React clears the typed value a moment later, and
 * the next submit posts empty fields — which reads as "the form rejected a
 * correct answer" rather than "the test typed into a form that was still
 * re-rendering".
 */
async function fillStable(page, selector, value) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.fill(selector, value);
    await page.waitForTimeout(250);
    if ((await page.inputValue(selector)) === value) return;
  }
  throw new Error(`could not get ${selector} to hold its value`);
}

async function sawText(page, pattern, timeout = 15_000) {
  try {
    await page.waitForFunction(
      ([source, flags]) => new RegExp(source, flags).test(document.body.innerText),
      [pattern.source, pattern.flags], { timeout },
    );
    return true;
  } catch { return false; }
}

async function signUp(page, email, password) {
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.fill('#field-displayName', 'Account Smoke');
  await page.fill('#field-email', email);
  await page.fill('#field-password', password);
  await page.click('button[type=submit]');
  await page.waitForTimeout(3000);
}

const db = new pg.Client({ connectionString: PG });
await db.connect();
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

try {
  console.log('account self-service');

  const email = `account${Date.now()}@example.com`;
  const OLD = 'correct horse battery';
  const NEW = 'an entirely different passphrase';

  // Two contexts: one is "this device", the other is "somewhere else".
  const here = await (await browser.newContext()).newPage();
  const elsewhere = await (await browser.newContext()).newPage();

  await signUp(here, email, OLD);
  check('signed up', !here.url().includes('/signup'));

  // The same account signed in on a second device.
  await elsewhere.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await elsewhere.waitForTimeout(1500);
  await elsewhere.fill('#field-email', email);
  await elsewhere.fill('#field-password', OLD);
  await elsewhere.click('button[type=submit]');
  await elsewhere.waitForTimeout(2500);
  await elsewhere.goto(`${BASE}/app/watchlist`, { waitUntil: 'domcontentloaded' });
  await elsewhere.waitForTimeout(1500);
  check('the second device is signed in', !elsewhere.url().includes('/login'));

  // Something to export.
  await here.goto(`${BASE}/deals/calder-trail-sneaker`, { waitUntil: 'domcontentloaded' });
  await here.waitForTimeout(1500);
  await here.locator('form button:has-text("Save")').first().click();
  await here.waitForTimeout(2000);

  // ---- export ----
  const dump = await here.evaluate(async (base) => {
    const res = await fetch(`${base}/app/account/export`);
    return { status: res.status, disposition: res.headers.get('content-disposition'), body: await res.text() };
  }, BASE);
  check('the export responds', dump.status === 200);
  check('it comes back as a file, not a page', /attachment; filename=/.test(dump.disposition ?? ''));
  let parsed = null;
  try { parsed = JSON.parse(dump.body); } catch { /* reported below */ }
  check('it is valid JSON', parsed !== null);
  check('it contains the saved item', (parsed?.saved ?? []).length > 0);
  check('it names the account it belongs to', typeof parsed?.profile?.id === 'string');

  // An anonymous caller must not learn that exports exist at all.
  const anon = await (await browser.newContext()).newPage();
  // Must be ON the origin first: fetch from about:blank is a cross-origin
  // request and fails before it reaches the route at all.
  await anon.goto(`${BASE}/today`, { waitUntil: 'domcontentloaded' });
  await anon.waitForTimeout(800);
  // Middleware bounces it to sign-in before the route is reached; the route's
  // own 404 sits behind that as defence in depth. Either way the one thing
  // that must never happen is the export being served.
  const anonResult = await anon.evaluate(async (base) => {
    const res = await fetch(`${base}/app/account/export`, { redirect: 'manual' });
    return { status: res.status, type: res.type };
  }, BASE);
  check('an anonymous request is never served the export',
    anonResult.status !== 200 && anonResult.type !== 'basic');

  // ---- change password ----
  await here.goto(`${BASE}/app/account/password`, { waitUntil: 'domcontentloaded' });
  await here.waitForTimeout(1500);
  await here.fill('#field-currentPassword', 'not the right password');
  await here.fill('#field-newPassword', NEW);
  await here.fill('#field-confirmPassword', NEW);
  await submitFormWith(here, '#field-currentPassword');
  check('a wrong current password is refused', await sawText(here, /don’t match/i));

  await fillStable(here, '#field-currentPassword', OLD);
  await fillStable(here, '#field-newPassword', NEW);
  await fillStable(here, '#field-confirmPassword', NEW);
  await submitFormWith(here, '#field-currentPassword');
  check('the change is confirmed', await sawText(here, /password is changed/i));

  // This device stays in; the other one does not.
  await here.goto(`${BASE}/app/saved`, { waitUntil: 'domcontentloaded' });
  await here.waitForTimeout(1500);
  check('this device is still signed in', !here.url().includes('/login'));

  await elsewhere.goto(`${BASE}/app/watchlist`, { waitUntil: 'domcontentloaded' });
  await elsewhere.waitForTimeout(2000);
  check('the other device was signed out', elsewhere.url().includes('/login'));

  // ---- delete ----
  await here.goto(`${BASE}/app/account/delete`, { waitUntil: 'domcontentloaded' });
  await here.waitForTimeout(1500);
  check('the page says what does not get deleted', await sawText(here, /What does not/i));

  await here.fill('#field-password', NEW);
  await here.fill('#field-confirmation', 'yes please');
  await submitFormWith(here, '#field-confirmation');
  check('a wrong confirmation word is refused', await sawText(here, /Type delete to confirm/i));

  const { rows: before } = await db.query(
    'select count(*)::int n from profiles where display_name = $1', ['Account Smoke'],
  );

  await fillStable(here, '#field-password', NEW);
  await fillStable(here, '#field-confirmation', 'delete');
  await submitFormWith(here, '#field-confirmation');
  await here.waitForURL(/deleted=1/, { timeout: 20_000 }).catch(() => undefined);
  check('deleting lands back on the public site, signed out', here.url().includes('deleted=1'));

  const { rows: after } = await db.query(
    'select count(*)::int n from profiles where display_name = $1', ['Account Smoke'],
  );
  check('the profile row is gone', after[0].n === before[0].n - 1);

  await here.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await here.waitForTimeout(1200);
  await here.fill('#field-email', email);
  await here.fill('#field-password', NEW);
  await here.click('button[type=submit]');
  check('the deleted account cannot sign in', await sawText(here, /email and password don’t match/i));
} finally {
  await browser.close();
  await db.end();
}

console.log(failures === 0 ? '\nPASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
