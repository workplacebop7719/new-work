#!/usr/bin/env node
/**
 * The flow a person actually walks, driven in a real browser.
 *
 * Not features — FLOW. Does pressing a button tell you anything happened, does
 * a dead end offer a way out, does the bar at the bottom of a phone know who
 * you are, and can you order a list of deals by something useful.
 *
 *   BASE=http://localhost:3210 node scripts/smoke-flow.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3210';

const SMOKE_CALLER = '198.51.100.21';
const CALLER_HEADERS = { 'x-forwarded-for': SMOKE_CALLER };

let failures = 0;
const check = (label, ok, extra = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${extra ? `  (${extra})` : ''}`);
  if (!ok) failures++;
};

async function sawText(page, pattern, timeout = 15_000) {
  try {
    await page.waitForFunction(
      ([source, flags]) => new RegExp(source, flags).test(document.body.innerText),
      [pattern.source, pattern.flags], { timeout },
    );
    return true;
  } catch { return false; }
}

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
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60_000 }).catch(() => undefined);
  }
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

try {
  console.log('site flow');
  const page = await (await browser.newContext({ extraHTTPHeaders: CALLER_HEADERS })).newPage();
  await warm(page, ['/today', '/signup', '/search', '/categories/shoes', '/stores',
    '/deals/calder-trail-sneaker', '/no-such-page']);

  // ---- a dead-end search now offers a way out ----
  await page.goto(`${BASE}/search?q=zzzznothinglikethis`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  check('a search with no results explains itself',
    await sawText(page, /Nothing recorded for that yet/i));
  const outLinks = await page.locator('main a[href^="/categories/"], main a[href="/today"]').count();
  check('and offers somewhere to go next', outLinks > 0, `${outLinks} routes offered`);

  // ---- sorting a browse page ----
  await page.goto(`${BASE}/categories/shoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const hasSort = await page.locator('select#sort').count();
  check('a category page can be reordered', hasSort === 1);

  if (hasSort === 1) {
    const options = await page.locator('select#sort option').allTextContents();
    check('the orders are the three that matter', options.length === 3, options.join(' | '));
    check('and none of them is discount percentage',
      !options.some((o) => /discount|%|off/i.test(o)));

    await page.selectOption('select#sort', 'price');
    await page.waitForTimeout(1800);
    check('choosing an order puts it in the URL', page.url().includes('sort=price'), page.url());

    // `p.numeral`, not `.numeral`: the card renders the price in a <p> and the
    // Value Index in a <span>, both with that class. The looser selector
    // interleaved scores with prices and reported a working sort as broken.
    const prices = await page.locator('article p.numeral').allTextContents();
    const numeric = prices.map((p) => Number(p.replace(/[^0-9.]/g, ''))).filter((n) => n > 0);
    const ascending = numeric.every((n, i) => i === 0 || n >= numeric[i - 1]);
    check('cheapest first actually sorts by price', ascending, numeric.join(', '));
  }

  // ---- a 404 is not a dead end ----
  await page.goto(`${BASE}/no-such-page-at-all`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const notFoundLinks = await page.locator('main a').count();
  check('a 404 offers a route onward', notFoundLinks > 0, `${notFoundLinks} links`);

  // ---- the machine-readable furniture a launch needs ----
  for (const [path, test, label] of [
    ['/robots.txt', /Sitemap:/i, 'robots.txt points at the sitemap'],
    ['/sitemap.xml', /<loc>.*\/deals\//i, 'sitemap lists deal pages'],
    ['/icon', null, 'the tab icon renders'],
    ['/opengraph-image', null, 'the share card renders'],
  ]) {
    const res = await page.request.get(BASE + path);
    const ok = res.ok() && (test ? test.test(await res.text()) : true);
    check(label, ok, `${res.status()}`);
  }

  /* ---- membership: a real price for something nobody can buy ----
   *
   * The failure this guards against is not a broken page, it is a dishonest
   * one. §01 forbids a control that looks like it works: no checkout exists,
   * so the page must contain no purchase button and must say why, and §52
   * forbids the perk that would quietly appear on a page selling a
   * subscription — a better score, a rank, an earlier alert.
   */
  await page.goto(`${BASE}/membership`, { waitUntil: 'domcontentloaded' });
  const body = await page.locator('body').innerText();

  check('membership quotes one price', /\$\d+\.\d{2}/.test(body),
    (body.match(/\$\d+\.\d{2}/g) ?? []).join(' '));
  check('and admits it cannot be bought yet', /can’t buy this yet/i.test(body));
  check('and says what is missing, not just that something is',
    /payment provider/i.test(body));

  const purchaseControls = await page.locator(
    'button, [role=button], a[href*="checkout"], a[href*="subscribe"]',
  ).count();
  check('offers no control that looks like a checkout', purchaseControls === 0,
    `${purchaseControls} found`);

  check('states what money can never buy (§52)',
    /never buy/i.test(body) && /Value Index/i.test(body) && /same instant/i.test(body));
  check('and does not promise a rank, a score or an earlier alert',
    !/(better|higher) (value index|score)/i.test(body) && !/alerts? (first|sooner|earlier)/i.test(body));

  const membershipLinks = await page.locator('a[href="/membership"]').count();
  check('is reachable from the footer', membershipLinks > 0, `${membershipLinks} links`);

  // ---- THE ONE THAT MATTERS: does Save say anything? ----
  const email = `flow${Date.now()}@example.com`;
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await challengeSolved(page);
  await page.fill('#field-displayName', 'Flow');
  await page.fill('#field-email', email);
  await page.fill('#field-password', 'correct horse battery');
  await page.locator('form:has(#field-email) button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/signup'), { timeout: 20_000 })
    .catch(() => undefined);
  check('signed up', !page.url().includes('/signup'));

  await page.goto(`${BASE}/deals/calder-trail-sneaker`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.locator('form:has(input[name=offerId]) button[type=submit]').click();
  check('pressing Save says it worked', await sawText(page, /Saved\./i));

  // Pressing it again should reassure, not look broken or duplicate.
  await page.locator('form:has(input[name=offerId]) button[type=submit]').click();
  await page.waitForTimeout(1500);
  check('pressing Save twice still reassures rather than erroring',
    await sawText(page, /Saved\./i));

  // ---- Watch reports the target it stored ----
  await page.fill('#targetPrice', '25');
  await page.locator('form:has(#targetPrice) button[type=submit]').click();
  check('Watch confirms the target it stored', await sawText(page, /\$25\.00/));

  // ---- and refuses a target that is not a number, instead of dropping it ----
  await page.goto(`${BASE}/deals/northaven-puffer`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.fill('#targetPrice', 'cheap please');
  await page.locator('form:has(#targetPrice) button[type=submit]').click();
  check('a nonsense target price is refused, not silently ignored',
    await sawText(page, /didn’t look like a number/i));

  // ---- the phone bar knows who you are ----
  const phone = await (await browser.newContext({
    extraHTTPHeaders: CALLER_HEADERS,
    viewport: { width: 390, height: 844 },
    storageState: await page.context().storageState(),
  })).newPage();
  await phone.goto(`${BASE}/today`, { waitUntil: 'domcontentloaded' });
  await phone.waitForTimeout(2500);
  const tabs = await phone.locator('nav[aria-label=Primary] a').allTextContents();
  check('the phone bar offers the portal, not a sign-in link',
    tabs.some((t) => /yours/i.test(t)) && !tabs.some((t) => /sign in/i.test(t)),
    tabs.join(' | '));

  await phone.goto(`${BASE}/categories/shoes`, { waitUntil: 'domcontentloaded' });
  await phone.waitForTimeout(1500);
  const current = await phone.locator('nav[aria-label=Primary] a[aria-current=page]').count();
  check('and marks the tab you are inside, not just the exact page', current === 1);
} finally {
  await browser.close();
}

console.log(failures === 0 ? '\nPASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
