#!/usr/bin/env node
/**
 * The account-recovery flow, driven in a real browser.
 *
 * Unit tests cover the adapter and the token checks. This covers the seams:
 * that the forgot-password form says the same thing either way, that the link
 * the development adapter issues actually lands on a working page, and that
 * the reset genuinely signs every session out.
 *
 * The reset link is read from the DEV SERVER'S OWN LOG, which is where the
 * development adapter writes it when no email provider can deliver. That is
 * also how a developer completes this flow by hand.
 *
 *   npm run dev > /tmp/dev.log 2>&1 &
 *   DEV_LOG=/tmp/dev.log node scripts/smoke-recovery.mjs
 *
 * Exits non-zero on the first failed expectation.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const DEV_LOG = process.env.DEV_LOG || '/tmp/dev.log';

let failures = 0;
const check = (label, condition) => {
  console.log(`  ${condition ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!condition) failures++;
};

/**
 * Waits for a message to appear anywhere on the page.
 *
 * Deliberately NOT `waitForSelector('[role=alert]')`. Next's route announcer
 * is itself `role=alert` and is present on every page from the moment it
 * loads, so waiting for "an alert" returns instantly and reads the page title
 * — which made a working sign-in form look broken twice in a row here.
 *
 * Waiting for the words we actually expect has no such ambiguity, and asserts
 * the thing that matters: the customer can see it.
 */
async function sawText(page, pattern, timeout = 15_000) {
  try {
    await page.waitForFunction(
      ([source, flags]) => new RegExp(source, flags).test(document.body.innerText),
      [pattern.source, pattern.flags],
      { timeout },
    );
    return true;
  } catch {
    return false;
  }
}

/** All the text of a role, joined — for comparing two responses for sameness. */
const roleText = async (page, role) =>
  (await page.locator(`[role=${role}]`).allTextContents()).join(' ').trim();

/** The most recent link of a given kind the dev server logged. */
function latestLink(kind) {
  const log = readFileSync(DEV_LOG, 'utf8');
  const matches = [...log.matchAll(new RegExp(`\\[dev auth\\] ${kind} for \\S+ — .*?(https?://\\S+)`, 'g'))];
  return matches.at(-1)?.[1];
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

try {
  console.log('account recovery');

  const email = `recover${Date.now()}@example.com`;
  const oldPassword = 'correct horse battery';
  const newPassword = 'an entirely different passphrase';

  // ---- an account to recover ----
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.fill('#field-displayName', 'Recovery');
  await page.fill('#field-email', email);
  await page.fill('#field-password', oldPassword);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/today/, { timeout: 20_000 }).catch(() => undefined);
  check('signing up lands somewhere signed in', !page.url().includes('/signup'));

  // ---- the page must admit nothing will arrive ----
  await page.goto(`${BASE}/forgot-password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const body = await page.textContent('body');
  check('says plainly that no email will arrive (§01)',
    /nothing will arrive/i.test(body ?? ''));

  // ---- an address with no account ----
  await page.fill('#field-email', `nobody${Date.now()}@example.com`);
  await page.click('button[type=submit]');
  check('an unknown address is answered at all', await sawText(page, /if there’s an account/i));
  const unknownNotice = await roleText(page, 'status');
  check('an unknown address gets a confirmation, not a denial',
    /if there’s an account/i.test(unknownNotice ?? ''));
  check('the URL does not change, so it cannot be read as a signal',
    page.url().includes('/forgot-password'));

  // ---- the real address ----
  await page.goto(`${BASE}/forgot-password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.fill('#field-email', email);
  await page.click('button[type=submit]');
  check('a real address is answered at all', await sawText(page, /if there’s an account/i));
  const knownNotice = await roleText(page, 'status');
  check('a real address gets the identical confirmation', knownNotice === unknownNotice);

  // ---- a mangled link explains itself rather than collecting a password ----
  await page.goto(`${BASE}/reset-password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  check('a reset link with no token does not show a password form',
    (await page.locator('#field-password').count()) === 0);

  // ---- the real link ----
  const link = latestLink('PASSWORD_RESET');
  check('the dev server logged a reset link', Boolean(link));
  if (!link) throw new Error('no reset link in the dev log — is DEV_LOG right?');

  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  check('the link opens a page asking for a new password',
    (await page.locator('#field-password').count()) === 1);

  // Mismatched confirmation must be caught before anything changes.
  await page.fill('#field-password', newPassword);
  await page.fill('#field-confirmPassword', 'something else entirely');
  await page.click('button[type=submit]');
  check('two different passwords are refused', await sawText(page, /don’t match/i));

  await page.fill('#field-password', newPassword);
  await page.fill('#field-confirmPassword', newPassword);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/login/, { timeout: 20_000 }).catch(() => undefined);
  check('a successful reset lands on sign-in, NOT signed in',
    page.url().includes('/login') && page.url().includes('reset=1'));

  const afterReset = await page.textContent('body');
  check('sign-in explains that every device was signed out',
    /signed out/i.test(afterReset ?? ''));

  // ---- the old password must be dead, the new one alive ----
  await page.fill('#field-email', email);
  await page.fill('#field-password', oldPassword);
  await page.click('button[type=submit]');
  check('the old password no longer works',
    await sawText(page, /email and password don’t match/i));

  // React resets uncontrolled fields after a form action, so the failed attempt
  // above leaves both boxes empty. Refilling is not belt-and-braces here.
  await page.fill('#field-email', email);
  await page.fill('#field-password', newPassword);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/today/, { timeout: 20_000 }).catch(() => undefined);
  check('the new password works', !page.url().includes('/login'));

  // ---- the link is single use ----
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.fill('#field-password', 'yet another passphrase');
  await page.fill('#field-confirmPassword', 'yet another passphrase');
  await page.click('button[type=submit]');
  check('a used reset link cannot be used again',
    await sawText(page, /expired or already been used/i));
} finally {
  await browser.close();
}

console.log(failures === 0 ? '\nPASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
