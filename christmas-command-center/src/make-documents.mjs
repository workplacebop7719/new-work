/**
 * Builds the customer documents (§3): three PDFs and the text assets.
 *
 * The PDFs are written as HTML and printed by the Chromium that is already on
 * this machine, which keeps the typography under the same control as the
 * workbook rather than at the mercy of a converter.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readMeFirst, startHere, termsOfUse } from './documents/pages.js';
import { etsyListingCopy, mockupShotList, changeLog, faq, sheetsSetup } from './documents/text-assets.js';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'dist', 'documents');

const CHROME_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);

async function chromium() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch { /* try the next one */ }
  }
  throw new Error('No Chromium found. Set CHROMIUM_PATH to a Chrome or Chromium binary.');
}

async function toPdf(browser, htmlPath, pdfPath) {
  await run(browser, [
    '--headless', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`,
  ], { timeout: 120000 });
}

export async function makeDocuments() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const browser = await chromium();

  const documents = [
    ['READ_ME_FIRST', readMeFirst()],
    ['START_HERE', startHere()],
    ['TERMS_OF_USE', termsOfUse()],
  ];

  const written = [];
  for (const [name, html] of documents) {
    const htmlPath = join(OUT, `${name}.html`);
    const pdfPath = join(OUT, `${name}.pdf`);
    await writeFile(htmlPath, html);
    await toPdf(browser, htmlPath, pdfPath);
    written.push(pdfPath);
  }

  const texts = [
    ['Etsy_Listing_Copy.txt', etsyListingCopy()],
    ['Mockup_Shot_List.txt', mockupShotList()],
    ['Change_Log.txt', changeLog()],
    ['FAQ.txt', faq()],
    ['Google_Sheets_Setup.txt', sheetsSetup()],
  ];
  for (const [name, text] of texts) {
    const path = join(OUT, name);
    await writeFile(path, text);
    written.push(path);
  }
  return written;
}

if (process.argv[1] && process.argv[1].endsWith('make-documents.mjs')) {
  const written = await makeDocuments();
  for (const path of written) console.log(`  wrote ${path}`);
}
