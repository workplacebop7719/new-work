#!/usr/bin/env node
/**
 * The bot challenge, driven in a real browser (PRD §01, §06).
 *
 * Two questions no unit test can answer: does a real page actually solve the
 * proof of work in a reasonable time, and does a submission that skips it get
 * refused. The second is simulated by posting the form with JavaScript
 * disabled for the solver — which is exactly what a script would do.
 *
 *   BASE=http://localhost:3210 node scripts/smoke-challenge.mjs
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
const SMOKE_CALLER = '198.51.100.14';
const CALLER_HEADERS = { 'x-forwarded-for': SMOKE_CALLER };


const BASE = process.env.BASE || 'http://localhost:3210';

/**
 * The one message every challenge failure produces.
 *
 * Matched as a fragment of `CHALLENGE_MESSAGE` in security/challenge.ts
 * rather than the whole sentence, so rewording the copy does not fail a test
 * about the honeypot. It was the full sentence, and changing "Reload the page
 * and try again" — advice that stopped being true once the forms refetched
 * their own challenge — broke two checks that are not about wording at all.
 *
 * That the message is IDENTICAL for every failure is the security property,
 * and it is pinned where it belongs, in challenge.test.ts.
 */
const CHALLENGE_REFUSAL = /couldn’t check this form/i;

let failures = 0;
const check = (label, ok, extra = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${extra ? `  (${extra})` : ''}`);
  if (!ok) failures++;
};

async function sawText(page, pattern, timeout = 20_000) {
  try {
    await page.waitForFunction(
      ([source, flags]) => new RegExp(source, flags).test(document.body.innerText),
      [pattern.source, pattern.flags], { timeout },
    );
    return true;
  } catch { return false; }
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

/**
 * A cold dev server compiles a route on first request. Measuring "how long
 * does the proof of work take" from page load then times the COMPILER, which
 * is how this reported nine seconds on a cold start and under two warm.
 */
async function warm(page, paths) {
  for (const path of paths) {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }
}

try {
  console.log('bot challenge');
  const page = await (await browser.newContext({ extraHTTPHeaders: CALLER_HEADERS })).newPage();
  await warm(page, ['/signup', '/today', '/login']);

  // ---- it solves, and quickly enough that nobody notices ----
  // Measured from navigation, with no sleep first. An earlier version waited
  // 1500ms and then timed how long the wait took to resolve, which reported
  // 26ms and measured nothing at all.
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  const started = Date.now();
  await page.waitForFunction(
    () => document.querySelector('input[name=challengeSolution]')?.value !== '',
    { timeout: 30_000 },
  ).catch(() => undefined);
  const solveMs = Date.now() - started;

  const solution = await page.inputValue('input[name=challengeSolution]');
  check('the page solves its own challenge', solution !== '', `${solveMs}ms from load`);
  check('fast enough not to be felt', solveMs < 8_000, `${solveMs}ms`);

  // ---- the honeypot is genuinely out of reach ----
  const trap = page.locator('input[name=website]');
  check('the honeypot exists for a script to find', (await trap.count()) === 1);

  // Positioned off-screen rather than display:none on purpose — a form filler
  // that respects CSS would skip a hidden field, and catching those is the
  // point. So the assertion is "outside the viewport", not "not visible":
  // Playwright rightly reports an off-screen element as visible.
  const box = await trap.boundingBox();
  check('but is parked outside the viewport, where nobody can reach it',
    box !== null && box.x < 0, box ? `x=${Math.round(box.x)}` : 'no box');
  check('and is out of the tab order', (await trap.getAttribute('tabindex')) === '-1');
  check('and hidden from assistive technology',
    (await page.locator('[aria-hidden="true"] input[name=website]').count()) === 1);

  // ---- a real sign-up still works ----
  const email = `challenge${Date.now()}@example.com`;
  await page.fill('#field-displayName', 'Challenge');
  await page.fill('#field-email', email);
  await page.fill('#field-password', 'correct horse battery');
  await page.locator('form:has(#field-email) button[type=submit]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/signup'), { timeout: 20_000 })
    .catch(() => undefined);
  check('a person gets through', !page.url().includes('/signup'),
    page.url().includes('/signup')
      ? (await page.locator('[role=alert]').allTextContents()).join(' | ')
      : page.url());

  // ---- a script that fills the honeypot is refused ----
  const bot = await (await browser.newContext({ extraHTTPHeaders: CALLER_HEADERS })).newPage();
  await bot.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await bot.waitForFunction(
    () => document.querySelector('input[name=challengeSolution]')?.value !== '',
    { timeout: 30_000 },
  ).catch(() => undefined);
  await bot.waitForTimeout(1500);

  await bot.fill('#field-displayName', 'Bot');
  await bot.fill('#field-email', `bot${Date.now()}@example.com`);
  await bot.fill('#field-password', 'correct horse battery');
  // A form-filler fills every input it can see in the DOM, CSS notwithstanding.
  await bot.evaluate(() => {
    const trap = document.querySelector('input[name=website]');
    if (trap) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(trap, 'https://spam.example');
      trap.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await bot.locator('form:has(#field-email) button[type=submit]').click();
  check('filling the honeypot is refused', await sawText(bot, CHALLENGE_REFUSAL));
  check('and it stays on the sign-up page', bot.url().includes('/signup'));

  // ---- a forged solution is refused ----
  const forger = await (await browser.newContext({ extraHTTPHeaders: CALLER_HEADERS })).newPage();
  await forger.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  // Wait for the real solution first: the submit button is disabled until the
  // challenge is solved, so tampering before that just clicks a dead control.
  await forger.waitForFunction(
    () => document.querySelector('input[name=challengeSolution]')?.value !== '',
    { timeout: 30_000 },
  ).catch(() => undefined);
  await forger.waitForTimeout(1500);
  await forger.fill('#field-displayName', 'Forger');
  await forger.fill('#field-email', `forge${Date.now()}@example.com`);
  await forger.fill('#field-password', 'correct horse battery');
  await forger.evaluate(() => {
    const setValue = (name, value) => {
      const input = document.querySelector(`input[name=${name}]`);
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    // Ask for no work at all, and hand back a made-up answer.
    setValue('challengeBits', '0');
    setValue('challengeSolution', '1');
  });
  await forger.locator('form:has(#field-email) button[type=submit]').click();
  const forgeRefused = await sawText(forger, CHALLENGE_REFUSAL);
  check('a self-lowered difficulty is refused', forgeRefused,
    forgeRefused ? '' : `landed on ${forger.url()}`);

  // ---- the failure message gives nothing away ----
  const message = await forger.locator('[role=alert]').first().textContent();
  check('the refusal does not say which check failed',
    !/honeypot|difficulty|signature|too fast|solution/i.test(message ?? ''));

  // ---- sign-in is deliberately NOT challenged ----
  const signin = await (await browser.newContext({ extraHTTPHeaders: CALLER_HEADERS })).newPage();
  await signin.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await signin.waitForTimeout(1500);
  check('sign-in carries no challenge, so returning customers are not taxed',
    (await signin.locator('input[name=challengeSolution]').count()) === 0);
} finally {
  await browser.close();
}

console.log(failures === 0 ? '\nPASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
