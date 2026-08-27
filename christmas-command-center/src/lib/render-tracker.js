/**
 * The generic tracker renderer.
 *
 * Every one of the twenty-eight tracker sheets is drawn by this function from
 * its specification, which is what keeps the workbook visually consistent and
 * makes a new field a one-line change (§11.1).
 */
import { TOKENS, LAYOUT, UI_FONT, SHEETS } from '../config.js';
import {
  fill, thin, headerCell, dataCell, navStrip, sheetTitle, sheetIntro, legendRow, bodyText,
} from './style.js';
import { colLetter } from './a1.js';

/** §9 conditional-format states. Every one of these words also reads as words. */
const STATE_WORDS = {
  alert: ['OVER BUDGET', 'OVERDUE', 'LATE', 'WINDOW CLOSED', 'BALANCE OVERDUE', 'PREP OVERDUE',
    'CHECK DUPLICATE', 'MISSING DATE', 'NOT FOUND'],
  attention: ['NEAR LIMIT', 'THIS WEEK', 'CLOSING SOON', 'NO TRACKING', 'LOW', 'AWAITING REFUND',
    'BALANCE DUE SOON', 'TO BUY', 'NO DATE', 'NO COUNT'],
  good: ['ON TRACK', 'COMPLETE', 'DONE', 'ARRIVED', 'SETTLED', 'AT BUDGET', 'IN STOCK',
    'BOUGHT', 'READY'],
  quiet: ['NOT SET', 'NOT STARTED', 'SCHEDULED', 'CLOSED', 'IN THE PANTRY', 'BALANCE OPEN'],
};

const STATE_STYLE = {
  alert: { fill: TOKENS.SOFT_ROSE, font: TOKENS.ROSE, bold: true },
  attention: { fill: TOKENS.SOFT_AMBER, font: TOKENS.INK, bold: false },
  good: { fill: TOKENS.MIST, font: TOKENS.PLUM_2, bold: false },
  quiet: { fill: TOKENS.PAPER, font: TOKENS.MUTED, bold: false },
};

/** Builds the formula context handed to every column's `formula` function. */
export function formulaContext({ ref, row, sheetName, rollups }) {
  return {
    row,
    sheet: sheetName,
    c: (key) => ref.local(sheetName, key, row),
    a: (key) => ref.localAnchored(sheetName, key, row),
    r: (sheet, key) => ref.range(sheet, key),
    cell: (sheet, key, atRow) => ref.cell(sheet, key, atRow),
    ...rollups,
  };
}

