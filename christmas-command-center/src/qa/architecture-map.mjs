/**
 * Generates docs/ARCHITECTURE_MAP.md from the specifications themselves.
 *
 * PRD §14 asks for a map of sheet dependencies, named ranges, data tables,
 * formula sources, output consumers and compatibility risks. Deriving it from
 * the code rather than writing it by hand is the only way it stays true after
 * the third change.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SHEETS, SHEET_ORDER, OPTIONAL_SHEETS, LISTS, SETTINGS_FIELDS, CAPACITY, COST_MAPPING, PRODUCT,
} from '../config.js';
import { makeSpecs, buildRollups, NAV_LINKS } from '../build-command-center.js';
import { buildRef } from '../lib/a1.js';
import { formulaContext } from '../lib/render-tracker.js';
import { attentionBoard } from '../sheets/pages.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Every sheet named by any formula on `spec`, other than the sheet itself. */
function dependencies(spec, ref, rollups) {
  const named = new Set();
  const row = spec.firstDataRow;
  const context = formulaContext({ ref, row, sheetName: spec.name, rollups });
  for (const column of spec.columns) {
    if (column.kind !== 'formula') continue;
    const formula = column.formula(context);
    for (const m of formula.matchAll(/'([^']+)'!/g)) {
      if (m[1] !== spec.name) named.add(m[1]);
    }
    for (const name of SETTINGS_FIELDS) {
      if (formula.includes(name.name)) named.add(SHEETS.SETTINGS);
    }
  }
  return [...named].sort();
}

