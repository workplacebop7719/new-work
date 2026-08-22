#!/usr/bin/env node
/**
 * End-to-end smoke test of the member flow, driven in a real browser.
 *
 * Unit tests cover the pieces; this covers the seams between them, which is
 * where the bugs actually were. It caught a real one: profile rows were only
 * provisioned on entry to /app, so a customer who signed up and immediately
 * pressed Save hit a foreign-key violation. Nothing below the browser would
 * have found that.
 *
 * Needs a dev server on BASE with DATABASE_URL set and migrations applied:
 *
 *   npm run db:migrate && npm run db:seed
 *   DATABASE_URL=... npm run dev
 *   node scripts/smoke-member-flow.mjs
 *
 * Exits non-zero on the first failed expectation.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const SLUG = process.env.SLUG || 'calder-trail-sneaker';

let failures = 0;
const check = (label, condition) => {
  console.log(`  ${condition ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!condition) failures++;
};

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

try {
  console.log('member flow');

  // An anonymous Save must remember the task, not dump them on the homepage (§31).
  await page.goto(`${BASE}/deals/${SLUG}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.locator('form button:has-text("Save")').first().click();
  // Wait on the condition, not a stopwatch: a cold dev server can take
  // seconds to compile /login on first hit, which made a fixed wait flaky.
  await page.waitForURL(/\/login/, { timeout: 15_000 }).catch(() => undefined);
  console.log('    url after anonymous Save:', page.url());
  check('anonymous Save redirects to sign-in with the deal remembered',
    page.url().includes('/login') && page.url().includes(encodeURIComponent(`/deals/${SLUG}`)));

  // Signing up must return them to what they were doing.
  const email = `smoke${Date.now()}@example.com`;
  await page.goto(`${BASE}/signup?returnTo=${encodeURIComponent(`/deals/${SLUG}`)}`,
    { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.fill('#field-displayName', 'Smoke');
  await page.fill('#field-email', email);
  await page.fill('#field-password', 'correct horse battery');
  await page.click('button[type=submit]');
  await page.waitForURL(new RegExp(`/deals/${SLUG}$`), { timeout: 15_000 }).catch(() => undefined);
  check('signing up returns to the original deal', page.url().endsWith(`/deals/${SLUG}`));

  // Save, then Watch with a target price.
  await page.locator('form button:has-text("Save")').first().click();
  await page.waitForTimeout(1800);
  await page.fill('#targetPrice', '30');
  await page.locator('form button:has-text("Watch")').first().click();
  await page.waitForTimeout(1800);

  await page.goto(`${BASE}/app/saved`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  check('the saved item appears in the portal', (await page.locator('body').innerText()).includes('Trail Runner'));

  await page.goto(`${BASE}/app/watchlist`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const watchlist = await page.locator('body').innerText();
  check('the watched item appears in the portal', watchlist.includes('Trail Runner'));
  check('the target price was recorded', watchlist.includes('30.00'));

  // The header must reflect the session.
  await page.goto(`${BASE}/today`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  check('the header shows the signed-in state',
    (await page.getByRole('banner').innerText()).includes('YOUR BARGENATION'));
} finally {
  await browser.close();
}

console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
