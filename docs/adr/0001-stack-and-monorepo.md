# ADR-0001 — Stack, monorepo tooling and package management

- **Status:** Proposed
- **Date:** 2026-08-18
- **Deciders:** Engineering lead (accountable), product lead, security/privacy lead
- **Blocks:** CC-01
- **PRD basis:** §17 Technology and integration architecture; §27 Technical baseline, Recommended repository shape, Environment and command contract

## Context

The PRD fixes the *shape* of the stack and leaves the versions open: "Use a TypeScript monorepo and a server-rendered React framework such as Next.js App Router, with PostgreSQL, S3-compatible object storage, a managed standards-based identity provider, a structured headless CMS and event-driven integration adapters. Select current supported versions at project kickoff, pin them in the lockfile."

Three PRD constraints narrow the choice more than they first appear:

1. **ARC-006** — critical public pages must render useful primary content without client-side JavaScript. This rules out client-only SPA architectures and makes server rendering non-optional, not a performance preference.
2. **ENG-001** — authorization is enforced at server/domain and storage boundaries. The framework must make it hard to accidentally ship a client-side-only check, which favours server components and server actions over a client-fetch-everything pattern.
3. **ARC-002** — vendor choices stay replaceable behind domain interfaces. `/packages/domain` is framework-independent by mandate, so business rules cannot import framework types.

## Decision

**Recommended:**

| Concern | Choice | Rationale |
|---|---|---|
| Language | TypeScript, `strict` plus `noUncheckedIndexedAccess` | PRD §27 mandates TypeScript; strict settings are chosen now because retrofitting them across a monorepo is expensive. |
| Framework | Next.js App Router, server components by default | Named in the PRD; satisfies ARC-006 and ENG-001 posture. |
| Package manager | pnpm with workspaces, committed lockfile, pinned exact versions | Deterministic install (CMD-001 `install`); strict node_modules prevents phantom dependencies between packages. |
| Task runner | Turborepo | Caching for `lint`/`typecheck`/`test` across nine packages; no lock-in — its config is replaceable. |
| Database access | Postgres via a typed query builder/ORM chosen in ADR-0003 alongside the isolation model | Isolation strategy and data-access layer are one decision, not two. |
| Validation | One schema library (Zod or equivalent) shared across API boundaries, forms and integration adapters | ARC-004 requires schema validation at every boundary; a single library keeps error envelopes uniform. |
| Testing | Vitest (unit/integration), Playwright (`test:e2e`, `test:a11y`), axe-core, Storybook interaction tests | Directly maps to the §27 testing row and CMD-001. |
| Node runtime | Current active LTS at kickoff, pinned in `.nvmrc` and CI | — |

**Repository layout** follows PRD §27 exactly: `/apps/web`, `/packages/{ui,domain,db,auth,integrations,observability,testing}`, `/docs`, `/infra`. Dependency rule enforced in CI: `domain` may not import from `apps`, `ui`, `db` or `integrations`.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Remix / React Router framework mode | Comparable SSR quality and arguably a cleaner data model. Rejected only because the PRD names Next.js App Router and the team's hiring pool is deeper; revisit if the App Router's caching model causes repeated correctness bugs. |
| Astro + islands for the public site, separate app for portals | Best-in-class for ARC-005/ARC-006 on marketing pages. Rejected for CC-01 because two apps duplicate the design system, auth session handling and analytics consent logic. Reconsider at CC-09 if Core Web Vitals budgets fail. |
| Nx instead of Turborepo | Stronger generators and dependency-graph enforcement; heavier configuration. Either is acceptable; Turborepo chosen for lower ceremony. |
| npm/yarn workspaces | Acceptable. pnpm chosen for install determinism and disk efficiency in CI. |
| Non-TypeScript backend service (Go/Python) for jobs | Adds a second toolchain and a second authorization implementation — a direct ENG-001 risk. Rejected. |

## Consequences

- **Positive:** one language across web, domain, jobs and tests; a single authorization implementation; CI caching keeps the nine-package build under control.
- **Negative:** Next.js App Router upgrades have historically carried breaking caching-semantics changes. Mitigation: pin exact versions, and treat framework upgrades as their own PR with the full `test:e2e` + `test:a11y` suite.
- **Negative:** server components make it easy to *forget* that some interactions still need progressive enhancement. Mitigation: ARC-006 is tested with JavaScript disabled in `test:e2e`, not assumed.
- **Cost:** Turborepo remote caching is optional; if adopted, it becomes a supply-chain surface and needs a SEC-008 review.

## Requirements satisfied

ARC-001, ARC-002, ARC-006, ENG-001 (posture), CMD-001, CMD-002.

## Review triggers

Revisit if: Core Web Vitals budgets (ARC-005) fail at CC-09 on the public site; framework upgrade breaks two consecutive releases; or the team splits the public site from the portals.
