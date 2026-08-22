# Runbook

- **Status:** v3 (CC-03a) — local and CI operations only. Production runbooks are a CC-09 deliverable (SEC-010) and must be tested by someone who did not write them.

## Local setup

```bash
pnpm install                 # deterministic, from the committed lockfile
cp .env.example .env.local   # then edit DATABASE_URL if your Postgres differs
pnpm db:migrate
pnpm db:seed
pnpm dev                     # http://localhost:3000 → redirects to /en
```

You need PostgreSQL 16+ reachable at `DATABASE_URL`. The application connects as
`northstar_app`, a role the first migration creates. That role **must** be
`NOBYPASSRLS`: a superuser silently defeats every row-level security policy in
the schema, so a superuser connection would make the isolation tests pass while
proving nothing.

## Commands (PRD §27 contract)

| Command | What it does |
|---|---|
| `pnpm install` | Deterministic install from `pnpm-lock.yaml`. |
| `pnpm dev` | Full local experience with fake integrations (`@northstar/integrations` fakes). |
| `pnpm lint` | ESLint across the workspace **plus** the §27 repository guards. |
| `pnpm typecheck` | `tsc --noEmit` in every package. |
| `pnpm test` | Unit and integration tests. Needs a database for the isolation suite. |
| `pnpm test:e2e` | Playwright journeys: desktop, mobile, and a no-JavaScript project. |
| `pnpm test:a11y` | The `@a11y`-tagged subset. Coverage only — see the accessibility test plan. |
| `pnpm test:authz` | Cross-tenant and role matrix; every protected resource class. |
| `pnpm db:migrate` | Applies pending migrations in filename order, each in its own transaction. |
| `pnpm db:seed` | Loads the fictional Maple Grove and Riverside demo tenants. |
| `pnpm db:reset-safe` | Drops, re-migrates and reseeds. **Refuses** unless `APP_ENV` is non-production *and* the host is local. |
| `pnpm build` | Production build. |
| `pnpm start` | Serves the production build. |

## Demo accounts

`pnpm db:seed` creates fictional data only.

**The password for every demo account is `northstar demo passphrase`.**

The seed cannot create credentials — those live with the identity provider
(ADR-0002), and locally that provider is in-memory. The first time you open the
sign-in page, the app provisions each seeded account at the fake provider and
sets that password. The panel at the bottom of `/en/sign-in` lists them, and it
appears only when the fake is the provider actually in use.

The bootstrap touches **only** addresses in the reserved `.example` top-level
domain, which is what the seed uses. An account you create yourself on a local
build is never touched by it.

| Role | Email |
|---|---|
| Client admin | `admin@maplegrove.example` |
| Client executive | `exec@maplegrove.example` |
| Client contributor (web lead) | `web@maplegrove.example` |
| Contractor (auditor) | `auditor@specialists.example` |
| Internal PM | `pm@northstar.example` |
| Qualified reviewer | `reviewer@northstar.example` |
| Platform admin | `platform@northstar.example` |
| Client admin, second tenant | `admin@riverside.example` |

The second tenant exists so the tenant boundary is demonstrable rather than merely asserted, which is what PRD §27 asks the demo to make visible.

### Signing in for the first time

Every account needs a second factor (SEC-002), and none of the seeded ones has
one yet. The first sign-in therefore lands on enrolment:

1. Sign in with the address and the password above.
2. Choose **Set up an authenticator app**.
3. Either scan nothing and paste the printed setup key into a real authenticator
   app, or use the **Current code** the page prints next to it — a local-only
   convenience so you do not need a phone to try the product.
4. Confirm, then sign in again with the factor you just enrolled.

Enrolment does not itself create a session, and neither does signing up. That is
deliberate: `verifySecondFactor` is the only place in the codebase that issues
one.

## Things that will confuse you once

**A query returns zero rows and you expected data.** Almost always a missing tenant context. Row-level security turns a forgotten `SET LOCAL` into an empty result, not an error — that is the design (a confusing empty state is much better than a cross-tenant leak). Use `withTenant(organizationId, ...)`, or `withSystemContext(reason, ...)` for a deliberate cross-tenant read.

**`db:reset-safe` refuses to run.** It requires *both* a non-production `APP_ENV` and a host that looks local. Both, deliberately: one mis-set variable should not be enough to destroy data.

**The homepage shows "This guidance is being reviewed" instead of the deadline.** Correct behaviour. The seeded regulatory claim is `in_review` pending counsel sign-off (open question Q-04), and an unreviewed claim structurally cannot render its statement (CNT-005). This demonstrates the safety mechanism rather than bypassing it.

**"This page couldn't load" on the qualifier.** Almost always a database that is behind on migrations — the qualifier persists sessions from the first answer. Run `pnpm db:migrate`. CI runs migrations before the end-to-end job for this reason.

**The homepage keeps asking about analytics.** The decision lives in the `ns_consent` cookie. Clearing cookies clears the decision, which is intended: no decision is not consent.

**"Too many requests from your connection" while developing.** The rate limiter
(Q-27) counts per client address in fixed hourly windows. Locally every request
looks like the same client, so a heavy manual session can exhaust a budget. Wait
for the window, or clear it: `psql -c "TRUNCATE rate_limit_counters"`. Do not
raise the limits to make a local annoyance go away — they are sized for a shared
office address, and the values are a security decision (see the threat model).

**Sign-in says "that email address and password did not match an account" for a
seeded account.** Two likely causes. Either the app has not provisioned the demo
accounts yet — open `/en/sign-in` once, which triggers it — or the database was
reseeded while the server was running, in which case restart it. The fake
provider derives its subject ids from the address precisely so a restart does not
orphan the rows the database already holds.

**An invitation "sends" but no email arrives.** There is no mail server locally.
The team page prints the acceptance link once, on the page that created it,
whenever the fake email adapter is in use.

**Everyone gets signed out after a while.** By design (ACC-004): twelve hours
idle for a client session, two for an internal one, with a warning and a
"keep me signed in" button five minutes before. Both clocks are server-side, so
clearing the cookie is not what ended the session — the row was.

**A guard fails in `pnpm lint`.** The repository guards enforce PRD §27 constraints, not style. Read the message: each names the requirement and, where an exception is legitimate, the annotation that records it (`northstar-allow-claim:`, `northstar-allow-regulatory:`, `-- global:`). Annotations are reviewed in the pull request; that is the audit trail.

**Playwright can't find a browser.** Set `CHROMIUM_PATH` to an existing Chromium, or run `pnpm --filter @northstar/web exec playwright install chromium`.

## CI

`.github/workflows/ci.yml` runs three jobs: quality (lint, typecheck, migrate, seed, test, test:authz against a Postgres service), end-to-end (migrate, build, test:e2e, test:a11y — also against a Postgres service, since the qualifier persists sessions), and supply-chain (dependency audit, secret scan). Every command exits non-zero on failure.

## Scheduled jobs

`pnpm db:retention` is not yet scheduled. It must run daily once the qualifier is
public, because CNV-001 commits to a retention schedule and an unrun sweep means
that commitment is not being kept. Scheduling it is part of the CC-03
infrastructure work.

As of CC-03a it also sweeps auth sessions (90 days from last activity), closed
invitations (30 days, which removes the stored address) and sign-in throttle
counters (2 days). It is still dry-run by default; `--apply` deletes.
