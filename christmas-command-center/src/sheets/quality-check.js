/**
 * QUALITY CHECK — §12.1.
 *
 * The point of this sheet is that nothing disappears quietly. A cost with no
 * budget category, an ID that points nowhere, a duplicate key: each one is
 * counted here and totalled into QA_Exceptions, which the dashboard shows.
 */
import { TOKENS, LAYOUT, SHEETS, LISTS, UI_FONT, DISPLAY_FONT } from '../config.js';
import { fill, thin, navStrip, sheetTitle, sheetIntro, legendRow, headerCell, bodyText, sectionHeading } from '../lib/style.js';
import { colLetter } from '../lib/a1.js';

const S = SHEETS;

export function renderQualityCheck(ws, ctx, specs) {
  const { ref, money } = ctx;
  const width = 9;
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 52;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 56;
  for (let c = 8; c <= width; c += 1) ws.getColumn(c).width = 10;

  navStrip(ws, { links: ctx.navLinks, columnCount: width, currentSheet: S.QA });
  sheetTitle(ws, { title: 'Quality check', columnCount: width });
  sheetIntro(ws, { intro: 'Everything the workbook cannot reconcile on its own, counted rather than hidden.', columnCount: width });
  legendRow(ws, { columnCount: width, note: 'A zero in every row is what you want. Anything else names the sheet to open and what to look for.' });

  const R = (sheet, key) => ref.range(sheet, key);
  const costSpecs = specs.filter((s) => s.cost);
  const refundSpec = specs.find((s) => s.refund);

  const sourcePlanned = costSpecs.map((s) => `SUM(${R(s.name, s.cost.planned)})`).join('+');
  const sourceActual = costSpecs.map((s) => `SUM(${R(s.name, s.cost.actual)})`).join('+');
  const refunds = `SUM(${R(refundSpec.name, refundSpec.refund.amount)})`;
  const budgetPlanned = `SUM(${R(S.BUDGET, 'planned')})`;
  const budgetActual = `SUM(${R(S.BUDGET, 'actual')})`;

  let row = LAYOUT.HEADER_ROW + 1;
  const exceptionCells = [];

  /* --- 1. Reconciliation -------------------------------------------- */
  sectionHeading(ws, { row, col: 2, columnCount: width, text: 'Does the budget agree with its sources?' });
  row += 2;
  ['Check', 'Sources say', 'Budget says', 'Difference', 'Verdict', 'What a difference means'].forEach((text, i) => {
    headerCell(ws.getRow(row).getCell(2 + i), text);
  });
  row += 1;

  const reconciliations = [
    {
      label: 'Planned cost across every module, against MASTER BUDGET Planned',
      source: sourcePlanned,
      book: budgetPlanned,
      meaning: 'A cost is tagged with a category the budget does not have, or with none at all. The rows are counted below.',
    },
    {
      label: 'Actual spend less confirmed refunds, against MASTER BUDGET Actual',
      source: `${sourceActual}-${refunds}`,
      book: budgetActual,
      meaning: 'The same cause as above, on the money you have actually spent.',
    },
  ];

  const reconRows = [];
  for (const item of reconciliations) {
    const r = row;
    bodyText(ws, { row: r, col: 2, text: item.label, size: 10, wrap: true });
    ws.getRow(r).height = 26;
    setNumber(ws, r, 3, item.source, money);
    setNumber(ws, r, 4, item.book, money);
    setNumber(ws, r, 5, `ROUND(${colLetter(3)}${r}-${colLetter(4)}${r},2)`, money);
    setStatus(ws, r, 6, `IF(ABS(E${r})<0.005,"RECONCILED","UNMAPPED COSTS")`);
    bodyText(ws, { row: r, col: 7, text: item.meaning, size: 9, colour: TOKENS.MUTED, wrap: true });
    reconRows.push(r);
    row += 1;
  }
  row += 2;

  /* --- 2. Exceptions raised by the trackers -------------------------- */
  sectionHeading(ws, { row, col: 2, columnCount: width, text: 'Exceptions the trackers raised' });
  row += 2;
  ['What was found', 'Count', 'Sheet', '', 'What to do'].forEach((text, i) => {
    if (text) headerCell(ws.getRow(row).getCell(2 + i), text);
  });
  headerCell(ws.getRow(row).getCell(3), 'Count');
  row += 1;

  for (const spec of specs) {
    for (const qa of spec.qaColumns ?? []) {
      bodyText(ws, { row, col: 2, text: qa.label, size: 10 });
      const cell = setNumber(ws, row, 3, `SUM(${R(spec.name, qa.key)})`);
      exceptionCells.push(`C${row}`);
      const link = ws.getRow(row).getCell(4);
      link.value = { text: spec.name, hyperlink: `#'${spec.name}'!A1` };
      link.font = { name: UI_FONT, size: 9, color: { argb: TOKENS.PINE_2 } };
      bodyText(ws, { row, col: 7, text: qa.detail, size: 9, colour: TOKENS.MUTED, wrap: true });
      for (let c = 2; c <= 7; c += 1) ws.getRow(row).getCell(c).border = { bottom: thin() };
      void cell;
      row += 1;
    }
  }
  row += 2;

  /* --- 3. Blanks and things that contradict each other --------------- */
  sectionHeading(ws, { row, col: 2, columnCount: width, text: 'Blanks and contradictions' });
  row += 2;
  const consistency = [
    {
      label: 'Budget categories sharing a name',
      count: `SUMPRODUCT((${R(S.BUDGET, 'category')}<>"")*(COUNTIF(${R(S.BUDGET, 'category')},${R(S.BUDGET, 'category')}&"")>1))`,
      detail: 'Two rows with the same category name would each claim the same costs. Rename one.',
      sheet: S.BUDGET,
    },
    {
      label: 'Gifts with a cost but no recipient',
      count: `COUNTIFS(${R(S.GIFTS, 'giftId')},"?*",${R(S.GIFTS, 'personId')},"",${R(S.GIFTS, 'plannedCost')},">0")`,
      detail: 'The money counts, but the gift will not appear against anybody on PEOPLE + BUDGETS.',
      sheet: S.GIFTS,
    },
    {
      label: 'Gifts marked Purchased with no actual cost',
      count: `COUNTIFS(${R(S.GIFTS, 'lifecycle')},"Purchased",${R(S.GIFTS, 'actualCost')},"")`,
      detail: 'Your spending is understated until the receipt figure is typed in.',
      sheet: S.GIFTS,
    },
    {
      label: 'Active people with a budget but no name',
      count: `COUNTIFS(${R(S.PEOPLE, 'personId')},"?*",${R(S.PEOPLE, 'name')},"",${R(S.PEOPLE, 'totalBudget')},">0")`,
      detail: 'A budget is set aside for a row nobody can identify.',
      sheet: S.PEOPLE,
    },
    {
      label: 'Calendar entries with no date',
      count: `COUNTIFS(${R(S.CALENDAR, 'calId')},"?*",${R(S.CALENDAR, 'when')},"")`,
      detail: 'An undated entry can never reach the next-seven-days list.',
      sheet: S.CALENDAR,
    },
    {
      label: 'Orders expected but with no expected date',
      count: `COUNTIF(${R(S.ORDERS, 'attention')},"MISSING DATE")`,
      detail: 'The order cannot be judged late or on time.',
      sheet: S.ORDERS,
    },
    {
      label: 'Refunds recorded as received with no amount and no expectation',
      count: `COUNTIFS(${R(S.RETURNS, 'refundReceivedFlag')},"Yes",${R(S.RETURNS, 'refundAmount')},"",${R(S.RETURNS, 'refundExpected')},"")`,
      detail: 'A refund marked received but worth nothing subtracts nothing.',
      sheet: S.RETURNS,
    },
    {
      label: 'Gift rows flagged as possible duplicates',
      count: `COUNTIF(${R(S.GIFTS, 'dupWarning')},"CHECK DUPLICATE")`,
      detail: 'Sometimes deliberate. Worth one look before December.',
      sheet: S.GIFTS,
    },
  ];

  for (const item of consistency) {
    bodyText(ws, { row, col: 2, text: item.label, size: 10 });
    setNumber(ws, row, 3, item.count);
    exceptionCells.push(`C${row}`);
    const link = ws.getRow(row).getCell(4);
    link.value = { text: item.sheet, hyperlink: `#'${item.sheet}'!A1` };
    link.font = { name: UI_FONT, size: 9, color: { argb: TOKENS.PINE_2 } };
    bodyText(ws, { row, col: 7, text: item.detail, size: 9, colour: TOKENS.MUTED, wrap: true });
    for (let c = 2; c <= 7; c += 1) ws.getRow(row).getCell(c).border = { bottom: thin() };
    row += 1;
  }
  row += 2;

  /* --- 4. Formula errors --------------------------------------------- */
  sectionHeading(ws, { row, col: 2, columnCount: width, text: 'Formula errors' });
  row += 2;
  const scanned = [
    [S.BUDGET, 'planned'], [S.BUDGET, 'actual'], [S.BUDGET, 'status'],
    [S.PEOPLE, 'combinedActual'], [S.PEOPLE, 'status'],
    [S.GIFTS, 'plannedCost'], [S.GIFTS, 'active'], [S.GIFTS, 'arrived'],
    [S.ORDERS, 'attention'], [S.RETURNS, 'refundCounted'], [S.CALENDAR, 'due'],
  ];
  const errorFormula = scanned.map(([sheet, key]) => `SUMPRODUCT(--ISERROR(${R(sheet, key)}))`).join('+');
  bodyText(ws, { row, col: 2, text: 'Calculated cells reporting an error', size: 10 });
  setNumber(ws, row, 3, errorFormula);
  exceptionCells.push(`C${row}`);
  bodyText(ws, { row, col: 7, text: 'Checked across the budget, people, gift, order, refund and calendar calculations. Anything other than zero should be reported before you go further.', size: 9, colour: TOKENS.MUTED, wrap: true });
  ws.getRow(row).height = 26;
  row += 3;

  /* --- Total ---------------------------------------------------------- */
  const totalRow = row;
  const reconMismatch = reconRows.map((r) => `IF(ABS(E${r})<0.005,0,1)`).join('+');
  bodyText(ws, { row: totalRow, col: 2, text: 'Everything above, added up', size: 12, bold: true, colour: TOKENS.PINE });
  const totalCell = ws.getRow(totalRow).getCell(3);
  totalCell.value = { formula: `${reconMismatch}+${exceptionCells.join('+')}` };
  totalCell.font = { name: DISPLAY_FONT, size: 20, bold: true, color: { argb: TOKENS.OXBLOOD } };
  totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalCell.protection = { locked: true };
  bodyText(ws, { row: totalRow, col: 7, text: 'This is the number the dashboard shows. Zero means every figure in the workbook traces back to a row you can open.', size: 10, wrap: true, colour: TOKENS.INK });
  ws.getRow(totalRow).height = 30;

  ws.views = [{ showGridLines: false, zoomScale: 90, state: 'frozen', ySplit: LAYOUT.LEGEND_ROW }];
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  ws.properties.tabColor = { argb: TOKENS.MUTED };

  for (let r = 1; r <= totalRow + 2; r += 1) {
    for (let c = 1; c <= width; c += 1) ws.getRow(r).getCell(c).protection = { locked: true };
  }

  return { totalCell: `C${totalRow}`, totalRow };
}

function setNumber(ws, row, col, formula, numFmt) {
  const cell = ws.getRow(row).getCell(col);
  cell.value = { formula };
  cell.numFmt = numFmt ?? '#,##0;-#,##0;0';
  cell.font = { name: UI_FONT, size: 11, bold: true, color: { argb: TOKENS.PINE } };
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  cell.fill = fill(TOKENS.MIST);
  cell.protection = { locked: true };
  return cell;
}

function setStatus(ws, row, col, formula) {
  const cell = ws.getRow(row).getCell(col);
  cell.value = { formula };
  cell.font = { name: UI_FONT, size: 10, bold: true, color: { argb: TOKENS.PINE_2 } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  cell.protection = { locked: true };
  return cell;
}

export { LISTS };
