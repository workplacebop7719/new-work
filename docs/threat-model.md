# Threat model

- **Status:** v1 (CC-02). PRD §16 requires this to be revised at every slice that adds a data class or an external boundary, not merely updated.
- **Standard:** OWASP ASVS 5.0 Level 2 (SEC-001); OWASP Top 10 for awareness and training.
- **Owner:** security/privacy lead, who holds stop-ship authority (PRD §20).

## What the platform will hold

Internal accessibility policies, employee training records, website audit findings for unremediated systems, contracts, and business-sensitive evidence — for many client organizations at once, with external contractors given narrow access to slices of it. PRD §25 names "Sensitive data exposure" as an existential risk. This document treats it as one.

## Assets, ranked

| # | Asset | Why it matters |
|---|---|---|
| A1 | Client evidence files | Contains employee records and descriptions of unfixed vulnerabilities in client systems. |
| A2 | Cross-tenant access | One leak ends the business's core claim. |
| A3 | Audit log integrity | It is the evidence that access controls worked. |
| A4 | Regulatory claim integrity | A wrong published statement is client harm and legal exposure (§25). |
| A5 | Internal commercial data | Margins, wholesale rates, contractor scorecards. |
| A6 | Identity and session state | The route to everything above. |

## Trust boundaries in CC-01

```
  visitor ──► apps/web (server components)
                 │
                 ├─ @northstar/auth  policy check   (inner door — ENG-001)
                 │
                 └─ @northstar/db    RLS + tenant tx (outer wall — ADR-0003)
                                          │
                                    PostgreSQL (northstar_app, NOBYPASSRLS)
```

External boundaries declared but not yet crossed in CC-01: object storage, malware scanner, IdP, CRM, payments, e-signature, email, AI provider. All are behind ports in `@northstar/integrations` with fakes only.

## Threats and controls

| # | Threat | Control in CC-01 | Verified by |
|---|---|---|---|
| T1 | A query missing its `WHERE` clause returns another tenant's rows. | RLS `ENABLE` + `FORCE`, tenant context set per transaction; app role is `NOBYPASSRLS`. | `packages/db/test/tenant-isolation.test.ts` — a bare `SELECT * FROM projects` returns only the current tenant. |
| T2 | A write is smuggled into another tenant. | RLS `WITH CHECK` on every policy. | Same file — insert with a foreign `organization_id` is rejected. |
| T3 | A forgotten tenant context silently reads everything. | `current_setting(..., true)` returns NULL → policy matches nothing → zero rows; `withTenant` refuses an empty organization id. | Same file. |
| T4 | Authorization is checked in the UI only and bypassed via a direct request. | Policy layer is pure, server-side, deny-by-default; `test:authz` runs the full role matrix without a renderer. | `packages/auth/src/policy.test.ts` — 106 assertions. |
| T5 | A contractor keeps access after an assignment closes. | Grant expiry is re-evaluated on every request, not only by a revocation job. | `policy.test.ts` — "denies everything once the grant has expired". |
| T6 | A contractor reads evidence outside their brief. | Evidence access requires the object id to appear in the grant's evidence list. | `policy.test.ts`. |
| T7 | An attacker enumerates tenants or objects from URLs. | UUIDv7 identifiers; no sequential ids; cross-tenant denial reports "no membership", never "forbidden". | `packages/domain/src/ids.test.ts`, `policy.test.ts`. |
| T8 | Audit history is rewritten to hide an action. | `audit_events` has no UPDATE/DELETE grant to the app role **and** a trigger that raises. | `tenant-isolation.test.ts` — update and delete both rejected. |
| T9 | A deliverable is released with no accountable approver. | `released_requires_approver` CHECK constraint, in addition to the domain rule. | `tenant-isolation.test.ts`. |
| T10 | A reviewer approves their own high-risk work. | Segregation enforced in the policy layer (DAT-004). | `policy.test.ts`. |
| T11 | A platform admin browses client content routinely. | No routine access; break-glass is time-bound, read-only, and requires a stated reason. | `policy.test.ts`. |
| T12 | Secrets or personal data leak into logs. | Redaction applied on the way in, by key and by pattern; depth-limited. | `packages/observability/src/events.test.ts`. |
| T13 | Personal data leaks to an analytics vendor. | Closed event taxonomy, per-event strict schemas, global forbidden-property denylist. | Same file. |
| T14 | Analytics loads before consent. | Consent gate in the dispatcher, not in a script tag. | Same file; asserted again at page level in CC-02. |
| T15 | A stale regulatory claim keeps rendering. | Effective status is computed at render time; a claim past review returns a hold branch with no statement to render. | `packages/domain/src/content.test.ts`, `apps/web/e2e/shell.spec.ts`. |
| T16 | A regulatory claim is hard-coded into a component. | CI guard scans component source for regulatory vocabulary. | `scripts/guards/regulatory-hardcoding.mjs`. |
| T17 | A prohibited compliance claim ships. | CI guard over source and content, EN and FR. | `scripts/guards/prohibited-claims.mjs`. |
| T18 | A new table ships without tenant isolation. | CI guard requires `organization_id` + `ENABLE` + `FORCE` + policy, or an explicit `-- global:` declaration with a reason. | `scripts/guards/tenant-columns.mjs`. |
| T19 | A migration reaches production with no rollback plan. | CI guard requires a paired notes file containing Rollback, Roll-forward and Backup impact sections. | `scripts/guards/migration-notes.mjs`. |
| T20 | Destructive tooling runs against production. | `db:reset-safe` requires both a non-production `APP_ENV` **and** a local-looking host. | `packages/db/test/config.test.ts`. |

