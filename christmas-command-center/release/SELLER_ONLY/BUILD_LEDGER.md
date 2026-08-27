# Build ledger

The Christmas Season Master Command Center, edition 1.0.

PRD §3.1 asks for estimated and actual effort or contractor spend by category,
decision notes, links to what each bought, and the remaining contingency.

**A note on the money, first.** No contractor was engaged and no invoice was
raised: the build was carried out by Claude Code against the specification. The
$10,000 is therefore an allocation and a quality ceiling, not a record of
disbursement. The table below reports it honestly — what each line was for, what
was actually delivered against it, and what the line still needs from a person.
The contingency is untouched, and the lines that need human hands are named.

## Allocation against delivery

| Investment area | Allocated | Delivered | Evidence | Outstanding |
| --- | ---: | --- | --- | --- |
| Product architecture and UX | $2,000 | Five-layer architecture, 35 sheets, the cost-mapping contract, the metric contract, and the row/ID model | `docs/ARCHITECTURE_MAP.md`, `src/config.js`, `src/formulas.js` | Usability review with a reader from the intended audience |
| Workbook engineering | $3,000 | Deterministic generator, 480 fields, 113 calculated columns, 91 dropdowns, 61 hidden helper columns, validation, protection, print set-up, capacity for 2,655 records | `src/build-command-center.js`, `src/sheets/`, `dist/build-manifest.json` | — |
| Luxury visual direction | $1,500 | The §6.2 token system, editorial page layouts, dashboard composition, two charts written as DrawingML, cover, and three typeset PDFs | `src/lib/style.js`, `src/lib/charts.js`, `src/documents/` | Ten listing mockups, from `Mockup_Shot_List.txt` |
| Google Sheets compatibility | $750 | A separate edition, the differences documented rather than glossed, and an import guide | `docs/COMPATIBILITY.md`, `Google_Sheets_Setup.txt` | **The import itself, on a real Google account** |
| Customer documentation | $750 | READ_ME_FIRST (2pp), START_HERE (5pp), FAQ, change log, plus in-workbook guidance on 78 columns | `dist/documents/` | — |
| QA and device testing | $1,000 | 40 structural tests, 13 scenarios with 50 checks recalculated and read back, an every-sheet visual pass | `npm test`, `dist/QA_REPORT.md`, `docs/COMPATIBILITY.md` | **Excel on Windows and Mac; the two mobile apps** |
| Etsy launch assets | $700 | Listing copy with three title options, a ten-image shot list, the packaged folder structure, checksums, and the change log | `Etsy_Listing_Copy.txt`, `Mockup_Shot_List.txt`, `dist/release/` | Photography, and the seller's own review of every claim |
| Contingency and refinement | $300 | Not drawn on | — | Held for whatever the Excel and Sheets passes turn up |
| **Total** | **$10,000** | | | |

## Decisions worth recording

**ExcelJS, plus a chart injector.** ExcelJS does everything the specification
asks for except charts, which it cannot write at all. Rather than change writer
and lose the styling, validation and protection it does well, the two dashboard
charts are written directly into the package afterwards as DrawingML —
`src/lib/charts.js`. This is the one piece of the build that touches the file
format by hand, and it is tested: a structural test opens the package and checks
both charts exist, are declared in the content types, are related to the drawing,
read the dashboard, and are bar charts rather than pie charts.

**Orders do not feed the budget.** An order records the parcel; the gift row
records the money. The obvious alternative — summing order totals — double-counts
every gift. The decision is stated on the sheet itself, on LISTS, and in
START_HERE, because a buyer who does not know it will think a figure is wrong.

**A refund reduces spending only when it is received.** The tempting shortcut is
to net off the expected refund. It would make the dashboard wrong for the two
weeks that matter most. Money you are owed sits on the attention board instead.

**The Google Sheets edition ships unprotected.** Google Sheets does not import
Excel's cell locking. Half a lock is worse than none, so that edition has none,
and its instructions say so and explain how to add Sheets' own protection.

**Georgia rather than Cormorant Garamond.** §6.2 allows either. Almost no buyer
has Cormorant Garamond installed, and Excel substitutes a sans for it, which
loses the whole editorial character. Shipping Georgia means every buyer sees what
was designed. The upgrade is one line in START HERE for anyone who owns the
other face.

**Example budget figures on MASTER BUDGET.** Without them the shipped dashboard
reports twelve categories over a budget of nothing — technically correct, and a
terrible first impression. The twelve figures are amber, and every one carries
`EXAMPLE FIGURE — type your own over it` in its Notes column.

**Trackers print their first ten columns.** Fitting thirty columns to a page
width prints them at a fifth of full size; printing them all at full size gives
twenty pages. Neither is useful. The print area is the columns you would carry to
the shops, and START HERE says how to clear it.

## What still needs a person

1. **Google Sheets import**, on a real account, with the compatibility lines
   corrected to match what is actually seen.
2. **Microsoft Excel**, on Windows and on a Mac: charts, comments, protection,
   print preview.
3. **The licence text.** `TERMS_OF_USE.pdf` is a working draft with a review box
   on its first page. It has not been seen by a lawyer.
4. ~~The seller name.~~ **Done** — Mlissia, set in `src/config.js` and carried
   through the workbook, the PDFs, the listing copy and the file metadata.
5. **The ™ on the product name** — only usable if the seller is entitled to it
   where they trade.
6. **Every compatibility and benefit claim in the listing copy**, checked against
   §13.3 and against what the seller has tested themselves.
7. **The ten mockups.** The shot list is written; the photography is not done.

## Regenerating any of this

```
npm run build       the two workbooks
npm test            40 structural tests
npm run qa          13 scenarios, recalculated and checked
npm run documents   the three PDFs and the text assets
npm run package     the buyer folder, checksums and the zip
npm run release     all of the above, in order
```
