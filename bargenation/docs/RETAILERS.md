# Retailer pages

`/stores` and `/stores/[slug]` — the only surface that publishes a judgement
about a named business (PRD §43).

Everything on them is computed by `profileRetailer()` in
`src/domain/retailer-profile.ts`, which is pure, framework-free and takes
already-scored deals. It has no access to commission data, no parameter through
which a retailer could be favoured, and no text that is written separately from
the figures — the summary sentence is derived from the counts, so it cannot
drift away from them.

## The evidence threshold

Below `MIN_OFFERS_FOR_VERDICT` (4 **scored** offers) there is no verdict at all,
only counts. Characterising how a business prices from two data points would be
exactly the confident guess this product exists to avoid.

On the current development dataset **every** retailer sits under that threshold,
which is the intended demonstration: the gate is load-bearing, not decorative.
The index page says so in a sentence rather than leaving the reader to infer it
from six identical marks.

An early draft headlined that page "Who actually discounts" above six rows all
reading NO VERDICT YET. A headline must not promise an answer the record cannot
support; it now reads "The stores we watch".

## How a verdict is derived

Let `holdShare` be the share of scored offers we would currently tell somebody
to hold or skip.

| Condition | Verdict |
|---|---|
| fewer than 4 scored offers | `NOT_ENOUGH_EVIDENCE` |
| `holdShare >= 0.5` | `SHALLOW_DISCOUNTS` |
| `holdShare <= 0.2` and median Index `>= 8` | `GENUINE_DISCOUNTS` |
| otherwise | `MIXED` |

Offers we track but cannot yet score are counted in `offersTracked`, excluded
from the verdict, and the page says which is which.

## What the page shows beside the verdict

Counts and observation totals sit next to the verdict at the same typographic
weight, not in a footnote. Nobody should be able to read the verdict without
also reading how much it rests on. `SHALLOW_DISCOUNTS` renders in outline, not
in a warning colour — it is a finding from our own record, not an accusation.

The commercial relationship is stated **on the page**, not only in
`/disclosures`. A verdict about a business we might earn money from is only
trustworthy if you can see that from where you are standing.

## Ordering

Alphabetical, and the page says so. Any other order — by verdict, by score, by
how much we track — reads as a ranking, and a ranking of retailers on a site
that earns commission is precisely what §52 forbids anyone from being able to
buy. Alphabetical cannot be sold.

## Watching a retailer

`WatchRetailer` writes `watchlist_items.retailer_id`. What the sweep then does
with it, and why it fires only one kind of signal, is in
[DEAL-SIGNALS.md](./DEAL-SIGNALS.md#watching-a-whole-retailer).

The control is gated off entirely when no database is configured, rather than
rendered doing nothing (§01).

## Open question for the founder

A price flat at $50 for forty days that dips 1% to $49.50 currently scores
**6.3 / CONSIDER**, because three of the four measurable components reward
being "at the recorded low" and `discountStrength` is diluted by
renormalisation. It is pinned by a documenting test —
`scores a trivial dip to a new low in the middle of the band` in
`src/domain/retailer-profile.test.ts` — pinned as *behaviour*, not endorsed. Whether a 1% dip deserves 6.3 is a product decision.

It matters here more than anywhere: a retailer whose offers all behave that way
would accumulate mid-band scores and read as `MIXED` rather than
`SHALLOW_DISCOUNTS`.
