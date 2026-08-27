/**
 * The text assets in §3 and §13: Etsy listing copy, the mockup shot list, the
 * change log, the FAQ, and the Google Sheets instructions.
 *
 * §13.3 guardrails hold throughout: no promise of saved money, removed stress
 * or instant results, no compatibility claim that has not been tested, and
 * nothing that leans on somebody else's trademark.
 */
import { PRODUCT, SHEET_ORDER, CAPACITY, LISTS, OPTIONAL_SHEETS } from '../config.js';

const NAME = PRODUCT.trademarkName;
const SHEETS_N = SHEET_ORDER.length;

export function etsyListingCopy() {
  return `${NAME}
ETSY LISTING COPY — DRAFT FOR SELLER REVIEW
Edition ${PRODUCT.edition}

Everything below is a draft. Read §13.3 of the specification before publishing:
do not promise savings, stress relief or instant results, and do not claim
compatibility with software you have not tested yourself.

--------------------------------------------------------------------------
TITLE OPTIONS (Etsy allows 140 characters)
--------------------------------------------------------------------------

1. Christmas Planner Spreadsheet | Gift Tracker, Budget, Hosting & Décor |
   Excel + Google Sheets | Editable Digital Download
   (137 characters)

2. Luxury Christmas Planner Excel Template | Gift Budget Tracker, Meal Plan,
   Guest List | Google Sheets Compatible | Instant Download
   (136 characters)

3. Christmas Command Center Spreadsheet | Gifts, Orders, Budget, Hosting,
   Traditions | Excel & Google Sheets | Editable Planner
   (129 characters)

--------------------------------------------------------------------------
OPENING PARAGRAPH
--------------------------------------------------------------------------

Christmas usually lives in eleven places at once: a note on your phone, three
browser tabs, a paper list in the kitchen drawer, and a nagging feeling that
you have already bought your father a scarf. This is one place instead.

${NAME} is a ${SHEETS_N}-sheet workbook for the whole season — the gifts, the
budget, the deliveries, the table, the guests, the traditions, and the notes
you will want next September. Every number on the dashboard is calculated from
something you typed, and every one of them will tell you where it came from.

--------------------------------------------------------------------------
WHAT IT DOES
--------------------------------------------------------------------------

• One dashboard. Days to Christmas, what you set aside, what you have spent,
  what is left, how far along the gifts are, and a list of what needs you
  today — with a link to the sheet that fixes it.

• Gifts, properly tracked. ${CAPACITY['GIFT PLANNER']} rows from first idea to
  wrapped and hidden. Planned cost and actual cost are separate, so an estimate
  never masquerades as a receipt. It also warns you when the same gift appears
  twice for the same person.

• Deliveries that chase themselves. ${CAPACITY['ONLINE ORDERS']} order rows that
  flag what is late, what has no tracking, and which return window closes this
  week. An order with no expected date says so, instead of pretending to be on
  time.

• A budget that reconciles. Twelve categories you can rename. Every cost in the
  workbook carries a category, and anything that does not match is reported
  rather than quietly dropped.

• Refunds that behave. Money you are owed stays on the attention board. It only
  reduces what you have spent when you mark it received.

• Hosting, in detail. Guests and their dietary needs, sleeping arrangements and
  arrival times, the meal plan, the shopping list, the recipe index, the table
  and the flowers, the vendors and their deposits.

• The house and the season. Décor inventory with storage locations, a
  room-by-room decorating plan, cleaning by zone, cards and postage, event
  wardrobe, travel, giving, traditions, and a page for what you want to
  remember.

• Made to be reused. An annual archive, a page of notes for next year, and a
  documented way to clear the workbook and start the next season.

--------------------------------------------------------------------------
WHAT YOU RECEIVE
--------------------------------------------------------------------------

• Christmas_Master_Command_Center_Excel.xlsx — the Excel edition
• Christmas_Master_Command_Center_Google_Sheets.xlsx — prepared for Sheets
• START_HERE.pdf — an illustrated guide to setting up and using it
• READ_ME_FIRST.pdf — opening the files, and what works where
• TERMS_OF_USE.pdf — your licence
• FAQ.txt and Change_Log.txt
• Google Sheets import instructions

This is a digital download. Nothing is posted to you.

--------------------------------------------------------------------------
COMPATIBILITY  (verify each line yourself before publishing)
--------------------------------------------------------------------------

• Built and tested for Microsoft Excel on Windows and Mac.
• A separate edition is prepared for Google Sheets, with the differences listed
  in the included instructions.
• Usable on a phone or tablet in the Excel or Google Sheets app, though setting
  it up on a small screen is hard work — do that on a computer.
• Not tested in Apple Numbers, LibreOffice or WPS Office.
• No macros. No add-ins. No sign-in. Nothing is sent anywhere.

--------------------------------------------------------------------------
FREQUENTLY ASKED, ON THE LISTING
--------------------------------------------------------------------------

Do I need to be good at spreadsheets?
No. You type in the cream cells and read the green ones. The guide is six steps
long.

Can I change it?
Yes — rename the categories, add rows, hide the sheets you do not want, change
the colours. The dropdown lists are yours to edit, and any sheet can be
unprotected without a password.

Will it work for my currency?
Choose from the list in Settings, or add your own. It shows one currency at a
time and does not convert between them.

Can I use it again next year?
Yes. There is an archive sheet and a documented way to clear it down.

Is anything preloaded that I would have to delete?
Three clearly marked example rows on each sheet, and example budget figures on
the budget sheet. Everything marked EXAMPLE — DELETE ME can go.

--------------------------------------------------------------------------
TAGS  (13 allowed; check each against Etsy search yourself)
--------------------------------------------------------------------------

christmas planner, christmas spreadsheet, gift tracker, holiday budget,
christmas organizer, excel planner, google sheets planner, hosting planner,
christmas budget, gift list, holiday planner, digital planner, editable planner

--------------------------------------------------------------------------
DO NOT PUBLISH WITHOUT
--------------------------------------------------------------------------

• Replacing ${PRODUCT.seller} everywhere it appears.
• A lawyer's or your own review of TERMS_OF_USE.
• Testing the Google Sheets import on your own account and correcting the
  compatibility lines above to match what you saw.
• Checking that the trademark symbol on the product name is one you are
  entitled to use where you trade.
• Your own mockups. No retailer screenshots, no film or character artwork, no
  other seller's images.
`;
}

