# Project Northstar — AODA Readiness Platform

**Repository state: planning only. No application code exists yet, by instruction.**

PRD §27 ("First Claude Code prompt") directs: *"Read /docs/PRD.md in full. Do not write application code yet. Produce: (1) a requirement traceability matrix; (2) an assumptions/questions register; (3) proposed ADRs for stack, identity, tenancy, files, CMS, integrations, analytics and AI; (4) a Phase 0 prototype and validation plan; (5) an incremental delivery plan for CC-01 through CC-09; and (6) the risks that could invalidate the CA$5M programme. Cite PRD requirement IDs. **Wait for approval before scaffolding.***

Those six deliverables are complete and are listed below. Scaffolding of CC-01 has **not** started and will not start until approval and Gate 0.

## Documents

| # | Deliverable | File |
|---|---|---|
| — | Source of truth (PRD v1.0) | [`docs/PRD.md`](./docs/PRD.md) |
| 1 | Requirement traceability matrix | [`docs/traceability.md`](./docs/traceability.md) |
| 2 | Assumptions and open-questions register | [`docs/assumptions-register.md`](./docs/assumptions-register.md) |
| 3 | Proposed ADRs (0001–0008) | [`docs/adr/`](./docs/adr/) |
| 4 | Phase 0 prototype and validation plan | [`docs/phase-0-validation-plan.md`](./docs/phase-0-validation-plan.md) |
| 5 | CC-01 → CC-09 delivery plan | [`docs/delivery-plan.md`](./docs/delivery-plan.md) |
| 6 | Programme-invalidating risks | [`docs/programme-risks.md`](./docs/programme-risks.md) |

## What needs a decision before any code is written

Ordered by what they block. Full detail in the [assumptions register](./docs/assumptions-register.md).

| Blocks | Question |
|---|---|
| **CC-01** | Q-01 accept the derived requirement-ID namespaces · Q-05 roadmap vs. the December 2026 deadline · Q-09–Q-13 accept ADRs 0001, 0002, 0003, 0005 · Q-17 data-residency posture |
| **CC-02** | Q-04 counsel-reviewed regulatory claim wording · Q-06 price fixed or configurable · Q-21 the "routing vs. conclusion" rule · Q-15 analytics vendor |
| **CC-03** | Q-14 integration vendors · Q-19 e-signature accessibility |
| **CC-05** | Q-02 named stop-ship authorities · Q-22 accessible-PDF approach |
| **CC-06/07** | Q-07 wholesale rate card · Q-08 contractor payment rails |
| **CC-08** | Q-16 AI provider and terms |

The three programme-level questions for the steering committee are summarized at the end of [`docs/programme-risks.md`](./docs/programme-risks.md).

## Commands

None yet. The command contract from PRD §27 (`install`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`, `test:a11y`, `test:authz`, `db:migrate`, `db:seed`, `db:reset-safe`, `build`, `start`) is tracked as CMD-001 and is delivered in **CC-01**. This README is replaced with the exact commands and documented seed accounts at that point (CMD-002).

## Planned repository shape (CC-01, per PRD §27)

```
apps/web                 public site, qualifier, portals, internal console
packages/ui              accessible design-system primitives and tokens
packages/domain          framework-independent business rules
packages/db              schema, migrations, tenant controls, seed factories
packages/auth            roles, permissions, policy checks, break-glass
packages/integrations    typed adapters (CRM, payment, storage, email, …)
packages/observability   structured events, redaction, analytics, tracing
packages/testing         a11y fixtures, journey helpers, tenant-isolation tests
docs/                    PRD, ADRs, data dictionary, threat model, runbooks
infra/                   environments, deployment policy, backups, identities
```

## Scope boundaries carried from the PRD

Restated here because they constrain every future change, not just the first one:

- No claim of government authorization, certification or guaranteed legal compliance.
- No accessibility overlay or widget presented as a substitute for accessible source and content.
- No automated submission to government in the first release.
- No general-purpose legal-advice chatbot.
- Authorization is never enforced in UI components alone.
- Evidence-file contents are never sent to an AI provider by default.
- Accessibility work is never closed on automated tooling alone.

---

*This repository is a commercial and product specification workspace. The PRD is not legal advice; see `docs/PRD.md` §26.*
