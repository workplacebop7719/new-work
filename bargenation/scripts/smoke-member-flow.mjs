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

/**
 * This script's own caller identity.
 *
 * Rate limiting counts by caller, and every Playwright context here
 * shares one source address — so without this, smoke-rate-limit burning
 * the sign-in allowance on purpose silently broke every script that ran
 * after it for the next fifteen minutes. One connection per script is
 * also what the real world looks like.
 */
const SMOKE_CALLER = '198.51.100.11';
const CALLER_HEADERS = { 'x-forwarded-for': SMOKE_CALLER };


const BASE = process.env.BASE || 'http://localhost:3210';
const SLUG = process.env.SLUG || 'calder-trail-sneaker';

let failures = 0;
const check = (label, condition) => {
  console.log(`  ${condition ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!condition) failures++;
};

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await (await browser.newContext({ extraHTTPHeaders: CALLER_HEADERS,  viewport: { width: 1280, height: 900 } })).newPage();

/**
 * A dev server compiles a route on its first request, which can take eight
 * seconds and is enough to race a form submit. Not the product being slow —
 * but enough to make this script fail on a cold start and pass on a re-run,
 * which is the worst kind of test.
 */
/**
 * Waits for the bot challenge, never a stopwatch. The submit button stays
 * disabled until the proof of work finishes — about two seconds — and
 * clicking a disabled control silently does nothing, which reads as "sign-up
 * is broken".
 */
/**
 * Waits until the proof of work is solved AND the form has been on screen
 * long enough to have been typed by a person.
 *
 * The second half is not padding. The server measures dwell time by ITS clock
 * — `MIN_AGE_MS` in security/challenge.ts — and refuses a form returned in
 * under 1.2 seconds, because nobody types that fast. A script does. Once the
 * dev server was warmed, these smokes started submitting inside a second and
 * were correctly refused, which looked exactly like a product bug and was not.
 *
 * Waiting here rather than sprinkling `waitForTimeout` at each call site
 * means a new form cannot be added to a smoke without it.
 */
async function challengeSolved(page) {
  await page.waitForFunction(
    () => {
      const field = document.querySelector('input[name=challengeSolution]');
      return field === null || field.value !== '';
    },
    { timeout: 30_000 },
  ).catch(() => undefined);

  // The server refuses a form returned faster than a person could type one.
  await page.waitForTimeout(1400);
}

async function warm(page, paths) {
  for (const path of paths) {
    // `load`, not `domcontentloaded`: the point is to make the server compile
    // the route, and domcontentloaded can return while it still is.
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60_000 })
      .catch(() => undefined);
  }
}

try {
  console.log('member flow');
  await warm(page, ['/today', '/login', '/signup', `/deals/${SLUG}`, '/app/saved', '/app/watchlist']);

  // An anonymous Save must remember the task, not dump them on the homepage (§31).
  await page.goto(`${BASE}/deals/${SLUG}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.locator('form button:has-text("Save")').first().click({ timeout: 60_000 });
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
  await challengeSolved(page);
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
