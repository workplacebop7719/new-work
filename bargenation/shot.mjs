/**
 * Visual QA (PRD §76) — compiling is not the same as looking right.
 *
 * Screenshots any set of routes at the breakpoints the PRD names.
 *
 *   node shot.mjs                                  # all breakpoints, full page
 *   PAGES=/,/today node shot.mjs                   # choose routes
 *   SIZES=375,1440 SCALE=1 node shot.mjs           # choose widths and DPR
 *   FULL=0 node shot.mjs                           # viewport only, not full page
 *
 * SCALE=1 and FULL=0 exist because very tall 2x full-page captures are
 * awkward to share — a mobile page can render 17,000px tall.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const PAGES = (process.env.PAGES || '/').split(',');
const SCALE = Number(process.env.SCALE || 2);
const FULL = process.env.FULL !== '0';
const HEIGHTS = { 320: 800, 375: 900, 390: 900, 430: 950, 768: 1000, 1024: 900, 1280: 1000, 1440: 1100 };
const SIZES = (process.env.SIZES || '375,768,1440').split(',').map(Number);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

for (const path of PAGES) {
  for (const width of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width, height: HEIGHTS[width] ?? 900 },
      deviceScaleFactor: SCALE,
    });
    const page = await ctx.newPage();
    // not networkidle: self-hosted fonts can leave a request pending
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    const name = path === '/' ? 'home' : path.replace(/\//g, '-').replace(/^-/, '');
    await page.screenshot({ path: `/tmp/shots/${name}-${width}.png`, fullPage: FULL });
    await ctx.close();
  }
}

await browser.close();
console.log(`captured ${PAGES.length * SIZES.length} screenshot(s) to /tmp/shots`);