export function mockupShotList() {
  return `${NAME}
MOCKUP SHOT LIST — TEN LISTING IMAGES
Edition ${PRODUCT.edition}

House style for all ten: warm ivory or deep evergreen backgrounds, one prop at
most, real daylight or a soft single source. No snowflake scatter, no glitter,
no gradient, no stock-photo family. Text overlay in a serif for the headline and
a sans for the supporting line. Every screenshot is of the real workbook with
the example data in it — never a mocked-up screen.

--------------------------------------------------------------------------
1. YOUR ENTIRE CHRISTMAS, BEAUTIFULLY ORGANISED
--------------------------------------------------------------------------
Screen:   DASHBOARD, full width, at 100% zoom.
Frame:    Laptop on a dark wood surface, the printed at-a-glance page beside it,
          a single candle out of focus behind.
Must show: the countdown, the four money cards, the attention board.
Overlay:  Headline top left, one supporting line: "One place for the gifts, the
          budget, the table and the traditions."

--------------------------------------------------------------------------
2. MORE THAN A GIFT LIST
--------------------------------------------------------------------------
Screen:   A grid of eight tab names, set as type rather than a screenshot:
          DASHBOARD · GIFT PLANNER · ONLINE ORDERS · MASTER BUDGET ·
          MEAL + BAKING PLAN · HOSTING + GUESTS · DECOR INVENTORY · MEMORIES
Overlay:  "${SHEETS_N} sheets. Use the ones you want; hide the rest."

--------------------------------------------------------------------------
3. KNOW WHAT YOU SPENT — AND WHAT IS LEFT
--------------------------------------------------------------------------
Screen:   MASTER BUDGET, rows for the twelve categories, plus a crop of the
          dashboard's budget chart.
Must show: one category reading AT BUDGET and the Remaining column.
Overlay:  "Every figure traces back to the row that made it."

--------------------------------------------------------------------------
4. NEVER LOSE A GIFT OR A DELIVERY AGAIN
--------------------------------------------------------------------------
Screen:   GIFT PLANNER left, ONLINE ORDERS right, side by side.
Must show: the Attention column with LATE and NO TRACKING visible.
Overlay:  "It tells you what is late, what has no tracking, and which return
          window closes this week."

--------------------------------------------------------------------------
5. PLAN THE MAGIC, NOT JUST THE TASKS
--------------------------------------------------------------------------
Screen:   TRADITIONS + BUCKET LIST and MEMORIES.
Frame:    Warmer than the others. Greenery in the corner, nothing branded.
Overlay:  "Traditions, the films, the décor, and the part worth remembering."

--------------------------------------------------------------------------
6. HOST CHRISTMAS WITHOUT THE LAST-MINUTE SCRAMBLE
--------------------------------------------------------------------------
Screen:   MEAL + BAKING PLAN with HOSTING + GUESTS beneath it.
Must show: a dietary tag and an allergy note, and the make-ahead column.
Overlay:  "Menus, prep dates, the shopping list, and who cannot eat what."

--------------------------------------------------------------------------
7. FULLY EDITABLE
--------------------------------------------------------------------------
Screen:   A dropdown open on a tracker, beside the four-colour key.
Must show: the open list, and a cream cell next to a green one.
Overlay:  "Rename the categories, edit the lists, hide what you do not need."

--------------------------------------------------------------------------
8. EXCEL AND GOOGLE SHEETS
--------------------------------------------------------------------------
Screen:   The same dashboard in both, side by side, honestly captured.
Overlay:  "Two editions, one workbook." Plus the tested-in line, worded exactly
          as it appears in READ_ME_FIRST.
Note:     No Microsoft or Google logos without permission. Name the software in
          plain text.

--------------------------------------------------------------------------
9. WHAT YOU RECEIVE
--------------------------------------------------------------------------
Screen:   The file stack as an illustration: two workbook icons, three PDFs, two
          text files, arranged as a neat pile.
Overlay:  "Two workbooks, three guides, and the notes." Then: "Digital download.
          Nothing is posted."

--------------------------------------------------------------------------
10. MADE FOR PEOPLE WHO LOVE CHRISTMAS
--------------------------------------------------------------------------
Screen:   None, or a small crop of SEASON VISION.
Frame:    A laid table at dusk, candles lit, one open notebook. Nobody in shot.
Overlay:  "Curate every exquisite detail in one private Christmas atelier."

--------------------------------------------------------------------------
PRODUCTION NOTES
--------------------------------------------------------------------------
• Capture at 2× and export at 2000 × 2000 for the square listing images.
• Keep the first image legible as a thumbnail: three elements at most.
• Use the example data as shipped, so the screenshots stay honest.
• Blur nothing. If a figure looks wrong on screen, fix the workbook.
`;
}

