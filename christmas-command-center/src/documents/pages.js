/**
 * The three customer PDFs (§3), written as HTML and printed by Chromium.
 *
 * The copy standard from §11.3 applies here as much as in the workbook: warm,
 * concise, human. No "seamless", no "unlock", no promise the product cannot
 * keep — in particular no claim about saving money or removing stress, and no
 * compatibility claim that has not been tested (§13.3).
 */
import { PRODUCT, SHEET_ORDER, OPTIONAL_SHEETS, TOKENS, CAPACITY, LISTS } from '../config.js';
import { document_ } from './style.js';
import { ART, svg } from '../lib/wildflowers.js';

const hex = (t) => `#${t.slice(2)}`;
const NAME = PRODUCT.trademarkName;

const gold = `#${TOKENS.GOLD.slice(2)}`;

const sprig = svg({ ...ART.sprigSmall({ width: 104, height: 46 }), stroke: gold, strokeWidth: 1.1 });
const spray = svg({ ...ART.spray({ width: 300, height: 44 }), stroke: gold, strokeWidth: 1 });

const cover = (eyebrow, title, lede) => `
<div class="cover">
  <div class="eyebrow">${eyebrow}</div>
  <h1>${title}</h1>
  <p class="lede">${lede}</p>
  <div class="art">${sprig}</div>
</div>
<div class="rule-art">${spray}</div>`;

const foot = (docName) => `
<div class="foot">
  ${NAME} · Edition ${PRODUCT.edition} · ${docName}<br>
  ${PRODUCT.seller} · For your own household. Not for resale, redistribution or sharing.
</div>`;

/* ================================================================== *
 * READ ME FIRST — delivery and access
 * ================================================================== */
export function readMeFirst() {
  const body = `
${cover('Before you open anything', 'Read me first', 'What you have just downloaded, and how to open it.')}

<h2>What is in the folder</h2>
<table>
  <tr><th>Folder</th><th>What is in it</th></tr>
  <tr><td>01_START_HERE</td><td>This page, and the illustrated quick-start guide.</td></tr>
  <tr><td>02_EXCEL</td><td>The workbook for Microsoft Excel.</td></tr>
  <tr><td>03_GOOGLE_SHEETS</td><td>The workbook prepared for Google Sheets, and how to import it.</td></tr>
  <tr><td>04_CANVA_AND_PRINTABLE</td><td>Nine printable pages in A4 and US Letter, the wildflower drawings, and the brand kit — for Canva, or straight to your printer.</td></tr>
  <tr><td>05_LICENSE</td><td>What you may and may not do with it.</td></tr>
  <tr><td>06_SUPPORT</td><td>Questions people ask, and the record of changes.</td></tr>
</table>

<h2>Getting the files out</h2>
<div class="step"><div class="n">1</div><div>
  <h3>Unzip the download first</h3>
  <p>On Windows, right-click the .zip and choose Extract All. On a Mac, double-click it. Do not try to open the workbook from inside the zip — it will open read-only and nothing you type will be saved.</p>
</div></div>
<div class="step"><div class="n">2</div><div>
  <h3>Open the edition you use</h3>
  <p>Excel: open <strong>Christmas_Master_Command_Center_Excel.xlsx</strong> from 02_EXCEL. Google Sheets: follow the short instructions in 03_GOOGLE_SHEETS.</p>
</div></div>
<div class="step"><div class="n">3</div><div>
  <h3>Save your own copy before you type</h3>
  <p>File, Save As, and give it this year's name. Keep the original untouched — next December you will want a clean one.</p>
</div></div>
<div class="step"><div class="n">4</div><div>
  <h3>Go to START HERE inside the workbook</h3>
  <p>It is the second tab. Six steps, and you are planning.</p>
</div></div>
<div class="step"><div class="n">5</div><div>
  <h3>Print a page or two, if you like paper</h3>
  <p>04_CANVA_AND_PRINTABLE has nine write-on pages in the same design. The gift list on the fridge is the one people actually use.</p>
</div></div>

<h2>What it works in</h2>
<table>
  <tr><th>Where</th><th>What to expect</th></tr>
  <tr><td>Microsoft Excel on Windows or Mac (Microsoft 365, 2021, 2019)</td><td>Everything: formulas, dropdowns, the two charts, protection, print set-up.</td></tr>
  <tr><td>Google Sheets</td><td>Formulas, dropdowns, filters and formatting. Some Excel-only details change on import — 03_GOOGLE_SHEETS lists them plainly.</td></tr>
  <tr><td>Excel or Sheets on a phone or tablet</td><td>Readable, and fine for ticking something off. Setting up on a small screen is hard work; do that on a computer.</td></tr>
  <tr><td>Canva</td><td>Not for the workbook — Canva has no formulas and cannot calculate anything. It is for the printable pack in 04, which you can upload, personalise and print. Canva_Setup.txt explains it.</td></tr>
  <tr><td>Apple Numbers, LibreOffice, WPS</td><td>Not tested. They may open the file and may lose formatting or formulas. We cannot support them.</td></tr>
</table>

<div class="note">
  <strong>No macros, no add-ins, no sign-in.</strong> This is an ordinary spreadsheet file. It does not send anything anywhere, and it does not need an internet connection to work.
</div>

<h2>What you type into it</h2>
<p>The workbook sits on your own device or your own drive. It is not encrypted, and anyone who can open the file can read everything in it. Keep sizes, preferences and hiding places here — that is what it is for. Keep card numbers, passwords and identity documents somewhere else.</p>

<h2>If something is wrong</h2>
<p>If a file will not open or a figure looks wrong, message ${PRODUCT.seller} through your order on Etsy and say which edition you are using and which sheet the problem is on. Support covers the files as delivered: opening them, missing files, and errors in the workbook itself. It does not cover teaching Excel or Google Sheets from scratch, customisations you have made, or software we have not tested.</p>

${foot('Read me first')}`;
  return document_({ title: 'Read me first', body });
}

