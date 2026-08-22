# The Bargenation Edit

An editorial property, not a signup form (PRD §38–§41).

```
/edit           the publication, with today's real issue
/edit/confirm   completes double opt-in
/edit/manage    consent record, frequency, unsubscribe
```

## The sample issue is not a mock-up

`/edit` composes today's issue from real scored deals using the same function
that will compose the sent one. What a reader sees is exactly what they would
have received — which also means the page is honest on a quiet day: if nothing
cleared the bar, it says there is no issue rather than showing a pretend one.

## An issue with nothing to say is not sent

Sections with nothing in them are **omitted, not padded**, and below two items
there is no issue at all.

A daily newsletter that must go out daily will eventually recommend something
it does not believe in. That is the whole argument for the cap and the floor.

## It has to read as edited

Two faults found by looking at the rendered page, neither caught by a test:

1. **The same line on four items out of five.** The scoring engine ranks
   reasons by contribution, so the top one tends to be identical across a day's
   deals. Composition now tracks lines already used and picks a fresh one,
   falling back to concrete recorded evidence which differs by construction.
2. **A reason *for* buying under "what we'd hold off buying".** The fallback
   reached into the positive list. Tone is now explicit per section.

Two products with the identical recorded low and typical price still get the
identical factual sentence — repeating a *fact* is not template repetition.

## Consent is evidentiary, not a checkbox

CASL's obligation is that you can show, per address, that consent was given —
when, how, and from where. So status is **derived from an append-only log**,
and the log is the record. It cannot be edited or deleted, including by us.

Double opt-in is not optional: an address is not subscribed until somebody
proves they can read it. A second request while pending records a second
`REQUESTED`, because a second signup attempt genuinely is a second request. A
request against an already-subscribed address records **nothing**, because
logging one would make the history misleading.

The subscriber can see that whole dated record at `/edit/manage`. Being able to
produce it for a regulator is the minimum; showing it to the person it
describes is the point.

This does not make anyone compliant. It makes compliance provable.

## Subscribers are reached by token, enforced by the database

The customer tables key their policies on `auth.uid()`. That cannot work here,
because §38 requires The Edit not to need an account — most subscribers have no
auth identity at all.

So each subscriber carries two opaque tokens and access is scoped to whichever
is presented, by policy against a GUC rather than a `WHERE` clause somebody has
to remember:

| Token | Purpose |
|---|---|
| `confirm_token` | single use: completing double opt-in |
| `manage_token` | long-lived: unsubscribe and preferences |

They are separate because a confirmation link travels through email and may sit
in an inbox for years. It must not later become a key to read or change
anything — asserted by test.

### Subscribing without being able to read subscribers

Deciding whether to record a request requires knowing the address's current
status, but reading `newsletter_subscribers` by email is exactly the capability
that would turn the signup form into an enumeration oracle.

An `insert ... on conflict do update` cannot work: an upsert needs the UPDATE
policy as well as INSERT, and UPDATE is token-gated. Loosening that policy
would have traded the actual protection for convenience.

Instead `newsletter_request_subscription()` is `SECURITY DEFINER` with a pinned
`search_path`: the **operation** is permitted while the **capability** is not.
It returns a state and a token, never a row.

## Delivery is not built

There is no email provider — no account with anyone exists. `EmailPort` defines
the shape, and the development adapter reports `configured: false`, so every
surface that depends on delivery says so rather than silently succeeding.

The signup form records the request and states plainly that nothing will be
sent, handing back the confirmation link directly in development. A form that
claims an email is on its way when none can be sent is the fake functionality
§01 rules out.

**Not built:** sending, HTML templates, bounce and complaint handling
(the `BOUNCED` and `COMPLAINED` states exist and nothing writes them), and
scheduling.
