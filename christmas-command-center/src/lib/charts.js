/**
 * Chart injection.
 *
 * ExcelJS writes everything this workbook needs except charts, and PRD §7.1
 * asks for exactly two: budget by category, and completion. Rather than change
 * writer — and lose the styling, validation and protection ExcelJS does well —
 * the two charts are written straight into the package afterwards as
 * DrawingML, which is what Excel would have written itself.
 *
 * Both charts read a fixed range on the dashboard that a formula fills, so the
 * ranges never need to move and nothing here depends on a dynamic name.
 */
import JSZip from 'jszip';
import { readFile, writeFile } from 'node:fs/promises';
import { TOKENS, SHEETS } from '../config.js';
import { DASH } from '../sheets/pages.js';

const NS = {
  c: 'http://schemas.openxmlformats.org/drawingml/2006/chart',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  xdr: 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
};

const CHART_TYPE = 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml';
const DRAWING_TYPE = 'application/vnd.openxmlformats-officedocument.drawing+xml';

/** Palette without the leading alpha byte — DrawingML wants six hex digits. */
const rgb = (token) => token.slice(2);

function sheetRef(column, first, last) {
  return `${SHEETS.DASHBOARD}!$${column}$${first}${last ? `:$${column}$${last}` : ''}`;
}

function textProps({ size = 900, colour = TOKENS.INK, bold = 0 } = {}) {
  return `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}" b="${bold}"><a:solidFill><a:srgbClr val="${rgb(colour)}"/></a:solidFill><a:latin typeface="Aptos"/></a:defRPr></a:pPr><a:endParaRPr lang="en-GB"/></a:p></c:txPr>`;
}

function title(text) {
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1000" b="1"><a:solidFill><a:srgbClr val="${rgb(TOKENS.PINE)}"/></a:solidFill><a:latin typeface="Aptos"/></a:defRPr></a:pPr><a:r><a:rPr lang="en-GB" sz="1000" b="1"/><a:t>${text}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`;
}

function series({ index, nameRef, catRef, valRef, colour, pointCount, numberFormat = 'General' }) {
  return [
    '<c:ser>',
    `<c:idx val="${index}"/><c:order val="${index}"/>`,
    `<c:tx><c:strRef><c:f>${nameRef}</c:f><c:strCache><c:ptCount val="1"/></c:strCache></c:strRef></c:tx>`,
    `<c:spPr><a:solidFill><a:srgbClr val="${rgb(colour)}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>`,
    '<c:invertIfNegative val="0"/>',
    `<c:cat><c:strRef><c:f>${catRef}</c:f><c:strCache><c:ptCount val="${pointCount}"/></c:strCache></c:strRef></c:cat>`,
    `<c:val><c:numRef><c:f>${valRef}</c:f><c:numCache><c:formatCode>${numberFormat}</c:formatCode><c:ptCount val="${pointCount}"/></c:numCache></c:numRef></c:val>`,
    '</c:ser>',
  ].join('');
}

function axes({ catId, valId, valueFormat, valueMax }) {
  const line = `<c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="${rgb(TOKENS.RULE)}"/></a:solidFill></a:ln></c:spPr>`;
  return [
    `<c:catAx><c:axId val="${catId}"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:delete val="0"/><c:axPos val="l"/>`,
    line, `<c:tickLblPos val="nextTo"/>${textProps({ size: 850, colour: TOKENS.INK })}`,
    `<c:crossAx val="${valId}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`,
    `<c:valAx><c:axId val="${valId}"/><c:scaling><c:orientation val="minMax"/>${valueMax ? `<c:max val="${valueMax}"/>` : ''}<c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>`,
    `<c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="${rgb(TOKENS.MIST)}"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>`,
    `<c:numFmt formatCode="${valueFormat}" sourceLinked="0"/>`,
    line, `<c:tickLblPos val="nextTo"/>${textProps({ size: 850, colour: TOKENS.MUTED })}`,
    `<c:crossAx val="${catId}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`,
  ].join('');
}

