# Architecture Decision Records

**ADRs 0001–0008 were accepted at the start of CC-01.** Amendments made while building are recorded inside the affected ADRs, marked "Amended at CC-01", rather than by rewriting the original decision.

PRD §17 is deliberately vendor-neutral: "Technology selections must pass accessibility, security, data-residency, portability, total-cost and procurement reviews." Each ADR therefore records the *decision shape* and a recommended default, with the vendor named as a recommendation subject to those five reviews — not as a settled fact.

| ADR | Decision | Blocks | Status |
|---|---|---|---|
| [0001](./0001-stack-and-monorepo.md) | Language, framework, monorepo tooling, package manager | CC-01 | Accepted |
| [0002](./0002-identity-and-access.md) | Identity provider, MFA, session and role enforcement | CC-01, CC-03 | Accepted |
| [0003](./0003-tenancy-and-data-isolation.md) | Tenancy model and database-level isolation | CC-01 | Accepted |
| [0004](./0004-file-pipeline-and-evidence.md) | Evidence upload, scanning, storage, signed access | CC-04 | Accepted |
| [0005](./0005-content-platform.md) | Headless CMS, bilingual model, regulatory content governance | CC-01, CC-02 | Accepted |
| [0006](./0006-integration-architecture.md) | CRM, payments, calendar, e-signature, email, support, accounting | CC-03 | Accepted |
| [0007](./0007-analytics-and-consent.md) | Product analytics, consent gating, event contracts | CC-02 | Accepted |
| [0008](./0008-ai-governance.md) | AI provider, provenance, redaction, capability registry | CC-08 | Accepted |

## Format

Each ADR uses: Context → Decision → Alternatives considered → Consequences → Requirements satisfied → Review triggers. The "Requirements satisfied" section cites IDs from [`/docs/traceability.md`](../traceability.md).

## Rule

Per PRD §27, a missing decision is resolved by *writing an ADR and surfacing the trade-off* — never by an undocumented choice in code, and never by weakening the requirement the decision was supposed to satisfy.
