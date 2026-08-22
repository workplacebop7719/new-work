# Threat model

- **Status:** v2 (CC-02 hardening). PRD §16 requires this to be revised at every slice that adds a data class or an external boundary, not merely updated.
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

## Closed in the CC-02 hardening pass

| # | Threat | Control | Verified by |
|---|---|---|---|
| T30 | An anonymous endpoint is flooded: session rows created without limit. | Fixed-window rate limiting per client address and action, failing **closed** if the counter cannot be read. | `packages/db/test/rate-limit.test.ts`; `apps/web/e2e/hardening.spec.ts` drives a real endpoint to its limit. |
| T31 | The resume form is used to enumerate addresses or send mail to a third party. | Tightest budget of all the actions, applied before the address is validated or stored. | Same. |
| T32 | Rate-limit records become a log of who visited from where. | The key is an HMAC of the address with a server secret **and** the current UTC date. No raw address is stored, and yesterday's counters cannot be correlated with today's — including by us. Missing secret is a hard failure, not a silent constant. | `rate-limit.test.ts`. |
| T33 | Abuse control becomes an accessibility barrier. | The refusal is an ordinary page: heading, plain language, wait time, and a link to reach a person immediately. No challenge, no puzzle, no countdown that steals focus. Asserted in an `@a11y` test that fails if the word "captcha" appears. | `hardening.spec.ts`. |
| T34 | Injected script executes. | Nonce-based CSP with `strict-dynamic`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, and `connect-src 'self'` — no third-party origin is permitted anywhere. | `hardening.spec.ts` asserts the header and that using the qualifier produces no CSP violation. |
| T35 | An open redirect via the consent form's return path. | A prefix check alone is insufficient — browsers normalise backslashes, so `/en\evil.example` can be read as a host. The path must match a locale route and contain no backslash or colon. | `apps/web/lib/return-to.test.ts`. |

### A note on how the limits were chosen

The first values were tuned to "how often would one person do this?" and would
have locked out an entire client the moment two colleagues at the same office
compared notes — the buyers here are organizations, so many legitimate visitors
share one NAT address. The limits were re-sized against that false-positive case
instead. They still cost a script far more time than these endpoints are worth.

## Added in CC-03a — identity and access

The first authenticated surface. Sessions, second factors and invitations are
all bearer credentials in one form or another, and the threats below are mostly
about what happens when one is stolen, replayed or guessed.

| # | Threat | Control | Verified by |
|---|---|---|---|
| T36 | A stolen session cookie is used indefinitely. | Two server-side clocks on every request: idle (12 h client, 2 h privileged) and absolute (7 d / 12 h). The cookie carries no expiry of its own, so the row is the only authority. | `packages/domain/src/identity.test.ts`; `packages/db/test/identity.test.ts`. |
| T37 | A database disclosure yields working session cookies. | Only the SHA-256 hash of the token is stored, and no function in the module returns a token after creation. | `identity.test.ts` asserts the stored value is a hex digest and is not the cookie. |
| T38 | A session is created without a second factor. | `SignInChallenge` has no `authenticated` outcome — the type cannot express it — and `mfa_satisfied_at` starts null with only `verifySecondFactor` able to move it. Marking it is guarded on `revoked_at IS NULL`, so an administrator revoking mid-sign-in wins the race. | `identity.test.ts`; `apps/web/e2e/identity.spec.ts`. |
| T39 | A captured second-factor code is replayed. | The provider challenge is single-use: verifying deletes it, so a valid code with a spent challenge id fails. Challenges also expire after five minutes, reported distinctly so the interface says what to do. | `packages/integrations/src/identity.test.ts`. |
| T40 | Credential stuffing against known addresses. | Per-address lockout (10 attempts / 15 minutes), checked **before** the provider is called, plus per-client rate limiting. Neither alone is sufficient: a botnet defeats the first, one noisy client defeats the second. | `packages/db/test/identity.test.ts`; `packages/domain/src/identity.test.ts`. |
| T41 | The sign-in or sign-up form is used to enumerate accounts. | A wrong password, an unknown address and a disabled account produce the same page and the same words. Sign-up shows the neutral "check your email" page for an address that already exists. A failed sign-in records `actorId: null` even when the address matches a real user. | `apps/web/e2e/identity.spec.ts` compares the two rendered messages; `identity.test.ts` compares the two port outcomes. |
| T42 | The throttle table becomes a record of who was targeted. | The key is an HMAC of the address with a server secret and the current UTC date — the same construction the rate limiter uses, and most keys in an attack belong to no user at all. | `identity.test.ts` asserts the stored key contains no part of the address. |
| T43 | An invitation email is forwarded and accepted by someone else. | The accepting account's address must match the invitation's, re-checked inside the transaction that creates the membership. | `packages/db/test/identity.test.ts`. |
| T44 | An invitation is replayed, or accepted after being revoked. | Single-use, and the row is re-read `FOR UPDATE` inside the acceptance transaction rather than trusted from the page that rendered the form. A partial unique index means only one live invitation per address per organization can exist. | Same file — including the revoked-while-the-form-was-open race. |
| T45 | An invitation link is guessed. | 32 bytes of randomness, stored only as a SHA-256 hash. | Same file. |
| T46 | A client administrator invites themselves internal staff. | Three layers: `invitableRoles` in the domain, the policy layer, and a database CHECK that accepts only client roles. No role may ever invite a contractor. | `packages/auth/src/policy.test.ts`; `packages/domain/src/identity.test.ts`; `identity.test.ts` (the raw insert is rejected). |
| T47 | An organization is left with no administrator and cannot recover. | `wouldOrphanOrganization`, evaluated inside the same transaction as the write against rows read `FOR UPDATE`, so two administrators demoting each other concurrently cannot both succeed. | `packages/db/test/identity.test.ts`. |
| T48 | Revoking access takes effect only at the person's next sign-in. | Removing a membership also revokes every session that person holds. Disabling an account and redeeming a recovery code do the same. | `identity.test.ts`; `apps/web/e2e/identity.spec.ts`. |
| T49 | A recovery code becomes a permanent second factor. | Redeeming one signs nobody in: it clears the enrolled factors and returns the account to enrolment. Codes are single-use, a new set invalidates the old, and this platform stores only the date they were issued. | `packages/integrations/src/identity.test.ts`; `apps/web/e2e/identity.spec.ts`. |
| T50 | An open redirect on the sign-in return path. | Same rule as the consent form and its own explicit copy: the path must match a locale route and contain no backslash or colon. | `apps/web/lib/return-to.test.ts` covers the shared rule; the sign-in copy is exercised by the end-to-end sign-in flow. |
| T52 | A TOTP setup key or a set of recovery codes ends up in browser history or an access log. | Both travel from the action that created them to the page that renders them in a two-minute `httpOnly` hand-off cookie, never in the URL. The query string carries only a non-secret enrolment id, which must match the cookie. | `apps/web/e2e/identity.spec.ts` asserts the URL contains neither the setup key nor any recovery code. |
| T51 | A local convenience leaks into a real environment. | The demo accounts panel, the demo TOTP hint and the printed invitation link all render only when the fake adapter is the object actually in use — a check on the instance, not on an environment variable. The demo bootstrap additionally touches only the reserved `.example` TLD. | Code review; the bootstrap's scope was added after an end-to-end test caught it resetting a real account's password. |

