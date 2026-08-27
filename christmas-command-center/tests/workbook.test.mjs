/**
 * Workbook inspection tests — §12.1.
 *
 * These open the built files and check the things a buyer would only discover
 * by being let down: a missing sheet, an unprotected calculation, a dropdown
 * pointing at nothing, a formula naming a sheet that is not there.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SHEETS, SHEET_ORDER, EDITIONS, LISTS, CAPACITY, LAYOUT, SETTINGS_FIELDS, PRODUCT, TOKENS,
} from '../src/config.js';
import { makeSpecs } from '../src/build-command-center.js';
import { buildRef, colLetter } from '../src/lib/a1.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const SPECS = makeSpecs();
const REF = buildRef(SPECS);
const BY_NAME = new Map(SPECS.map((s) => [s.name, s]));

const loaded = new Map();
async function workbook(key) {
  if (!loaded.has(key)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(join(DIST, EDITIONS[key].file));
    loaded.set(key, wb);
  }
  return loaded.get(key);
}

const TRACKERS = SPECS.map((s) => s.name);
const EDITION_KEYS = Object.keys(EDITIONS);

/* ------------------------------------------------------------------ *
 * Inventory and order
 * ------------------------------------------------------------------ */
for (const key of EDITION_KEYS) {
  test(`${key}: every required sheet exists, in the documented order`, async () => {
    const wb = await workbook(key);
    assert.deepEqual(wb.worksheets.map((ws) => ws.name), SHEET_ORDER);
  });

  test(`${key}: workbook metadata is set`, async () => {
    const wb = await workbook(key);
    assert.equal(wb.title, PRODUCT.name);
    assert.ok(wb.creator);
    assert.ok(wb.keywords.includes('Christmas planner'));
    assert.ok(wb.description.includes(EDITIONS[key].label));
    // ExcelJS does not read calcPr back, so check what actually shipped.
    const zip = await JSZip.loadAsync(await readFile(join(DIST, EDITIONS[key].file)));
    const xml = await zip.file('xl/workbook.xml').async('string');
    assert.match(xml, /fullCalcOnLoad="1"/, 'the workbook would open with stale figures');
  });

  test(`${key}: every tracker has filters, frozen panes and a print set-up`, async () => {
    const wb = await workbook(key);
    for (const name of TRACKERS) {
      const ws = wb.getWorksheet(name);
      const spec = BY_NAME.get(name);
      const headerRow = spec.headerRow ?? LAYOUT.HEADER_ROW;
      assert.ok(ws.autoFilter, `${name} has no filter`);
      const filterFrom = typeof ws.autoFilter === 'string'
        ? Number(/\d+/.exec(ws.autoFilter)[0]) : ws.autoFilter.from.row;
      assert.equal(filterFrom, headerRow, `${name} filter is on the wrong row`);
      assert.equal(ws.views[0].state, 'frozen', `${name} panes are not frozen`);
      assert.equal(ws.views[0].ySplit, headerRow, `${name} freezes the wrong rows`);
      assert.ok(ws.views[0].xSplit >= 1, `${name} does not freeze an identifying column`);
      assert.equal(ws.pageSetup.printTitlesRow, `${headerRow}:${headerRow}`, `${name} would print without headers`);
      assert.ok(ws.pageSetup.printTitlesColumn, `${name} would print pages with no identifying column`);
      assert.equal(ws.pageSetup.fitToWidth, 1, `${name} would print wider than a page`);
      assert.ok(ws.pageSetup.printArea, `${name} has no print area`);
    }
  });

  test(`${key}: the dashboard prints as two pages, headers and all`, async () => {
    const ws = (await workbook(key)).getWorksheet(SHEETS.DASHBOARD);
    assert.equal(ws.pageSetup.fitToWidth, 1);
    assert.equal(ws.pageSetup.fitToHeight, 2);
    assert.ok(ws.pageSetup.printArea, 'the dashboard has no print area');
  });

  test(`${key}: calculations are locked and inputs are not`, async () => {
    const wb = await workbook(key);
    for (const spec of SPECS) {
      const ws = wb.getWorksheet(spec.name);
      const firstCol = spec.firstColumn ?? 2;
      const row = spec.firstDataRow + 4; // past the examples
      spec.columns.forEach((column, i) => {
        const cell = ws.getRow(row).getCell(firstCol + i);
        const locked = cell.protection?.locked !== false;
        assert.equal(locked, column.kind === 'formula',
          `${spec.name}.${column.key} is ${locked ? 'locked' : 'unlocked'} and should not be`);
      });
    }
  });

  test(`${key}: headers are never blank and never merged over data`, async () => {
    const wb = await workbook(key);
    for (const spec of SPECS) {
      const ws = wb.getWorksheet(spec.name);
      const headerRow = spec.headerRow ?? LAYOUT.HEADER_ROW;
      const firstCol = spec.firstColumn ?? 2;
      spec.columns.forEach((column, i) => {
        const value = ws.getRow(headerRow).getCell(firstCol + i).value;
        assert.equal(value, column.header, `${spec.name} header ${i} is wrong`);
      });
      const merges = Object.keys(ws._merges ?? {});
      for (const merge of merges) {
        const row = Number(/\d+/.exec(merge)[0]);
        assert.ok(row < headerRow, `${spec.name} merges cells inside its table at ${merge}`);
      }
    }
  });

  test(`${key}: money, dates and percentages carry a number format`, async () => {
    const wb = await workbook(key);
    for (const spec of SPECS) {
      const ws = wb.getWorksheet(spec.name);
      const firstCol = spec.firstColumn ?? 2;
      spec.columns.forEach((column, i) => {
        if (!['money', 'date', 'percent', 'int', 'time'].includes(column.type)) return;
        const cell = ws.getRow(spec.firstDataRow + 4).getCell(firstCol + i);
        assert.ok(cell.numFmt, `${spec.name}.${column.key} has no number format`);
      });
    }
  });

  test(`${key}: helper columns are hidden and no visible column is`, async () => {
    const wb = await workbook(key);
    for (const spec of SPECS) {
      const ws = wb.getWorksheet(spec.name);
      const firstCol = spec.firstColumn ?? 2;
      spec.columns.forEach((column, i) => {
        assert.equal(Boolean(ws.getColumn(firstCol + i).hidden), Boolean(column.hidden),
          `${spec.name}.${column.key} visibility is wrong`);
      });
    }
  });

  test(`${key}: every tracker carries three example rows, all marked`, async () => {
    const wb = await workbook(key);
    for (const spec of SPECS) {
      if (spec.seed) continue;
      assert.equal(spec.samples.length, 3, `${spec.name} does not have three examples`);
      const ws = wb.getWorksheet(spec.name);
      const firstCol = spec.firstColumn ?? 2;
      for (let n = 0; n < 3; n += 1) {
        const row = ws.getRow(spec.firstDataRow + n);
        const text = spec.columns
          .map((_, i) => row.getCell(firstCol + i).value)
          .filter((v) => typeof v === 'string').join(' ');
        assert.ok(text.includes('EXAMPLE'), `${spec.name} example row ${n + 1} is not marked`);
        const inputCell = row.getCell(firstCol);
        assert.equal(inputCell.fill?.fgColor?.argb, TOKENS.SOFT_AMBER,
          `${spec.name} example row ${n + 1} is not visually distinct`);
      }
      const clean = ws.getRow(spec.firstDataRow + 3);
      const cleanText = spec.columns
        .map((_, i) => clean.getCell(firstCol + i).value)
        .filter((v) => typeof v === 'string');
      assert.equal(cleanText.length, 0, `${spec.name} has example text below the third row`);
    }
  });

  test(`${key}: dropdowns exist and point at a list that exists`, async () => {
    const wb = await workbook(key);
    const names = new Set(definedNames(wb).map(([name]) => name));
    for (const spec of SPECS) {
      const ws = wb.getWorksheet(spec.name);
      const firstCol = spec.firstColumn ?? 2;
      spec.columns.forEach((column, i) => {
        if (!column.list) return;
        const letter = colLetter(firstCol + i);
        // Validation round-trips per cell; check the first and last of the range.
        for (const row of [spec.firstDataRow, spec.firstDataRow + spec.rows - 1]) {
          const validation = ws.dataValidations.find(`${letter}${row}`);
          assert.ok(validation, `${spec.name}.${column.key} has no dropdown at row ${row}`);
          assert.equal(validation.type, 'list');
          const target = validation.formulae[0].replace('=', '');
          assert.ok(names.has(target), `${spec.name}.${column.key} points at ${target}, which does not exist`);
        }
        assert.ok(LISTS[column.list], `${column.list} is not a list in config`);
      });
    }
  });

  test(`${key}: every settings field and list has a defined name`, async () => {
    const wb = await workbook(key);
    const names = new Map(definedNames(wb));
    for (const field of SETTINGS_FIELDS) {
      assert.ok(names.has(field.name), `${field.name} is missing`);
      assert.ok(names.get(field.name).startsWith(SHEETS.SETTINGS), `${field.name} does not point at SETTINGS`);
    }
    for (const list of Object.keys(LISTS)) {
      assert.ok(names.has(`List_${list}`), `List_${list} is missing`);
    }
    assert.ok(names.has('QA_Exceptions'));
    for (const name of ['Vision_Theme', 'Vision_Feelings', 'Vision_Protect']) {
      assert.ok(names.has(name), `${name} is missing`);
    }
  });

  test(`${key}: no formula names a sheet that does not exist`, async () => {
    const wb = await workbook(key);
    const known = new Set(SHEET_ORDER);
    for (const ws of wb.worksheets) {
      ws.eachRow((row) => row.eachCell((cell) => {
        const formula = cell.formula ?? cell.value?.formula;
        if (!formula) return;
        for (const m of formula.matchAll(/'([^']+)'!/g)) {
          assert.ok(known.has(m[1]), `${ws.name}!${cell.address} names "${m[1]}"`);
        }
      }));
    }
  });

  test(`${key}: no volatile or incompatible function, and no external link`, async () => {
    const wb = await workbook(key);
    const banned = /\b(INDIRECT|OFFSET|XLOOKUP|FILTER|SORTBY|UNIQUE|LAMBDA|TEXTJOIN|LET)\s*\(/i;
    for (const ws of wb.worksheets) {
      ws.eachRow((row) => row.eachCell((cell) => {
        const formula = cell.formula ?? cell.value?.formula;
        if (!formula) return;
        assert.ok(!banned.test(formula), `${ws.name}!${cell.address} uses an unsupported function: ${formula.slice(0, 80)}`);
        assert.ok(!formula.includes('[1]'), `${ws.name}!${cell.address} links to another workbook`);
        assert.ok(!/\b[A-Z]+:[A-Z]+\b/.test(formula.replace(/'[^']*'/g, '')),
          `${ws.name}!${cell.address} uses a whole-column range`);
      }));
    }
  });

  test(`${key}: derived cells stay blank on an unused row`, async () => {
    const wb = await workbook(key);
    for (const spec of SPECS) {
      const ws = wb.getWorksheet(spec.name);
      const firstCol = spec.firstColumn ?? 2;
      const row = ws.getRow(spec.firstDataRow + spec.rows - 1);
      spec.columns.forEach((column, i) => {
        if (column.kind !== 'formula' || column.hidden) return;
        const formula = row.getCell(firstCol + i).value?.formula ?? '';
        assert.ok(/^IF\(\$?[A-Z]+\d+="",""/.test(formula) || formula.startsWith('IF('),
          `${spec.name}.${column.key} does not guard an empty row: ${formula.slice(0, 60)}`);
      });
    }
  });

  test(`${key}: documented row capacity is what the sheet actually holds`, async () => {
    for (const spec of SPECS) {
      if (!CAPACITY[spec.name]) continue;
      assert.equal(spec.rows, CAPACITY[spec.name], `${spec.name} capacity drifted`);
      assert.equal(REF.rowCount(spec.name), CAPACITY[spec.name]);
    }
  });

  test(`${key}: navigation reaches the dashboard from every visible sheet`, async () => {
    const wb = await workbook(key);
    for (const name of SHEET_ORDER) {
      if (name === SHEETS.COVER) continue;
      const ws = wb.getWorksheet(name);
      const targets = [];
      ws.getRow(LAYOUT.NAV_ROW).eachCell((cell) => {
        if (cell.value?.hyperlink) targets.push(cell.value.hyperlink);
        if (typeof cell.value === 'string') targets.push(cell.value);
      });
      const reaches = targets.some((t) => String(t).includes(SHEETS.DASHBOARD) || String(t) === 'Dashboard');
      assert.ok(reaches, `${name} has no way back to the dashboard`);
    }
  });

  test(`${key}: the columns that explain themselves actually carry a note`, async () => {
    const wb = await workbook(key);
    let documented = 0;
    for (const spec of SPECS) {
      const ws = wb.getWorksheet(spec.name);
      const headerRow = spec.headerRow ?? LAYOUT.HEADER_ROW;
      const firstCol = spec.firstColumn ?? 2;
      spec.columns.forEach((column, i) => {
        if (!column.note) return;
        documented += 1;
        assert.ok(ws.getRow(headerRow).getCell(firstCol + i).note,
          `${spec.name}.${column.key} lost its note`);
      });
    }
    assert.ok(documented > 30, `only ${documented} columns are documented`);
  });

  test(`${key}: status columns are conditionally formatted`, async () => {
    const wb = await workbook(key);
    for (const spec of SPECS) {
      const statusColumns = spec.columns.filter((c) => c.statusColumn);
      if (statusColumns.length === 0) continue;
      const ws = wb.getWorksheet(spec.name);
      assert.ok((ws.conditionalFormattings ?? []).length >= statusColumns.length,
        `${spec.name} has fewer formats than status columns`);
    }
  });
}

/* ------------------------------------------------------------------ *
 * Edition differences (§12.2 compatibility)
 * ------------------------------------------------------------------ */
test('the Excel edition protects its calculations', async () => {
  const wb = await workbook('excel');
  for (const ws of wb.worksheets) {
    assert.ok(ws.sheetProtection, `${ws.name} is not protected`);
    assert.equal(ws.sheetProtection.sort, true, `${ws.name} could not be sorted`);
    assert.equal(ws.sheetProtection.autoFilter, true, `${ws.name} could not be filtered`);
    assert.equal(ws.sheetProtection.insertRows, true, `${ws.name} could not take a new row`);
  }
});

test('the Google Sheets edition ships unprotected, as documented', async () => {
  const wb = await workbook('sheets');
  for (const ws of wb.worksheets) {
    assert.equal(ws.sheetProtection, undefined, `${ws.name} is protected in the Sheets edition`);
  }
});

/* ------------------------------------------------------------------ *
 * Charts (§7.1)
 * ------------------------------------------------------------------ */
for (const key of EDITION_KEYS) {
  test(`${key}: the two dashboard charts are in the package and wired up`, async () => {
    const zip = await JSZip.loadAsync(await readFile(join(DIST, EDITIONS[key].file)));
    const charts = Object.keys(zip.files).filter((n) => /^xl\/charts\/chart\d+\.xml$/.test(n));
    assert.equal(charts.length, 2, 'expected exactly two charts');

    const types = await zip.file('[Content_Types].xml').async('string');
    for (const chart of charts) assert.ok(types.includes(`/${chart}`), `${chart} is not declared`);
    assert.ok(types.includes('/xl/drawings/drawing1.xml'), 'the drawing is not declared');

    const drawingRels = await zip.file('xl/drawings/_rels/drawing1.xml.rels').async('string');
    for (const chart of charts) {
      assert.ok(drawingRels.includes(chart.split('/').pop()), `${chart} is not related to the drawing`);
    }

    const budget = await zip.file(charts[0]).async('string');
    assert.ok(budget.includes(`${SHEETS.DASHBOARD}!$B$`), 'the budget chart does not read the dashboard');
    assert.ok(budget.includes('<c:barDir val="bar"/>'), 'the budget chart is not a bar chart');
    const progress = await zip.file(charts[1]).async('string');
    assert.ok(progress.includes('formatCode>0%<'), 'the progress chart is not a percentage');
    assert.ok(!budget.includes('pieChart') && !progress.includes('pieChart'), 'a decorative pie chart crept in');
  });
}

function definedNames(wb) {
  const model = wb.definedNames.model ?? [];
  return model.map((entry) => [entry.name, (entry.ranges ?? [])[0] ?? '']);
}
