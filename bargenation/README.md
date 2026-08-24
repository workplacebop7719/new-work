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
npm run smoke:recovery   # forgot / reset / verify, driven the same way
npm run smoke:account    # change password, export, delete
npm run smoke:challenge  # the bot challenge on sign-up and reset
npm run smoke:noticed    # behaviour alerts: consent, recording, erasure
npm run smoke:household  # who you shop for, and what there is nowhere to put
npm run smoke:rate-limit # brute force refused, and the owner never locked out
npm run smoke:all        # all ten, in order
npm run signals    # one Deal Signal sweep (connects as the jobs role)
npm run ingest     # one ingestion pass from a local records file
npm run legal      # guard: no compliance claims, no invented company details
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
[docs/AUTH.md](docs/AUTH.md) for how authentication is layered, and
[docs/DEAL-SIGNALS.md](docs/DEAL-SIGNALS.md) for why the signal engine stays quiet, and
[docs/INGESTION.md](docs/INGESTION.md) for how feed data becomes history, and
[docs/ADMIN.md](docs/ADMIN.md) for the operations surface, and
[docs/LEGAL.md](docs/LEGAL.md) for how the legal pages handle what we do not know, and
[docs/NEWSLETTER.md](docs/NEWSLETTER.md) for how consent is kept provable, and
[docs/RETAILERS.md](docs/RETAILERS.md) for how a verdict about a named business
is derived and when it refuses to give one, and
[docs/BOT-RESISTANCE.md](docs/BOT-RESISTANCE.md) for why there is no captcha
vendor and what stands in for one, and
[docs/BEHAVIOUR-ALERTS.md](docs/BEHAVIOUR-ALERTS.md) for how membership adds
inference without ever subtracting service, and
[docs/HOUSEHOLD.md](docs/HOUSEHOLD.md) for the fields that deliberately do not
exist, and
[docs/RATE-LIMITING.md](docs/RATE-LIMITING.md) for the account lockout this
deliberately does not have.

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
| Signals cannot become spam | edge-triggered rules, one signal per watch per sweep, 24h quiet period |
| The signal job cannot roam | narrow role-scoped grants, `nobypassrls`, asserted by tests |
| A customer cannot promote themselves | column-level grant on `profiles.role`; RLS scopes rows, not columns |
| Staff cannot read customer personal data | enumerated grants; households and watchlists are not among them |
| Operator decisions cannot be erased | `admin_actions` is append-only and its actor cannot be deleted |
| We never claim legal compliance | `LAWYER_REVIEWED` is a literal false the environment cannot set |
| A missing company detail is never invented | guard rejects plausible placeholders; gaps are stated once, deliberately |
| Ambiguous feed data is refused, not guessed | extraction returns a reason; `"1,234"` is rejected outright |
| A doubtful price never enters the permanent record | quarantined until a **different** source agrees |
| Two products are never silently merged | matching asks for review instead of picking a winner |
| A resolved match never has to be resolved twice | the answer is stored as an alias and consulted before similarity |
| Consent is provable, not asserted | append-only log; status is derived from it, never set directly |
| A subscriber's token cannot reach another's row | token-scoped RLS policies, not a `WHERE` clause |
| An issue with nothing to say is not sent | sections are omitted rather than padded; below two items, no issue |
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
src/ingest/      source port, normalisation, product matching, watchdog, pipeline
src/content/     legal document metadata and the details we do not yet have
src/newsletter/  issue composition, subscription and consent
src/email/       the delivery port both The Edit and account recovery use
src/security/    the first-party bot challenge (no third-party script)
src/app/app/     the member portal, behind a real session check
src/db/          pooled client, schema, parity and signal-job tests
db/migrations/   … 0007 adds the narrowly-granted signal job role
src/components/  chrome, deal, ui
src/app/         routes
scripts/         contrast guard
shot.mjs         visual QA — screenshots every page at 375 / 768 / 1440
```

## Built

**Public** — `/` · `/today` · `/search` · `/categories` · `/categories/[slug]` ·
`/deals/[slug]` · `/stores` · `/stores/[slug]` · `/how-it-works` · `404`

**Accounts** — `/login` · `/signup` · `/forgot-password` · `/reset-password` ·
`/verify-email`

**Self-service** — `/app/account/password` · `/app/account/sessions` ·
`/app/account/export` · `/app/account/delete`

**Member portal** — `/app/watchlist` · `/app/saved` · `/app/deal-signals` ·
`/app/household` · `/app/noticed` · `/app/account`

**Operations** — `/admin` · `/admin/review` · `/admin/quarantine` ·
`/admin/sources` · `/admin/audience` · `/admin/revenue`

**The Edit** — `/edit` · `/edit/confirm` · `/edit/manage`

**Legal** — `/privacy` · `/terms` · `/disclosures` · `/contact` · `/about`

## Not built yet

Deliberately absent rather than faked (PRD §01). Controls for these render
visibly disabled with the reason, and no navigation links to them.

| Area | Blocked on |
|---|---|
| Real sign-in (architecture and portal built, forms disabled) | Supabase Auth credentials |
| Delivering recovery and confirmation links (the flow itself is built) | an email provider credential |
| Selling membership (the tier itself works; an operator sets the flag) | a price and a payment provider |
| Matching deals to a household's sizes (sizes are recorded and shown) | variant-level size data no source supplies yet |
| Sending The Edit (composition and signup are built) | an email provider credential |
| Affiliate `/go/[offer]` redirects | an affiliate account |
| Admin platform | depends on authentication |
| Legal review of the drafted pages | a lawyer, not more writing |