export function renderTracker(ws, spec, ctx) {
  const { ref, symbol, rollups, navLinks } = ctx;
  const headerRow_ = spec.headerRow ?? LAYOUT.HEADER_ROW;
  const firstCol = spec.firstColumn ?? 2;
  const columnCount = firstCol + spec.columns.length; // one spare column of right margin

  ws.getColumn(1).width = 2;
  spec.columns.forEach((column, i) => {
    const col = ws.getColumn(firstCol + i);
    col.width = column.width ?? 16;
    if (column.hidden) col.hidden = true;
  });
  ws.getColumn(columnCount).width = 2;

  navStrip(ws, { links: navLinks, columnCount, currentSheet: spec.name });
  sheetTitle(ws, { title: spec.name, columnCount });
  sheetIntro(ws, { intro: spec.intro, columnCount });
  legendRow(ws, { columnCount, note: spec.legend });

  const headerRow = ws.getRow(headerRow_);
  headerRow.height = 32;
  spec.columns.forEach((column, i) => headerCell(headerRow.getCell(firstCol + i), column.header));
  headerRow.getCell(1).fill = fill(TOKENS.PLUM);
  headerRow.getCell(columnCount).fill = fill(TOKENS.PLUM);

  const first = spec.firstDataRow;
  const last = first + spec.rows - 1;
  const seeded = spec.seed ?? [];
  const samples = spec.samples ?? [];

  for (let r = first; r <= last; r += 1) {
    const index = r - first;
    const seedRow = seeded[index];
    const sampleRow = index < samples.length && seeded.length === 0 ? samples[index] : undefined;
    const isSample = Boolean(sampleRow);
    const row = ws.getRow(r);
    row.height = 17;
    row.getCell(1).fill = fill(TOKENS.PAPER);
    row.getCell(columnCount).fill = fill(TOKENS.PAPER);

    spec.columns.forEach((column, i) => {
      const cell = row.getCell(firstCol + i);
      // A seeded table (MASTER BUDGET) is structure, not an example — but a
      // starting figure inside it is, and is marked cell by cell.
      const exampleCell = isSample
        || Boolean(seedRow && column.exampleValue && seedRow[column.key] !== undefined);
      dataCell(cell, { column, symbol, isSample: exampleCell });
      if (column.kind === 'formula') {
        cell.value = { formula: column.formula(formulaContext({ ref, row: r, sheetName: spec.name, rollups })) };
      } else {
        const source = seedRow ?? sampleRow;
        const raw = source?.[column.key];
        if (raw !== undefined && raw !== '') {
          cell.value = column.type === 'date' ? new Date(`${raw}T00:00:00Z`) : raw;
        }
      }
    });
  }

  // §9 filters on every tracker, and frozen titles and identifying columns.
  ws.autoFilter = {
    from: { row: headerRow_, column: firstCol },
    to: { row: last, column: firstCol + spec.columns.length - 1 },
  };
  ws.views = [{
    state: 'frozen',
    xSplit: firstCol - 1 + (spec.freezeColumns ?? 1),
    ySplit: headerRow_,
    zoomScale: 90,
    showGridLines: false,
  }];

  applyStatusFormats(ws, spec, firstCol, first, last);
  applyCellNotes(ws, spec, firstCol, headerRow_);

  if (spec.footnote) {
    bodyText(ws, { row: last + 2, col: firstCol, text: spec.footnote, size: 9, colour: TOKENS.MUTED });
  }
  if (spec.privacyNote) {
    const cell = bodyText(ws, { row: last + 3, col: firstCol, text: spec.privacyNote, size: 9, colour: TOKENS.ROSE });
    cell.font = { ...cell.font, bold: true };
  }

  /*
   * Printing a tracker.
   *
   * Fitting thirty columns onto one page width would print them at a fifth of
   * full size, which is not readable. Printing all of them at full size gives
   * twenty pages of spreadsheet. Neither is what anybody wants on paper, so the
   * print area is the ten identifying and decision columns — the ones you would
   * carry to the shops — fitted to one page width, which lands at around
   * eighty-five per cent rather than twenty. The header row and the identifying
   * column repeat on every page. START HERE says how to print the rest.
   */
  const visible = spec.columns.filter((c) => !c.hidden).length;
  const printCols = Math.min(spec.printColumns ?? 10, visible);
  const idLetter = colLetter(firstCol);
  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: `${headerRow_}:${headerRow_}`,
    printTitlesColumn: `${idLetter}:${colLetter(firstCol + (spec.freezeColumns ?? 1) - 1)}`,
    printArea: `${idLetter}$${LAYOUT.NAV_ROW}:${colLetter(firstCol + printCols - 1)}$${last}`,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
  };
  ws.headerFooter = { oddFooter: `&L${spec.name}&C&P of &N&R${ctx.product.trademarkName}` };
  ws.properties.tabColor = { argb: spec.optional ? TOKENS.GOLD : TOKENS.PLUM_2 };

  return { firstCol, columnCount, first, last, headerRow: headerRow_ };
}

function applyStatusFormats(ws, spec, firstCol, first, last) {
  spec.columns.forEach((column, i) => {
    if (!column.statusColumn) return;
    const letter = colLetter(firstCol + i);
    const range = `${letter}${first}:${letter}${last}`;
    let priority = 1;
    for (const state of ['alert', 'attention', 'good', 'quiet']) {
      const style = STATE_STYLE[state];
      for (const word of STATE_WORDS[state]) {
        ws.addConditionalFormatting({
          ref: range,
          rules: [{
            type: 'containsText',
            operator: 'containsText',
            text: word,
            priority,
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: style.fill } },
              font: { color: { argb: style.font }, bold: style.bold, name: UI_FONT, size: 10 },
            },
          }],
        });
        priority += 1;
      }
    }
  });
}

/** §10.2 — the explanation lives where the decision is made. */
function applyCellNotes(ws, spec, firstCol, headerRow_) {
  spec.columns.forEach((column, i) => {
    if (!column.note) return;
    const cell = ws.getRow(headerRow_).getCell(firstCol + i);
    cell.note = {
      texts: [{ font: { name: UI_FONT, size: 9, color: { argb: TOKENS.INK } }, text: column.note }],
      margins: { insetmode: 'auto' },
    };
  });
}

export { STATE_WORDS, STATE_STYLE };