function chartSpace({ titleText, sers, catId, valId, valueFormat, valueMax, legend, gapWidth = 60, overlap = -20 }) {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<c:chartSpace xmlns:c="${NS.c}" xmlns:a="${NS.a}" xmlns:r="${NS.r}">`,
    '<c:roundedCorners val="0"/><c:chart>',
    title(titleText),
    '<c:plotArea><c:layout/>',
    `<c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="0"/>${sers}`,
    `<c:gapWidth val="${gapWidth}"/><c:overlap val="${overlap}"/><c:axId val="${catId}"/><c:axId val="${valId}"/></c:barChart>`,
    axes({ catId, valId, valueFormat, valueMax }),
    `<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>`,
    '</c:plotArea>',
    legend ? `<c:legend><c:legendPos val="b"/><c:overlay val="0"/>${textProps({ size: 850, colour: TOKENS.MUTED })}</c:legend>` : '<c:legend><c:legendPos val="b"/><c:overlay val="0"/><c:delete val="1"/></c:legend>',
    '<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>',
    `<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${rgb(TOKENS.RULE)}"/></a:solidFill></a:ln></c:spPr>`,
    '</c:chartSpace>',
  ].join('');
}

function budgetChart(moneyFormatCode) {
  const first = DASH.DATA_FIRST;
  const last = DASH.DATA_FIRST + DASH.DATA_ROWS - 1;
  const sers = [
    series({
      index: 0, nameRef: sheetRef('D', DASH.DATA_HEADER), catRef: sheetRef('B', first, last),
      valRef: sheetRef('D', first, last), colour: TOKENS.CHAMPAGNE, pointCount: DASH.DATA_ROWS,
      numberFormat: moneyFormatCode,
    }),
    series({
      index: 1, nameRef: sheetRef('E', DASH.DATA_HEADER), catRef: sheetRef('B', first, last),
      valRef: sheetRef('E', first, last), colour: TOKENS.PINE, pointCount: DASH.DATA_ROWS,
      numberFormat: moneyFormatCode,
    }),
  ].join('');
  return chartSpace({
    titleText: 'Budget and spend, ten largest categories', sers, catId: 811110001, valId: 811110002,
    valueFormat: '#,##0', legend: true, gapWidth: 40, overlap: -10,
  });
}

function progressChart() {
  const first = DASH.PROGRESS_FIRST;
  const last = DASH.PROGRESS_FIRST + DASH.PROGRESS_ROWS - 1;
  const sers = series({
    index: 0, nameRef: sheetRef('L', DASH.DATA_HEADER), catRef: sheetRef('J', first, last),
    valRef: sheetRef('L', first, last), colour: TOKENS.PINE_2, pointCount: DASH.PROGRESS_ROWS,
    numberFormat: '0%',
  });
  return chartSpace({
    titleText: 'Completed', sers, catId: 822220001, valId: 822220002,
    valueFormat: '0%', valueMax: 1, legend: false, gapWidth: 80, overlap: 0,
  });
}

function drawing(anchors) {
  const body = anchors.map(({ from, to, id, name, rid }) => [
    '<xdr:twoCellAnchor editAs="oneCell">',
    `<xdr:from><xdr:col>${from.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${from.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`,
    `<xdr:to><xdr:col>${to.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${to.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`,
    '<xdr:graphicFrame macro="">',
    `<xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="${name}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>`,
    '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>',
    `<a:graphic><a:graphicData uri="${NS.c}"><c:chart xmlns:c="${NS.c}" xmlns:r="${NS.r}" r:id="${rid}"/></a:graphicData></a:graphic>`,
    '</xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>',
  ].join('')).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${NS.xdr}" xmlns:a="${NS.a}">${body}</xdr:wsDr>`;
}