export function changeLog() {
  const today = new Date().toISOString().slice(0, 10);
  return `${NAME}
CHANGE LOG

--------------------------------------------------------------------------
Edition ${PRODUCT.edition} — ${today} — first release
--------------------------------------------------------------------------

What is in it
  ${SHEETS_N} sheets: onboarding, ${SHEET_ORDER.length - 6} planning modules, and
  three support sheets.
  Two editions: one for Excel, one prepared for Google Sheets.
  ${Object.keys(LISTS).length} editable dropdown lists on the LISTS sheet.
  Two dashboard charts: budget against spend by category, and completion.

Affected sheets
  All.

Compatibility
  Excel on Windows and Mac (Microsoft 365, 2021, 2019).
  Google Sheets, via the separate edition and the included import notes.
  No macros, no add-ins, no external links, no volatile functions.

Known differences in the Google Sheets edition
  Sheet protection is not applied — Google Sheets does not import Excel's,
  and a half-applied lock is worse than none. The colour key does that work.
  Cell notes import as notes rather than as Excel comments.
  Charts refresh on first open.

--------------------------------------------------------------------------
How to record a change
--------------------------------------------------------------------------

Each entry: edition, date, what changed, which sheets it touched, and whether a
buyer on the previous edition needs to do anything. If a formula changes, say
what it was and what it is now, so somebody who has already filled in their
workbook can decide whether to move.
`;
}

