/**
 * The sheets that are pages rather than tables: COVER, START HERE, SETTINGS,
 * DASHBOARD, SHEET INDEX, LISTS and QUALITY CHECK.
 *
 * PRD §7.1 governs the dashboard: decision-first, two charts that earn their
 * place, and an attention board that names the next action rather than scoring
 * the season out of ten.
 */
import {
  TOKENS, LAYOUT, SHEETS, LISTS, SETTINGS_FIELDS, SETTINGS_LAYOUT, DISPLAY_FONT, UI_FONT,
  PRODUCT, COST_MAPPING, OPTIONAL_SHEETS, FORMATS,
} from '../config.js';
import {
  fill, thin, navStrip, sheetTitle, sheetIntro, legendRow, headerCell, bodyText,
  sectionHeading, card, labelledInput, numberFormat, paragraph, span,
} from '../lib/style.js';

/**
 * Page geometry.
 *
 * A portrait page with half-inch margins is about seventy-two characters wide.
 * Page sheets are built to that width so they print at full size instead of
 * being scaled down to a third and read like the small print (§12.3).
 */
const PAGE = { MARGIN: 2, MARKER: 4, TERM: 18, BODY_COL: 4, LAST: 9, BODY_WIDTH: 8 };

function pageGrid(ws) {
  ws.getColumn(1).width = PAGE.MARGIN;
  ws.getColumn(2).width = PAGE.MARKER;
  ws.getColumn(3).width = PAGE.TERM;
  for (let c = PAGE.BODY_COL; c <= PAGE.LAST; c += 1) ws.getColumn(c).width = PAGE.BODY_WIDTH;
}

const S = SHEETS;

/* ================================================================== *
 * COVER
 * ================================================================== */
