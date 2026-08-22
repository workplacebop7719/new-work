# BARGENATION

Shopping intelligence. We record what things actually cost over months, then
score today's price against **our own record** — not against the retailer's
claim about it. Sometimes the answer is that it isn't worth buying.

> **Status:** foundation build. The scoring engine, design system, public
> reading surfaces, database layer and authentication architecture are
> implemented and tested. The member portal, newsletter delivery, admin and
> affiliate redirects are **not** built — see *Not built yet* below.

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
npm run smoke      # end-to-end member flow in a real browser (needs a dev server)
```

No database is required. Without `DATABASE_URL` the app serves the fictional
fixture dataset and produces identical scores, because both paths feed the
same pure engine — [pinned by a parity test](src/db/parity.test.ts).

With PostgreSQL 16+:

```bash
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run test:db     # the database guarantees, against a real database
```

See [docs/DATABASE.md](docs/DATABASE.md) for what the schema guarantees and why,
and [docs/AUTH.md](docs/AUTH.md) for how authentication is layered.

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
| Price history cannot be rewritten | DB triggers reject UPDATE/DELETE/TRUNCATE, even for the owner |
| One customer cannot read another | RLS enabled **and forced**; proven by cross-user tests |
| Commission is unreachable from the app | `commerce` schema, no grant — a reaching query fails loudly |
| Sample data is always disclosed | the banner asks the **data**, not the environment |
| A fake auth provider cannot reach production | production without credentials degrades to a port that refuses everything |
| `returnTo` cannot become an open redirect | allowlist validation, 40 tests of hostile payloads |
| Provider errors never reach a customer | closed error set, our own copy |
| One customer cannot touch another's Saved, Watchlist or Signals | every member query runs *as the customer*; RLS is the enforcement |
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
src/data/        repository (the only module that knows where deals come from),
                 fixture + postgres adapters behind one contract
src/auth/        typed port, dev + supabase adapters, return-url allowlist
src/app/app/     the member portal, behind a real session check
src/db/          pooled client, schema and parity tests
db/migrations/   catalog, append-only, accounts+RLS, newsletter, commerce isolation
src/components/  chrome, deal, ui
src/app/         routes
scripts/         contrast guard
shot.mjs         visual QA — screenshots every page at 375 / 768 / 1440
```

## Built

**Public** — `/` · `/today` · `/search` · `/categories` · `/categories/[slug]` ·
`/deals/[slug]` · `/how-it-works` · `/login` · `/signup` · `404`

**Member portal** — `/app/watchlist` · `/app/saved` · `/app/deal-signals` ·
`/app/account`

## Not built yet

Deliberately absent rather than faked (PRD §01). Controls for these render
visibly disabled with the reason, and no navigation links to them.

| Area | Blocked on |
|---|---|
| Real sign-in (architecture and portal built, forms disabled) | Supabase Auth credentials |
| Forgot / reset / verify-email pages | the next slice |
| The Bargenation Edit + newsletter | an email provider credential |
| Affiliate `/go/[offer]` redirects | an affiliate account |
| Admin platform | depends on authentication |
| Legal pages | content that needs a lawyer, not invention |