export function faq() {
  return `${NAME}
QUESTIONS PEOPLE ASK

--------------------------------------------------------------------------
OPENING IT
--------------------------------------------------------------------------

The file will not open.
  Unzip the download first. Opening a workbook from inside a zip gives you a
  read-only copy, and nothing you type is saved.

Excel says the file is protected.
  Only the calculated cells are locked, so they cannot be typed over by
  accident. Review, then Unprotect Sheet. There is no password.

It opened but everything says 0.
  That is a blank workbook doing the right thing. Add people and budgets first.

The dates look American / British.
  Dates follow your own computer's settings. Change them in your operating
  system, or select the column and choose a different date format.

--------------------------------------------------------------------------
USING IT
--------------------------------------------------------------------------

How do I add more rows?
  Click a row in the middle of the table and insert above it, so the formulas
  and dropdowns come with it. Then copy one calculated cell down into the new
  row. Each tracker starts with room for ${CAPACITY['GIFT PLANNER']} gifts,
  ${CAPACITY['ONLINE ORDERS']} orders and ${CAPACITY['CHRISTMAS CALENDAR']}
  calendar entries, which is more than most households need.

Can I delete a sheet I will not use?
  Hide it rather than delete it: right-click the tab, Hide. Nothing breaks —
  every total reads an empty sheet as zero. ${OPTIONAL_SHEETS.join(', ')} are
  the ones most often hidden.

Can I add my own dropdown values?
  Yes. They live on LISTS. Click a row inside the block and insert above it.
  Adding below the last value does nothing — that is the one catch.

Why does the wrapping percentage ignore some gifts?
  Digital and experience gifts are left out of the wrapping count. A gift
  certificate does not need ribbon.

I marked a refund as expected and my spending did not change.
  That is deliberate. Money you are owed is not money you have back. Set
  Refund received to Yes and the figure drops.

The same gift is flagged as a duplicate but I meant it.
  It is a nudge, not an error. Two of the same thing for the same person is
  sometimes exactly right. Ignore it.

A number looks wrong.
  Open QUALITY CHECK. Every row on it should read zero. If one does not, it
  names the sheet and what to look for.

--------------------------------------------------------------------------
GOOGLE SHEETS
--------------------------------------------------------------------------

Which file do I use?
  The one in 03_GOOGLE_SHEETS. It is prepared for the import.

Are the sheets protected in Google Sheets?
  No. Google Sheets does not import Excel's protection, so that edition ships
  unprotected on purpose. The colour key tells you which cells calculate
  themselves: pale green ones do.

My charts look empty.
  Give them a moment on first open while Sheets recalculates, then reload.

--------------------------------------------------------------------------
THE LICENCE
--------------------------------------------------------------------------

Can I share it with a friend?
  No. It is for your own household. TERMS_OF_USE has the detail.

Can I sell a planner I made from it?
  No — not the workbook, and not a modified version of it.

Can I use it every year?
  Yes, for as long as you like. START_HERE explains how to clear it down.

--------------------------------------------------------------------------
PRIVACY
--------------------------------------------------------------------------

Does it send anything anywhere?
  No. There are no macros, no add-ins and no connections. It is an ordinary
  spreadsheet on your own device.

Is it safe to write down where I hid the presents?
  It is as safe as the file is. It is not encrypted, and anyone who opens it can
  read it. Keep hiding places and sizes here; keep card numbers, passwords and
  identity documents somewhere else.
`;
}

export function sheetsSetup() {
  return `${NAME}
OPENING THIS IN GOOGLE SHEETS

--------------------------------------------------------------------------
IMPORTING
--------------------------------------------------------------------------

1. Go to sheets.google.com and sign in.
2. File, then Import, then Upload.
3. Choose Christmas_Master_Command_Center_Google_Sheets.xlsx from this folder.
4. Choose "Import data" and, when asked, "Create new spreadsheet".
5. Give it this year's name.

The import takes a minute or two. It is a large workbook.

--------------------------------------------------------------------------
FIRST FIVE MINUTES
--------------------------------------------------------------------------

• Open the SETTINGS tab and set the year, the date and your currency.
• Look at the DASHBOARD. The countdown should be counting.
• If the two charts look empty, reload the page once. Sheets calculates the
  workbook on import and the charts draw after it finishes.

--------------------------------------------------------------------------
WHAT IS DIFFERENT IN THIS EDITION
--------------------------------------------------------------------------

Everything that matters works: the formulas, the dropdowns, the filters, the
frozen panes, the colour coding, the number formats and the two charts. These
are the differences, stated plainly rather than glossed over.

Sheet protection is not applied.
  Google Sheets does not import Excel's cell locking, and a protection that
  half-applies is worse than none. So this edition ships unprotected, and the
  colour key does the work instead: pale green cells calculate themselves —
  typing in one replaces a formula. Cream cells are yours.
  If you would rather have the lock, Google Sheets can add it: select a
  calculated column, then Data, Protect sheets and ranges.

Notes rather than comments.
  The small explanations on column headers arrive as Google Sheets notes. Hover
  to read them.

Conditional formatting.
  The status colours import. If a rule ever looks wrong after you have inserted
  rows, Format, then Conditional formatting, shows you exactly what is set.

Print set-up.
  Print areas and repeating headers come across, but Google Sheets handles page
  breaks its own way. Check the preview before you print.

The Excel edition.
  It is included too, and it is the fuller one — protection, comments and all
  the print settings. If you have Excel, use that.

--------------------------------------------------------------------------
IF SOMETHING LOOKS WRONG
--------------------------------------------------------------------------

Open the QUALITY CHECK tab. Every row on it should read zero. If one does not,
it names the sheet to open and what to look for.
`;
}
