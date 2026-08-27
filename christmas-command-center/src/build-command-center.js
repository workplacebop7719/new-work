/**
 * The single deterministic generator (PRD §11.1).
 *
 * `node src/build-command-center.js` writes both editions into /dist. Nothing
 * in /src is touched by a build, and the same inputs always produce the same
 * workbook, so the product can be regenerated and maintained rather than
 * hand-repaired.
 */
import ExcelJS from 'exceljs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  SHEETS, SHEET_ORDER, OPTIONAL_SHEETS, LISTS, LAYOUT, TOKENS, UI_FONT, DISPLAY_FONT,
  SETTINGS_FIELDS, SETTINGS_LAYOUT, SETTINGS_DEFAULTS, CURRENCY_SYMBOL, moneyFormat,
  EDITIONS, PRODUCT, COST_MAPPING,
} from './config.js';
import { buildRef, colLetter, quoteSheet } from './lib/a1.js';
import { prepare } from './lib/prepare.js';
import { renderTracker } from './lib/render-tracker.js';
import { fill, thin, box, bodyText, sectionHeading, labelledInput } from './lib/style.js';
import {
  renderCover, renderStartHere, renderSettings, renderDashboard, renderIndex, renderLists,
  LISTS_LAYOUT,
} from './sheets/pages.js';
import { renderQualityCheck } from './sheets/quality-check.js';
import { injectCharts } from './lib/charts.js';

import * as peopleSheets from './sheets/trackers-people.js';
import * as homeSheets from './sheets/trackers-home.js';
import * as tableSheets from './sheets/trackers-table.js';
import * as seasonSheets from './sheets/trackers-season.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '..', 'dist');

const RAW_SPECS = [
  ...Object.values(peopleSheets), ...Object.values(homeSheets),
  ...Object.values(tableSheets), ...Object.values(seasonSheets),
].filter((s) => s && s.name && s.columns);

/**
 * Builds the prepared specs for one run. `overrides` lets the QA runner swap
 * the sample rows for a scenario's data without touching the generator — the
 * scenario workbooks then go through exactly the code path the product does.
 */
export function makeSpecs(overrides = {}) {
  const raw = RAW_SPECS.map((spec) => {
    const override = overrides[spec.name];
    if (!override) return spec;
    const next = { ...spec };
    if ('samples' in override) next.samples = override.samples;
    if ('seed' in override) next.seed = override.seed;
    if (override.fill) next.samples = expand(spec, override.fill);
    return next;
  });
  return prepare(raw);
}

/** Fills a tracker to `count` rows by cycling its samples with fresh IDs. */
function expand(spec, count) {
  const base = spec.samples ?? [];
  if (base.length === 0 || !spec.idColumn) return base;
  const prefix = String(base[0][spec.idColumn] ?? 'Z-1').split('-')[0];
  return Array.from({ length: count }, (_, i) => ({
    ...base[i % base.length],
    [spec.idColumn]: spec.idColumn === 'year'
      ? 1900 + i
      : `${prefix}-${String(i + 1).padStart(4, '0')}`,
  }));
}

const SPECS = makeSpecs();

