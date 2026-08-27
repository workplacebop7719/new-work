# Compatibility notes

The Christmas Season Master Command Center, edition 1.0.

This file says what was tested, how, and what has not been tested. Everything in
the "not tested" section has to be checked by a person before the listing claims
it (PRD §13.3: do not claim compatibility that was not tested).

## What was tested, and how

| Area | How it was checked | Result |
| --- | --- | --- |
| The package opens | Both editions loaded by two independent readers — ExcelJS and LibreOffice Calc — and every XML part parsed | Passes |
| Formula correctness | 13 scenarios built through the real generator, recalculated by LibreOffice Calc, and read back cell by cell (`npm run qa`) | 50 of 50 checks pass |
| Budget reconciliation | Every module's planned and actual totals summed independently and compared with MASTER BUDGET | Exact to the cent, at empty, sample and maximum-row data |
| Formula errors | Every calculated cell in the recalculated workbook scanned for `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`, `#NUM!` | None, in any scenario |
| Structure | 40 inspection tests over the built files: sheet inventory and order, freeze panes, filters, print set-up, locking, dropdown targets, defined names, number formats, notes, example marking, capacity, charts (`npm test`) | All pass |
| Unsupported functions | Every formula scanned for `INDIRECT`, `OFFSET`, `XLOOKUP`, `FILTER`, `SORTBY`, `UNIQUE`, `LAMBDA`, `LET`, `TEXTJOIN`, whole-column ranges and external links | None present; the test fails the build if any appear |
| Visual state | Every sheet rendered to PDF and inspected at full size for clipping, overlap, unreadable contrast, misleading charts and blank-row artefacts | Corrected and re-rendered until clean |
| Blank-row behaviour | Row 80 of every tracker checked for stray zeros, `FALSE` and January-1900 dates | Clean; only hidden helper columns hold a value, which is what QUALITY CHECK sums |

LibreOffice Calc is a stand-in for Excel's calculation engine, not for Excel. It
proves the formulas are well-formed and the arithmetic and exception logic are
right. It does not prove how Excel renders a chart or handles protection.

## What has **not** been tested

| Not tested | Why it matters | Who has to check it |
| --- | --- | --- |
| Microsoft Excel itself, on Windows or Mac | No Excel on the build machine. Charts, comments, protection and print preview should be looked at in the real application | The seller, before publishing |
| Google Sheets import | No Google account on the build machine. The Sheets edition is prepared for the import and the known differences are documented, but the import itself has not been run | The seller, before publishing |
| Excel and Google Sheets mobile apps | The listing should say what a small screen is like | The seller |
| Apple Numbers, LibreOffice, WPS | Deliberately out of scope. The listing says they are not supported | — |

## Differences between the two editions

| | Excel edition | Google Sheets edition |
| --- | --- | --- |
| Formulas, dropdowns, filters, frozen panes | Yes | Yes |
| Conditional formatting | Yes | Yes |
| Two dashboard charts | Yes | Yes, redrawn on import |
| Sheet protection on calculated cells | Yes, no password | **No** — Google Sheets does not import Excel's cell locking, so this edition ships unprotected on purpose and says so in its instructions |
| Column notes | Excel comments | Google Sheets notes |
| Print areas and repeating headers | Yes | Imported, but Sheets paginates its own way |

The Sheets edition is otherwise identical: same sheets, same formulas, same
capacity, same example data. It is not a reduced version.

## Deliberate technical choices, and what they protect

- **`INDEX`/`MATCH`, never `XLOOKUP`.** `XLOOKUP` is newer than a lot of the
  Excel installations this will land on, and does not import dependably.
- **Bounded ranges, never whole columns.** `A:A` over thirty sheets makes a
  workbook that recalculates slowly on an older laptop.
- **No Excel tables, no structured references.** They convert unpredictably.
  Bounded named ranges behave the same everywhere.
- **`SMALL` and `LARGE` over a helper column, never a dynamic array.** The
  dashboard's next-seven-days list and the budget chart both need a ranking.
  Doing it in a helper column works in Excel 2019 and in Google Sheets alike.
- **Charts read a fixed block that a formula fills.** A chart bound to a moving
  range breaks the first time somebody inserts a row.
- **Georgia, not Cormorant Garamond.** A font that is not installed is
  substituted for whatever the machine feels like, usually a sans, and the whole
  editorial character goes. Georgia is on every Windows and Mac. START HERE
  explains how to swap in Cormorant Garamond if you own it.
- **Text state beside every colour.** A cell says `OVER BUDGET`, not just red.

## Performance

At full capacity — every one of the 28 trackers filled to its documented row
count, 2,594 records — the workbook recalculates without a stall and every
figure still reconciles. That is the `max-rows` scenario in the QA report.
