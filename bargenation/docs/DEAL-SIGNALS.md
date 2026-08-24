# Deal Signals

The job that decides whether something that happened to a watched product
deserves an interruption. The hard part is not detecting changes — it is
declining to mention most of them (PRD §26).

```bash
npm run signals    # one sweep; SIGNALS_DATABASE_URL must name bargenation_jobs
```

## Every rule is edge-triggered

"The price is below your target" is a **state**. An engine triggered on state
re-announces it every run — that is how notification spam happens.

"The price **crossed** your target since we last looked" is an **edge**. It can
fire once per crossing, and re-arming is automatic: the price has to go back up
before it can cross down again. No stored "already notified" flag, nothing to
get out of sync.

The same applies to Back In Stock — it fires on the transition, never on the
condition of being in stock.

## Three layers of restraint, each added for a reason

1. **Materiality.** A drop must clear a proportional *and* an absolute bar
   (5% and $2). Either alone lets something through that isn't worth saying:
   2% off a £100 item clears the absolute bar; 20% off a £5 item clears the
   proportional one.

2. **One signal per watch, per sweep.** A single price movement can satisfy
   several rules at once — it crosses the target *and* is a material drop *and*
   now undercuts other retailers. `selectSignal()` picks the one worth saying:
   whatever the customer explicitly asked for, if it fired.
   *Found by running a real sweep, which emitted 12 signals across 7 watches.*

3. **A per-watch quiet period (24h).** Per-kind cooldowns are not enough on
   their own. If the top-priority rule is in cooldown, the next one simply
   takes its place on the following sweep — so the customer hears about the
   same drop twice, a day apart, under a different heading.
   *Found by running two sweeps back to back.*

Per-kind cooldowns then sit underneath all of that, so a recurring edge of the
same type does not become a drip.

## Watching a whole retailer

A watch whose subject is a store rather than an item (`watchlist_items.retailer_id`,
in the schema since migration 0003 and unused until the retailer pages shipped).

It evaluates exactly **one** rule: `UNUSUALLY_STRONG`, against the same
threshold a product watch uses. There is deliberately no second definition of
"unusual" anywhere in the product, and no retailer watch ever fires
`PRICE_DROPPED` — the promise on the retailer page is "we'll tell you when
something here is genuinely worth buying, not when they run a sale", and a
store-wide sale alert is the thing this product exists to replace.

The edge is a different one. A retailer watch has no single price to take an
edge across, so the edge is **which offer** is strong: an offer this watch has
already announced cannot announce itself again. That is what stops a catalogue
item sitting at 9.2 for two months from being reported every time its 14-day
cooldown lapses. The sweep reads `deal_signals.offer_id` over a 180-day window
to know what it has already said.

A store with four strong offers is still one interruption — the strongest wins,
with the offer id breaking ties so two runs of the same sweep cannot disagree.

`evaluateRetailerWatch()` in `src/domain/deal-signal.ts` is pure and holds all
of it; `RETAILER_WATCH_SQL` in the runner only fetches evidence. Note the
`product_id is null` predicate there: the schema permits a row carrying both a
product and a retailer, and such a row is already handled by the product sweep.
Without that predicate it would be swept twice and could produce two signals for
one watch in a single pass.

## What cannot influence it

There is no membership tier, advertiser or commission input — no parameter
through which one could be expressed. A free customer's valid signal is never
delayed or downgraded to favour a paying one, and a test asserts that output is
byte-identical when commercial metadata is attached to the offer.

A signal is never generated from an Index we would not publish. If the evidence
is too thin to show a score, it is too thin to interrupt someone about.

## The job role

The sweep is the one thing that legitimately reads across customers. The blunt
way to allow that is `BYPASSRLS`, which disables row level security for the role
entirely — including on tables it has no business reading, and on every future
table.

Instead `bargenation_jobs` gets exactly what the sweep needs, through
role-scoped policies visible in `pg_policies`:

| Can | Cannot |
|---|---|
| read active watches | read saved items, households, members, preferences |
| read catalog and price history | update or delete any signal |
| read recent signals (cooldown) | rewrite price history |
| insert new signals | touch schema `commerce` |

`nobypassrls` is set explicitly so a reader knows it was a decision rather than
an oversight. Each row of that table is a test.

## Not built yet

**Delivery.** Signals are recorded and shown in the portal; nothing emails
them. That needs a provider credential. `deal_signals.delivered_at` exists for
it and stays null.

**Quiet hours** (§36) are built. They DEFER delivery and never suppress a
signal: what happened to a price is a fact about the world, and the record of
it must not depend on when somebody sleeps. The sweep writes
`deal_signals.deliver_after`, the portal shows "held until 7am", and the
signal itself is there the moment it happened.

The sweep reads the preference through `quiet_hours_for()` rather than the
`preferences` table, for the same reason the interest sweep does: migration
0007 denies this role that table outright, and needing one field is not a
reason to hand a batch job everybody's settings.

The wrapping window — ten at night to seven in the morning — is the case the
code is written around rather than the exception, because it is what people
actually set. Daylight saving is handled by Intl and the platform's own tz
database, not by offset arithmetic that is wrong twice a year; tests cover
both the night the clocks go forward and the night they go back.