/** §5 purposes, shown on SHEET INDEX. */
const PURPOSE = {
  [SHEETS.COVER]: 'Where the workbook introduces itself, and the licence reminder.',
  [SHEETS.START]: 'Six steps to set up, the colour key, and how to put the year away.',
  [SHEETS.SETTINGS]: 'Year, dates, currency, thresholds. Everything else reads from here.',
  [SHEETS.DASHBOARD]: 'Where the season stands today, and what needs you next.',
  [SHEETS.VISION]: 'What you want this Christmas to feel like, and what you will protect.',
  [SHEETS.PROFILES]: 'Sizes, preferences, monograms and what you have given before.',
  [SHEETS.PEOPLE]: 'Who you are giving to and what you intend to spend on each of them.',
  [SHEETS.BUDGET]: 'Budget by category, with planned and actual traced to their sources.',
  [SHEETS.GIFTS]: 'Every gift from first idea to wrapped and hidden.',
  [SHEETS.STOCKINGS]: 'The small things, and what they add up to.',
  [SHEETS.ORDERS]: 'What is on its way and what needs chasing.',
  [SHEETS.RETURNS]: 'What went back, and the refunds you are still owed.',
  [SHEETS.CALENDAR]: 'Every dated thing in one table. The dashboard reads this sheet.',
  [SHEETS.VENDORS]: 'Florists, caterers, cleaners: quotes, deposits and balances.',
  [SHEETS.DECOR]: 'What you own, where it is stored, and what needs replacing.',
  [SHEETS.DECOR_PLAN]: 'Room by room: the intention, the pieces, the install date.',
  [SHEETS.TABLESCAPE]: 'Linen, china, glass, flowers and candles, per table.',
  [SHEETS.MEALS]: 'Every dish, its cook, and when it can be made ahead.',
  [SHEETS.GROCERIES]: 'One shopping list, gathered from the meal plan.',
  [SHEETS.RECIPES]: 'Where each recipe lives and whose it was.',
  [SHEETS.HOSTING]: 'Guests, dietary needs, sleeping and arrivals.',
  [SHEETS.TRADITIONS]: 'The rituals and outings, and whether they were worth it.',
  [SHEETS.MEDIA]: 'Your own watch and listen list. Nothing is preloaded.',
  [SHEETS.CARDS]: 'The card list, addresses, postage and what has gone out.',
  [SHEETS.WARDROBE]: 'What is being worn where, and what still needs collecting.',
  [SHEETS.TRAVEL]: 'Journeys, bookings, transfers and what to pack.',
  [SHEETS.CLEANING]: 'The house, zone by zone, before anybody arrives.',
  [SHEETS.DONATIONS]: 'The giving you intend to do, and whether it happened.',
  [SHEETS.ADVENT]: 'A quiet page for December, entirely yours to write.',
  [SHEETS.MEMORIES]: 'The part worth keeping. Fill it in as you go.',
  [SHEETS.NEXT_YEAR]: 'Written in January, read next September.',
  [SHEETS.ARCHIVE]: 'One line a year, so the seasons can be compared.',
  [SHEETS.INDEX]: 'This list.',
  [SHEETS.LISTS]: 'The values behind every dropdown, and how costs reach the budget.',
  [SHEETS.QA]: 'Everything the workbook cannot reconcile on its own.',
};

const SUPPORT_SHEETS = new Set([SHEETS.INDEX, SHEETS.LISTS, SHEETS.QA]);

const NAV_LINKS = [
  { label: 'Dashboard', sheet: SHEETS.DASHBOARD },
  { label: 'Start here', sheet: SHEETS.START },
  { label: 'Calendar', sheet: SHEETS.CALENDAR },
  { label: 'Budget', sheet: SHEETS.BUDGET },
  { label: 'All sheets', sheet: SHEETS.INDEX },
];

/* ------------------------------------------------------------------ *
 * Rollups: the §7.3 mapping, compiled into the MASTER BUDGET formulas.
 * ------------------------------------------------------------------ */
function buildRollups(ref, specs) {
  const costSpecs = specs.filter((s) => s.cost);
  const refundSpec = specs.find((s) => s.refund);
  const roll = (field) => (categoryCell) => costSpecs
    .map((s) => `SUMIFS(${ref.range(s.name, s.cost[field])},${ref.range(s.name, s.cost.category)},${categoryCell})`)
    .join('+');
  return {
    plannedRollup: roll('planned'),
    actualRollup: (categoryCell) =>
      `${roll('actual')(categoryCell)}-SUMIFS(${ref.range(refundSpec.name, refundSpec.refund.amount)},${ref.range(refundSpec.name, refundSpec.refund.category)},${categoryCell})`,
  };
}

/** The upcoming Christmas: this year's until it has passed, then next year's. */
export function upcomingChristmasYear(today = new Date()) {
  const year = today.getUTCFullYear();
  const christmas = Date.UTC(year, 11, 25);
  return Date.UTC(year, today.getUTCMonth(), today.getUTCDate()) > christmas ? year + 1 : year;
}

