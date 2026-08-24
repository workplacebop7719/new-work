#!/usr/bin/env node
/**
 * The Edit: subscribe, confirm, manage, unsubscribe — driven in a browser.
 *
 * Covers the seam the unit tests cannot: that double opt-in genuinely leaves
 * somebody unsubscribed until they confirm, and that the consent record they
 * are shown is the same record the database holds.
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
const SMOKE_CALLER = '198.51.100.17';
const CALLER_HEADERS = { 'x-forwarded-for': SMOKE_CALLER };


const BASE = process.env.BASE || 'http://localhost:3210';
const PG = process.env.PGURL;
if (!PG) { console.error('PGURL is not set'); process.exit(1); }

const ADDRESS = `edit${Date.now()}@example.com`;
let failures = 0;
const check = (label, ok) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

const db = new pg.Client({ connectionString: PG });
await db.connect();
const status = async () => {
  const { rows } = await db.query('select status from newsletter_subscribers where email=$1', [ADDRESS]);
  return rows[0]?.status ?? null;
};
const events = async () => {
  const { rows } = await db.query(
    `select e.event from newsletter_consent_events e
     join newsletter_subscribers s on s.id=e.subscriber_id
     where s.email=$1 order by e.occurred_at`, [ADDRESS]);
  return rows.map((r) => r.event);
};

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

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
  console.log('the edit');
  const page = await (await browser.newContext({ extraHTTPHeaders: CALLER_HEADERS,  viewport: { width: 1440, height: 1100 } })).newPage();
  await warm(page, ['/today', '/edit', '/edit/confirm', '/edit/manage']);

  await page.goto(`${BASE}/edit`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const body = await page.locator('body').innerText();
  check('the page shows a real composed issue, not a mock', /today.s issue/i.test(body));
  await page.screenshot({ path: '/tmp/shots/edit.png', fullPage: true });

  await page.fill('#edit-email', ADDRESS);
  await page.click('button:has-text("Get the Edit")');
  await page.waitForTimeout(2500);

  check('a request does not subscribe anyone', (await status()) === 'PENDING');
  check('the request is recorded as consent evidence', (await events()).join() === 'REQUESTED');
  const notice = await page.locator('[role=status]').innerText();
  check('it says plainly that nothing can be sent', /cannot email you yet|NOT subscribed/i.test(notice));

  await page.locator('a:has-text("confirm your subscription")').click();
  await page.waitForTimeout(2500);
  check('confirming subscribes', (await status()) === 'SUBSCRIBED');
  check('confirmation is recorded', (await events()).includes('CONFIRMED'));

  await page.locator('a:has-text("Manage your subscription")').click();
  await page.waitForTimeout(2000);
  const manage = await page.locator('body').innerText();
  check('the subscriber is shown their own consent record', /you asked to subscribe/i.test(manage));
  check('and their confirmation', /you confirmed your address/i.test(manage));
  await page.screenshot({ path: '/tmp/shots/edit-manage.png', fullPage: true });

  await page.locator('button:has-text("Unsubscribe")').click();
  await page.waitForTimeout(2500);
  check('unsubscribing is immediate', (await status()) === 'UNSUBSCRIBED');
  check('and recorded', (await events()).includes('UNSUBSCRIBED'));
} finally {
  await browser.close();
  await db.end();
}

console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