/* ================================================================== *
 * START HERE — the illustrated quick-start guide
 * ================================================================== */
export function startHere() {
  const optional = OPTIONAL_SHEETS.join(', ');
  const body = `
${cover('A private Christmas atelier', 'Start here', 'Ten minutes of setting up, and the season has somewhere to live.')}

<p>You do not need to know anything about spreadsheets. You will type in the blush-pink cells and read the grey ones. That is the whole idea.</p>

<h2>The ten minutes</h2>
<div class="step"><div class="n">1</div><div>
  <h3>Save a clean copy</h3>
  <p>Before anything else: File, Save As, "Christmas ${new Date().getUTCFullYear() + (new Date().getUTCMonth() > 10 ? 1 : 0)}". Keep the file you downloaded untouched. It is your master.</p>
</div></div>
<div class="step"><div class="n">2</div><div>
  <h3>Fill in SETTINGS</h3>
  <p>Nine boxes: the year, the date of Christmas, when your season starts, your currency, your household name, and four thresholds you can leave alone. Everything else in the workbook reads from these.</p>
</div></div>
<div class="step"><div class="n">3</div><div>
  <h3>Add people before you add gifts</h3>
  <p>Go to PEOPLE + BUDGETS and list who you are giving to, with what you intend to spend on each. Give each one a Person ID — P-001, P-002, and so on. Gifts attach to that ID, which is how the workbook can tell you what you have spent on your mother without your having to add it up.</p>
</div></div>
<div class="step"><div class="n">4</div><div>
  <h3>Decide which modules you want</h3>
  <p>There are ${SHEET_ORDER.length} sheets. Nobody uses all of them. ${optional} are optional and hide cleanly — right-click the tab and choose Hide. Nothing breaks: every total reads an empty sheet as zero.</p>
</div></div>
<div class="step"><div class="n">5</div><div>
  <h3>Write five lines on SEASON VISION</h3>
  <p>What this year is for, how it should feel, what you are protecting. It takes two minutes and it is the thing you will read in the middle of December when you are deciding whether to say yes to one more thing.</p>
</div></div>
<div class="step"><div class="n">6</div><div>
  <h3>Go to the DASHBOARD</h3>
  <p>It will tell you what is unfinished and where to go. Work down the attention board. That is the method — there is nothing else to learn.</p>
</div></div>

<div class="break"></div>
<h2>What the colours mean</h2>
<p>Every colour is backed by a word, so nothing depends on being able to tell two greens apart.</p>
<table>
  <tr><th style="width:60pt">Colour</th><th style="width:90pt">Name</th><th>What it means</th></tr>
  <tr><td><span class="swatch" style="background:${hex(TOKENS.BLUSH)}"></span></td><td>Blush pink</td><td>Yours to fill in.</td></tr>
  <tr><td><span class="swatch" style="background:${hex(TOKENS.MIST)}"></span></td><td>Soft grey</td><td>Calculates itself. Locked, so it cannot be typed over by accident.</td></tr>
  <tr><td><span class="swatch" style="background:${hex(TOKENS.SOFT_AMBER)}"></span></td><td>Amber</td><td>Either an example row you can delete, or something asking for attention.</td></tr>
  <tr><td><span class="swatch" style="background:${hex(TOKENS.SOFT_ROSE)}"></span></td><td>Deep pink</td><td>Over budget, overdue or late. The cell also says so in words.</td></tr>
</table>

<h2>Finding your way around</h2>
<p>Every sheet opens with a dark green strip: Dashboard, Start here, Calendar, Budget, All sheets. SHEET INDEX lists all ${SHEET_ORDER.length} sheets with a line on what each is for and a link straight to it. The tabs along the bottom are in the order you would use them.</p>

<h2>The seven habits that make it work</h2>
<h3>Filter, do not delete</h3>
<p>Every tracker has filters on its header row. Hiding what you are not working on beats deleting rows you will want in January.</p>
<h3>Sorting is safe</h3>
<p>IDs are typed text, not row numbers. Sort a table any way you like; nothing comes unstuck.</p>
<h3>Adding rows</h3>
<p>Each tracker starts with room for a set number of entries — ${CAPACITY['GIFT PLANNER']} gifts, ${CAPACITY['ONLINE ORDERS']} orders, ${CAPACITY['CHRISTMAS CALENDAR']} calendar entries, and so on. If you need more, click a row in the middle of the table and insert above it, so the formulas and dropdowns come with it. Then copy one calculated cell down into the new row.</p>
<h3>Editing the dropdowns</h3>
<p>They all live on the LISTS sheet — ${Object.keys(LISTS).length} lists in all. To add a value, click a row inside the block and insert above it. Adding below the last value does nothing, which is the one thing worth remembering.</p>
<h3>Unprotecting</h3>
<p>Review, then Unprotect Sheet. There is no password. The lock exists only so a calculation is not typed over by mistake; if you want to change one, unprotect and change it.</p>
<h3>Deleting the examples</h3>
<p>Three amber rows on each tracker, every one marked EXAMPLE — DELETE ME. Select the contents and delete them whenever you like. The formulas beside them stay.</p>
<h3>Printing</h3>
<p>The dashboard is set up to print on its own as a Christmas-at-a-glance page. A tracker prints its first columns — the ones worth carrying to the shops — fitted to one page across. Filter the sheet first, or you will print every empty row. To print a whole table instead, go to Page Layout, Print Area, Clear.</p>

<div class="break"></div>
<h2>How the money adds up</h2>
<p>This is the only part worth understanding properly, because it is what makes the dashboard trustworthy.</p>
<ul>
  <li>Every sheet that can cost money has a <strong>Budget category</strong> column.</li>
  <li>MASTER BUDGET adds up everything tagged with each category — planned in one column, actually spent in another.</li>
  <li>A refund only reduces what you have spent once you mark it <strong>received</strong>. Until then it sits on the attention board as money you are owed.</li>
  <li>ONLINE ORDERS deliberately does not add to the budget. The order records the parcel; the gift row records the money. Counting both would double your spending.</li>
  <li>If a cost is tagged with a category the budget does not recognise, it is reported on QUALITY CHECK rather than quietly dropped.</li>
</ul>
<div class="note">QUALITY CHECK is the sheet to open if a number ever looks wrong. Every row on it should read zero. If one does not, it names the sheet to open and what to look for.</div>

<h2>Putting the year away</h2>
<ol>
  <li>Save this year's workbook under its own name and leave it alone. It is the record.</li>
  <li>Open your clean master copy — or, if you only have the one, copy this year's figures into ANNUAL ARCHIVE before you clear anything.</li>
  <li>From MASTER BUDGET, copy the budget and actual totals. From the dashboard, gifts given and guests hosted. Paste them as values, not formulas.</li>
  <li>Delete the contents of the pink cells on each tracker. Do not delete rows, and do not touch the grey columns.</li>
  <li>Change the year on SETTINGS. The countdown, the calendar and every label follow it.</li>
  <li>Read NEXT YEAR NOTES before you plan anything. That is what it was for.</li>
</ol>

<h2>The printable pages</h2>
<p>There are nine of them, in the folder marked 04, in A4 and in US Letter: a cover, the season on one page, the gift list, the budget, the menu, the guest list, December on one page, cards to send, and notes for next year. Print them, or upload the PDF to Canva and change the wording first.</p>
<p>They are a companion to the workbook, not a substitute. Canva cannot add up a column — nothing in it calculates — so the numbers on a printed page are yours to write. The workbook is where the arithmetic lives.</p>

<h2>Questions people ask</h2>
<h3>Can I change the colours?</h3>
<p>Yes. Unprotect the sheet and change any fill you like. The words in the status columns are what carry the meaning, so nothing stops working.</p>
<h3>Can I use it for a currency that is not in the list?</h3>
<p>Yes. SETTINGS has a currency dropdown, and you can add to it on LISTS. The workbook does not convert between currencies — one workbook, one currency.</p>
<h3>I deleted something and a cell now says #REF!</h3>
<p>Close the file without saving and open it again. If you have already saved, the cleanest fix is to start from your master copy. This is why step one is to keep one.</p>
<h3>Why is a category showing as over budget when I have not spent anything?</h3>
<p>Because its budget is zero and something has been tagged to it. Set a budget for it on MASTER BUDGET, or re-tag the cost.</p>
<h3>Can I share it with my sister?</h3>
<p>No — the licence is for your own household. She can buy her own copy, and it will be hers to keep.</p>

${foot('Start here')}`;
  return document_({ title: 'Start here', body });
}