export async function buildWorkbook(editionKey, {
  today = new Date(), overrides = {}, settings = {}, outPath, charts = true,
} = {}) {
  const specs = makeSpecs(overrides);
  const byName = new Map(specs.map((s) => [s.name, s]));
  const edition = EDITIONS[editionKey];
  const symbol = CURRENCY_SYMBOL[SETTINGS_DEFAULTS.CURRENCY];
  const money = moneyFormat(symbol);
  const year = upcomingChristmasYear(today);

  const wb = new ExcelJS.Workbook();
  wb.creator = PRODUCT.seller;
  wb.lastModifiedBy = PRODUCT.seller;
  wb.created = today;
  wb.modified = today;
  wb.title = PRODUCT.name;
  wb.subject = 'Christmas planning workbook';
  wb.keywords = PRODUCT.keywords;
  wb.description = `${PRODUCT.promise} ${edition.label}, edition ${PRODUCT.edition}.`;
  wb.category = 'Planner';
  wb.company = PRODUCT.seller;
  wb.calcProperties = { fullCalcOnLoad: true };

  const ref = buildRef(specs);
  const rollups = buildRollups(ref, specs);
  const ctx = { ref, symbol, money, edition, rollups, navLinks: NAV_LINKS, product: PRODUCT };

  const sheets = new Map();
  for (const name of SHEET_ORDER) {
    const ws = wb.addWorksheet(name, { views: [{ showGridLines: false }] });
    sheets.set(name, ws);
  }

  /* --- Page sheets ------------------------------------------------- */
  renderCover(sheets.get(SHEETS.COVER), ctx);
  renderStartHere(sheets.get(SHEETS.START), ctx);
  const settingsCells = renderSettings(sheets.get(SHEETS.SETTINGS), ctx);
  const listRanges = renderLists(sheets.get(SHEETS.LISTS), ctx);

  /* --- Defined names, before any formula is evaluated -------------- */
  for (const [, meta] of Object.entries(settingsCells)) {
    addName(wb, meta.field.name, SHEETS.SETTINGS, `$${colLetter(meta.col)}$${meta.row}`);
  }
  for (const [name, range] of Object.entries(listRanges)) {
    addName(wb, `List_${name}`, SHEETS.LISTS,
      `$${colLetter(range.col)}$${range.first}:$${colLetter(range.col)}$${range.last}`);
  }

  /* --- Trackers ---------------------------------------------------- */
  for (const spec of specs) {
    renderTracker(sheets.get(spec.name), spec, ctx);
  }
  renderVisionFields(sheets.get(SHEETS.VISION), wb, ctx, byName);

  /* --- Sheets that read the trackers ------------------------------- */
  const qa = renderQualityCheck(sheets.get(SHEETS.QA), ctx, specs);
  addName(wb, 'QA_Exceptions', SHEETS.QA, qa.totalCell.replace(/([A-Z]+)(\d+)/, '$$$1$$$2'));
  renderDashboard(sheets.get(SHEETS.DASHBOARD), ctx);
  renderIndex(sheets.get(SHEETS.INDEX), ctx, SHEET_ORDER.map((name) => ({
    name, purpose: PURPOSE[name], support: SUPPORT_SHEETS.has(name),
  })));

  /* --- Seed SETTINGS ----------------------------------------------- */
  seedSettings(sheets.get(SHEETS.SETTINGS), settingsCells, { year, settings });

  /* --- Validation, protection -------------------------------------- */
  applyValidation(sheets, specs, listRanges);
  if (edition.protect) await protectSheets(sheets);

  const path = outPath ?? join(DIST, edition.file);
  await mkdir(dirname(path), { recursive: true });
  await wb.xlsx.writeFile(path);
  if (charts && process.env.CCC_NO_CHARTS !== '1') await injectCharts(path, { symbol, edition });
  return { path, edition, year, specs };
}

/* ------------------------------------------------------------------ *
 * SEASON VISION's five labelled fields (§5).
 * ------------------------------------------------------------------ */
function renderVisionFields(ws, wb, ctx, byName) {
  const spec = byName.get(SHEETS.VISION);
  sectionHeading(ws, { row: spec.fieldsFirstRow - 1, col: 2, columnCount: 8, text: 'The season in five lines' });
  spec.fields.forEach((field, i) => {
    const row = spec.fieldsFirstRow + i;
    ws.getRow(row).height = 22;
    const cell = labelledInput(ws, {
      row, labelCol: 2, valueCol: 3, label: field.label, locked: false,
    });
    ws.mergeCells(row, 3, row, 6);
    cell.value = field.sample ? `${field.sample}` : undefined;
    if (field.sample) {
      cell.font = { name: UI_FONT, size: 11, italic: true, color: { argb: TOKENS.MUTED } };
      cell.fill = fill(TOKENS.SOFT_AMBER);
    }
    addName(wb, field.name, SHEETS.VISION, `$C$${row}`);
  });
  ws.getColumn(2).width = 34;
  bodyText(ws, {
    row: spec.fieldsFirstRow + spec.fields.length, col: 2,
    text: 'The amber lines above are examples — write over them. The dashboard shows the theme, the feeling and the first priority below.',
    size: 9, colour: TOKENS.MUTED, wrap: true,
  });
  void ctx;
}

/* ------------------------------------------------------------------ *
 * Defined names
 * ------------------------------------------------------------------ */
function addName(wb, name, sheet, address) {
  wb.definedNames.add(`${quoteSheet(sheet)}!${address}`, name);
}

/* ------------------------------------------------------------------ *
 * SETTINGS seed values (§6.1 defaults)
 * ------------------------------------------------------------------ */
