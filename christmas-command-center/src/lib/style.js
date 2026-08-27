/**
 * The §6.2 design system, expressed once.
 *
 * Two rules from the PRD shape everything here: colour is never the only way a
 * state is communicated, and no more than two or three colours carry meaning on
 * any one sheet. The palette is wide; each sheet uses a narrow slice of it.
 */
import { TOKENS, DISPLAY_FONT, UI_FONT, LAYOUT, FORMATS, moneyFormat } from '../config.js';

export const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

export const thin = (argb = TOKENS.RULE) => ({ style: 'thin', color: { argb } });
export const hair = (argb = TOKENS.RULE) => ({ style: 'hair', color: { argb } });

export const box = (argb = TOKENS.RULE) => ({
  top: thin(argb), left: thin(argb), bottom: thin(argb), right: thin(argb),
});

/**
 * The nav strip that opens every visible sheet (§4.2).
 *
 * Each link is merged across as many columns as its label needs, measured
 * against the actual column widths — otherwise "Dashboard" lands in a
 * four-character column and reads "Das". Returns the last column it used so the
 * bands beneath it can be painted to the same width.
 */
export function navStrip(ws, { links, columnCount, currentSheet }) {
  const row = ws.getRow(LAYOUT.NAV_ROW);
  row.height = 21;

  let col = 2;
  for (const link of links) {
    const needed = link.label.length + 3;
    let last = col;
    let width = ws.getColumn(col).width ?? 8;
    while (width < needed) {
      last += 1;
      width += ws.getColumn(last).width ?? 8;
    }
    if (last > col) ws.mergeCells(LAYOUT.NAV_ROW, col, LAYOUT.NAV_ROW, last);
    const cell = row.getCell(col);
    const here = link.sheet === currentSheet;
    cell.value = here ? link.label : { text: link.label, hyperlink: `#'${link.sheet}'!A1` };
    cell.font = {
      name: UI_FONT, size: 9, bold: here,
      color: { argb: here ? TOKENS.PAPER : TOKENS.CHAMPAGNE },
      underline: false,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    col = last + 1;
  }

  const lastColumn = Math.max(columnCount, col - 1);
  for (let c = 1; c <= lastColumn; c += 1) {
    const cell = row.getCell(c);
    cell.fill = fill(TOKENS.PINE);
    cell.border = { bottom: thin(TOKENS.CHAMPAGNE) };
  }
  return { lastColumn };
}

/** Sheet title in the display serif (§6.2). */
export function sheetTitle(ws, { title, columnCount }) {
  const row = ws.getRow(LAYOUT.TITLE_ROW);
  row.height = 34;
  for (let c = 1; c <= columnCount; c += 1) row.getCell(c).fill = fill(TOKENS.IVORY);
  const cell = row.getCell(2);
  cell.value = title;
  cell.font = { name: DISPLAY_FONT, size: 22, bold: true, color: { argb: TOKENS.PINE } };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  return row;
}

/** The one sentence saying what belongs on the sheet (§10.2). */
export function sheetIntro(ws, { intro, columnCount }) {
  const row = ws.getRow(LAYOUT.INTRO_ROW);
  row.height = 18;
  for (let c = 1; c <= columnCount; c += 1) row.getCell(c).fill = fill(TOKENS.IVORY);
  const cell = row.getCell(2);
  cell.value = intro;
  cell.font = { name: UI_FONT, size: 10, italic: true, color: { argb: TOKENS.MUTED } };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  return row;
}

/** The colour key, repeated on every tracker so no legend lives off-screen. */
export function legendRow(ws, { columnCount, note }) {
  const row = ws.getRow(LAYOUT.LEGEND_ROW);
  row.height = 17;
  for (let c = 1; c <= columnCount; c += 1) row.getCell(c).fill = fill(TOKENS.IVORY);
  const cell = row.getCell(2);
  cell.value = note ?? 'Cream cells are yours to fill in · pale green cells calculate themselves · amber rows are examples you can delete';
  cell.font = { name: UI_FONT, size: 9, color: { argb: TOKENS.MUTED } };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  return row;
}

export function headerCell(cell, text) {
  cell.value = text;
  cell.fill = fill(TOKENS.PINE);
  cell.font = { name: UI_FONT, size: 10, bold: true, color: { argb: TOKENS.PAPER } };
  cell.alignment = { vertical: 'bottom', horizontal: 'left', wrapText: true };
  cell.border = { bottom: { style: 'medium', color: { argb: TOKENS.CHAMPAGNE } } };
}

/** Number format for a column type, given the workbook's currency symbol. */
export function numberFormat(type, symbol) {
  switch (type) {
    case 'money': return moneyFormat(symbol);
    case 'date': return FORMATS.date;
    case 'time': return FORMATS.time;
    case 'int': return FORMATS.integer;
    case 'year': return FORMATS.year;
    case 'percent': return FORMATS.percent;
    default: return undefined;
  }
}

/**
 * Paint one data cell. Input cells are cream and unlocked; derived cells are
 * mist and locked; example rows are amber so they cannot be mistaken for data.
 */
export function dataCell(cell, { column, symbol, isSample }) {
  const derived = column.kind === 'formula';
  const base = derived ? TOKENS.MIST : (isSample ? TOKENS.SOFT_AMBER : TOKENS.IVORY);
  cell.fill = fill(base);
  cell.font = {
    name: UI_FONT,
    size: 10,
    color: { argb: derived ? TOKENS.PINE : TOKENS.INK },
    italic: Boolean(isSample && !derived),
  };
  cell.border = { bottom: hair(), right: hair() };
  cell.alignment = {
    vertical: 'top',
    horizontal: ['money', 'int', 'percent'].includes(column.type) ? 'right'
      : column.type === 'date' || column.type === 'time' ? 'center' : 'left',
    wrapText: column.width >= 26,
  };
  const format = numberFormat(column.type, symbol);
  if (format) cell.numFmt = format;
  cell.protection = { locked: derived };
  return cell;
}

/** A labelled input on a page-style sheet (SETTINGS, SEASON VISION). */
export function labelledInput(ws, {
  row, labelCol, valueCol, label, help, helpCol, helpLastCol, valueLastCol, locked = false,
}) {
  if (valueLastCol && valueLastCol > valueCol) ws.mergeCells(row, valueCol, row, valueLastCol);
  if (helpCol && helpLastCol && helpLastCol > helpCol) ws.mergeCells(row, helpCol, row, helpLastCol);
  const labelCell = ws.getRow(row).getCell(labelCol);
  labelCell.value = label;
  labelCell.font = { name: UI_FONT, size: 10, bold: true, color: { argb: TOKENS.PINE } };
  labelCell.alignment = { vertical: 'middle', horizontal: 'right' };

  const valueCell = ws.getRow(row).getCell(valueCol);
  valueCell.fill = fill(locked ? TOKENS.MIST : TOKENS.IVORY);
  valueCell.font = { name: UI_FONT, size: 11, color: { argb: TOKENS.INK } };
  valueCell.border = box();
  valueCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  valueCell.protection = { locked };

  if (help && helpCol) {
    const helpCell = ws.getRow(row).getCell(helpCol);
    helpCell.value = help;
    helpCell.font = { name: UI_FONT, size: 9, color: { argb: TOKENS.MUTED } };
    helpCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  }
  return valueCell;
}

/** A dashboard card: a large figure with a quiet label and a plain-word state. */
export function card(ws, { row, col, width = 3, height = 4, label, valueFormula, valueFormat, note, accent = TOKENS.PINE }) {
  const last = { row: row + height - 1, col: col + width - 1 };
  for (let r = row; r <= last.row; r += 1) {
    for (let c = col; c <= last.col; c += 1) {
      const cell = ws.getRow(r).getCell(c);
      cell.fill = fill(TOKENS.PAPER);
      cell.border = {
        top: r === row ? { style: 'medium', color: { argb: accent } } : undefined,
        bottom: r === last.row ? thin() : undefined,
        left: c === col ? thin() : undefined,
        right: c === last.col ? thin() : undefined,
      };
      cell.protection = { locked: true };
    }
  }
  // §6.2 allows merging in dashboard presentation regions, and a 24pt figure
  // in a nine-character column shows as ###.
  const labelCell = span(ws, row, col, last.col);
  labelCell.value = label;
  labelCell.font = { name: UI_FONT, size: 9, bold: true, color: { argb: TOKENS.MUTED } };
  labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const valueCell = span(ws, row + 1, col, last.col);
  valueCell.value = { formula: valueFormula };
  valueCell.font = { name: DISPLAY_FONT, size: 22, bold: true, color: { argb: accent } };
  valueCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  if (valueFormat) valueCell.numFmt = valueFormat;

  const noteCell = span(ws, row + height - 1, col, last.col);
  if (note) {
    noteCell.value = typeof note === 'string' ? note : { formula: note.formula };
    noteCell.font = { name: UI_FONT, size: 8, color: { argb: TOKENS.MUTED } };
    noteCell.alignment = { vertical: 'top', horizontal: 'left', indent: 1, wrapText: true };
  }
  return { valueCell, noteCell };
}

/** A section rule — a line of champagne, used instead of a heavy fill. */
export function sectionHeading(ws, { row, col, columnCount, text }) {
  const cell = ws.getRow(row).getCell(col);
  cell.value = text;
  cell.font = { name: DISPLAY_FONT, size: 14, bold: true, color: { argb: TOKENS.PINE } };
  cell.alignment = { vertical: 'bottom', horizontal: 'left' };
  for (let c = col; c <= columnCount; c += 1) {
    ws.getRow(row).getCell(c).border = { bottom: thin(TOKENS.CHAMPAGNE) };
  }
}

export function bodyText(ws, { row, col, text, size = 10, bold = false, colour = TOKENS.INK, indent = 0, wrap = false }) {
  const cell = ws.getRow(row).getCell(col);
  cell.value = text;
  cell.font = { name: UI_FONT, size, bold, color: { argb: colour } };
  cell.alignment = { vertical: 'top', horizontal: 'left', indent, wrapText: wrap };
  return cell;
}

/**
 * A block of prose on a page sheet.
 *
 * Merged across a run of columns and given a row height computed from the text,
 * because Excel does not auto-fit a merged wrapped cell and a clipped sentence
 * is the commonest way a spreadsheet looks unfinished (§12.3).
 */
export function paragraph(ws, {
  row, col, lastCol, text, size = 10, bold = false, italic = false,
  colour = TOKENS.INK, indent = 0, minHeight = 16,
}) {
  if (lastCol > col) ws.mergeCells(row, col, row, lastCol);
  const cell = ws.getRow(row).getCell(col);
  cell.value = text;
  cell.font = { name: UI_FONT, size, bold, italic, color: { argb: colour } };
  cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent };
  let chars = 0;
  for (let c = col; c <= lastCol; c += 1) chars += ws.getColumn(c).width ?? 10;
  const perLine = Math.max(8, (chars - indent * 2) * (10 / size) * 1.05);
  const lines = Math.max(1, Math.ceil(String(text).length / perLine));
  ws.getRow(row).height = Math.max(minHeight, Math.round(lines * size * 1.5) + 5);
  return cell;
}

/** Merges a run of columns and returns the anchor cell, styling untouched. */
export function span(ws, row, col, lastCol) {
  if (lastCol > col) ws.mergeCells(row, col, row, lastCol);
  return ws.getRow(row).getCell(col);
}
