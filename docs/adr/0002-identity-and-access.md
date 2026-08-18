# ADR-0002 — Identity, authentication and access enforcement

- **Status:** Proposed
- **Date:** 2026-08-18
- **Deciders:** Engineering lead, security/privacy lead (accountable for risk acceptance), accessibility lead (stop-ship on MFA accessibility)
- **Blocks:** CC-01 (skeleton), CC-03 (delivery)
- **PRD basis:** §16 Identity, Authorization; §18 Role model; §15 Authentication; §27 non-negotiable constraint 1

## Context

Seven roles with asymmetric restrictions (§18), three user populations (client, contractor, staff), MFA everywhere, phishing-resistant options for privileged roles, SSO for higher tiers, and **accessible MFA with password-manager support, paste allowed, an alternative verification method and accessible recovery** (ACC-009).

That accessibility requirement is the constraint that eliminates most convenient options. Hosted IdP login pages are frequently the least accessible surface in a product, and PRD §27 forbids patching over a third-party accessibility defect — the component must be replaced instead.

Separately, §27 constraint 1 forbids authorization living in UI components. The IdP answers *who you are*; it must not be the thing that answers *what you may do*.

## Decision

**Split authentication from authorization.**

1. **Authentication** — a managed, standards-based IdP (OIDC) handling credentials, MFA enrolment, WebAuthn/passkeys for privileged roles, SSO federation for higher-tier clients, and detailed sign-in audit logs. Recommended default: a managed IdP with **custom, self-hosted authentication UI** driven by the provider's API — not the vendor's hosted pages — so ACC-009 is under our own test suite and our own design system. Vendor selection is subject to a mandatory accessibility evaluation of any screen we cannot replace (recovery flows, email templates).
2. **Authorization** — implemented entirely in `/packages/auth` as a policy layer over the domain model. Every protected operation calls an explicit policy check that takes `(actor, action, object)` and returns a decision with a reason. Deny by default. No role string is ever trusted from a JWT claim for object-level decisions; the claim identifies the user, the database holds the memberships.
3. **Enforcement points** — three, all required: server route/action, domain service, and storage (row-level isolation per ADR-0003, signed-URL scoping per ADR-0004). A UI-level check is presentation only and is never the sole gate.
4. **Contractor access** is deny-by-default and time-bound: an assignment grants a scoped grant record with an expiry; every request re-evaluates it, and a scheduled job revokes at closure (assumption A-16 — belt and braces, because a failed job must not leave a client's evidence exposed).
5. **Break-glass** platform-admin access is a distinct, time-bound grant (default 4 h) requiring a written reason, emitting an audit event and an alert to the security lead (DAT-005).
6. **Segregation of duties** — the policy layer, not the UI, refuses to let a qualified reviewer approve their own high-risk work (DAT-004). This is tested as a negative case.

## Alternatives considered

| Alternative | Why not |
|---|---|
| IdP hosted login pages | Fastest path, and the accessibility of these pages is outside our control and historically weak (focus management, error announcement, timeout handling). Directly conflicts with ACC-009 and §27's "replace rather than patch". Rejected for the primary flows; acceptable only for a flow we have tested and can evidence. |
| Roll our own authentication (password storage, MFA, recovery) | Full control over accessibility, but takes on credential-stuffing defence, MFA secret storage, recovery-flow abuse and audit logging — a poor trade against ASVS 5.0 L2 (SEC-001) with a fractional security lead (§21). Rejected. |
| Authorization delegated to the IdP (roles as JWT claims, permissions in the IdP) | Attractive for staff tooling; fails for object-scoped permissions ("this contractor, this assignment, until this date") and makes immediate revocation depend on token lifetime. Rejected. |
| A policy engine (OPA/Cedar) as the decision point | Genuinely good fit for the role matrix and worth revisiting at CC-07. Rejected for CC-01 because it adds a second language and deployment unit before the model is stable; the policy layer is written so it can be swapped behind its interface. |
| Separate IdP tenants per user population | Cleaner blast-radius story; triples configuration and complicates a contractor who is also a client user. Rejected; one directory, distinct membership records. |

## Consequences

- **Positive:** authorization is testable in-process (`test:authz` can exercise the full role matrix without a live IdP); revocation is immediate because it is a database fact, not a token TTL.
- **Positive:** custom auth UI means MFA, recovery and error states are covered by our axe and screen-reader test evidence.
- **Negative:** custom auth UI is more work and more security surface than hosted pages, and every IdP API change is our problem. Mitigation: keep the surface small, pen-test it (SEC-008), and treat it as a release-gated component.
- **Negative:** three enforcement points mean three places a new resource type can be forgotten. Mitigation: `test:authz` requires every protected resource class to be covered (CMD-001), and CI fails when a new domain object has no policy test.
- **Risk:** an IdP without a Canadian region conflicts with Q-17. Residency decision must precede vendor signature.

## Requirements satisfied

CLP-001, CLP-013, SEC-002, SEC-003, DAT-003, DAT-004, DAT-005, CTR-004, ACC-009, ENG-001.

## Review triggers

Revisit if: the chosen IdP cannot support a custom UI for MFA enrolment or recovery; SSO demand arrives before CC-03; or the role matrix grows past what hand-written policies can keep correct (then adopt a policy engine).
