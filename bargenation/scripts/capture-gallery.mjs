#!/usr/bin/env node
/**
 * Captures every page of the product for visual review.
 *
 * Signs a real account up first, so the member portal renders signed in
 * rather than as a redirect to the sign-in page, and promotes it to admin so
 * the operations surface renders too. Writes JPEGs, because the gallery these
 * feed embeds them and a full-page PNG at 1440 is megabytes on its own.
 *
 *   BASE=http://localhost:3210 PGURL=... node scripts/capture-gallery.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
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
const SMOKE_CALLER = '198.51.100.20';
const CALLER_HEADERS = { 'x-forwarded-for': SMOKE_CALLER };


const BASE = process.env.BASE || 'http://localhost:3210';
const OUT = process.env.OUT || '/tmp/gallery';
const PG = process.env.PGURL;

mkdirSync(OUT, { recursive: true });

/** Public first, then the flows, then what only a member or operator sees. */
const PAGES = [
  ['home', '/', 'The front page'],
  ['today', '/today', 'Today — what we would actually buy'],
  ['categories', '/categories', 'Browse by category'],
  ['category-shoes', '/categories/shoes', 'One category'],
  ['deal', '/deals/calder-trail-sneaker', 'A deal, with the full working shown'],
  ['stores', '/stores', 'Retailers'],
  ['store', '/stores/calder-kids', 'One retailer, with its evidence'],
  ['search', '/search?q=coat', 'Search'],
  ['how-it-works', '/how-it-works', 'The method'],
  ['about', '/about', 'About'],
  ['edit', '/edit', 'The Edit — the newsletter'],
  ['login', '/login', 'Sign in'],
  ['signup', '/signup', 'Create an account'],
  ['forgot-password', '/forgot-password', 'Forgot password'],
  ['account-password', '/app/account/password', 'Change password', true],
  ['account-delete', '/app/account/delete', 'Delete account — what goes, and what does not', true],
  ['verify-email', '/verify-email', 'Confirm your email, with no token'],
  ['app-watchlist', '/app/watchlist', 'Portal — Watchlist', true],
  ['app-saved', '/app/saved', 'Portal — Saved', true],
  ['app-signals', '/app/deal-signals', 'Portal — Deal Signals', true],
  ['app-household', '/app/household', 'Portal — Household, leading with what there is nowhere to put', true],
  ['app-noticed', '/app/noticed', 'Portal — What we noticed, switched off by default', true],
  ['app-account', '/app/account', 'Portal — Account', true],
  ['admin', '/admin', 'Operations — overview', true],
  ['admin-review', '/admin/review', 'Operations — match review', true],
  ['admin-quarantine', '/admin/quarantine', 'Operations — quarantine', true],
  ['privacy', '/privacy', 'Privacy'],
  ['terms', '/terms', 'Terms'],
  ['disclosures', '/disclosures', 'Disclosures'],
  ['contact', '/contact', 'Contact'],
  ['not-found', '/no-such-page-here', '404'],
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

const shots = [];

try {
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ extraHTTPHeaders: CALLER_HEADERS, 
      viewport: { width, height: width === 1440 ? 1000 : 860 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    // A real account, so the portal is the portal and not a redirect.
    const email = `gallery${Date.now()}${width}@example.com`;
    await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
    // The submit button is disabled until the bot challenge is solved, so
    // clicking on a timer clicks a dead control.
    await page.waitForFunction(
      () => document.querySelector('input[name=challengeSolution]')?.value !== '',
      { timeout: 30_000 },
    ).catch(() => undefined);
    await page.waitForTimeout(1400);
    await page.fill('#field-displayName', 'Sam');
    await page.fill('#field-email', email);
    await page.fill('#field-password', 'correct horse battery');
    await page.locator('form:has(#field-email) button[type=submit]').click();
    await page.waitForURL((url) => !url.pathname.startsWith('/signup'), { timeout: 20_000 })
      .catch(() => undefined);

    if (PG) {
      const db = new pg.Client({ connectionString: PG });
      await db.connect();
      const { rows } = await db.query('select id from profiles order by created_at desc limit 1');
      if (rows[0]) await db.query("update profiles set role='admin' where id=$1", [rows[0].id]);
      await db.end();
    }

    for (const [name, path, caption, needsSession] of PAGES) {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(width === 1440 ? 2200 : 1800);
      // Next's development badge is furniture, not product.
      await page.addStyleTag({ content: 'nextjs-portal,[data-nextjs-toast]{display:none!important}' });
      await page.waitForTimeout(250);

      // Very tall pages are clipped rather than shrunk. A 12,000px capture of
      // a review queue full of test rows is not more informative than the
      // first screenful and a half, and it dominates the gallery's weight.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const cap = width === 1440 ? 5200 : 4200;
      const file = `${OUT}/${name}-${width}.jpg`;
      await page.screenshot({
        path: file,
        type: 'jpeg',
        quality: 60,
        ...(height > cap
          ? { clip: { x: 0, y: 0, width, height: cap } }
          : { fullPage: true }),
      });
      const bytes = readFileSync(file).length;
      if (width === 1440) shots.push({ name, path, caption, needsSession: Boolean(needsSession) });
      console.log(`  ${String(bytes).padStart(8)}  ${name}-${width}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

writeFileSync(`${OUT}/index.json`, JSON.stringify(shots, null, 2));
console.log(`\n${shots.length} pages captured to ${OUT}`);
