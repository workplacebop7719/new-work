# Household

Who you are shopping for.

```bash
npm run smoke:household   # drives it in a real browser
```

## Why it exists

A coat in the wrong size is not a bargain, however good the Value Index. This
is what turns "60% off" into "60% off, and it is the size your eldest actually
wears".

## Read the absences as the design

There is **no legal name, no date of birth, no school, no address, no medical
field and no government identifier** — and not because we chose not to ask.
**The columns do not exist.** We cannot lose, be compelled to produce, or
mis-sell a field we never created.

A nickname is enough to size a coat. A birth year is enough to judge whether a
toy suits.

The page says all of this **before** anything is typed, rather than leaving it
in `/privacy`. This is the one screen in the product that asks about a child,
and somebody should be able to see the shape of the question before answering
it. A smoke test reads the DOM and asserts the only fields present are a
nickname, a year and two sizes.

## Every field is optional, including the nickname

Somebody who only knows a shoe size can record that and nothing else.
Requiring a name in order to store a size would ask for more about a child
than the feature needs — the exact failure the table's shape exists to
prevent.

A blank field is stored as absent, never as an empty string.

## A birth year that cannot be right is not stored

A full date pasted into the box, a year in the future, `1200`, or "last April"
all record **no birth year** rather than being rejected. A wrong year quietly
produces wrong size advice, and arguing with somebody about a child's details
is a poor trade for a field that is optional anyway.

## Removing somebody keeps the shopping

`watchlist_items.household_member_id` is `on delete set null`. A watch that
was "coat for the eldest" becomes simply "coat". Deleting a child must not
silently delete the shopping, and the watch losing a name is the honest
outcome rather than one pointing at somebody who is gone.

## Isolation is the licence for the feature

This is the one table that describes a child, so "another customer cannot read
or touch it" is not a routine RLS check. Tests assert that naming another
household's member id from a different account updates nothing, removes
nothing, and cannot attach that person to your own watch — the guard is a
subquery that simply returns no rows, not a comparison somebody could forget
to write.

## Not built yet

**Matching deals to sizes.** The household records a clothing size and a shoe
size, and the Watchlist shows them beside the deal — but nothing filters or
scores offers *by* size, because offers carry no size data. `offers` has a
`variant_id` column and the ingestion pipeline does not populate it. Until a
source supplies variant-level sizes, "this is the right size" would be a guess
dressed as a match, so the product shows you the size and lets you decide.

**Sharing a household.** One household per customer, the same as watchlists.
A second adult with their own sign-in would need a real invitation and
permission model, which is a slice of its own rather than a second row.
