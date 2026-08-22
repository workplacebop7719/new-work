# Ingestion

How a retailer feed becomes price history we are willing to score (PRD §46).

```bash
npm run ingest -- <retailer-slug> <records.json>
```

## Five separate responsibilities

| Stage | Module | Decides |
|---|---|---|
| Discovery | `source-port.ts` | where records come from |
| Extraction | `normalise.ts` | is this a fact, or a refusal |
| Matching | `product-match.ts` | which product is this |
| Screening | `watchdog.ts` | may this enter an immutable record |
| History | `pipeline.ts` | writes what survived, records what did not |

The pipeline decides nothing itself. Every judgement lives in a pure module
with no database import, which is why the interesting rules can be tested
without one.

**AI is absent from this path entirely.** §46 permits AI to assist and forbids
it from inventing pricing facts; the simplest way to honour that is to keep it
out of the code that writes prices.

## Extraction is mostly refusals

The governing rule is §45: never fabricate. Where an input is ambiguous — and
retail price strings often are — the answer is to reject the record and say
why, not to pick the likelier reading.

The clearest case is `"1,234"`. That is 1234 in the US and 1.234 in much of
Europe. Guessing costs nothing today and produces a permanently wrong history
if the guess is wrong, so it is refused.

Also refused: ranges (`from $20`), unsupported currencies (**never converted** —
an exchange rate would make recorded history depend on when we looked),
sub-cent precision, feed placeholders like `9999.99`, future timestamps, and
availability states we have not modelled (`preorder`) rather than flattening
them into "out of stock".

## Screening protects an immutable record

`price_observations` is append-only, enforced by trigger. Anything that gets
through is part of the product's memory forever — a single bogus $0.01 becomes
a permanent "recorded low" that every future Value Index is measured against.

So screening happens **before** the insert, with three outcomes:

- **ACCEPT** — record it
- **REJECT** — never record it; something is definitely wrong
- **QUARANTINE** — might be real, might be a feed glitch

Quarantine is the interesting one. A genuine 85% crash and a broken feed look
identical in a single row, and we would rather be a day late than permanently
wrong. Held observations live in `quarantined_observations`, outside the
permanent record, until corroborated.

**Corroboration must come from a different source.** Re-reading the same broken
feed reproduces the same error; a naive "we saw it twice" rule would accept
exactly the failure this gate exists to catch.

## Matching fails safe

A missed match costs a duplicate product row — tidy-up work. A false match
merges two products' price histories, and since observations are append-only,
the timelines can never be untangled. Every Index computed from the merged
history is then wrong, confidently.

So: identifiers first, then similarity with brand as a hard gate, and when two
candidates score within 0.05 of each other the pipeline records a question
rather than picking the higher one.

## Known gaps

- **The SKU fast path is unreachable from the pipeline.** `matchProduct`
  supports it, but the pipeline does not load `product_variants`, so every
  match falls through to title similarity. The consequence is more
  `NEEDS_REVIEW` than necessary — the safe direction.
- **`-es` plurals are not folded.** `dress`/`dresses` read as different tokens.
  Stripping `es` would break `shoes`/`shoe`, which is far more common here.
- **No real source adapter exists**, because no retailer relationship does. The
  CLI drives the pipeline from a local JSON file.
- **Nothing reviews the review queue.** `NEEDS_REVIEW` records land in
  `ingest_rejections`; the admin surface to resolve them is not built.
- **Nothing discards stale quarantine.** Held observations wait indefinitely
  rather than expiring.
