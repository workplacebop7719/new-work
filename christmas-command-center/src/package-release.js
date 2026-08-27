/**
 * Assembles the buyer package (§13.1).
 *
 * Two things this script is careful about: the buyer folder contains only
 * customer-ready files, and the seller's source and testing material is kept
 * separately and never zipped into the download by accident.
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDITIONS, PRODUCT } from './config.js';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DIST = join(ROOT, 'dist');
const DOCS = join(DIST, 'documents');
// The finished package lives at the project root, not under dist/. dist/ is
// regenerable build output; release/ is the thing that gets uploaded, and it is
// kept with the source so the deliverables are never only on one machine.
const ART = join(ROOT, 'assets');
const RELEASE = join(ROOT, 'release');
const BUYER = join(RELEASE, 'Christmas_Season_Master_Command_Center');
const SELLER = join(RELEASE, 'SELLER_ONLY');

const LAYOUT = [
  ['01_START_HERE', [
    [join(DOCS, 'READ_ME_FIRST.pdf'), 'READ_ME_FIRST.pdf'],
    [join(DOCS, 'START_HERE.pdf'), 'START_HERE.pdf'],
  ]],
  ['02_EXCEL', [
    [join(DIST, EDITIONS.excel.file), EDITIONS.excel.file],
  ]],
  ['03_GOOGLE_SHEETS', [
    [join(DIST, EDITIONS.sheets.file), EDITIONS.sheets.file],
    [join(DOCS, 'Google_Sheets_Setup.txt'), 'Google_Sheets_Setup.txt'],
  ]],
  ['04_CANVA_AND_PRINTABLE', [
    [join(DOCS, 'Christmas_Printable_Pack_A4.pdf'), 'Christmas_Printable_Pack_A4.pdf'],
    [join(DOCS, 'Christmas_Printable_Pack_Letter.pdf'), 'Christmas_Printable_Pack_Letter.pdf'],
    [join(DOCS, 'Canva_Setup.txt'), 'Canva_Setup.txt'],
    [join(DOCS, 'BRAND_KIT.txt'), 'BRAND_KIT.txt'],
    [join(ART, 'wildflower-sprig.svg'), 'wildflower-sprig.svg'],
    [join(ART, 'wildflower-sprig.png'), 'wildflower-sprig.png'],
    [join(ART, 'wildflower-spray.svg'), 'wildflower-spray.svg'],
    [join(ART, 'wildflower-spray.png'), 'wildflower-spray.png'],
    [join(ART, 'wildflower-corner.svg'), 'wildflower-corner.svg'],
    [join(ART, 'wildflower-corner.png'), 'wildflower-corner.png'],
  ]],
  ['05_LICENSE', [
    [join(DOCS, 'TERMS_OF_USE.pdf'), 'TERMS_OF_USE.pdf'],
  ]],
  ['06_SUPPORT', [
    [join(DOCS, 'FAQ.txt'), 'FAQ.txt'],
    [join(DOCS, 'Change_Log.txt'), 'Change_Log.txt'],
  ]],
];

const SELLER_FILES = [
  [join(DOCS, 'Etsy_Listing_Copy.txt'), 'Etsy_Listing_Copy.txt'],
  [join(DOCS, 'Mockup_Shot_List.txt'), 'Mockup_Shot_List.txt'],
  [join(DIST, 'QA_REPORT.md'), 'QA_REPORT.md'],
  [join(DIST, 'qa-results.json'), 'qa-results.json'],
  [join(DIST, 'build-manifest.json'), 'build-manifest.json'],
  [join(ROOT, 'BUILD_LEDGER.md'), 'BUILD_LEDGER.md'],
  [join(ROOT, 'docs', 'ARCHITECTURE_MAP.md'), 'ARCHITECTURE_MAP.md'],
  [join(ROOT, 'docs', 'COMPATIBILITY.md'), 'COMPATIBILITY.md'],
  [join(ROOT, 'docs', 'RELEASE_STATUS.md'), 'RELEASE_STATUS.md'],
];

async function copyIfPresent(from, to) {
  try {
    await stat(from);
  } catch {
    return false;
  }
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to);
  return true;
}

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else found.push(path);
  }
  return found.sort();
}

export async function packageRelease() {
  await rm(RELEASE, { recursive: true, force: true });
  await mkdir(BUYER, { recursive: true });
  await mkdir(SELLER, { recursive: true });

  const missing = [];
  for (const [folder, files] of LAYOUT) {
    for (const [from, name] of files) {
      const ok = await copyIfPresent(from, join(BUYER, folder, name));
      if (!ok) missing.push(relative(ROOT, from));
    }
  }
  for (const [from, name] of SELLER_FILES) {
    const ok = await copyIfPresent(from, join(SELLER, name));
    if (!ok) missing.push(relative(ROOT, from));
  }

  await writeFile(join(SELLER, 'README.txt'),
    `${PRODUCT.trademarkName} — seller material.\n\n`
    + 'Nothing in this folder goes to a buyer. It is the listing copy, the shot\n'
    + 'list, the test evidence and the build record. The folder beside it,\n'
    + 'Christmas_Season_Master_Command_Center, is the one you zip and upload.\n');

  // Checksums, so a buyer's download can be checked against what was built.
  const buyerFiles = await walk(BUYER);
  const lines = [];
  for (const path of buyerFiles) {
    const hash = createHash('sha256').update(await readFile(path)).digest('hex');
    lines.push(`${hash}  ${relative(BUYER, path)}`);
  }
  await writeFile(join(RELEASE, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`);

  const zipPath = join(RELEASE, 'Christmas_Season_Master_Command_Center.zip');
  let zip = zipPath;
  try {
    await run('zip', ['-r', '-q', zipPath, 'Christmas_Season_Master_Command_Center'], { cwd: RELEASE });
  } catch {
    zip = null;
  }
  return { buyerFiles, missing, zip };
}

if (process.argv[1] && process.argv[1].endsWith('package-release.js')) {
  const result = await packageRelease();
  for (const path of result.buyerFiles) console.log(`  ${relative(ROOT, path)}`);
  if (result.zip) console.log(`  ${relative(ROOT, result.zip)}`);
  if (result.missing.length > 0) {
    console.error(`\n  ${result.missing.length} file(s) missing from the package:`);
    for (const name of result.missing) console.error(`    ${name}`);
    process.exitCode = 1;
  }
}