export async function writeArchitectureMap() {
  const specs = makeSpecs();
  const ref = buildRef(specs);
  const rollups = buildRollups(ref, specs);
  const byName = new Map(specs.map((s) => [s.name, s]));

  const reads = new Map();
  const readBy = new Map();
  for (const spec of specs) {
    const deps = dependencies(spec, ref, rollups);
    reads.set(spec.name, deps);
    for (const dep of deps) {
      if (!readBy.has(dep)) readBy.set(dep, []);
      readBy.get(dep).push(spec.name);
    }
  }

  const board = attentionBoard(ref);
  const dashboardReads = new Set();
  for (const item of board) {
    for (const m of item.count.matchAll(/'([^']+)'!/g)) dashboardReads.add(m[1]);
  }
  for (const sheet of [SHEETS.BUDGET, SHEETS.GIFTS, SHEETS.ORDERS, SHEETS.CALENDAR,
    SHEETS.TRADITIONS, SHEETS.VISION, SHEETS.SETTINGS]) dashboardReads.add(sheet);

  const lines = [];
  const L = (...s) => lines.push(...s);

  L(`# Architecture map`, '',
    `${PRODUCT.trademarkName}, edition ${PRODUCT.edition}. Generated from the`,
    'specifications by `node src/qa/architecture-map.mjs` — if it disagrees with the',
    'workbook, the workbook changed and this file has not been regenerated.', '');

  L('## The shape of it', '',
    'Five layers, in the order the buyer meets them.', '',
    '| Layer | Sheets | Rule |',
    '| --- | --- | --- |',
    `| Onboarding | ${[SHEETS.COVER, SHEETS.START, SHEETS.SETTINGS].join(', ')} | Explain the product, collect the global inputs, guide the setup. |`,
    `| Source inputs | ${specs.filter((s) => ![SHEETS.BUDGET].includes(s.name)).length} trackers | Cream cells only. Every record has a stable ID. |`,
    `| Calculation | Hidden helper columns, ${SHEETS.LISTS}, ${SHEETS.QA} | No magic numbers. Every rule reads SETTINGS or a visible mapping. |`,
    `| Decision outputs | ${SHEETS.DASHBOARD}, ${SHEETS.BUDGET} | Show change, variance, exception and next action. |`,
    `| Archive | ${SHEETS.MEMORIES}, ${SHEETS.NEXT_YEAR}, ${SHEETS.ARCHIVE} | Preserve what matters; make next year easier. |`, '');

  L('## Sheet dependencies', '',
    'What each tracker reads, and who reads it back. A sheet with nothing in the',
    '"reads" column is pure input; one with nothing in "read by" is a leaf, and can',
    'be hidden with no effect on any total.', '',
    '| Sheet | Rows | Fields | Reads | Read by |',
    '| --- | ---: | ---: | --- | --- |');
  for (const name of SHEET_ORDER) {
    const spec = byName.get(name);
    if (!spec) continue;
    const consumers = [...new Set([...(readBy.get(name) ?? []),
      ...(dashboardReads.has(name) ? [SHEETS.DASHBOARD] : []),
      ...(spec.cost || spec.refund || spec.idColumn ? [SHEETS.QA] : [])])].sort();
    L(`| ${name}${OPTIONAL_SHEETS.includes(name) ? ' *(optional)*' : ''} | ${spec.rows} | ${spec.columns.length} | ${(reads.get(name) ?? []).join(', ') || '—'} | ${consumers.join(', ') || '—'} |`);
  }
  L('');

  L('## How costs reach the budget', '',
    'The §7.3 contract. Every sheet below carries a **Budget category** column; the',
    'MASTER BUDGET adds up everything tagged with each category. A cost whose',
    'category the budget does not recognise is counted on QUALITY CHECK — it is',
    'never silently included and never silently dropped.', '',
    '| Source sheet | Planned column | Actual column | Suggested category |',
    '| --- | --- | --- | --- |');
  for (const spec of specs.filter((s) => s.cost)) {
    const mapping = COST_MAPPING.find((m) => m.sheet === spec.name);
    L(`| ${spec.name} | \`${spec.cost.planned}\` | \`${spec.cost.actual}\` | ${mapping?.defaultCategory ?? '—'} |`);
  }
  const refund = specs.find((s) => s.refund);
  L('', `Refunds come from **${refund.name}** (\`${refund.refund.amount}\`) and are subtracted`,
    'from the actual figure for their category — but only once the refund is marked',
    'received.', '',
    `**${SHEETS.ORDERS} is deliberately absent.** An order records the parcel; the gift`,
    'row records the money. Counting both would double the season\'s spending.', '');

  L('## Named ranges', '',
    '| Name | Points at | Used by |',
    '| --- | --- | --- |');
  for (const field of SETTINGS_FIELDS) {
    L(`| \`${field.name}\` | ${SHEETS.SETTINGS}, ${field.label} | ${field.key === 'EDITION' ? 'the cover' : 'formulas across the workbook'} |`);
  }
  for (const name of ['Vision_Theme', 'Vision_Feelings', 'Vision_Colours', 'Vision_Scent', 'Vision_Protect']) {
    L(`| \`${name}\` | ${SHEETS.VISION} | the dashboard's season strip |`);
  }
  L(`| \`QA_Exceptions\` | ${SHEETS.QA}, the total | the dashboard's attention board |`);
  L(`| \`List_*\` (${Object.keys(LISTS).length}) | ${SHEETS.LISTS}, one column each | every dropdown in the workbook |`, '');

  L('## The dashboard\'s sources', '',
    'Every figure on the dashboard, and where it comes from.', '',
    '| Attention row | Counts |', '| --- | --- |');
  for (const item of board) {
    L(`| ${item.label} | ${item.sheet} |`);
  }
  L('');

  L('## Row capacity', '',
    'The documented default. START HERE explains how to extend a table.', '',
    '| Sheet | Rows |', '| --- | ---: |');
  for (const [name, rows] of Object.entries(CAPACITY)) L(`| ${name} | ${rows} |`);
  L('');

  L('## Compatibility risks, and what was done about each', '',
    '| Risk | Decision |', '| --- | --- |',
    '| `XLOOKUP` does not import reliably into Google Sheets | Every lookup is `INDEX`/`MATCH`. A test fails the build if `XLOOKUP` appears. |',
    '| `INDIRECT` and `OFFSET` are volatile and slow a large workbook | Neither is used anywhere. Enforced by the same test. |',
    '| Dynamic-array functions (`FILTER`, `SORTBY`, `UNIQUE`) do not exist in older Excel | Not used. Ranking is done with `SMALL`/`LARGE` over a helper column, which is ordinary and portable. |',
    '| Whole-column ranges (`A:A`) recalculate the entire sheet | Every range is bounded to its documented capacity. Enforced by test. |',
    '| Excel tables and structured references convert unpredictably on import | Not used. Bounded named ranges instead. |',
    '| Google Sheets does not import Excel sheet protection | The Sheets edition ships unprotected on purpose, and says so. The colour key does the work. |',
    '| A chart tied to a moving range breaks when rows are added | Both charts read a fixed block on the dashboard that a formula fills. |',
    '| Cormorant Garamond is not installed on most machines | The workbook ships set in Georgia, which is. The documentation explains how to swap. |',
    '| An empty cell read through `INDEX` returns 0, which a date format renders as January 1900 | Every lookup guards for it. A test asserts every derived cell is blank-guarded. |', '');

  L('## Navigation', '',
    `Every visible sheet opens with the same strip: ${NAV_LINKS.map((l) => l.label).join(', ')}.`,
    `${SHEETS.INDEX} lists all ${SHEET_ORDER.length} sheets with a purpose and a link.`,
    'Dashboard attention rows link to the sheet that resolves them.', '');

  const path = join(ROOT, 'docs', 'ARCHITECTURE_MAP.md');
  await writeFile(path, `${lines.join('\n')}\n`);
  return path;
}

if (process.argv[1] && process.argv[1].endsWith('architecture-map.mjs')) {
  console.log(`  wrote ${await writeArchitectureMap()}`);
}
