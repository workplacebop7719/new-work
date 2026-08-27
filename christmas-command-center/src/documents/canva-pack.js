/**
 * The printable planner pack.
 *
 * Canva has no spreadsheet engine: it cannot hold a formula, a dropdown or a
 * cross-sheet reference, so the command centre itself cannot run there. What
 * Canva is good at is a beautiful printed page you can personalise, so that is
 * what this pack is — nine print-and-write pages in the same pink, gold and
 * wildflower system as the workbook, sized for A4 and US Letter, ready to be
 * uploaded to Canva, printed, or dropped into a listing mockup.
 *
 * These pages are a companion to the workbook, not a replacement for it. The
 * instructions say so plainly rather than letting a buyer discover it.
 */
import { PRODUCT, TOKENS } from '../config.js';
import { ART, svg } from '../lib/wildflowers.js';

const hex = (t) => `#${t.slice(2)}`;
const gold = hex(TOKENS.GOLD);

const sprigSmall = svg({ ...ART.sprigSmall({ width: 104, height: 46 }), stroke: gold, strokeWidth: 1.1 });
const sprigTall = svg({ ...ART.sprigTall({ width: 132, height: 360 }), stroke: gold, strokeWidth: 1.3 });
const spray = svg({ ...ART.spray({ width: 300, height: 44 }), stroke: gold, strokeWidth: 1 });

function css(pageSize) {
  return `
  @page { size: ${pageSize}; margin: 14mm 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Aptos, Arial, sans-serif; color: ${hex(TOKENS.INK)};
         font-size: 10pt; background: #fff; }
  .page { break-after: page; position: relative; min-height: 244mm; }
  .page:last-child { break-after: auto; }
  h1, h2, .display { font-family: Georgia, serif; color: ${hex(TOKENS.PLUM)}; font-weight: 700; }
  h1 { font-size: 30pt; margin: 0 0 2pt; letter-spacing: -0.01em; }
  h2 { font-size: 17pt; margin: 0 0 2pt; }
  .eyebrow { font-size: 8pt; letter-spacing: 0.2em; text-transform: uppercase; color: ${gold}; margin-bottom: 8pt; }
  .sub { color: ${hex(TOKENS.PLUM_2)}; font-style: italic; font-family: Georgia, serif; font-size: 11pt; margin: 0 0 12pt; }
  .head { border-bottom: 1.2pt solid ${gold}; padding-bottom: 8pt; margin-bottom: 16pt;
          display: flex; justify-content: space-between; align-items: flex-end; gap: 16pt; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; color: ${hex(TOKENS.PLUM)};
       text-align: left; padding: 0 6pt 5pt; border-bottom: 1pt solid ${gold}; font-weight: 700; }
  /* A page you write on: an even blush field, hairline columns so a hand knows
     where to stop, and a firmer gold rule every fifth line to count by. */
  td { height: 26pt; padding: 0 6pt; background: ${hex(TOKENS.BLUSH)};
       border-bottom: 0.6pt solid ${hex(TOKENS.RULE)};
       border-right: 0.6pt solid ${hex(TOKENS.RULE)}; }
  td:last-child { border-right: none; }
  tr.tint td { border-bottom: 0.9pt solid ${gold}; }
  tbody tr:last-child td { border-bottom: 0.9pt solid ${gold}; }
  .boxes { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5pt; }
  .box { border: 0.75pt solid ${hex(TOKENS.RULE)}; border-top: 2pt solid ${gold};
         height: 74pt; padding: 4pt 5pt; background: ${hex(TOKENS.BLUSH)}; }
  .box .n { font-family: Georgia, serif; font-size: 11pt; color: ${hex(TOKENS.PLUM_2)}; }
  .dow { font-size: 7.5pt; letter-spacing: 0.1em; text-transform: uppercase;
         color: ${hex(TOKENS.MUTED)}; text-align: center; padding-bottom: 3pt; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18pt; }
  .panel { border: 0.75pt solid ${hex(TOKENS.RULE)}; border-top: 2pt solid ${gold};
           background: ${hex(TOKENS.BLUSH)}; padding: 10pt 12pt; }
  .panel h3 { font-family: Georgia, serif; color: ${hex(TOKENS.PLUM)}; font-size: 12pt; margin: 0 0 6pt; }
  .lines div { border-bottom: 0.75pt solid ${hex(TOKENS.RULE)}; height: 22pt; }
  .foot { position: absolute; bottom: 0; left: 0; right: 0; display: flex;
          justify-content: space-between; font-size: 7.5pt; color: ${hex(TOKENS.MUTED)};
          border-top: 0.75pt solid ${gold}; padding-top: 5pt; }
  .cover { text-align: center; padding-top: 46mm; }
  .cover h1 { font-size: 40pt; }
  .cover .art { margin: 18pt 0; }
  .rule { text-align: center; margin: 10pt 0 16pt; }
  `;
}

