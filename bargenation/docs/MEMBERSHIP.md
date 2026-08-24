# Membership

`/membership`, `/app/noticed`, `/app/account` — and one file that owns the
number: `src/domain/membership.ts` (PRD §52, §01, §45).

## The price, and why this one

Two founding documents named two different prices. The PRD said **$9.99** a
month; the capital plan modelled **$5.99–8.99**. Nothing shipped while that was
open, because a price quoted in one place and contradicted in another is worse
than no price at all — whichever a customer reads first is the one they believe
they were promised.

The founder resolved it by delegating the decision, with the instruction to
overrule the PRD where the two conflict.

```
MONTHLY_PRICE_CENTS = 799     // $7.99 USD per month
```

**Why $7.99.** It is the top of the band the capital plan actually modelled, so
the revenue assumptions behind that plan still hold; and it resolves in favour
of the document carrying the financial model rather than the one carrying the
product description. The gap to the PRD's $9.99 is two dollars a month. The gap
to a price nobody modelled is a plan nobody can trust.

**One source, enforced.** `membership.test.ts` walks `src/app` and
`src/components` and fails on any price-shaped literal (`$1.00`–`$99.99`) in the
UI. Prose that types the price by hand is exactly how one page comes to
contradict another two sprints later.

## It cannot be bought

`MEMBERSHIP_PURCHASABLE` is `false` and is hard-coded, not read from an
environment variable — a variable would imply somebody could turn this on
without also building the checkout, the receipts, the tax handling and the
cancellation route that must exist before taking money is either legal or
decent.

So `/membership` quotes a real price for something nobody can buy, and says so
in the largest type on the page after the price itself. The tempting
alternatives were a "Join" button that collects an address and calls it a
waitlist, or a disabled button with no explanation. Both read as a product that
works and is merely busy. §01 forbids both: omit it, or disable it *and state
the reason*.

A test holds that line — while the flag is false, the page must contain no
`<button>` and none of the words a checkout uses.

Until a provider exists, an operator sets `profiles.membership` for a real
member. That is a flag, and it is described as a flag.

## What membership adds

The complete list lives in `MEMBER_BENEFITS`, and every entry names a route
that exists — a test resolves each `href` to a real `page.tsx`, so an
aspirational benefit would fail the suite rather than 404 in front of somebody.

1. **We watch what you never got round to adding.** Three visits to the same
   product without a Watchlist entry is a decision being put off
   ([BEHAVIOUR-ALERTS.md](./BEHAVIOUR-ALERTS.md)).
2. **Inferred alerts held to the same bar as a Buy call.** `MIN_INDEX_TO_MENTION`
   is set at the Buy threshold, not below it. The temptation with an alert
   nobody asked for is to fire it more readily so the feature looks alive,
   which is precisely how it becomes the thing people mute.

## What it can never buy (§52)

Rendered on the page at the same weight as the list above it, because a page
selling a subscription is exactly where a ranking boost gets quietly listed as
a perk:

- a Value Index
- a Buy, Hold or Skip call
- rank, placement or a Standout
- an alert that arrives sooner — a free account's Watchlist fires at the same
  instant as a member's
- anything about what is collected or how long it is kept

This is not a policy anybody has to remember. The scoring code is given no
commercial or membership input, and `evaluateSignals` has no parameter through
which a tier could be expressed. Membership adds **inference**; it never
subtracts **service**.

`MEMBER_BENEFITS` titles are tested against a forbidden-word list covering
score, rank, featured, sooner, priority and queue — the detail text may *deny*
those, but a title promising one cannot ship.
