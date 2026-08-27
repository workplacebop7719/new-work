/**
 * Renders the wildflower drawings to transparent PNGs in assets/.
 *
 * Run with `npm run art`. The output is committed, so `npm run build` needs
 * nothing but Node — a workbook build should not depend on a browser being
 * installed. Re-run this only when the drawings or the palette change.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOKENS } from './config.js';
import { ART, svg } from './lib/wildflowers.js';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ASSETS = join(ROOT, 'assets');
const TMP = join(ROOT, 'dist', 'art-tmp');

const hex = (token) => `#${token.slice(2)}`;

/** Drawn at three times the placed size so they stay crisp when printed. */
const SCALE = 3;

const DRAWINGS = [
  { name: 'wildflower-sprig', art: ART.sprigTall({ width: 150, height: 430 }), stroke: TOKENS.GOLD, weight: 1.5 },
  { name: 'wildflower-spray', art: ART.spray({ width: 340, height: 48 }), stroke: TOKENS.GOLD, weight: 1.15 },
  { name: 'wildflower-corner', art: ART.sprigSmall({ width: 104, height: 46 }), stroke: TOKENS.GOLD, weight: 1.15 },
  { name: 'wildflower-sprig-plum', art: ART.sprigTall({ width: 150, height: 430 }), stroke: TOKENS.PLUM_2, weight: 1.5 },
];

const CHROME_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
].filter(Boolean);

async function chromium() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch { /* next */ }
  }
  throw new Error('No Chromium found. Set CHROMIUM_PATH.');
}

export async function makeArt() {
  await mkdir(ASSETS, { recursive: true });
  await rm(TMP, { recursive: true, force: true });
  await mkdir(TMP, { recursive: true });
  const browser = await chromium();
  const written = [];

  for (const { name, art, stroke, weight } of DRAWINGS) {
    const w = art.width * SCALE;
    const h = art.height * SCALE;
    const markup = svg({ ...art, stroke: hex(stroke), strokeWidth: weight });
    const html = `<!doctype html><meta charset="utf-8">`
      + `<style>html,body{margin:0;padding:0;background:transparent}`
      + `svg{display:block;width:${w}px;height:${h}px}</style>${markup}`;
    const htmlPath = join(TMP, `${name}.html`);
    const pngPath = join(ASSETS, `${name}.png`);
    await writeFile(htmlPath, html);
    await run(browser, [
      '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--default-background-color=00000000',
      `--window-size=${w},${h}`, `--screenshot=${pngPath}`, `file://${htmlPath}`,
    ], { timeout: 60000 });
    // The SVG source is kept too: the PDFs draw it as vector, and the Canva
    // pack ships it so the seller can scale it without it going soft.
    await writeFile(join(ASSETS, `${name}.svg`), markup);
    written.push(pngPath);
  }

  await rm(TMP, { recursive: true, force: true });
  return written;
}

if (process.argv[1] && process.argv[1].endsWith('make-art.mjs')) {
  for (const path of await makeArt()) console.log(`  wrote ${path}`);
}