function seedSettings(ws, cells, { year, settings = {} }) {
  const value = { ...SETTINGS_DEFAULTS, ...settings };
  const at = (key) => ws.getRow(cells[key].row).getCell(cells[key].col);
  at('YEAR').value = settings.YEAR ?? year;
  at('CHRISTMAS_DATE').value = settings.CHRISTMAS_DATE ?? new Date(Date.UTC(settings.YEAR ?? year, 11, 25));
  at('SEASON_START').value = settings.SEASON_START
    ?? new Date(Date.UTC(settings.YEAR ?? year, value.SEASON_START_MONTH - 1, value.SEASON_START_DAY));
  at('CURRENCY').value = value.CURRENCY;
  at('HOUSEHOLD').value = value.HOUSEHOLD || null;
  at('WARN_THRESHOLD').value = value.WARN_THRESHOLD;
  at('SHIP_WINDOW').value = value.SHIP_WINDOW;
  at('LOW_STOCK').value = value.LOW_STOCK;
  at('WEEK_START').value = value.WEEK_START;
  at('EDITION').value = value.EDITION;
}

/* ------------------------------------------------------------------ *
 * §9 Data validation
 * ------------------------------------------------------------------ */
function applyValidation(sheets, specs, listRanges) {
  for (const spec of specs) {
    const ws = sheets.get(spec.name);
    const firstCol = spec.firstColumn ?? 2;
    const first = spec.firstDataRow;
    const last = first + spec.rows - 1;
    spec.columns.forEach((column, i) => {
      if (column.kind === 'formula') return;
      const letter = colLetter(firstCol + i);
      const range = `${letter}${first}:${letter}${last}`;
      const head = `${letter}${first}`;

      if (column.list && listRanges[column.list]) {
        ws.dataValidations.add(range, {
          type: 'list', allowBlank: true, formulae: [`=List_${column.list}`],
          showErrorMessage: true, errorStyle: 'warning',
          errorTitle: 'Not one of the usual values',
          error: `This column normally uses a value from the ${column.list} list on LISTS. You can keep what you typed, or add it to the list so it appears in the dropdown.`,
        });
      } else if (['money', 'int', 'percent'].includes(column.type)) {
        ws.dataValidations.add(range, {
          type: 'custom', allowBlank: true, formulae: [`=OR(${head}="",ISNUMBER(${head}))`],
          showErrorMessage: true, errorStyle: 'warning',
          errorTitle: 'That looks like text',
          error: 'Type the number on its own — no currency symbol and no words. The column adds the symbol for you.',
        });
      } else if (['date', 'time'].includes(column.type)) {
        ws.dataValidations.add(range, {
          type: 'custom', allowBlank: true, formulae: [`=OR(${head}="",ISNUMBER(${head}))`],
          showErrorMessage: true, errorStyle: 'warning',
          errorTitle: 'That is not a date yet',
          error: 'Type a real date, so the workbook can count days with it. "Before Christmas" cannot be sorted.',
        });
      }
    });
  }
}

/* ------------------------------------------------------------------ *
 * §9 Protection. No password: the lock exists to protect calculations
 * from a stray keystroke, not to keep the buyer out of their own file.
 * ------------------------------------------------------------------ */
async function protectSheets(sheets) {
  for (const [, ws] of sheets) {
    await ws.protect('', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: true,
      formatColumns: true,
      formatRows: true,
      insertRows: true,
      insertColumns: false,
      deleteRows: true,
      deleteColumns: false,
      sort: true,
      autoFilter: true,
      pivotTables: false,
      objects: false,
      scenarios: false,
    });
  }
}

export { SPECS, PURPOSE, NAV_LINKS, SUPPORT_SHEETS, buildRollups };

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */
if (process.argv[1] && process.argv[1].endsWith('build-command-center.js')) {
  const results = [];
  for (const key of Object.keys(EDITIONS)) {
    results.push(await buildWorkbook(key));
  }
  const manifest = {
    product: PRODUCT.name,
    edition: PRODUCT.edition,
    builtAt: new Date().toISOString(),
    christmasYear: results[0].year,
    sheets: SHEET_ORDER.length,
    trackers: SPECS.length,
    fields: SPECS.reduce((n, s) => n + s.columns.length, 0),
    files: results.map((r) => r.path),
  };
  await writeFile(join(DIST, 'build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const r of results) console.log(`  wrote ${r.path}`);
  console.log(`  ${manifest.sheets} sheets · ${manifest.trackers} trackers · ${manifest.fields} fields · Christmas ${manifest.christmasYear}`);
}