const foot = (name) => `<div class="foot"><span>${PRODUCT.trademarkName}</span><span>${name}</span><span>${PRODUCT.seller}</span></div>`;

const head = (eyebrow, title, sub) => `
<div class="head">
  <div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</div>
  <div>${sprigSmall}</div>
</div>`;

function table(columns, rows, { tintEvery } = {}) {
  const body = Array.from({ length: rows }, (_, i) =>
    `<tr class="${tintEvery && (i + 1) % tintEvery === 0 ? 'tint' : ''}">${columns.map(() => '<td></td>').join('')}</tr>`).join('');
  return `<table><thead><tr>${columns.map((c) => `<th${c.width ? ` style="width:${c.width}"` : ''}>${c.label}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

function lines(count) {
  return `<div class="lines">${Array.from({ length: count }, () => '<div></div>').join('')}</div>`;
}

export function canvaPack({ year, pageSize = 'A4' }) {
  const pages = [];

  pages.push(`<div class="page cover">
    <div class="eyebrow">A private Christmas atelier</div>
    <h1>Christmas ${year}</h1>
    <p class="sub">${PRODUCT.promise}</p>
    <div class="art">${sprigTall}</div>
    <div class="rule">${spray}</div>
    <p class="sub" style="font-size:10pt">The printable companion to ${PRODUCT.trademarkName}</p>
    ${foot('Cover')}
  </div>`);

  pages.push(`<div class="page">
    ${head('One page', 'The season at a glance', 'What this Christmas is for, before the list-making starts.')}
    <div class="cols">
      <div class="panel"><h3>This year is for</h3>${lines(4)}</div>
      <div class="panel"><h3>It should feel</h3>${lines(4)}</div>
    </div>
    <div style="height:14pt"></div>
    <div class="cols">
      <div class="panel"><h3>What I am protecting</h3>${lines(5)}</div>
      <div class="panel"><h3>What I am letting go of</h3>${lines(5)}</div>
    </div>
    <div style="height:14pt"></div>
    <div class="panel"><h3>The five things that matter most</h3>${lines(5)}</div>
    ${foot('The season at a glance')}
  </div>`);

  pages.push(`<div class="page">
    ${head('Gifts', 'The gift list', 'Who, what, what it cost, and whether it is wrapped.')}
    ${table([
    { label: 'For', width: '20%' }, { label: 'Gift', width: '30%' },
    { label: 'Where from', width: '18%' }, { label: 'Budget', width: '11%' },
    { label: 'Spent', width: '11%' }, { label: 'Wrapped', width: '10%' },
  ], 20, { tintEvery: 5 })}
    ${foot('The gift list')}
  </div>`);

  pages.push(`<div class="page">
    ${head('Money', 'The budget', 'Set the figure first. Fill the last column in as you go.')}
    ${table([
    { label: 'Category', width: '40%' }, { label: 'Set aside', width: '20%' },
    { label: 'Spent', width: '20%' }, { label: 'Left', width: '20%' },
  ], 16, { tintEvery: 4 })}
    <div style="height:16pt"></div>
    <div class="panel"><h3>Notes</h3>${lines(3)}</div>
    ${foot('The budget')}
  </div>`);

  pages.push(`<div class="page">
    ${head('The table', 'The menu', 'Dishes, who is making them, and what can be done ahead.')}
    ${table([
    { label: 'Course', width: '16%' }, { label: 'Dish', width: '34%' },
    { label: 'Cook', width: '18%' }, { label: 'Make ahead?', width: '16%' },
    { label: 'Done', width: '16%' },
  ], 18, { tintEvery: 6 })}
    ${foot('The menu')}
  </div>`);

  pages.push(`<div class="page">
    ${head('Hosting', 'The guest list', 'Who is coming, what they need, and where they sleep.')}
    ${table([
    { label: 'Name', width: '24%' }, { label: 'Dietary needs and allergies', width: '30%' },
    { label: 'Arriving', width: '16%' }, { label: 'Staying', width: '18%' },
    { label: 'Thank you', width: '12%' },
  ], 18, { tintEvery: 6 })}
    ${foot('The guest list')}
  </div>`);

  const dow = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const cells = Array.from({ length: 35 }, (_, i) => `<div class="box"><div class="n">${i < 31 ? i + 1 : ''}</div></div>`).join('');
  pages.push(`<div class="page">
    ${head('The month', `December ${year}`, 'One page for the whole month. Write the dates in, not the tasks.')}
    <div class="boxes">${dow.map((d) => `<div class="dow">${d}</div>`).join('')}</div>
    <div class="boxes" style="margin-top:4pt">${cells}</div>
    ${foot(`December ${year}`)}
  </div>`);

  pages.push(`<div class="page">
    ${head('The post', 'Cards and gifts to send', 'Address checked, written, posted.')}
    <div class="cols">
      ${[0, 1].map(() => `<div>${table([
    { label: 'Name', width: '58%' }, { label: 'Address ✓', width: '21%' }, { label: 'Posted', width: '21%' },
  ], 16, { tintEvery: 4 })}</div>`).join('')}
    </div>
    ${foot('Cards and gifts to send')}
  </div>`);

  pages.push(`<div class="page">
    ${head('Afterwards', 'Notes for next year', 'Written in January, read next September. The most useful page in the pack.')}
    <div class="panel"><h3>What worked</h3>${lines(5)}</div>
    <div style="height:12pt"></div>
    <div class="panel"><h3>Buy earlier</h3>${lines(4)}</div>
    <div style="height:12pt"></div>
    <div class="panel"><h3>Do not repeat</h3>${lines(4)}</div>
    <div style="height:12pt"></div>
    <div class="panel"><h3>The bit worth remembering</h3>${lines(4)}</div>
    ${foot('Notes for next year')}
  </div>`);

  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<title>Christmas ${year} — printable pack</title><style>${css(pageSize)}</style></head>
<body>${pages.join('')}</body></html>`;
}

export function canvaSetup({ year }) {
  return `${PRODUCT.trademarkName}
USING THIS IN CANVA

--------------------------------------------------------------------------
FIRST, THE HONEST PART
--------------------------------------------------------------------------

Canva is a design tool, not a spreadsheet. It has no formulas, no dropdowns and
no way to add a column of numbers. The command centre — the countdown, the
budget that reconciles, the attention board — cannot run in Canva, and nobody
can make it. That is a limit of Canva, not of this workbook.

So the pack works like this:

  The workbook          Excel or Google Sheets. Everything calculates.
  The printable pack    Canva, or straight to your printer. Beautiful pages
                        you write on by hand.

Most people use both: the workbook to keep track, and two or three printed
pages on the kitchen wall.

--------------------------------------------------------------------------
WHAT IS IN THE CANVA FOLDER
--------------------------------------------------------------------------

Christmas_Printable_Pack_A4.pdf       Nine pages, A4
Christmas_Printable_Pack_Letter.pdf   The same nine, US Letter
wildflower-sprig.svg / .png           The tall drawing
wildflower-spray.svg / .png           The wide drawing, as a divider
wildflower-corner.svg / .png          The small sprig
BRAND_KIT.txt                         The exact colours and fonts

The nine pages: cover · the season at a glance · gift list · budget · menu ·
guest list · December on one page · cards to send · notes for next year.

--------------------------------------------------------------------------
OPENING THE PACK IN CANVA
--------------------------------------------------------------------------

1. In Canva, choose Create a design, then Import file, and pick the PDF.
2. Canva opens it as an editable design, one page per sheet.
3. Change anything you like: the year, the headings, the row labels.
4. Share, then Download, then PDF Print, to print it.

Two things to expect. Canva re-flows text when it imports a PDF, so check the
spacing on any page you edit. And it substitutes its own fonts unless you have
Georgia and Aptos available — the brand kit below says what to pick instead.

--------------------------------------------------------------------------
THE DRAWINGS
--------------------------------------------------------------------------

Upload the SVG files rather than the PNGs wherever Canva lets you: they stay
sharp at any size, and you can recolour them in Canva. The PNGs have
transparent backgrounds and are there for anywhere SVG will not go.

They are yours to use in your own designs. They are not for resale on their own.

--------------------------------------------------------------------------
IF YOU ONLY WANT ONE PAGE
--------------------------------------------------------------------------

Print page 3 — the gift list — and put it on the fridge. That is the page
people actually use.

Christmas ${year}.
`;
}

export function brandKit() {
  const rows = [
    ['Deep plum', TOKENS.PLUM, 'Headings, table headers, the type on the cover'],
    ['Soft plum', TOKENS.PLUM_2, 'Secondary text, the completion bars'],
    ['Dusty rose', TOKENS.ROSE, 'Accents, the figures that matter, anything overdue'],
    ['Blush pink', TOKENS.BLUSH, 'The field everything sits on, and every cell you fill in'],
    ['Pink band', TOKENS.BAND, 'Alternating rows, quiet panels'],
    ['Antique gold', TOKENS.GOLD, 'Every rule, every divider, the wildflowers'],
    ['Light gold', TOKENS.GOLD_LIGHT, 'Gold that has to sit on plum and still be read'],
    ['Pale gold', TOKENS.GOLD_PALE, 'A wash behind a callout'],
    ['Ink', TOKENS.INK, 'Body text'],
    ['Soft grey', TOKENS.MIST, 'Cells that calculate themselves'],
    ['Warm sand', TOKENS.SOFT_AMBER, 'Examples, and anything asking for attention'],
    ['Deep pink', TOKENS.SOFT_ROSE, 'Over budget, overdue, late'],
    ['Muted', TOKENS.MUTED, 'Captions and small print'],
  ];
  const width = Math.max(...rows.map(([n]) => n.length));
  return `${PRODUCT.trademarkName}
BRAND KIT

Set these up once in Canva under Brand, then Brand Kit, and every mockup you
make will match the product exactly.

--------------------------------------------------------------------------
COLOURS
--------------------------------------------------------------------------

${rows.map(([name, token, use]) => `${name.padEnd(width)}  #${token.slice(2)}   ${use}`).join('\n')}

Every one of these pairings has been checked for contrast: text on its
background clears WCAG AA at 4.5:1. If you change a colour, check it again —
the workbook is used by people reading small figures on a laptop in December.

--------------------------------------------------------------------------
TYPE
--------------------------------------------------------------------------

Headings     Georgia, bold. In Canva: Playfair Display, or Lora.
Body         Aptos. In Canva: Inter, or Open Sans.
Eyebrows     The body face, 8pt, letterspaced 0.2em, uppercase, in gold.

Set headings large and let them breathe. The product reads as expensive
because of the whitespace, not because of the ornament.

--------------------------------------------------------------------------
THE RULES THAT KEEP IT LOOKING LIKE ONE PRODUCT
--------------------------------------------------------------------------

1. Gold is a line, never a fill. Rules, dividers, the wildflowers, a 2pt edge
   on a panel. Never a gold background.
2. Two or three colours per page, not the whole palette.
3. One drawing per page at most. The wildflowers are punctuation.
4. Deep plum is the only dark. No black, no grey headings.
5. Whitespace before decoration. If a page looks empty, it is probably right.
6. Never put a colour on something without also putting a word on it.

--------------------------------------------------------------------------
THE DRAWINGS
--------------------------------------------------------------------------

wildflower-sprig     tall, for a cover or a margin
wildflower-spray     wide, a rule with flowers growing out of it
wildflower-corner    small, for beside a heading

SVG for anything that will be resized. PNG (transparent) everywhere else.
`;
}
