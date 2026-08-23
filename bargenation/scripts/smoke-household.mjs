#!/usr/bin/env node
/**
 * The household, driven in a real browser (PRD §35).
 *
 * This is the one screen in the product that asks about a child, so the
 * checks are about what it refuses to ask for as much as what it stores.
 *
 *   BASE=http://localhost:3210 PGURL=... node scripts/smoke-household.mjs
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

const db = new pg.Client({ connectionString: PG });
await db.connect();
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

/**
 * A dev server compiles a route on its first request, which can take eight
 * seconds. That is not the product being slow, but it is enough to race a
 * form submit, so every route this script touches is warmed first.
 */
async function warm(page, paths) {
  for (const path of paths) {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }
}

try {
  console.log('household');
  const page = await (await browser.newContext()).newPage();
  await warm(page, ['/signup', '/today', '/app/household', '/app/watchlist',
    '/deals/calder-trail-sneaker', '/login']);
  const email = `house${Date.now()}@example.com`;

  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.querySelector('input[name=challengeSolution]')?.value !== '',
    { timeout: 30_000 },
  ).catch(() => undefined);
  await page.waitForTimeout(1400);
  await page.fill('#field-displayName', 'Parent');
  await page.fill('#field-email', email);
  await page.fill('#field-password', 'correct horse battery');
  await page.locator('form:has(#field-email) button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/signup'), { timeout: 20_000 })
    .catch(() => undefined);
  check('signed up', !page.url().includes('/signup'));

  const { rows: who } = await db.query('select id from profiles order by created_at desc limit 1');
  const profileId = who[0].id;

  await page.goto(`${BASE}/app/household`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  const body = await page.textContent('body');

  // ---- the absences are stated before anything is typed ----
  check('it says what there is nowhere to put', /nowhere to put/i.test(body ?? ''));
  check('and names the columns that do not exist',
    /legal name/i.test(body ?? '') && /date of birth/i.test(body ?? ''));
  check('and asks for a nickname rather than a full name',
    /nickname rather than a full name/i.test(body ?? ''));

  // ---- there is genuinely no field for any of it ----
  // Next injects its own $ACTION_ID_… input for a server action. That is
  // framework machinery, not a field this form asks anybody to fill in.
  const fieldNames = await page.evaluate(() =>
    [...document.querySelectorAll('#add input, #add select')]
      .map((el) => el.name)
      .filter((name) => name && !name.startsWith('$ACTION')));
  check('no field for a legal name, DOB, school or address',
    !fieldNames.some((n) => /legalname|dob|dateofbirth|school|address|postcode/i.test(n)),
    fieldNames.join(', '));
  check('the only fields are a nickname, a year and two sizes',
    fieldNames.filter(Boolean).sort().join(',') === 'birthYear,clothingSize,nickname,shoeSize',
    fieldNames.filter(Boolean).join(', '));

  // ---- adding somebody ----
  await page.fill('#nickname-new', 'Little One');
  await page.fill('#birthYear-new', '2018');
  await page.fill('#clothingSize-new', '5-6y');
  await page.fill('#shoeSize-new', '12');
  await page.locator('#add form button[type=submit]').click();
  await page.waitForTimeout(2500);
  check('they appear in the household',
    /Little One/.test((await page.textContent('body')) ?? ''));

  const { rows: stored } = await db.query(
    `select hm.nickname, hm.birth_year, hm.clothing_size, hm.shoe_size
     from household_members hm
     join households h on h.id = hm.household_id
     where h.owner_profile_id = $1`, [profileId],
  );
  check('stored as given', stored.length === 1 && stored[0].birth_year === 2018);

  // ---- a size with no name at all ----
  await page.fill('#shoeSize-new', '4');
  await page.locator('#add form button[type=submit]').click();
  await page.waitForTimeout(2500);
  const { rows: anon } = await db.query(
    `select count(*)::int n from household_members hm
     join households h on h.id = hm.household_id
     where h.owner_profile_id = $1 and hm.nickname is null and hm.shoe_size = '4'`, [profileId],
  );
  check('a size can be recorded with no name at all', anon[0].n === 1);

  // ---- the payoff: a watch that is for somebody ----
  await page.goto(`${BASE}/deals/calder-trail-sneaker`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  await page.locator('form:has(#targetPrice) button:has-text("Watch")').click();
  await page.waitForTimeout(2500);

  await page.goto(`${BASE}/app/watchlist`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const options = await page.locator('select[name=memberId]').first()
    .locator('option').allTextContents();
  check('the watch can be pointed at somebody',
    options.some((o) => /Little One/.test(o)), options.join(' | '));

  const value = await page.locator('select[name=memberId]').first()
    .locator('option', { hasText: 'Little One' }).getAttribute('value');
  await page.locator('select[name=memberId]').first().selectOption(value);
  await page.waitForTimeout(2500);

  const listed = await page.textContent('body');
  check('the watchlist says who it is for', /For Little One/i.test(listed ?? ''));
  check('and shows their size where the shopping is', /clothes 5-6y/i.test(listed ?? ''));

  // ---- removing the person keeps the shopping ----
  await page.goto(`${BASE}/app/household`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  await page.locator('form:has(button:has-text("Remove from household"))').first()
    .locator('button:has-text("Remove from household")').click();
  await page.waitForTimeout(2500);

  await page.goto(`${BASE}/app/watchlist`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const after = await page.textContent('body');
  check('removing them does not delete the watch',
    /Trail Runner|Watchlist/i.test(after ?? '') && !/For Little One/i.test(after ?? ''));

  const { rows: watches } = await db.query(
    `select count(*)::int n from watchlist_items wi
     join watchlists w on w.id = wi.watchlist_id where w.profile_id = $1`, [profileId],
  );
  check('the watch itself is still there', watches[0].n >= 1, `${watches[0].n} watches`);
} finally {
  await browser.close();
  await db.end();
}

console.log(failures === 0 ? '\nPASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