/* ================================================================== *
 * TERMS OF USE — placeholder for seller review
 * ================================================================== */
export function termsOfUse() {
  const body = `
${cover('Licence', 'Terms of use', 'What you may do with this workbook, in plain words.')}

<div class="warn">
  <strong>For the seller, before publishing:</strong> this text is a working draft prepared as part of the build, and it has not been reviewed by a lawyer. Have it checked against the law where you trade and against Etsy's current seller policies, add the contact details you want buyers to use, and delete this box before the file goes into the buyer package.
</div>

<h2>What you are buying</h2>
<p>A licence to use ${NAME} — a spreadsheet workbook and its accompanying documents — for your own personal, household use. You are not buying the design, the formulas, the wording or any other part of the product itself.</p>

<h2>What you may do</h2>
<ul>
  <li>Use it for your own Christmas planning, year after year, for as long as you like.</li>
  <li>Save copies for yourself, and keep one copy per year as a record.</li>
  <li>Change it: rename categories, add rows, adjust colours, hide sheets, unprotect sheets and rewrite formulas.</li>
  <li>Print it for your own use, and share the file with people in your own household.</li>
</ul>

<h2>What you may not do</h2>
<ul>
  <li>Resell it, give it away, or share the file outside your household.</li>
  <li>Upload it anywhere it can be downloaded by others, including template libraries and file-sharing sites.</li>
  <li>Sell anything made from it, including a modified version, a translation, or a derivative template.</li>
  <li>Use it as a paid service for other people, or as part of a course, membership or bundle.</li>
  <li>Claim it as your own design, or remove the attribution from it.</li>
</ul>

<h2>Refunds</h2>
<p>This is a digital download. Because the files are yours the moment you receive them, they cannot be returned. If a file will not open, or something in the workbook is wrong, get in touch and it will be repaired or refunded. This does not affect any statutory right you have.</p>

<h2>What is not promised</h2>
<p>The workbook is a planning tool. It records what you tell it and adds it up. It is not financial advice, and it cannot know about a purchase you have not entered. It is supplied as it is, and it has been tested in Microsoft Excel and Google Sheets as described in the compatibility notes; other software is not supported. The seller is not liable for a decision made from a figure in it, or for any loss arising from its use, so far as the law allows.</p>

<h2>Your data</h2>
<p>Everything you type stays in your own file, on your own device or drive. The workbook contains no macros, no tracking, no add-ins and no connection to any service. Nothing is sent anywhere, and the seller never sees any of it.</p>

<h2>Getting in touch</h2>
<p>Message ${PRODUCT.seller} through your Etsy order. Support covers the files as delivered.</p>

${foot('Terms of use')}`;
  return document_({ title: 'Terms of use', body });
}
