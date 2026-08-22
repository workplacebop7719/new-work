# Legal surface

Five pages that every footer links to: `/privacy`, `/terms`, `/disclosures`,
`/contact`, `/about`. All five previously 404'd while the footer simultaneously
asserted a commission relationship.

```bash
npm run legal   # guard: no compliance claims, no invented company details
```

## Two rules

**Never claim compliance.** These drafts describe what the software does.
Whether that satisfies CCPA, PIPEDA, Law 25, COPPA or CASL is a lawyer's
judgement, and asserting it would be the product concluding something nobody
qualified has checked. `LAWYER_REVIEWED` is a literal `false` and is
deliberately *not* readable from the environment — "a lawyer read this" is a
claim about the world, and a deployment must not be able to make it about
itself.

**Never invent a company detail.** The operating entity, its address, its
contact addresses and the governing jurisdiction are facts about a company, not
copy. A plausible placeholder is worse than a visible gap, because it stops
looking like a gap.

## How the gaps are presented

An earlier product in this lineage scattered amber `[entity name — to be
completed]` markers through the prose, and they read as broken template output.

Here the prose never contains a gap. It says "Bargenation", which is true
regardless of what the operating entity turns out to be called. Every missing
fact is listed **once**, in a panel that reads as a considered statement, with
an explanation of why each one matters — a gap a reader cannot interpret is
only slightly better than a fake value.

`Detail` exists for the two sentences that genuinely cannot be written without
the fact (governing law, and who the agreement is with). Everywhere else the
prose was written so it does not need one.

## The privacy policy describes the actual schema

Most privacy policies are boilerplate that does not match the system. This one
was written against the migrations, so every claim corresponds to a column that
exists — or deliberately does not:

- **No** column for a child's legal name, date of birth, school, home address,
  medical information or government identifier. Not "we choose not to collect
  it": the columns were never created.
- Affiliate clicks record a coarse referrer and browser family. **No** IP
  address column, **no** device fingerprint.
- Access is enforced by row level security, so a bug returns nothing rather
  than somebody else's Watchlist.
- Operations staff connect with a role that has no grant on households, saved
  items, watchlists, signals, preferences or subscribers.

Each of those is testable, and most already are.

A policy that does not match the database is worse than none, because it is a
promise nobody is keeping.

## The guard

`scripts/check-legal-claims.mjs` fails the build on:

1. A compliance claim (`fully compliant`, `PIPEDA-compliant`, `approved by
   counsel`, …).
2. An invented company detail (a plausible street address, a
   `…@bargenation.com` address, `Bargenation Inc.`, a named province or state).
3. `LAWYER_REVIEWED` becoming anything other than a literal `false`, or being
   derived from the environment.
4. A footer link marked `built: true` whose page does not exist.

All four were verified by introducing each violation and watching the guard
reject it.

## Honest gaps stated on the pages themselves

- Export and account deletion are not built; a request today would be handled
  by a person. The privacy page says so.
- There is no monitored inbox, so `/contact` has **no form** rather than one
  that silently discards messages.
- Recorded prices are not deleted on account deletion, because they are not
  personal data. Stated plainly rather than left ambiguous.
