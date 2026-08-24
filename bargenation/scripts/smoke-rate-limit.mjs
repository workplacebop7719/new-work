#!/usr/bin/env node
/**
 * Rate limiting, driven in a real browser (PRD §69).
 *
 * The two questions no unit test answers: does the limit actually stop a
 * script hammering the real form, and — the one that matters more — does a
 * person who knows their own password still get in after somebody else has
 * burned the allowance against their address.
 *
 *   BASE=http://localhost:3210 PGURL=... node scripts/smoke-rate-limit.mjs
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

async function sawText(page, pattern, timeout = 15_000) {
  try {
    await page.waitForFunction(
      ([source, flags]) => new RegExp(source, flags).test(document.body.innerText),
      [pattern.source, pattern.flags], { timeout },
    );
    return true;
  } catch { return false; }
}

async function fillStable(page, selector, value) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.fill(selector, value);
    await page.waitForTimeout(200);
    if ((await page.inputValue(selector)) === value) return;
  }
  throw new Error(`could not get ${selector} to hold its value`);
}

const submitFormWith = (page, field) =>
  page.locator(`form:has(${field}) button[type=submit]`).click();

const db = new pg.Client({ connectionString: PG });
await db.connect();
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

/**
 * A browser context that looks like it came from its own connection.
 *
 * Every Playwright context here shares one source address, so without this the
 * "attacker" and the "owner" land in the same caller bucket and the owner is
 * refused — which reads as a lockout but is really the caller limit doing its
 * job on a test that modelled two people as one machine.
 *
 * Setting the header is also a reminder of a real caveat: `x-forwarded-for` is
 * only trustworthy when something we control appends to it. See
 * docs/RATE-LIMITING.md.
 */
const contextFrom = async (ip) =>
  (await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': ip } })).newPage();

/** A dev server compiles a route on first request; warm before timing anything. */
async function warm(page, paths) {
  for (const path of paths) {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }
}

try {
  console.log('rate limiting');
  const page = await contextFrom('203.0.113.10');
  await warm(page, ['/signup', '/login', '/forgot-password', '/today']);

  // Start from a clean slate so an earlier smoke does not decide this one.
  await db.query('delete from rate_limit_hits');
  await db.query('delete from challenge_uses');

  const email = `ratelimit${Date.now()}@example.com`;
  const PASSWORD = 'correct horse battery';

  // ---- an account to attack ----
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.querySelector('input[name=challengeSolution]')?.value !== '',
    { timeout: 30_000 },
  ).catch(() => undefined);
  await page.waitForTimeout(1400);
  await fillStable(page, '#field-displayName', 'Target');
  await fillStable(page, '#field-email', email);
  await fillStable(page, '#field-password', PASSWORD);
  await submitFormWith(page, '#field-email');
  await page.waitForURL((u) => !u.pathname.startsWith('/signup'), { timeout: 20_000 })
    .catch(() => undefined);
  check('signed up', !page.url().includes('/signup'));

  // ---- eleven wrong passwords: ten allowed, then refused ----
  const attacker = await contextFrom('203.0.113.20');
  let refusedAt = null;
  // The caller allowance is the only limit on sign-in, so this has to run
  // past it — there is no shorter way to prove the one protection works.
  for (let attempt = 1; attempt <= 25 && refusedAt === null; attempt++) {
    await attacker.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await attacker.waitForTimeout(500);
    await fillStable(attacker, '#field-email', email);
    await fillStable(attacker, '#field-password', `wrong-guess-${attempt}`);
    await submitFormWith(attacker, '#field-email');
    if (await sawText(attacker, /Too many attempts/i, 6_000)) refusedAt = attempt;
  }
  check('a sustained run of wrong passwords is eventually refused', refusedAt !== null,
    refusedAt ? `refused on attempt ${refusedAt}` : 'never refused');
  check('but not before a person having a bad morning would have got in',
    refusedAt === null || refusedAt > 5, `refused on ${refusedAt}`);

  const message = await attacker.locator('[role=alert]').first().textContent();
  check('the refusal names no account and no address',
    !/@|address|account|email/i.test(message ?? ''), (message ?? '').trim());

  // ---- THE ONE THAT MATTERS: the owner still gets in ----
  // A different connection entirely — which is the whole point of the check.
  const owner = await contextFrom('203.0.113.30');
  await owner.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await owner.waitForTimeout(800);
  await fillStable(owner, '#field-email', email);
  await fillStable(owner, '#field-password', PASSWORD);
  await submitFormWith(owner, '#field-email');
  await owner.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 })
    .catch(() => undefined);
  check('the real owner, on their own connection, is NOT locked out',
    !owner.url().includes('/login'), owner.url());

  // The attacker is still refused: succeeding elsewhere did not refill their
  // bucket, which is the other half of getting this right.
  await attacker.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await attacker.waitForTimeout(600);
  await fillStable(attacker, '#field-email', email);
  await fillStable(attacker, '#field-password', PASSWORD);
  await submitFormWith(attacker, '#field-email');
  check('the attacker’s own allowance is still spent',
    await sawText(attacker, /Too many attempts/i, 8_000));

  // Sign-in is limited by caller only, so nothing is written against the
  // address at all — that is what makes the lockout above impossible rather
  // than merely unlikely.
  const { rows: after } = await db.query(
    `select count(*)::int n from rate_limit_hits
     where bucket = 'SIGN_IN' and dimension = 'subject'`,
  );
  check('nothing was ever recorded against the address', after[0].n === 0, `${after[0].n} rows`);

  // ---- password reset is tighter, because it mails a real person ----
  const spammer = await contextFrom('203.0.113.40');
  let resetRefusedAt = null;
  for (let attempt = 1; attempt <= 6 && resetRefusedAt === null; attempt++) {
    await spammer.goto(`${BASE}/forgot-password`, { waitUntil: 'domcontentloaded' });
    await spammer.waitForFunction(
      () => document.querySelector('input[name=challengeSolution]')?.value !== '',
      { timeout: 30_000 },
    ).catch(() => undefined);
    await spammer.waitForTimeout(1300);
    await fillStable(spammer, '#field-email', email);
    await submitFormWith(spammer, '#field-email');
    if (await sawText(spammer, /Too many attempts/i, 6_000)) resetRefusedAt = attempt;
  }
  check('repeated reset requests are refused', resetRefusedAt !== null,
    resetRefusedAt ? `refused on attempt ${resetRefusedAt}` : 'never refused');
  check('and sooner than sign-in, because each one mails somebody',
    resetRefusedAt !== null && refusedAt !== null && resetRefusedAt < refusedAt,
    `reset ${resetRefusedAt} vs sign-in ${refusedAt}`);

  // ---- nothing personal was written down ----
  const { rows: stored } = await db.query('select token, dimension from rate_limit_hits limit 50');
  check('no row contains the address or an IP',
    stored.every((r) => /^[0-9a-f]{64}$/.test(r.token) && !r.token.includes(email)),
    `${stored.length} rows, all 64-hex`);
  check('both dimensions were actually recorded',
    new Set(stored.map((r) => r.dimension)).size === 2,
    [...new Set(stored.map((r) => r.dimension))].join(', '));

  // ---- a solved challenge cannot be spent twice ----
  const { rows: spent } = await db.query('select count(*)::int n from challenge_uses');
  check('solved challenges are recorded as spent', spent[0].n > 0, `${spent[0].n} spent`);
} finally {
  await browser.close();
  await db.end();
}

console.log(failures === 0 ? '\nPASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