### Gaps opened by this slice

| Gap | Why it matters | Closes in |
|---|---|---|
| The authentication audit event is written **after** the provider call, not in the same transaction. | A crash between the two loses the record. A-11 asks for one transaction, and there is no local transaction that can enclose an HTTP call. Every audit event whose action *is* a database write — invitation, membership, organization — does commit in the same transaction. | Reviewed at CC-09 |
| Sign-up is three writes, not one. | Provider subject, user row, organization. Ordered so the recoverable failure comes first, but a durable outbox is what makes it atomic. | CC-03b (arrives with payments) |
| No passkey implementation. | The port and the policy both distinguish phishing-resistant factors, and privileged roles require one — but the fake stands in a fixed assertion for a WebAuthn signature. Internal staff therefore cannot yet satisfy their own requirement. | CC-03b / CC-07, with the Q-13 vendor |
| Session `client_hash` is derived from `x-forwarded-for`. | Inherits the CC-02 deployment constraint above. Here it affects only the "signed in from somewhere new" display, not an access decision. | CC-09 / infra |

## Known gaps at CC-02

| Gap | Why it matters | Closes in |
|---|---|---|
| `x-forwarded-for` is trusted for the client address. | Spoofable by anyone reaching the origin directly, which would let an attacker evade the limit and, worse, exhaust another visitor's budget. **Deployment constraint: the origin must only be reachable through the proxy**, and the proxy must overwrite rather than append the header. Recorded here because nothing in the repository can currently verify it. | CC-09 / infra |
| `style-src` still allows `'unsafe-inline'`. | The framework injects inline styles. Much smaller exposure than for scripts, but not zero. | CC-09 |
| No bot detection beyond rate limiting. | Deliberate: any further mitigation must not become an inaccessible challenge (ACC-005). Rate limiting is the accessible control; anything more needs a design decision. | Reviewed at CC-09 |

## Accepted risks in CC-01

| Risk | Why accepted now | Closes in |
|---|---|---|
| No authentication exists; there is no login and no session. | CC-01 ships no authenticated surface. The policy layer is complete and tested ahead of the identity work so authorization is not retrofitted. | CC-03 |
| The `northstar_app` role is created by a migration rather than by infrastructure. | Environment parity for local and preview. In production the role and its credential are owned by `/infra` and the block is a no-op. | CC-01 hardening / infra |
| Connection pooling mode is a documented deployment constraint, not an enforced one. | Transaction-scoped pooling is required so `SET LOCAL` cannot leak between callers. Nothing in the repository can currently verify the deployed pooler's mode. | CC-09 |
| No Content-Security-Policy beyond baseline headers. | A nonce-based CSP needs a real page to be measured against; a policy written now would be wrong by CC-02. | CC-02 |
| No rate limiting. | No public form or authentication endpoint exists yet. | CC-02 |

## Not yet modelled

Object storage and the malware pipeline (CC-04), payments and the commerce path (CC-03b), the AI provider boundary (CC-08), and the internal console's cross-tenant read models (CC-07). Each requires a threat-model revision in its own slice, per PRD §16 — a revision, not an addendum.
