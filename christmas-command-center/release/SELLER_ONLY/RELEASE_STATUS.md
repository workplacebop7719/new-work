# Release status

The Christmas Season Master Command Center, edition 1.0.

## HUMAN REVIEW REQUIRED

PRD §12.4 allows PASS only when formula reconciliation, compatibility,
protection and editability, and the visual checks all pass. Three of those four
pass. **Compatibility has not been verified in the two applications the product
is sold for**, because neither Microsoft Excel nor a Google account exists on the
build machine. Calling that a PASS would be claiming a test that was not run.

Nothing on the list below is a known defect. They are checks a person has to
perform, and legal and commercial text a person has to own.

## What passes

| Gate | Evidence |
| --- | --- |
| Formula reconciliation | Every module's planned and actual totals summed independently and compared with MASTER BUDGET: exact to the cent, at empty, sample and maximum-row data. `dist/QA_REPORT.md` |
| Formula errors | Every calculated cell scanned after recalculation, in all 13 scenarios: none |
| Exception logic | Late orders, missing dates, refunds, duplicates, unmapped costs, inactive recipients, digital gifts, the warning threshold, the year change: all behave as §12.2 specifies |
| Protection and editability | Calculated cells locked, input cells unlocked, no password, sorting and filtering and inserting rows all still permitted. 45 structural tests |
| Colour contrast | Every text-on-fill pairing and every conditional-format state measured against WCAG AA. Lowest is 5.16:1; a test fails the build if any drops below 4.5 |
| Structure | Sheet inventory and order, freeze panes, filters, print set-up, dropdown targets, defined names, number formats, notes, example marking, row capacity, both charts |
| Visual state | Every sheet rendered and inspected at full size. Clipping, overlap, blank-row artefacts and the misleading negative-spend example found and corrected |
| Copy | No prohibited claim, no "seamless", "unlock", "effortless" or "revolutionise", no promise of savings or stress relief, no untested compatibility claim |

## What is outstanding

| # | Item | Why it is not closed | Who |
| --- | --- | --- | --- |
| 1 | Google Sheets import | No Google account on the build machine. The edition is prepared and the known differences documented; the import has not been run | Seller |
| 2 | Microsoft Excel, Windows and Mac | No Excel on the build machine. Formulas were recalculated by LibreOffice Calc, which proves the arithmetic but not Excel's rendering of charts, comments, protection or print preview | Seller |
| 3 | Mobile apps | The listing should describe what a small screen is actually like | Seller |
| 3b | Canva import of the printable pack | The pack is built to A4 and US Letter and reads correctly as a PDF, but the import has not been run in a Canva account | Seller |
| 4 | `TERMS_OF_USE.pdf` | A working draft with a review box on its first page. Not seen by a lawyer | Seller and their lawyer |
| 5 | ~~Seller name~~ | **Closed.** Set to Mlissia throughout the workbook, the documents and the file metadata | — |
| 6 | The ™ on the product name | Only usable if the seller is entitled to it where they trade | Seller |
| 7 | Listing claims | Every compatibility and benefit line to be checked against §13.3 and against what the seller has tested | Seller |
| 8 | Ten listing mockups | The shot list is written; the photography is not done | Seller or photographer |

## Scope stated, not narrowed

One place where the seller's direction overrides the specification, stated
rather than buried:

- **§2.1 says the product must not become pink.** The seller asked for a
  super-light pink with gold and wildflowers, and that is what is built. The
  specification's worry was cheapness — "pink, childish, ornamental,
  trend-chasing" — not the hue. The build answers the worry on its own terms:
  the pink is a near-white field rather than a saturated fill, gold appears only
  as a line and never as a fill, there is one drawing per page at most, and the
  contrast of every pairing is measured rather than judged by eye. §14's own
  release plan anticipates a Pink Christmas edition; this is that edition, made
  the flagship at the seller's direction.

Two places where the specification was read as allowing a choice, and the choice
is recorded rather than made quietly:

- **§6.2 display face.** "Cormorant Garamond or Georgia fallback." Shipped in
  Georgia, because a font that is not installed is substituted for whatever the
  machine picks — usually a sans, which loses the editorial character entirely.
  START HERE tells anyone who owns Cormorant Garamond how to swap it in.
  Rationale in `BUILD_LEDGER.md`.
- **§10.2 printable "Christmas at a Glance".** Specified as two pages; it fits on
  one, with print area, repeating header and margins as required. One page was
  judged better than padding it to two.

One thing the specification asks for that is deliberately *not* built:

- **§7.7 ingredient consolidation.** The PRD itself rules it out for version 1
  ("Version 1 does not attempt unreliable automated ingredient consolidation").
  Recipe IDs and event filters give the structure; quantities stay with the
  buyer, where they are correct. This is a stated gap, not an omission.

## Recommendation

Do not publish until items 1, 2 and 4 are closed. Items 1 and 2 are an
afternoon's work with the two applications open. Item 4 needs a lawyer.

Once those are done, re-read this file and reissue the status. If the Excel and
Sheets passes are clean, the status becomes PASS.
