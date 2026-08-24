# Behaviour alerts

If somebody keeps coming back to the same pushchair and never adds it to their
Watchlist, they have told us something. This is the feature that acts on that.

```bash
npm run smoke:noticed    # consent, recording and erasure in a real browser
```

## The rule the whole feature is built around

**Membership adds inference. It never subtracts service.**

A free customer's explicit Watchlist alert fires at exactly the same moment,
with the same wording, at the same threshold, whether or not anybody is
paying. `evaluateSignals` has no parameter through which membership could
arrive, and a test asserts its context object has exactly four keys.

What membership buys is that we **also** look at the things you never got
round to adding. That is the difference between a tier that adds work and a
tier that withholds it, and it is the only version PRD §52 permits: money
cannot buy a score, a Buy call, a ranking, or a place in a queue. It can buy
us paying attention to more of your behaviour on your behalf.

The Value Index and the Buy / Hold call are untouched. `noticeSomething()`
reads scored deals and decides whether to **mention** one — it cannot change
one, and a test pins that.

## Consent, and what "off" means

Off by default. Nothing is recorded for a signed-out visitor, and nothing for
a signed-in customer who has not switched it on. That check lives in
`recordInterest` rather than at the call site, so a new surface that forgets to
ask still records nothing — the safe default is the one you get by not
thinking about it.

**Turning it off erases what was collected.** Not "stops collecting". Anything
less makes the switch a setting rather than a decision.

`/app/noticed` shows the customer every row we hold, what it would take to act
on it, and a single control to delete all of it. A behaviour feature you
cannot inspect is surveillance with a friendly name.

## What is recorded

One row per customer, per product, per **day**, carrying a count.

There is no clickstream, no per-request row, and no column for an IP address,
user agent, referrer, session identifier or dwell time — a test asserts the
table has nowhere to put them. It is enough to tell "came back four times"
from "glanced once", and not enough to reconstruct somebody's afternoon.

Ninety days, pruned by `prune_interest_events()`. What you looked at last
spring tells us nothing useful and is only a liability.

## When it will actually say something

Every bar is deliberately high, because nobody asked for this alert:

| Condition | Why |
|---|---|
| Opened at least 3 times | One visit is a click, not a decision being put off |
| Not already on the Watchlist | Telling somebody twice is the duplicate-notification bug in a new costume |
| Not mentioned in the last 90 days | Longest cooldown of any signal kind |
| Value Index at least 7.5 | The same bar as a Buy call, not a lower one |
| Confidence not LOW, and publishable | An inferred alert must not be where a withheld Index leaks out |

At most one per customer per sweep, and `NOTICED` sits **last** in the signal
priority order — anything the customer explicitly asked for outranks anything
we inferred.

The alert carries its reason: *"You looked at this 5 times and never added it
to your Watchlist."* Somebody who cannot tell why they were messaged has been
surveilled rather than served.

## The privilege boundary that caught the first version

The sweep needs one fact: which customers are members **and** opted in. The
obvious implementation reads `profiles.membership` and `preferences.settings`.

Migration 0007 forbids exactly that, in writing — the job may not read
profiles or preferences — and it refused the query. That is the boundary
working.

Widening it would have handed a batch job read access to every customer's
preferences to learn a single boolean about some of them. Instead the job
**asks a question**: `interest_alert_recipients()` (migration 0015) is
`SECURITY DEFINER` with a pinned `search_path` and returns **ids and nothing
else** — not the membership value, not the settings object, not a name. Tests
assert the job still cannot read either table, and cannot write or erase
anybody's interest history.

## Membership is a flag, not a payments integration

The price is decided and lives in `src/domain/membership.ts`
([MEMBERSHIP.md](./MEMBERSHIP.md)). There is still no way to BUY it — no
provider is configured — so an operator sets `profiles.membership` by hand, and
`/membership`, `/app/account` and `/app/noticed` all say that plainly rather
than showing an upgrade button that goes nowhere (§01).

## Category interest

Built, and deliberately coarser than the product path.

Repeated visits to one of the eight fixed categories in `CATEGORIES` are
recorded by `NoteCategoryInterest` on `/categories/[slug]`, through a server
action that validates the slug against that list before it reaches the
database — and the insert is a `select ... from categories where slug = $1`, so
an unknown slug matches nothing and writes nothing rather than creating a
category out of whatever it was handed.

**Search terms are still not recorded, and the reason has not changed.** Free
text is where the sensitive things are: a medical condition, an unannounced
pregnancy, a child's name. There is no column for it. A category affinity is
enough to say "you have been in Shoes a lot" and cannot say anything a customer
would be alarmed to read back on `/app/noticed` — which is the test this whole
subsystem is written to pass.

Three thresholds keep it the weaker signal, and all three are stricter than the
product path:

| | product | category |
| --- | --- | --- |
| visits before it counts | `REPEAT_VIEWS_FOR_INTEREST` (3) | `REPEAT_VIEWS_FOR_CATEGORY_INTEREST` (5) |
| deal must reach | `MIN_INDEX_TO_MENTION` (7.5) | `UNUSUALLY_STRONG_INDEX` (9.0) |
| when it runs | always | only when the product path found nothing |

A category hunch can never displace something we actually watched somebody
return to, and a merely good deal in a browsed category is not worth an
interruption — if it were, this would fire constantly and become the thing
people mute.

## Not built yet

**Delivery.** Like every other signal, a `NOTICED` row is recorded and shown
in the portal; nothing emails it. That needs a provider credential.

**The `SEARCHED` kind.** The column accepts it and nothing writes it, for the
reason above. Recording that somebody searched *at all*, without the term,
would be technically safe and is not obviously worth the row.
