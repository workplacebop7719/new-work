# Project Northstar — AODA Readiness Platform

Ontario accessibility readiness: a public demand engine, a secure client workspace, a contractor delivery network and an internal operations console.

**Current state: CC-01 (Foundation) and CC-02 (Public conversion) delivered. CC-03 not started.**
Source of truth is [`docs/PRD.md`](./docs/PRD.md). Requirement ids cited throughout the code are defined in [`docs/traceability.md`](./docs/traceability.md).

## Quick start

```bash
pnpm install
cp .env.example .env.local     # edit DATABASE_URL if your Postgres differs
pnpm db:migrate
pnpm db:seed
pnpm dev                       # http://localhost:3000
```

Requires Node 22 (see `.nvmrc`) and PostgreSQL 16+.

## Commands

The full PRD §27 contract. Every one exits non-zero on failure.

| Command | Purpose |
|---|---|
| `pnpm install` | Deterministic install from the committed lockfile. |
| `pnpm dev` | Full local experience with safe fake integrations. |
| `pnpm lint` | ESLint across the workspace **plus** the repository guards below. |
| `pnpm typecheck` | `tsc --noEmit` in every package. |
| `pnpm test` | Unit and integration tests, including row-level-security isolation (needs a database). |
| `pnpm test:e2e` | Playwright journeys: desktop, mobile, and a no-JavaScript project. |
| `pnpm test:a11y` | Automated accessibility checks. Coverage only — see below. |
| `pnpm test:authz` | Cross-tenant and role matrix across every protected resource class. |
| `pnpm db:migrate` | Applies pending migrations, each in its own transaction. |
| `pnpm db:seed` | Loads the fictional Maple Grove and Riverside demo tenants. |
| `pnpm db:reset-safe` | Drop, migrate, reseed. Refuses unless `APP_ENV` is non-production **and** the host is local. |
| `pnpm db:retention` | Retention sweep. Dry-run by default; `--apply` to delete. |
| `pnpm build` / `pnpm start` | Production build and serve. |

Demo accounts and the things that will confuse you once are in [`docs/runbook.md`](./docs/runbook.md).

## Repository

```
apps/web                 public site, portals, internal console (Next.js App Router)
packages/ui              design tokens and accessible primitives
packages/domain          framework-independent entities, roles and content rules
packages/db              migrations, tenant isolation, seed factories
packages/auth            policy layer: deny-by-default authorization
packages/integrations    typed ports + fakes (CRM, payments, storage, email, …)
packages/observability   event taxonomy, consent gate, redaction, audit writer
packages/testing         shared a11y and tenancy fixtures
scripts/guards           CI enforcement of the PRD's engineering constraints
docs                     PRD, ADRs, traceability, threat model, runbook
```

## How the constraints are enforced

The PRD's non-negotiable constraints (§27) are build failures, not review conventions. `pnpm lint` runs six guards:

| Guard | Enforces |
|---|---|
| `prohibited-claims` | Blocks the phrases PRD §5 and §27 forbid, in English and French (CNT-008, ENG-008). |
| `regulatory-hardcoding` | Regulatory statements come from versioned content objects, never string literals in components (ENG-007). |
| `migration-notes` | Every migration has paired rollback / roll-forward / backup-impact notes (ENG-006). |
| `tenant-columns` | Every new table has `organization_id` with RLS enabled **and** forced **and** a policy — or an explicit `-- global:` declaration with a reason (DAT-002). |
| `domain-purity` | `packages/domain` imports no framework, driver or app; `packages/auth` stays testable without a database (ARC-002, ENG-001). |
| `tokens-drift` | The committed `tokens.css` is exactly what `tokens.ts` renders, so a hand-edit cannot escape the contrast tests (BRD-001). |
| `analytics-consent` | No third-party script host anywhere in the app, no analytics globals, and `Analytics` constructible only in the consent wrapper (PUB-006, ARC-007, ANL-001). |

Where an exception is legitimate it is annotated in the code (`northstar-allow-claim:`, `northstar-allow-regulatory:`, `-- global:`) and reviewed in the pull request. The annotation is the audit trail.

Authorization is enforced at three layers, all required: the policy layer (`packages/auth`), row-level security in PostgreSQL, and — from CC-04 — per-request signed URLs for files. A check in a UI component is presentation, never a gate.

## What works today

`pnpm dev` gives you the public conversion journey, in English and French:

- an eight-question readiness qualifier, one question per page, with progress, save-and-resume and accessible validation;
- a result that shows the inputs behind it, the reason each one mattered, the rule version and an uncertainty notice;
- the free official route offered as a first-class link rather than buried;
- a contact page reachable from everywhere that asks for nothing first;
- a consent banner where accepting and declining are the same control, and nothing third-party loads either way.

The whole journey works with JavaScript disabled — a Playwright project completes it that way on every run.

There is no marketing homepage yet: that needs brand, photography and counsel-reviewed copy, none of which exist. What is built is the conversion *system*.

## Accessibility

Target is WCAG 2.2 AA across the public site, both portals and generated client artefacts. **Automated checks never close an accessibility item** (ENG-005) — they are regression coverage between manual passes. Manual method, supported assistive-technology combinations, the paid disability panel and the severity model are in [`docs/accessibility-test-plan.md`](./docs/accessibility-test-plan.md).

One finding worth knowing up front: the brand palette in PRD §14 does not pass WCAG as literally specified. Brand teal is 2.998:1 on white and warm gold is 1.85:1. The token system keeps both as brand colours but restricts where they may appear, and adds AA-passing tokens for text and interaction. The reasoning is in `packages/ui/src/tokens/tokens.ts` and it needs the design lead's sign-off (question Q-24).

## Documents

| Document | What it is |
|---|---|
| [`docs/PRD.md`](./docs/PRD.md) | Source of truth. |
| [`docs/traceability.md`](./docs/traceability.md) | Requirement matrix, per-slice state, CC-01 delivery record. |
| [`docs/assumptions-register.md`](./docs/assumptions-register.md) | Open questions with severity and owner; working assumptions. |
| [`docs/adr/`](./docs/adr/) | Eight accepted ADRs, with amendments made during the build. |
| [`docs/delivery-plan.md`](./docs/delivery-plan.md) | CC-01 → CC-09. |
| [`docs/phase-0-validation-plan.md`](./docs/phase-0-validation-plan.md) | Six-week paid validation and Gate 0. |
| [`docs/programme-risks.md`](./docs/programme-risks.md) | Risks that could invalidate the CA$5M programme, each with a kill criterion. |
| [`docs/threat-model.md`](./docs/threat-model.md) | Assets, threats, controls, and what is not yet modelled. |
| [`docs/data-dictionary.md`](./docs/data-dictionary.md) | Tables, classification, retention. |
| [`docs/accessibility-test-plan.md`](./docs/accessibility-test-plan.md) | Automated and manual coverage, panel, severity model. |
| [`docs/runbook.md`](./docs/runbook.md) | Setup, commands, demo accounts, common confusions. |

## Scope boundaries

Carried from the PRD, because they constrain every future change:

- No claim of government authorization, certification or guaranteed legal compliance. <!-- northstar-allow-claim: restating the prohibition itself -->
- No accessibility overlay or widget presented as a substitute for accessible source and content.
- No automated submission to government in the first release.
- No general-purpose legal-advice chatbot.
- Authorization is never enforced in UI components alone.
- Evidence-file contents are never sent to an AI provider by default.
- Accessibility work is never closed on automated tooling alone.

---

*This repository is a product and commercial specification workspace. The PRD is not legal advice; see `docs/PRD.md` §26.*