/** Finds the part path of a worksheet by its display name. */
async function locateSheet(zip, sheetName) {
  const workbook = await zip.file('xl/workbook.xml').async('string');
  const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const escaped = sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<sheet[^>]*name="${escaped}"[^>]*r:id="([^"]+)"`).exec(workbook);
  if (!match) throw new Error(`Sheet "${sheetName}" not found in the package`);
  const relMatch = new RegExp(`Id="${match[1]}"[^>]*Target="([^"]+)"`).exec(rels);
  if (!relMatch) throw new Error(`No relationship for "${sheetName}"`);
  return `xl/${relMatch[1].replace(/^\/?xl\//, '')}`;
}

function nextRelId(relsXml) {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  return `rId${(ids.length ? Math.max(...ids) : 0) + 1}`;
}

export async function injectCharts(path, { symbol }) {
  const zip = await JSZip.loadAsync(await readFile(path));
  const sheetPath = await locateSheet(zip, SHEETS.DASHBOARD);
  const sheetFile = sheetPath.split('/').pop();

  const existing = Object.keys(zip.files).filter((n) => /^xl\/drawings\/drawing\d+\.xml$/.test(n));
  const drawingIndex = existing.length + 1;
  const drawingPath = `xl/drawings/drawing${drawingIndex}.xml`;

  const charts = Object.keys(zip.files).filter((n) => /^xl\/charts\/chart\d+\.xml$/.test(n)).length;
  const chart1 = `chart${charts + 1}.xml`;
  const chart2 = `chart${charts + 2}.xml`;

  const moneyCode = `"${symbol}"#,##0`;
  zip.file(`xl/charts/${chart1}`, budgetChart(moneyCode));
  zip.file(`xl/charts/${chart2}`, progressChart());

  zip.file(drawingPath, drawing([
    { from: { col: 1, row: DASH.CHART_TOP - 1 }, to: { col: 8, row: DASH.CHART_BOTTOM - 1 },
      id: 2, name: 'Budget by category', rid: 'rId1' },
    { from: { col: 9, row: DASH.CHART_TOP - 1 }, to: { col: 16, row: DASH.CHART_BOTTOM - 1 },
      id: 3, name: 'Completion', rid: 'rId2' },
  ]));
  zip.file(`xl/drawings/_rels/drawing${drawingIndex}.xml.rels`,
    ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      `<Relationship Id="rId1" Type="${NS.r}/chart" Target="../charts/${chart1}"/>`,
      `<Relationship Id="rId2" Type="${NS.r}/chart" Target="../charts/${chart2}"/>`,
      '</Relationships>'].join(''));

  // The worksheet's relationship to its drawing.
  const relPath = `xl/worksheets/_rels/${sheetFile}.rels`;
  let sheetRels = zip.file(relPath)
    ? await zip.file(relPath).async('string')
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const rid = nextRelId(sheetRels);
  sheetRels = sheetRels.replace('</Relationships>',
    `<Relationship Id="${rid}" Type="${NS.r}/drawing" Target="../drawings/drawing${drawingIndex}.xml"/></Relationships>`);
  zip.file(relPath, sheetRels);

  // <drawing> sits after pageSetup and before legacyDrawing in CT_Worksheet.
  let sheetXml = await zip.file(sheetPath).async('string');
  const drawingTag = `<drawing r:id="${rid}"/>`;
  sheetXml = sheetXml.includes('<legacyDrawing')
    ? sheetXml.replace('<legacyDrawing', `${drawingTag}<legacyDrawing`)
    : sheetXml.replace('</worksheet>', `${drawingTag}</worksheet>`);
  zip.file(sheetPath, sheetXml);

  let types = await zip.file('[Content_Types].xml').async('string');
  const overrides = [
    `<Override PartName="/xl/charts/${chart1}" ContentType="${CHART_TYPE}"/>`,
    `<Override PartName="/xl/charts/${chart2}" ContentType="${CHART_TYPE}"/>`,
    `<Override PartName="/${drawingPath}" ContentType="${DRAWING_TYPE}"/>`,
  ].join('');
  types = types.replace('</Types>', `${overrides}</Types>`);
  zip.file('[Content_Types].xml', types);

  await writeFile(path, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  return { charts: [chart1, chart2], drawing: drawingPath, sheet: sheetPath };
}
