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

## Decided: a trivial dip is not a discount

**The problem.** A price flat at $50 for forty days that dipped 1% to $49.50
used to score **6.3 / CONSIDER**. Three of the four measurable components
rewarded it for being "at the recorded low" — `historicalPriceQuality` returned
1.0, `promotionRarity` 0.98 — and `discountStrength`, the only component that
noticed the dip was trivial, was diluted further by renormalisation across the
components we could not measure at all.

It mattered here more than anywhere. A retailer whose offers all behaved that
way accumulated mid-band scores and read as `MIXED` rather than
`SHALLOW_DISCOUNTS` — the profile would have credited exactly the pricing
behaviour it exists to expose.

**The decision.** Being at the bottom of a range that is itself meaningless is
meaningless. `MEANINGFUL_RANGE_FRACTION` in `src/domain/price-history.ts` now
requires a recorded price to have moved at least **5%** of its typical value
before the *shape* of that history informs anything. Below that,
`historicalPriceQuality` and `promotionRarity` both return `null`, coverage
falls under the publication gate, and no Index is published.

Five percent, not some other number, because it is the same threshold as
`MIN_DROP_FRACTION` in the signal engine — one definition of "this price
actually moved", used in both places, rather than two that drift apart.

**What it does not do.** It is a floor on *movement*, not on *discount depth*.
A genuinely modest 8% fall still publishes and still scores above the midpoint;
`still scores a modest but real discount rather than refusing everything` in
`src/domain/retailer-profile.test.ts` holds that line, so the refusal cannot
quietly widen into refusing everything unremarkable.

**What the customer sees.** The deal page shows the withheld reason, not a
score: *"This price has barely moved since we started watching, so there is
nothing to judge it against yet."* That wording is deliberate — the earlier
message said we had not recorded enough price history, which would be untrue in
front of forty-one recorded observations of that exact price. Both refusals
route through `canPublishIndex`, which is told whether history exists so it can
say which of the two is actually the case (§01, §45).
