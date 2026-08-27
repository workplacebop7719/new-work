/**
 * The QA runner (§12).
 *
 * Builds one workbook per scenario through the real generator, hands the whole
 * set to LibreOffice Calc for recalculation, then reads the calculated values
 * back and checks them against the §12.2 matrix. Writes dist/QA_REPORT.md.
 *
 *   node src/qa/run-qa.mjs
 *
 * LibreOffice is a stand-in for Excel's engine, not Excel itself. What it
 * proves is that the formulas are well-formed and that the arithmetic and the
 * exception logic are right; the compatibility notes say what still needs a
 * human with Excel and a Google account.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SHEETS, CAPACITY, SETTINGS_FIELDS, SETTINGS_LAYOUT } from '../config.js';
import { buildWorkbook, makeSpecs } from '../build-command-center.js';
import { buildRef, colLetter } from '../lib/a1.js';
import { DASH, attentionBoard } from '../sheets/pages.js';
import { scenarios } from './scenarios.js';
import { readValues } from './read-xlsx.js';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const WORK = join(ROOT, 'dist', 'qa');
const PROFILE = join(WORK, '.lo-profile');

const CARD_COLS = { 0: 2, 1: 6, 2: 10, 3: 14 };
const CARD_KEYS = {
  countdown: [DASH.CARD_ROW_1, 0], budgetSet: [DASH.CARD_ROW_1, 1],
  spent: [DASH.CARD_ROW_1, 2], remaining: [DASH.CARD_ROW_1, 3],
  giftsChosen: [DASH.CARD_ROW_2, 0], wrapped: [DASH.CARD_ROW_2, 1],
  delivered: [DASH.CARD_ROW_2, 2], onTheList: [DASH.CARD_ROW_2, 3],
};

async function recalculate(paths) {
  await run('soffice', [
    '--headless', `-env:UserInstallation=file://${PROFILE}`,
    '--convert-to', 'xlsx', '--outdir', join(WORK, 'recalculated'), ...paths,
  ], { timeout: 900000, maxBuffer: 1 << 26 });
}

function reader(sheets, ref, today) {
  const board = attentionBoard(ref);
  const get = (sheet, address) => {
    const value = sheets.get(sheet)?.get(address);
    return value === undefined ? null : value;
  };
  const num = (sheet, address) => {
    const v = get(sheet, address);
    if (v && typeof v === 'object' && 'error' in v) return v;
    return typeof v === 'number' ? v : (v === null || v === '' ? 0 : v);
  };
  const findRow = (sheet, column, text, from, to) => {
    for (let r = from; r <= to; r += 1) {
      if (get(sheet, `${column}${r}`) === text) return r;
    }
    return null;
  };

  const qaSheet = SHEETS.QA;
  const qaRow = (label) => findRow(qaSheet, 'B', label, 1, 200);

  const r = {
    raw: get,
    text: (sheet, address) => {
      const v = get(sheet, address);
      return v === null ? '' : String(v);
    },
    dash(key) {
      const [row, col] = CARD_KEYS[key];
      return num(SHEETS.DASHBOARD, `${colLetter(CARD_COLS[col])}${row + 1}`);
    },
    dashNoteAddress(key) {
      const [row, col] = CARD_KEYS[key];
      return `${colLetter(CARD_COLS[col])}${row + 3}`;
    },
    dashNote(key) { return r.text(SHEETS.DASHBOARD, r.dashNoteAddress(key)); },
    attention(label) {
      const index = board.findIndex((b) => b.label === label);
      if (index < 0) throw new Error(`No attention row "${label}"`);
      return num(SHEETS.DASHBOARD, `B${DASH.BOARD_FIRST + index}`);
    },
    budget(category, key) {
      const col = colLetter(ref.index(SHEETS.BUDGET, 'category'));
      const row = findRow(SHEETS.BUDGET, col, category, ref.firstRow(SHEETS.BUDGET), ref.lastRow(SHEETS.BUDGET));
      if (!row) throw new Error(`No budget row for "${category}"`);
      const address = `${colLetter(ref.index(SHEETS.BUDGET, key))}${row}`;
      const v = get(SHEETS.BUDGET, address);
      return typeof v === 'number' ? Math.round(v * 100) / 100 : (v ?? '');
    },
    row(sheet, n, key) {
      const address = `${colLetter(ref.index(sheet, key))}${ref.firstRow(sheet) + n - 1}`;
      const v = get(sheet, address);
      return typeof v === 'number' ? v : (v ?? '');
    },
    gift: (n, key) => r.row(SHEETS.GIFTS, n, key),
    order: (n, key) => r.row(SHEETS.ORDERS, n, key),
    qa(label) {
      const row = qaRow(label);
      if (!row) throw new Error(`No quality-check row "${label}"`);
      return num(qaSheet, `C${row}`);
    },
    qaTotal() {
      const row = qaRow('Everything above, added up');
      return num(qaSheet, `C${row}`);
    },
    reconciliation(which) {
      const label = which === 'planned'
        ? 'Planned cost across every module, against MASTER BUDGET Planned'
        : 'Actual spend less confirmed refunds, against MASTER BUDGET Actual';
      const row = qaRow(label);
      return r.text(qaSheet, `F${row}`);
    },
    settings(key) {
      const index = SETTINGS_FIELDS.findIndex((f) => f.key === key);
      return num(SHEETS.SETTINGS, `${colLetter(SETTINGS_LAYOUT.VALUE_COL)}${SETTINGS_LAYOUT.FIRST_ROW + index}`);
    },
    daysUntil(utcMillis) {
      const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      return Math.max(0, Math.round((utcMillis - start) / 86400000));
    },
    errorCount() {
      let n = 0;
      for (const cells of sheets.values()) {
        for (const value of cells.values()) {
          if (value && typeof value === 'object' && 'error' in value) n += 1;
        }
      }
      return n;
    },
    equal: (name, actual, expected) => ({
      name, actual, expected,
      pass: JSON.stringify(normalise(actual)) === JSON.stringify(normalise(expected)),
    }),
    atLeast: (name, actual, expected) => ({
      name, actual, expected: `≥ ${expected}`, pass: typeof actual === 'number' && actual >= expected,
    }),
  };
  return r;
}

const normalise = (v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v);

async function main() {
  const specs = makeSpecs();
  const specNames = specs.map((s) => s.name);
  const ref = buildRef(specs);
  const today = new Date();

  await rm(WORK, { recursive: true, force: true });
  await mkdir(join(WORK, 'recalculated'), { recursive: true });

  const list = scenarios(specNames, today);
  const built = [];
  for (const scenario of list) {
    const overrides = { ...scenario.build.overrides };
    for (const [name, override] of Object.entries(overrides)) {
      if (override.fill === 'capacity') overrides[name] = { fill: CAPACITY[name] ?? 0 };
    }
    const outPath = join(WORK, `${scenario.key}.xlsx`);
    await buildWorkbook('excel', {
      ...scenario.build, overrides, outPath, charts: false,
    });
    built.push({ scenario, outPath });
    process.stdout.write(`  built ${scenario.key}\n`);
  }

  process.stdout.write('  recalculating with LibreOffice Calc…\n');
  await recalculate(built.map((b) => b.outPath));

  const results = [];
  for (const { scenario, outPath } of built) {
    const recalculated = join(WORK, 'recalculated', basename(outPath));
    const sheets = await readValues(recalculated);
    // `today` is the recalculation date, not the scenario's build date: the
    // build date only decides which Christmas gets seeded into SETTINGS, while
    // TODAY() resolves when the sheet is opened.
    const r = reader(sheets, ref, today);
    let checks;
    try {
      checks = scenario.checks(r);
    } catch (error) {
      checks = [{ name: 'scenario could not be read', actual: String(error.message), expected: '—', pass: false }];
    }
    results.push({ scenario, checks });
    const failed = checks.filter((c) => !c.pass).length;
    process.stdout.write(`  ${failed === 0 ? 'pass' : `FAIL (${failed})`}  ${scenario.key}\n`);
  }

  await writeFile(join(ROOT, 'dist', 'QA_REPORT.md'), report(results, today));
  await writeFile(join(ROOT, 'dist', 'qa-results.json'), `${JSON.stringify(
    results.map(({ scenario, checks }) => ({ key: scenario.key, title: scenario.title, checks })), null, 2)}\n`);

  const failures = results.reduce((n, { checks }) => n + checks.filter((c) => !c.pass).length, 0);
  process.stdout.write(failures === 0
    ? '\n  every scenario passed\n'
    : `\n  ${failures} check(s) failed — see dist/QA_REPORT.md\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

function report(results, today) {
  const total = results.reduce((n, { checks }) => n + checks.length, 0);
  const failed = results.reduce((n, { checks }) => n + checks.filter((c) => !c.pass).length, 0);
  const lines = [
    '# Scenario test results',
    '',
    `Run ${today.toISOString().slice(0, 10)} · ${results.length} scenarios · ${total} checks · ${failed} failed`,
    '',
    'Every scenario is built by the same generator that produces the product, then',
    'recalculated by LibreOffice Calc and read back. A check compares a calculated',
    'cell against what PRD §12.2 says it must contain.',
    '',
  ];
  for (const { scenario, checks } of results) {
    const bad = checks.filter((c) => !c.pass).length;
    lines.push(`## ${scenario.title} ${bad === 0 ? '— pass' : `— ${bad} FAILED`}`, '');
    lines.push(`*${scenario.requirement}*`, '');
    lines.push('| Check | Expected | Got | |', '| --- | --- | --- | --- |');
    for (const c of checks) {
      lines.push(`| ${c.name} | \`${format(c.expected)}\` | \`${format(c.actual)}\` | ${c.pass ? 'pass' : '**FAIL**'} |`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

const format = (v) => (v === '' ? '(blank)' : typeof v === 'object' ? JSON.stringify(v) : String(v));

await main();
