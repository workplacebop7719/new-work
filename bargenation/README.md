# BARGENATION

Shopping intelligence. We record what things actually cost over months, then
score today's price against **our own record** — not against the retailer's
claim about it. Sometimes the answer is that it isn't worth buying.

> **Status:** foundation build. The scoring engine, design system and public
> reading surfaces are implemented and tested. Accounts, newsletter, admin and
> affiliate infrastructure are **not** built — see *Not built yet* below.

## Run it

```bash
npm install
npm run dev        # http://localhost:3210
```

Validation — all four must pass:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run contrast   # WCAG AA guard over the shipped tokens
```

No database is required. Without `DATABASE_URL` the app serves the fictional
fixture dataset and produces identical scores, because both paths feed the
same pure engine.

## The rules that are actually enforced

These are not conventions. Each one has a test or a guard that fails the build.

| Rule | Enforced by |
|---|---|
| The Value Index is arithmetic; AI never produces the number | `src/domain/value-index.ts` is pure — no clock, no network, no model |
| Commission cannot reach a score or a recommendation | `trust.test.ts` — there is no parameter to pass it through |
| Urgency cannot inflate the Index | `WEIGHTS` is asserted to contain exactly the eight PRD components |
| An unmeasurable component is excluded and the rest reweighted | `value-index.test.ts` — `null` is never treated as zero |
| No Index is published without our own price history | `canPublishIndex()` + gate tests |
| Nothing is fabricated | fixtures supply **observations only**; every score is computed |
| Brand pink is a surface, never type on white | `scripts/check-contrast.mjs` fails the build if it ever clears AA |

### The palette problem, and why it is solved this way

Brand pink `#FC78DC` scores **2.37:1** against white — it fails AA for text
(4.5) and even for UI boundaries (3.0). Black on pink scores **8.86:1**.

So pink is a **surface** colour: black sits on pink, pink never sits on white.
Where a pink mark is genuinely needed on white (links, focus rings) there is
`--color-pink-ink` `#B0148A`, the same hue darkened to 6.34:1. The contrast
guard asserts both directions — including that brand pink still *fails* as
type, so the rule cannot quietly erode.

This is also what keeps the identity from reading as bubblegum: pink in
confident blocks is editorial, pink on every link is candy.

## Layout

```
src/domain/      value-index, confidence, urgency, buy-hold, price-history — framework-free
src/data/        repository (the only module that knows where deals come from) + fixtures
src/components/  chrome, deal, ui
src/app/         routes
scripts/         contrast guard
shot.mjs         visual QA — screenshots every page at 375 / 768 / 1440
```

## Built

`/` · `/today` · `/search` · `/categories` · `/categories/[slug]` ·
`/deals/[slug]` · `/how-it-works` · `404`

## Not built yet

Deliberately absent rather than faked (PRD §01). Controls for these render
visibly disabled with the reason, and no navigation links to them.

| Area | Blocked on |
|---|---|
| Accounts, Watchlist, Saved, Deal Signals, Picked for You | Supabase credentials |
| The Bargenation Edit + newsletter | an email provider credential |
| Affiliate `/go/[offer]` redirects | an affiliate account |
| Admin platform | depends on accounts |
| Legal pages | content that needs a lawyer, not invention |
| Postgres adapter | schema designed, adapter not written |