export function renderCover(ws, ctx) {
  // Sized to fill one portrait page at full size: about 97 characters across
  // and 36 rows down, so nothing is scaled and the ink runs to the edges.
  const width = 11;
  ws.getColumn(1).width = 3;
  for (let c = 2; c <= width; c += 1) ws.getColumn(c).width = 9.4;
  for (let r = 1; r <= 36; r += 1) {
    const row = ws.getRow(r);
    row.height = 22;
    for (let c = 1; c <= width; c += 1) row.getCell(c).fill = fill(TOKENS.PINE);
  }

  ws.getRow(6).height = 26;
  bodyText(ws, { row: 6, col: 2, text: 'A PRIVATE CHRISTMAS ATELIER', size: 10, colour: TOKENS.CHAMPAGNE })
    .alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  for (const [row, text, size] of [[9, 'The Christmas Season', 34], [12, 'Master Command Center', 34]]) {
    ws.getRow(row).height = 44;
    const cell = span(ws, row, 2, width);
    cell.value = text;
    cell.font = { name: DISPLAY_FONT, size, bold: true, color: { argb: TOKENS.IVORY } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  }

  ws.getRow(15).height = 8;
  for (let c = 2; c <= 6; c += 1) ws.getRow(15).getCell(c).border = { bottom: thin(TOKENS.CHAMPAGNE) };

  ws.getRow(17).height = 24;
  const promise = span(ws, 17, 2, width);
  promise.value = PRODUCT.promise;
  promise.font = { name: DISPLAY_FONT, size: 15, italic: true, color: { argb: TOKENS.IVORY } };
  promise.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const welcome = span(ws, 20, 2, width);
  welcome.value = { formula: 'IF(Set_Household="","Welcome.","For the "&Set_Household&" household.")' };
  welcome.font = { name: UI_FONT, size: 11, color: { argb: TOKENS.CHAMPAGNE } };
  welcome.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const season = span(ws, 22, 2, width);
  season.value = { formula: '"Christmas "&Set_Year&"  ·  "&MAX(0,Set_ChristmasDate-TODAY())&" days to go"' };
  season.font = { name: UI_FONT, size: 11, color: { argb: TOKENS.IVORY } };
  season.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const start = span(ws, 25, 2, width);
  start.value = { text: 'Begin here  →  START HERE', hyperlink: `#'${S.START}'!A1` };
  start.font = { name: UI_FONT, size: 12, bold: true, color: { argb: TOKENS.CHAMPAGNE } };
  start.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const dash = span(ws, 26, 2, width);
  dash.value = { text: 'Straight to the dashboard  →  DASHBOARD', hyperlink: `#'${S.DASHBOARD}'!A1` };
  dash.font = { name: UI_FONT, size: 11, color: { argb: TOKENS.CHAMPAGNE } };
  dash.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  for (const [row, text] of [
    [32, { formula: `"Edition "&Set_Edition&"  ·  ${ctx.edition.label}"` }],
    [33, `${PRODUCT.seller} · For your own household. Not for resale, redistribution or sharing.`],
    [34, 'See TERMS OF USE, included with your download, for the full licence.'],
  ]) {
    const cell = span(ws, row, 2, width);
    cell.value = text;
    cell.font = { name: UI_FONT, size: 9, color: { argb: TOKENS.MUTED } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  }

  ws.views = [{ showGridLines: false, zoomScale: 100 }];
  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
    printArea: `A$1:${String.fromCharCode(64 + width)}$36`,
    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
  ws.properties.tabColor = { argb: TOKENS.OXBLOOD };
  lockAll(ws, 36, width);
}

/* ================================================================== *
 * START HERE — §10.1
 * ================================================================== */
const START_STEPS = [
  ['1', 'Save a clean copy first', 'Before you type anything, save a copy called “master”. Come next year you will want an empty one to start from.'],
  ['2', 'Set up SETTINGS', 'Year, Christmas date, season start, currency and household name. Everything else reads from there.'],
  ['3', 'Add people before gifts', 'Fill in PEOPLE + BUDGETS, then RECIPIENT PROFILES if you like keeping notes. Gift rows attach to a Person ID.'],
  ['4', 'Choose your modules', 'Use what suits you. TRAVEL PLAN, ADVENT + REFLECTION and MOVIES + MUSIC hide cleanly — right-click the tab and choose Hide.'],
  ['5', 'Write the season vision', 'Five lines on SEASON VISION, and the first few dates on CHRISTMAS CALENDAR.'],
  ['6', 'Go to the dashboard', 'It will tell you what is unfinished. Work down the attention board; that is the whole method.'],
];

const COLOUR_KEY = [
  [TOKENS.IVORY, 'Cream', 'Yours to fill in.'],
  [TOKENS.MIST, 'Pale green', 'Calculates itself. Locked so it cannot be typed over by accident.'],
  [TOKENS.SOFT_AMBER, 'Amber', 'Either an example row to delete, or something asking for attention.'],
  [TOKENS.SOFT_ROSE, 'Rose', 'Over budget, overdue or late. Read the word in the cell — the colour is never the whole story.'],
];

const HABITS = [
  ['Filters', 'Every tracker has them, on the header row. Filter, do not delete.'],
  ['Sorting', 'Safe. IDs are typed text, not row numbers, so nothing comes unstuck when you re-order a table.'],
  ['Adding rows', 'Insert a row inside the table — click a row in the middle, not the one after the last. Formulas and dropdowns come with it. Then copy a calculated cell down into the new row.'],
  ['Dropdown lists', 'They live on LISTS. To add a value, insert a row inside the block rather than below it, and every dropdown that uses it widens automatically.'],
  ['Hiding a module', 'Right-click the tab and choose Hide. Nothing breaks: every total reads an empty sheet as zero.'],
  ['Unprotecting', 'Review, then Unprotect Sheet. There is no password. The lock is only there to stop a calculation being typed over by accident.'],
  ['Examples', 'Three amber rows on each tracker, every one marked EXAMPLE — DELETE ME. Delete the contents when you are ready; deleting them breaks nothing.'],
  ['Printing', 'The dashboard prints as two pages. A tracker prints its first columns — the ones worth carrying to the shops — at full size. To print the whole table instead, go to Page Layout, Print Area, Clear. Filter the sheet first either way, or you will print every empty row.'],
];

const RESET_STEPS = [
  'Save this year’s workbook under its own name — “Christmas 2026”, and leave it alone.',
  'Open your clean master copy, or copy the figures below into ANNUAL ARCHIVE before you clear anything.',
  'From MASTER BUDGET copy the Budget and Actual totals; from the dashboard, gifts given and guests hosted.',
  'Delete the contents of the cream cells on each tracker. Do not delete rows, and do not touch the pale green columns.',
  'Update the year on SETTINGS. The countdown, the calendar and every label follow it.',
  'Read NEXT YEAR NOTES before you plan anything. That is what it was for.',
];

export function renderStartHere(ws, ctx) {
  pageGrid(ws);
  const width = navStrip(ws, { links: ctx.navLinks, columnCount: PAGE.LAST, currentSheet: S.START }).lastColumn;
  sheetTitle(ws, { title: 'Start here', columnCount: width });
  sheetIntro(ws, { intro: 'Six steps, ten minutes, and the rest of the season has somewhere to live.', columnCount: width });
  legendRow(ws, { columnCount: width, note: ' ' });
  ws.views = [{ showGridLines: false, zoomScale: 100 }];
  ws.properties.tabColor = { argb: TOKENS.CHAMPAGNE };

  let row = 6;
  sectionHeading(ws, { row, col: 2, columnCount: width, text: 'Setting up' });
  row += 2;
  for (const [n, heading, detail] of START_STEPS) {
    const numCell = ws.getRow(row).getCell(2);
    numCell.value = n;
    numCell.font = { name: DISPLAY_FONT, size: 18, bold: true, color: { argb: TOKENS.CHAMPAGNE } };
    numCell.alignment = { vertical: 'top', horizontal: 'left' };
    paragraph(ws, { row, col: 3, lastCol: width, text: heading, size: 11, bold: true, colour: TOKENS.PINE, minHeight: 18 });
    paragraph(ws, { row: row + 1, col: 3, lastCol: width, text: detail, size: 10, colour: TOKENS.INK });
    row += 3;
  }

  row += 1;
  sectionHeading(ws, { row, col: 2, columnCount: width, text: 'What the colours mean' });
  row += 2;
  for (const [swatch, name, meaning] of COLOUR_KEY) {
    const cell = ws.getRow(row).getCell(2);
    cell.fill = fill(swatch);
    cell.border = { top: thin(), left: thin(), bottom: thin(), right: thin() };
    bodyText(ws, { row, col: 3, text: name, size: 10, bold: true, colour: TOKENS.PINE });
    paragraph(ws, { row, col: PAGE.BODY_COL, lastCol: width, text: meaning, size: 10 });
    row += 1;
  }
  row += 1;
  paragraph(ws, { row, col: 3, lastCol: width, size: 9, colour: TOKENS.MUTED,
    text: 'Every colour is backed by a word. If you cannot see the fill, the cell still says OVERDUE, NEAR LIMIT or ON TRACK.' });
  row += 3;

  sectionHeading(ws, { row, col: 2, columnCount: width, text: 'Working in the workbook' });
  row += 2;
  for (const [term, detail] of HABITS) {
    bodyText(ws, { row, col: 2, text: term, size: 10, bold: true, colour: TOKENS.PINE });
    ws.mergeCells(row, 2, row, 3);
    paragraph(ws, { row, col: PAGE.BODY_COL, lastCol: width, text: detail, size: 10 });
    row += 1;
  }

  row += 2;
  sectionHeading(ws, { row, col: 2, columnCount: width, text: 'Putting the year away' });
  row += 2;
  RESET_STEPS.forEach((step, i) => {
    bodyText(ws, { row, col: 2, text: `${i + 1}.`, size: 10, bold: true, colour: TOKENS.CHAMPAGNE });
    paragraph(ws, { row, col: 3, lastCol: width, text: step, size: 10 });
    row += 1;
  });

  row += 2;
  sectionHeading(ws, { row, col: 2, columnCount: width, text: 'A note on what you keep here' });
  row += 2;
  paragraph(ws, { row, col: 2, lastCol: width, size: 10, colour: TOKENS.INK,
    text: 'This is an ordinary spreadsheet on your own device. It is not encrypted, and anyone who opens the file can read it. Keep hiding places, sizes and preferences here if they help you plan. Keep card numbers, passwords and identity documents somewhere else.' });
  row += 3;
  paragraph(ws, { row, col: 2, lastCol: width, size: 9, colour: TOKENS.MUTED,
    text: 'Set in Georgia and Aptos so it looks the same on every machine. If you own Cormorant Garamond, select the workbook and change the heading font — the layout is built to take it.' });

  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    printTitlesRow: `${LAYOUT.NAV_ROW}:${LAYOUT.NAV_ROW}`,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  lockAll(ws, row + 4, width);
}

/* ================================================================== *
 * SETTINGS — §6.1
 * ================================================================== */
export function renderSettings(ws, ctx) {
  // Landscape, and sized to the printable width so the help column reads at
  // full size rather than being scaled to a third (§12.3).
  const width = 6;
  ws.getColumn(1).width = 2;
  ws.getColumn(SETTINGS_LAYOUT.LABEL_COL).width = 28;
  ws.getColumn(SETTINGS_LAYOUT.VALUE_COL).width = 18;
  for (let c = SETTINGS_LAYOUT.HELP_COL; c <= width; c += 1) ws.getColumn(c).width = 18;

  const bandWidth = navStrip(ws, { links: ctx.navLinks, columnCount: width, currentSheet: S.SETTINGS }).lastColumn;
  sheetTitle(ws, { title: 'Settings', columnCount: bandWidth });
  sheetIntro(ws, { intro: 'Nine decisions the whole workbook reads from. Set them once, at the start of the season.', columnCount: bandWidth });
  legendRow(ws, { columnCount: bandWidth, note: 'Cream cells are yours · the edition below is fixed · everything else in the workbook follows these values' });

  const names = {};
  SETTINGS_FIELDS.forEach((field, i) => {
    const row = SETTINGS_LAYOUT.FIRST_ROW + i;
    ws.getRow(row).height = 24;
    const cell = labelledInput(ws, {
      row,
      labelCol: SETTINGS_LAYOUT.LABEL_COL,
      valueCol: SETTINGS_LAYOUT.VALUE_COL,
      helpCol: SETTINGS_LAYOUT.HELP_COL,
      helpLastCol: width,
      label: field.label,
      help: field.help,
      locked: Boolean(field.locked),
    });
    const format = numberFormat(field.type === 'integer' ? 'int' : field.type, ctx.symbol);
    if (format) cell.numFmt = format;
    ws.getRow(row).getCell(SETTINGS_LAYOUT.HELP_COL).alignment = {
      vertical: 'middle', horizontal: 'left', wrapText: true,
    };
    names[field.key] = { name: field.name, row, col: SETTINGS_LAYOUT.VALUE_COL, field };
  });

  const afterFields = SETTINGS_LAYOUT.FIRST_ROW + SETTINGS_FIELDS.length + 2;
  sectionHeading(ws, { row: afterFields, col: 2, columnCount: bandWidth, text: 'What these change' });
  const explain = [
    ['Christmas year', 'The countdown, every label that names the year, and the default Christmas date.'],
    ['Budget warning threshold', 'When a category turns amber instead of green. Lower it if you want warning sooner.'],
    ['Shipping risk window', 'How many days out an order with no tracking starts asking to be chased.'],
    ['Low-stock threshold', 'When DÉCOR INVENTORY says LOW rather than IN STOCK.'],
    ['Currency symbol', 'The symbol on every amount. It does not convert anything — one workbook, one currency.'],
  ];
  explain.forEach(([term, detail], i) => {
    const row = afterFields + 2 + i;
    bodyText(ws, { row, col: SETTINGS_LAYOUT.LABEL_COL, text: term, size: 10, bold: true, colour: TOKENS.PINE })
      .alignment = { vertical: 'top', horizontal: 'right' };
    paragraph(ws, {
      row, col: SETTINGS_LAYOUT.VALUE_COL, lastCol: width, text: detail, size: 10,
    });
  });

  ws.views = [{ showGridLines: false, zoomScale: 100, state: 'frozen', ySplit: LAYOUT.HEADER_ROW }];
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  ws.properties.tabColor = { argb: TOKENS.CHAMPAGNE };
  lockAll(ws, afterFields + 10, Math.max(width, bandWidth), names);
  return names;
}

/* ================================================================== *
 * DASHBOARD — §7.1
 * ================================================================== */
export const DASH = {
  WIDTH: 17,
  CARD_ROW_1: 6,
  CARD_ROW_2: 11,
  BOARD_HEADING: 16,
  BOARD_FIRST: 17,
  BOARD_ROWS: 12,
  JOY_FIRST: 17,
  SOON_HEADING: 23,
  SOON_FIRST: 24,
  SOON_ROWS: 6,
  CHART_HEADING: 31,
  CHART_TOP: 32,
  CHART_BOTTOM: 56,
  DATA_HEADING: 58,
  DATA_HEADER: 59,
  DATA_FIRST: 60,
  DATA_ROWS: 10,
  PROGRESS_FIRST: 60,
  PROGRESS_ROWS: 4,
};

export function renderDashboard(ws, ctx) {
  const { ref, symbol, money } = ctx;
  const W = DASH.WIDTH;
  ws.getColumn(1).width = 2;
  for (const c of [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16]) ws.getColumn(c).width = 9;
  for (const c of [5, 9, 13, 17]) ws.getColumn(c).width = 2;

  navStrip(ws, { links: ctx.navLinks, columnCount: W, currentSheet: S.DASHBOARD });
  sheetTitle(ws, { title: 'Dashboard', columnCount: W });
  const introRow = ws.getRow(LAYOUT.INTRO_ROW);
  for (let c = 1; c <= W; c += 1) introRow.getCell(c).fill = fill(TOKENS.IVORY);
  introRow.height = 18;
  const introCell = introRow.getCell(2);
  introCell.value = { formula: 'IF(Set_Household="","Christmas "&Set_Year&" — where everything stands today.","Christmas "&Set_Year&" for the "&Set_Household&" household — where everything stands today.")' };
  introCell.font = { name: UI_FONT, size: 10, italic: true, color: { argb: TOKENS.MUTED } };
  introCell.alignment = { vertical: 'middle', horizontal: 'left' };
  legendRow(ws, { columnCount: W, note: 'Every figure below is calculated. Follow a card to its sheet using the strip above, or the SHEET INDEX.' });

  const R = (sheet, key) => ref.range(sheet, key);
  const budgetTotal = `SUM(${R(S.BUDGET, 'budgetAmount')})`;
  const plannedTotal = `SUM(${R(S.BUDGET, 'planned')})`;
  const actualTotal = `SUM(${R(S.BUDGET, 'actual')})`;

  const activeGifts = `COUNTIFS(${R(S.GIFTS, 'active')},"Yes")`;
  const purchasedGifts = `COUNTIFS(${R(S.GIFTS, 'active')},"Yes",${R(S.GIFTS, 'purchased')},"Yes")`;
  const physicalPurchased = `COUNTIFS(${R(S.GIFTS, 'active')},"Yes",${R(S.GIFTS, 'purchased')},"Yes",${R(S.GIFTS, 'giftType')},"Physical")`;
  const wrappedGifts = `COUNTIFS(${R(S.GIFTS, 'active')},"Yes",${R(S.GIFTS, 'purchased')},"Yes",${R(S.GIFTS, 'giftType')},"Physical",${R(S.GIFTS, 'wrapped')},"Yes")`;
  const eligibleOrders = `COUNTIFS(${R(S.ORDERS, 'orderId')},"?*",${R(S.ORDERS, 'orderStatus')},"<>Cancelled")`;
  const arrivedOrders = `COUNTIFS(${R(S.ORDERS, 'orderId')},"?*",${R(S.ORDERS, 'orderStatus')},"<>Cancelled",${R(S.ORDERS, 'arrived')},"Yes")`;
  const openTasks = `COUNTIFS(${R(S.CALENDAR, 'calId')},"?*",${R(S.CALENDAR, 'open')},"Yes")`;
  const doneTasks = `COUNTIFS(${R(S.CALENDAR, 'calId')},"?*",${R(S.CALENDAR, 'open')},"No")`;

  const cards1 = [
    { label: 'DAYS TO CHRISTMAS', formula: 'MAX(0,Set_ChristmasDate-TODAY())', format: FORMATS.integer,
      note: { formula: '"Christmas falls on "&TEXT(Set_ChristmasDate,"dddd d mmmm")' }, accent: TOKENS.OXBLOOD },
    { label: 'BUDGET SET', formula: budgetTotal, format: money,
      note: 'The total of every category on MASTER BUDGET.', accent: TOKENS.PINE },
    { label: 'SPENT SO FAR', formula: actualTotal, format: money,
      note: { formula: `"Planned, including what you have not bought yet: "&TEXT(${plannedTotal},"${money.replace(/"/g, '""')}")` }, accent: TOKENS.PINE },
    { label: 'REMAINING', formula: `${budgetTotal}-${actualTotal}`, format: money,
      note: { formula: `IF(${budgetTotal}=0,"No budget set yet.",IF(${budgetTotal}-${actualTotal}<0,"OVER BUDGET — see MASTER BUDGET.","Against the budget you set."))` },
      accent: TOKENS.OXBLOOD },
  ];
  const cards2 = [
    { label: 'GIFTS CHOSEN', formula: `IF(${activeGifts}=0,0,${purchasedGifts}/${activeGifts})`, format: FORMATS.percent,
      note: { formula: `IF(${activeGifts}=0,"Not started.",${purchasedGifts}&" of "&${activeGifts}&" bought")` }, accent: TOKENS.PINE_2 },
    { label: 'WRAPPED', formula: `IF(${physicalPurchased}=0,0,${wrappedGifts}/${physicalPurchased})`, format: FORMATS.percent,
      note: { formula: `IF(${physicalPurchased}=0,"Nothing to wrap yet.",${wrappedGifts}&" of "&${physicalPurchased}&" — digital and experience gifts are not counted")` },
      accent: TOKENS.PINE_2 },
    { label: 'DELIVERED', formula: `IF(${eligibleOrders}=0,0,${arrivedOrders}/${eligibleOrders})`, format: FORMATS.percent,
      note: { formula: `IF(${eligibleOrders}=0,"No orders yet.",${eligibleOrders}-${arrivedOrders}&" still on their way")` }, accent: TOKENS.PINE_2 },
    { label: 'ON THE LIST', formula: `IF(${openTasks}+${doneTasks}=0,0,${doneTasks}/(${openTasks}+${doneTasks}))`, format: FORMATS.percent,
      note: { formula: `IF(${openTasks}+${doneTasks}=0,"Nothing in the calendar yet.",${openTasks}&" still open")` }, accent: TOKENS.PINE_2 },
  ];

  const cols = [2, 6, 10, 14];
  [[DASH.CARD_ROW_1, cards1], [DASH.CARD_ROW_2, cards2]].forEach(([row, cards]) => {
    ws.getRow(row).height = 16;
    ws.getRow(row + 1).height = 32;
    ws.getRow(row + 2).height = 6;
    ws.getRow(row + 3).height = 26;
    cards.forEach((c, i) => card(ws, {
      row, col: cols[i], width: 3, height: 4, label: c.label,
      valueFormula: c.formula, valueFormat: c.format, note: c.note, accent: c.accent,
    }));
  });

  /* --- Attention board (§7.1) ------------------------------------- */
  sectionHeading(ws, { row: DASH.BOARD_HEADING, col: 2, columnCount: 8, text: 'What needs you' });
  const board = attentionBoard(ref);
  // Colour is never the only signal, but a row reading "—" should not be set in
  // the same alarm red as a row reading 3.
  ws.addConditionalFormatting({
    ref: `B${DASH.BOARD_FIRST}:B${DASH.BOARD_FIRST + DASH.BOARD_ROWS - 1}`,
    rules: [{
      type: 'cellIs', operator: 'equal', formulae: ['0'], priority: 1,
      style: { font: { color: { argb: TOKENS.MUTED }, name: DISPLAY_FONT, size: 14, bold: false } },
    }],
  });
  board.forEach((item, i) => {
    const row = DASH.BOARD_FIRST + i;
    ws.getRow(row).height = 17;
    const count = ws.getRow(row).getCell(2);
    count.value = { formula: item.count };
    count.numFmt = FORMATS.integer;
    count.font = { name: DISPLAY_FONT, size: 14, bold: true, color: { argb: TOKENS.OXBLOOD } };
    count.alignment = { vertical: 'middle', horizontal: 'right' };
    count.protection = { locked: true };
    const label = ws.getRow(row).getCell(3);
    label.value = item.label;
    label.font = { name: UI_FONT, size: 10, color: { argb: TOKENS.INK } };
    label.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    const link = ws.getRow(row).getCell(7);
    link.value = { text: item.sheet, hyperlink: `#'${item.sheet}'!A1` };
    link.font = { name: UI_FONT, size: 9, color: { argb: TOKENS.PINE_2 } };
    link.alignment = { vertical: 'middle', horizontal: 'left' };
    for (let c = 2; c <= 8; c += 1) ws.getRow(row).getCell(c).border = { bottom: thin() };
  });

  /* --- Season joy strip ------------------------------------------- */
  sectionHeading(ws, { row: DASH.BOARD_HEADING, col: 10, columnCount: 16, text: 'This season' });
  const nextTradition = `IFERROR(INDEX(${R(S.TRADITIONS, 'activity')},MATCH(MIN(${R(S.TRADITIONS, 'upcoming')}),${R(S.TRADITIONS, 'upcoming')},0)),"")`;
  const nextTraditionDate = `MIN(${R(S.TRADITIONS, 'upcoming')})`;
  const joy = [
    ['This year is for', 'IF(Vision_Theme="","Write one line on SEASON VISION.",Vision_Theme)'],
    ['It should feel', 'IF(Vision_Feelings="","—",Vision_Feelings)'],
    ['First priority', `IFERROR(INDEX(${R(S.VISION, 'priority')},MATCH("?*",${R(S.VISION, 'priority')},0)),"Nothing written yet.")`],
    ['Next tradition', `IF(${nextTraditionDate}=0,"Nothing dated yet.",${nextTradition}&" — "&TEXT(${nextTraditionDate},"d mmm"))`],
    ['Protecting', 'IF(Vision_Protect="","—",Vision_Protect)'],
  ];
  joy.forEach(([label, formula], i) => {
    const row = DASH.JOY_FIRST + i;
    ws.getRow(row).height = 17;
    const labelCell = span(ws, row, 10, 11);
    labelCell.value = label;
    labelCell.font = { name: UI_FONT, size: 9, bold: true, color: { argb: TOKENS.MUTED } };
    labelCell.alignment = { vertical: 'middle', horizontal: 'left' };
    const cell = span(ws, row, 12, 16);
    cell.value = { formula };
    cell.font = { name: UI_FONT, size: 10, color: { argb: TOKENS.PINE } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.protection = { locked: true };
  });

  /* --- Next seven days -------------------------------------------- */
  sectionHeading(ws, { row: DASH.SOON_HEADING, col: 10, columnCount: 16, text: 'The next seven days' });
  const soonKeys = R(S.CALENDAR, 'soonKey');
  for (let i = 0; i < DASH.SOON_ROWS; i += 1) {
    const row = DASH.SOON_FIRST + i;
    const k = i + 1;
    const dateCell = span(ws, row, 10, 11);
    dateCell.value = { formula: `IFERROR(INT(SMALL(${soonKeys},${k})),"")` };
    dateCell.numFmt = 'ddd d mmm';
    dateCell.font = { name: UI_FONT, size: 10, color: { argb: TOKENS.MUTED } };
    dateCell.alignment = { vertical: 'middle', horizontal: 'left' };
    dateCell.protection = { locked: true };
    const titleCell = span(ws, row, 12, 16);
    titleCell.value = { formula: `IFERROR(INDEX(${R(S.CALENDAR, 'title')},MATCH(SMALL(${soonKeys},${k}),${soonKeys},0)),IF(${k}=1,"Nothing in the next seven days.",""))` };
    titleCell.font = { name: UI_FONT, size: 10, color: { argb: TOKENS.INK } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    titleCell.protection = { locked: true };
    for (let c = 10; c <= 16; c += 1) ws.getRow(row).getCell(c).border = { bottom: thin() };
  }

  /* --- Chart headings and the data the charts read ----------------- */
  sectionHeading(ws, { row: DASH.CHART_HEADING, col: 2, columnCount: 8, text: 'Where the money is going' });
  sectionHeading(ws, { row: DASH.CHART_HEADING, col: 10, columnCount: 16, text: 'How far along you are' });

  bodyText(ws, { row: DASH.DATA_HEADING, col: 2, text: 'Chart data — calculated. Safe to ignore; it is what the two charts above read.', size: 9, colour: TOKENS.MUTED });
  span(ws, DASH.DATA_HEADING + 1, 2, 3);
  for (const [col, text] of [[2, 'Category'], [4, 'Budget'], [5, 'Spent']]) {
    headerCell(ws.getRow(DASH.DATA_HEADING + 1).getCell(col), text);
  }
  const chartKeys = R(S.BUDGET, 'chartKey');
  for (let i = 0; i < DASH.DATA_ROWS; i += 1) {
    const row = DASH.DATA_FIRST + i;
    const k = i + 1;
    const match = `MATCH(LARGE(${chartKeys},${k}),${chartKeys},0)`;
    const nameCell = span(ws, row, 2, 3);
    nameCell.value = { formula: `IFERROR(INDEX(${R(S.BUDGET, 'category')},${match}),"")` };
    const budgetCell = ws.getRow(row).getCell(4);
    budgetCell.value = { formula: `IFERROR(INDEX(${R(S.BUDGET, 'budgetAmount')},${match}),0)` };
    const actualCell = ws.getRow(row).getCell(5);
    actualCell.value = { formula: `IFERROR(INDEX(${R(S.BUDGET, 'actual')},${match}),0)` };
    for (const cell of [nameCell, budgetCell, actualCell]) {
      cell.font = { name: UI_FONT, size: 9, color: { argb: TOKENS.MUTED } };
      cell.fill = fill(TOKENS.MIST);
      cell.protection = { locked: true };
    }
    budgetCell.numFmt = money;
    actualCell.numFmt = money;
  }

  span(ws, DASH.DATA_HEADING + 1, 10, 11);
  for (const [col, text] of [[10, 'Progress'], [12, 'Done']]) {
    headerCell(ws.getRow(DASH.DATA_HEADING + 1).getCell(col), text);
  }
  const progress = [
    ['Gifts chosen', `IF(${activeGifts}=0,0,${purchasedGifts}/${activeGifts})`],
    ['Wrapped', `IF(${physicalPurchased}=0,0,${wrappedGifts}/${physicalPurchased})`],
    ['Delivered', `IF(${eligibleOrders}=0,0,${arrivedOrders}/${eligibleOrders})`],
    ['On the list', `IF(${openTasks}+${doneTasks}=0,0,${doneTasks}/(${openTasks}+${doneTasks}))`],
  ];
  progress.forEach(([label, formula], i) => {
    const row = DASH.PROGRESS_FIRST + i;
    const labelCell = span(ws, row, 10, 11);
    labelCell.value = label;
    const valueCell = ws.getRow(row).getCell(12);
    valueCell.value = { formula };
    valueCell.numFmt = FORMATS.percent;
    for (const cell of [labelCell, valueCell]) {
      cell.font = { name: UI_FONT, size: 9, color: { argb: TOKENS.MUTED } };
      cell.fill = fill(TOKENS.MIST);
      cell.protection = { locked: true };
    }
  });

  ws.views = [{ showGridLines: false, zoomScale: 90, state: 'frozen', ySplit: LAYOUT.LEGEND_ROW }];
  ws.pageSetup = {
    orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 2,
    printArea: `A$1:Q$${DASH.CHART_BOTTOM}`,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    horizontalCentered: true,
  };
  ws.headerFooter = { oddFooter: `&LChristmas at a glance&C&P of &N&R${PRODUCT.trademarkName}` };
  ws.properties.tabColor = { argb: TOKENS.OXBLOOD };
  lockAll(ws, DASH.DATA_FIRST + DASH.DATA_ROWS + 2, W);
}

/** §7.1 attention board — exceptions with a count and somewhere to go. */
export function attentionBoard(ref) {
  const R = (sheet, key) => ref.range(sheet, key);
  return [
    { label: 'categories over budget', sheet: S.BUDGET,
      count: `COUNTIF(${R(S.BUDGET, 'status')},"OVER BUDGET")` },
    { label: 'categories near their limit', sheet: S.BUDGET,
      count: `COUNTIF(${R(S.BUDGET, 'status')},"NEAR LIMIT")` },
    { label: 'gifts still to choose or buy', sheet: S.GIFTS,
      count: `COUNTIFS(${R(S.GIFTS, 'active')},"Yes",${R(S.GIFTS, 'purchased')},"No")` },
    { label: 'bought gifts not yet wrapped', sheet: S.GIFTS,
      count: `COUNTIFS(${R(S.GIFTS, 'active')},"Yes",${R(S.GIFTS, 'purchased')},"Yes",${R(S.GIFTS, 'giftType')},"Physical",${R(S.GIFTS, 'wrapped')},"<>Yes")` },
    { label: 'orders running late', sheet: S.ORDERS,
      count: `COUNTIF(${R(S.ORDERS, 'attention')},"LATE")` },
    { label: 'orders with no tracking yet', sheet: S.ORDERS,
      count: `COUNTIF(${R(S.ORDERS, 'attention')},"NO TRACKING")` },
    { label: 'orders with no expected date', sheet: S.ORDERS,
      count: `COUNTIF(${R(S.ORDERS, 'attention')},"MISSING DATE")` },
    { label: 'return windows closing this week', sheet: S.ORDERS,
      count: `COUNTIF(${R(S.ORDERS, 'returnFlag')},"CLOSING SOON")` },
    { label: 'refunds owed to you', sheet: S.RETURNS,
      count: `COUNTIFS(${R(S.RETURNS, 'returnId')},"?*",${R(S.RETURNS, 'refundReceivedFlag')},"<>Yes",${R(S.RETURNS, 'refundExpected')},">0")` },
    { label: 'tasks and events overdue', sheet: S.CALENDAR,
      count: `COUNTIF(${R(S.CALENDAR, 'due')},"OVERDUE")` },
    { label: 'things still to buy for the table', sheet: S.GROCERIES,
      count: `COUNTIF(${R(S.GROCERIES, 'shopping')},"TO BUY")` },
    { label: 'items on QUALITY CHECK', sheet: S.QA,
      count: 'QA_Exceptions' },
  ];
}

/* ================================================================== *
 * SHEET INDEX
 * ================================================================== */
export function renderIndex(ws, ctx, inventory) {
  const width = 7;
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 4;
  ws.getColumn(3).width = 26;
  ws.getColumn(4).width = 15;
  ws.getColumn(5).width = 15;
  ws.getColumn(6).width = 10;
  ws.getColumn(7).width = 8;

  const bandWidth = navStrip(ws, { links: ctx.navLinks, columnCount: width, currentSheet: S.INDEX }).lastColumn;
  sheetTitle(ws, { title: 'Sheet index', columnCount: bandWidth });
  sheetIntro(ws, { intro: 'Every sheet in the workbook, what it is for, and whether you need it.', columnCount: bandWidth });
  legendRow(ws, { columnCount: bandWidth, note: 'Optional sheets hide cleanly — right-click the tab and choose Hide. No calculation depends on a sheet being visible.' });

  ws.mergeCells(LAYOUT.HEADER_ROW, 4, LAYOUT.HEADER_ROW, 5);
  for (const [col, text] of [[2, '#'], [3, 'Sheet'], [4, 'What it is for'], [6, 'Default']]) {
    headerCell(ws.getRow(LAYOUT.HEADER_ROW).getCell(col), text);
  }

  inventory.forEach((entry, i) => {
    const row = LAYOUT.HEADER_ROW + 1 + i;
    const number = ws.getRow(row).getCell(2);
    number.value = String(i + 1).padStart(2, '0');
    number.font = { name: UI_FONT, size: 9, color: { argb: TOKENS.MUTED } };
    const link = ws.getRow(row).getCell(3);
    link.value = { text: entry.name, hyperlink: `#'${entry.name}'!A1` };
    link.font = { name: UI_FONT, size: 10, bold: true, color: { argb: TOKENS.PINE_2 } };
    ws.mergeCells(row, 4, row, 5);
    const purpose = ws.getRow(row).getCell(4);
    purpose.value = entry.purpose;
    purpose.font = { name: UI_FONT, size: 9, color: { argb: TOKENS.INK } };
    purpose.alignment = { wrapText: true, vertical: 'middle' };
    ws.getRow(row).height = entry.purpose.length > 52 ? 26 : 17;
    const visibility = ws.getRow(row).getCell(6);
    visibility.value = OPTIONAL_SHEETS.includes(entry.name) ? 'Optional' : entry.support ? 'Support' : 'Visible';
    visibility.font = { name: UI_FONT, size: 9, color: { argb: OPTIONAL_SHEETS.includes(entry.name) ? TOKENS.CHAMPAGNE : TOKENS.MUTED } };
    for (let c = 2; c <= 6; c += 1) ws.getRow(row).getCell(c).border = { bottom: thin() };
  });

  ws.views = [{ showGridLines: false, zoomScale: 100, state: 'frozen', ySplit: LAYOUT.HEADER_ROW }];
  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  ws.properties.tabColor = { argb: TOKENS.CHAMPAGNE };
  lockAll(ws, LAYOUT.HEADER_ROW + inventory.length + 2, Math.max(width, bandWidth));
}

/* ================================================================== *
 * LISTS — dropdown sources and the §7.3 cost mapping
 * ================================================================== */
export const LISTS_LAYOUT = { FIRST_ROW: 8, FIRST_COL: 2 };

export function renderLists(ws, ctx) {
  const entries = Object.entries(LISTS);
  const width = LISTS_LAYOUT.FIRST_COL + entries.length + 1;

  ws.getColumn(1).width = 2;
  const bandWidth = navStrip(ws, { links: ctx.navLinks, columnCount: width, currentSheet: S.LISTS }).lastColumn;
  sheetTitle(ws, { title: 'Lists', columnCount: bandWidth });
  sheetIntro(ws, { intro: 'The values behind every dropdown in the workbook. Edit them freely — nothing here is referenced by name in a formula.', columnCount: bandWidth });
  legendRow(ws, { columnCount: bandWidth, note: 'To add a value: click a row inside a block and insert above it. The dropdown widens automatically. Adding below the last value does nothing.' });

  const ranges = {};
  entries.forEach(([name, values], i) => {
    const col = LISTS_LAYOUT.FIRST_COL + i;
    ws.getColumn(col).width = Math.max(12, Math.min(24, ...[Math.max(...values.map((v) => v.length + 3))]));
    headerCell(ws.getRow(LAYOUT.HEADER_ROW).getCell(col), name);
    values.forEach((value, j) => {
      const cell = ws.getRow(LISTS_LAYOUT.FIRST_ROW + j).getCell(col);
      cell.value = value;
      cell.fill = fill(TOKENS.IVORY);
      cell.font = { name: UI_FONT, size: 10, color: { argb: TOKENS.INK } };
      cell.border = { bottom: thin() };
      cell.protection = { locked: false };
    });
    ranges[name] = {
      col,
      first: LISTS_LAYOUT.FIRST_ROW,
      last: LISTS_LAYOUT.FIRST_ROW + values.length - 1,
    };
  });

  const mapRow = LISTS_LAYOUT.FIRST_ROW + Math.max(...entries.map(([, v]) => v.length)) + 3;
  sectionHeading(ws, { row: mapRow, col: 2, columnCount: 8, text: 'How costs reach the budget' });
  bodyText(ws, { row: mapRow + 1, col: 2, text: 'Each of these sheets has a Budget category column. Whatever you pick there is where the money lands on MASTER BUDGET. A cost with no recognised category is reported on QUALITY CHECK rather than quietly dropped.', size: 10, colour: TOKENS.INK, wrap: true });
  ws.getRow(mapRow + 1).height = 30;
  ['Sheet', 'Contributes', 'Suggested category'].forEach((text, i) => headerCell(ws.getRow(mapRow + 3).getCell(2 + i), text));
  COST_MAPPING.forEach((entry, i) => {
    const row = mapRow + 4 + i;
    bodyText(ws, { row, col: 2, text: entry.sheet, size: 10, bold: true, colour: TOKENS.PINE });
    bodyText(ws, { row, col: 3, text: entry.label, size: 10 });
    bodyText(ws, { row, col: 4, text: entry.defaultCategory, size: 10, colour: TOKENS.MUTED });
    for (let c = 2; c <= 4; c += 1) ws.getRow(row).getCell(c).border = { bottom: thin() };
  });
  bodyText(ws, { row: mapRow + 5 + COST_MAPPING.length, col: 2,
    text: 'ONLINE ORDERS is deliberately absent. An order records the parcel; the gift row records the money. Counting both would double your spending.',
    size: 9, colour: TOKENS.MUTED, wrap: true });

  ws.views = [{ showGridLines: false, zoomScale: 90, state: 'frozen', ySplit: LAYOUT.HEADER_ROW, xSplit: 1 }];
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  ws.properties.tabColor = { argb: TOKENS.MUTED };
  return ranges;
}

/* ================================================================== *
 * Shared helpers
 * ================================================================== */
/** Locks a page sheet, leaving named input cells editable. */
function lockAll(ws, lastRow, width, unlocked = {}) {
  const open = new Set(Object.values(unlocked).map(({ row, col }) => `${row}:${col}`));
  for (let r = 1; r <= lastRow; r += 1) {
    for (let c = 1; c <= width; c += 1) {
      const cell = ws.getRow(r).getCell(c);
      cell.protection = { locked: !open.has(`${r}:${c}`) };
    }
  }
}

export { lockAll };
