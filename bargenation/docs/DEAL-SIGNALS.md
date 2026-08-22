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

**Quiet hours** (§36) are a per-customer preference the sweep does not read
yet. When they arrive they should defer delivery, not suppress the signal —
the record of what happened should not depend on when someone sleeps.
