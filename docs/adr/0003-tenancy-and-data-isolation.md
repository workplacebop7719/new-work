# ADR-0003 — Tenancy model and data isolation

- **Status:** Accepted (CC-01)
- **Date:** 2026-08-18
- **Deciders:** Engineering lead, security/privacy lead
- **Blocks:** CC-01
- **PRD basis:** §16 Authorization; §17 Data; §18; §27 Database posture ("tenant ID on tenant-owned data, database-level enforcement where practical")

## Context

The platform holds internal policies, employee training records, audit findings and contracts for many client organizations, plus contractors who must see a strict subset of one client at a time. A cross-tenant leak is an existential failure (§25 "Sensitive data exposure").

The PRD asks for tenant IDs plus **database-level enforcement where practical** — an explicit instruction not to rely on application `WHERE` clauses alone.

Note that isolation here is two-dimensional: tenant (organization) *and* scope-within-tenant (a contractor sees one project's approved evidence, not the organization's whole vault). A tenancy model that only solves the first dimension is insufficient.

## Decision

**Shared database, shared schema, `organization_id` on every tenant-owned table, with PostgreSQL Row-Level Security as the enforcing backstop.**

1. Every tenant-owned table carries a non-null `organization_id`. This is checked by a migration lint that fails when a new table lacks it or an explicit `-- global` annotation.
2. RLS is `ENABLE`d and `FORCE`d on those tables. Application connections use a non-superuser role with no `BYPASSRLS`.
3. The request path sets a session-local tenant context (`SET LOCAL app.organization_id`) inside the transaction. The policy compares `organization_id` to that setting. A query that forgets its `WHERE` clause returns zero rows rather than another tenant's data.
4. **Scope-within-tenant** (contractor grants) stays in the application policy layer (ADR-0002), because it depends on assignment state and expiry, not on a static column. RLS is the outer wall; the policy layer is the inner door.
5. Identifiers exposed externally are opaque and non-sequential (ULID/UUIDv7) — ENG-003.
6. Cross-tenant tests are mandatory: `test:authz` includes, for every protected resource class, a test where actor from tenant A requests object from tenant B and must receive a not-found (not a forbidden — do not confirm existence).
7. Background jobs and the retention worker run under the same RLS role with an explicit tenant context per unit of work; no job runs "for all tenants" in a single unscoped transaction.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Schema-per-tenant | Stronger blast-radius isolation and a clean per-tenant export/deletion story (SEC-013). Rejected: migrations must run across N schemas, connection pooling degrades, and cross-tenant internal views (OPS-001..003, the whole operations console) become expensive joins across schemas. Reconsider only if an enterprise client contractually requires physical separation. |
| Database-per-tenant | Best isolation, worst operations for a small team (§21). Migration and backup cost scales linearly with clients. Rejected at this scale; revisit above ~200 tenants or on a specific contractual demand. |
| Application-only filtering (no RLS) | Simplest and fastest. Rejected outright — it makes a single missing `WHERE` clause a breach, and contradicts §27's "database-level enforcement where practical". |
| Separate database for evidence metadata | Adds a distributed-transaction problem between evidence rows and audit events (A-11 requires same-transaction audit writes). Rejected. |

## Consequences

- **Positive:** one migration set; internal console queries are ordinary SQL; RLS turns a class of application bugs into empty result sets.
- **Positive:** verified deletion (SEC-013) is a scoped delete plus object-storage lifecycle, testable end to end.
- **Negative:** RLS has a real query-planning cost and a real footgun — a forgotten `SET LOCAL` yields *zero* rows, which surfaces as a confusing empty state rather than an error. Mitigation: the data-access layer refuses to open a transaction without a tenant context (or an explicit `systemContext()` escape hatch that is itself audited).
- **Negative:** connection poolers must not multiplex sessions in a way that leaks `SET LOCAL` across transactions. Mitigation: transaction-scoped pooling only; this is a documented deployment constraint in `/infra`.
- **Negative:** "not-found instead of forbidden" complicates support diagnostics. Mitigation: correlation IDs in structured logs (ARC-009) let support explain a denial without leaking existence to the caller.

## Verified at CC-01

The decision is not merely written down; `packages/db/test/tenant-isolation.test.ts` proves each claim against a live PostgreSQL:

- a bare `SELECT * FROM projects` with no `WHERE` clause returns only the current tenant;
- a query naming another tenant's id explicitly returns nothing;
- an `INSERT` carrying a foreign `organization_id` is rejected by `WITH CHECK`;
- with no tenant context set, every tenant-owned table returns zero rows;
- the audited `withSystemContext` path does cross tenants, and refuses to run without a stated reason.

One implementation detail turned out to matter more than expected: a PostgreSQL **superuser bypasses row-level security regardless of `FORCE`**. The tests therefore drop into the `northstar_app` role (`NOBYPASSRLS`) inside each transaction. A test suite connecting as the owner would have passed while proving nothing — worth knowing before someone "simplifies" the connection setup.

## Requirements satisfied

DAT-002, DAT-006, SEC-003, SEC-013, CTR-004, ENG-003, ENG-001.

## Review triggers

Revisit if: a client contractually requires physical data separation; tenant count or data volume degrades RLS query plans measurably; or an internal reporting need makes cross-tenant queries awkward enough to tempt a `BYPASSRLS` role (that temptation is the signal, and the answer is a separate read model, not a bypass).
