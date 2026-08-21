# Database

PostgreSQL 16+. Runs on Supabase unchanged — the RLS policies are written
against `auth.uid()`, and migration `0003` creates a compatible local shim
only when that function does not already exist.

## Commands

```bash
npm run db:migrate   # apply pending migrations, each in its own transaction
npm run db:seed      # load the fictional development dataset
npm run db:reset     # drop schema, migrate, seed  (local databases only)
npm run test:db      # the guarantees below, against a real database
```

`test:db` needs two URLs, because row level security can only be tested from a
role that is subject to it:

```bash
TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5433/bargenation_dev \
TEST_APP_DATABASE_URL=postgresql://bargenation_app:...@127.0.0.1:5433/bargenation_dev \
npm run test:db
```

## Migrations

| File | What it establishes |
|---|---|
| `0001_catalog.sql` | retailers, products, offers, price observations, verification events, score audit |
| `0002_append_only.sql` | price history and verification events cannot be altered |
| `0003_accounts.sql` | profiles, households, watchlists, signals — all under forced RLS |
| `0004_newsletter.sql` | subscribers plus an append-only consent record |
| `0005_commerce_isolation.sql` | affiliate data in a separate schema, scoring role denied |
| `0006_app_role.sql` | the non-superuser role the application connects as |

## The four guarantees, and why each is built the way it is

### 1. Price history cannot be rewritten

`UPDATE`, `DELETE` and `TRUNCATE` on `price_observations` all raise. So do
`UPDATE` and `DELETE` on `verification_events`.

The whole product rests on "this is what we recorded". If a row can be edited
afterwards, that claim is worth nothing — an inconvenient score could be
improved by quietly rewriting the past and nobody could tell. **A correction is
a new observation.**

This applies to the table owner too, not only to the application role. It also
means a reseed cannot clear history: starting over requires dropping the
schema, which is what `db:reset` does and why it refuses to run against a
non-local database.

### 2. One customer cannot reach another

Every customer table is `enable row level security` **and**
`force row level security`.

`force` is the load-bearing half. Without it the table owner bypasses its own
policies, so any server code connecting as the owner would read every
household in the system no matter how carefully the policies were written.

For the same reason the application connects as `bargenation_app`, never as a
superuser: superusers and roles with `BYPASSRLS` ignore RLS entirely, which
would silently defeat every policy in `0003`.

Tables owned transitively (household members, watchlist items) are scoped
through a subquery on the parent, so a row is visible only when its chain
terminates at the caller's own profile.

### 3. Commission cannot reach a score

Affiliate links, clicks and campaigns live in schema `commerce`. Neither
`bargenation_scoring` nor `bargenation_app` is granted anything on it, and the
grants are explicitly revoked so a future change to default privileges cannot
quietly hand it over.

A query that reaches for a commission rate does not get a wrong answer or a
subtly influenced score. It gets `permission denied for schema commerce` and
fails loudly. This holds even when the reach is disguised as a join onto
`offers` — there is a test for exactly that.

This is the database half of the firewall. The other half is the shape of the
code: `computeValueIndex` has no parameter through which commission could
arrive in the first place.

### 4. We never collected what we should not hold

`household_members` has `nickname`, `birth_year`, `clothing_size`,
`shoe_size`. Read the absences as design:

- no legal name — a nickname is enough to size a coat
- no date of birth — a birth year is enough to judge age-appropriateness
- no school, no address, no medical field, no government identifier

We cannot leak, be subpoenaed for, or mis-sell a field we never collected. A
test asserts these columns stay absent. If a future feature appears to need
one, that is a product conversation, not a migration.

## Scores are recomputed, never read back for display

`value_index_scores` exists for audit — so any past call can be reconstructed
and defended — but no read path serves it to a customer. Both adapters load
observations and recompute, so a stale or tampered score row cannot reach a
page.

A `score_shape` constraint keeps the audit rows coherent: a published score
must carry a number and no withholding reason; a withheld one must carry a
reason and no number. Neither state can be recorded incorrectly.

## Known gap: market competitiveness across adapters

The in-memory fixtures carry a hardcoded list of competitor prices. The
database derives the same component properly — from other retailers' offers on
the same product — and the seeded set has one offer per product, so there is
nothing to compare and the component is excluded.

**The database model is the correct one.** The parity test pins this divergence
explicitly so it cannot be mistaken for agreement, and it should be deleted
once fixtures carry multiple offers per product.