## Added in CC-02 — the public qualifier

The first surface that accepts input from anonymous visitors and stores it.

| # | Threat | Control | Verified by |
|---|---|---|---|
| T21 | A resume link is guessed or brute-forced, exposing another visitor's answers. | 32 bytes of randomness; only the SHA-256 hash is stored, so a database disclosure yields no working links; there is no listing or search function anywhere in the module. | `packages/db/test/qualifier-session.test.ts`. |
| T22 | Answers are read by script through an XSS. | The resume cookie is `httpOnly`; answers are never rendered into a script context. | Code review; CSP follows in CC-03. |
| T23 | Analytics fires before consent. | The gate is in the dispatcher, and `readConsent` treats "no decision" as refusal. | `apps/web/e2e/qualifier.spec.ts` asserts **zero** non-local requests before a decision. |
| T24 | A third-party tag is added to a template later, bypassing the gate. | `scripts/guards/analytics-consent.mjs` fails the build on any third-party host, on analytics globals, and on constructing `Analytics` outside the consent wrapper. | Guard negative-tested in both directions. |
| T25 | An open redirect is introduced by the "official source" hand-off. | The destination is resolved from the registered claim; the form carries only a claim key. A caller-supplied URL is never followed. | Code review; the action has no path that reads a URL from input. |
| T26 | An email address is stored without consent. | Enforced in the form, in the action, and by the `contact_email_requires_consent` database constraint. | `qualifier-session.test.ts` — the raw insert is rejected. |
| T27 | Consent is recorded without provenance. | `consent_recorded_together` constraint: the decision and its timestamp are set as a pair. | Same file. |
| T28 | Abandoned visitor data is retained indefinitely. | Retention sweep, dry-run by default, with the window in one constant. | Same file — both dry-run and applied modes. |
| T29 | The qualifier states a compliance conclusion. | `assertNoConclusion` over rule output; 144-permutation sweep; an end-to-end assertion over the rendered page. | `packages/domain/src/qualifier.test.ts`, `apps/web/e2e/qualifier.spec.ts`. |

## Known gaps at CC-02

| Gap | Why it matters | Closes in |
|---|---|---|
| **No rate limiting** on the qualifier actions or the resume-email form. | An anonymous POST endpoint that writes rows is an abuse vector: session flooding, and email-address enumeration through the resume form. The retention sweep bounds the storage cost but not the abuse. **This is the most significant open item from this slice.** | CC-03, with the identity work |
| No Content-Security-Policy beyond baseline headers. | Now that there are forms, a nonce-based CSP is worth the effort. | CC-03 |
| No CAPTCHA-free bot mitigation decided. | Any mitigation must not become an inaccessible challenge (ACC-005); this needs a design decision, not a drop-in widget. | CC-03 |

## Accepted risks in CC-01

| Risk | Why accepted now | Closes in |
|---|---|---|
| No authentication exists; there is no login and no session. | CC-01 ships no authenticated surface. The policy layer is complete and tested ahead of the identity work so authorization is not retrofitted. | CC-03 |
| The `northstar_app` role is created by a migration rather than by infrastructure. | Environment parity for local and preview. In production the role and its credential are owned by `/infra` and the block is a no-op. | CC-01 hardening / infra |
| Connection pooling mode is a documented deployment constraint, not an enforced one. | Transaction-scoped pooling is required so `SET LOCAL` cannot leak between callers. Nothing in the repository can currently verify the deployed pooler's mode. | CC-09 |
| No Content-Security-Policy beyond baseline headers. | A nonce-based CSP needs a real page to be measured against; a policy written now would be wrong by CC-02. | CC-02 |
| No rate limiting. | No public form or authentication endpoint exists yet. | CC-02 |

## Not yet modelled

Object storage and the malware pipeline (CC-04), identity and session handling (CC-03), the AI provider boundary (CC-08), and the internal console's cross-tenant read models (CC-07). Each requires a threat-model revision in its own slice, per PRD §16 — a revision, not an addendum.
