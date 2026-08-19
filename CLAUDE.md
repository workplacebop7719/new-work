# Working in this repository

Read `docs/PRD.md` first — it is the source of truth, and its requirement ids
(PUB-, CNV-, CTR-, and the derived namespaces in `docs/traceability.md`) are cited
throughout the code. Requirement ids in comments are load-bearing: they are how a
reviewer finds the rule a piece of code exists to satisfy.

## Non-negotiables

These come from PRD §27 and are enforced by CI, not by convention. `pnpm lint`
runs seven guards in `scripts/guards/`.

- **Authorization is never in a UI component alone.** Three layers, all required:
  the policy layer (`packages/auth`), row-level security in PostgreSQL, and
  signed URLs for files. A component-level check is presentation.
- **Regulatory claims never appear as string literals in components.** They come
  from versioned content objects with a source, a review date and two reviewers.
  A claim past its review date structurally cannot render.
- **Prohibited claims never ship.** The exact phrases PRD §5 and §27 forbid are
  listed in `scripts/guards/prohibited-claims.mjs`, in English and French. The
  guard fires on documentation too, which is why this line does not quote them.
- **Every new table** carries `organization_id` with RLS enabled *and* forced *and*
  a policy — or an explicit `-- global: <reason>` declaration.
- **Every migration** has a paired `.notes.md` with Rollback, Roll-forward and
  Backup impact sections.
- **Automated accessibility checks never close an accessibility item.** They are
  regression coverage between manual passes with a named reviewer.
- **No third-party script**, and analytics only through `@northstar/observability`
  behind the consent gate.

Where an exception is genuinely right, annotate it (`northstar-allow-claim:`,
`northstar-allow-regulatory:`, `-- global:`) and explain it in the pull request.
The annotation is the audit trail — do not weaken a guard to make it pass.

## Working style that fits this codebase

- **Slices are vertical.** Interface, authorization, data, audit logging,
  analytics, tests and documentation together. Never "the UI for X".
- **Negative tests are the point.** The valuable tests here are the ones proving
  something *cannot* happen: a cross-tenant read, a released deliverable with no
  approver, a stale claim rendering, an event carrying an email address.
- **Prove a guard fails.** A new CI guard is not done until you have watched it
  reject a real violation and then pass again.
- **Say what you cut.** Scope reductions go in `docs/traceability.md` with a
  reason and the slice that will pick them up. Silent narrowing is worse than a
  stated gap.
- **Fail safe, visibly.** When something is unreviewed or uncertain, the product
  should show that state rather than hide it. The seeded regulatory claim ships
  unreviewed on purpose, so the hold path is what runs.

## Layout

```
apps/web                 Next.js App Router: public site, qualifier
packages/ui              tokens (contrast-tested) and accessible primitives
packages/domain          entities, roles, content rules, qualifier rules — no framework
packages/db              migrations, RLS, sessions, retention. `.` is runtime, `./admin` is CLI-only
packages/auth            deny-by-default policy layer, pure and synchronous
packages/integrations    typed ports + fakes; no vendor SDK type in a port signature
packages/observability   event taxonomy, consent gate, redaction, audit writer
packages/testing         shared a11y and tenancy fixtures
scripts/guards           the CI enforcement above
```

## Commands

`pnpm install | dev | lint | typecheck | test | test:e2e | test:a11y | test:authz |
db:migrate | db:seed | db:reset-safe | db:retention | build | start`

Needs Node 22 and PostgreSQL 16+. `cp .env.example .env.local` first.
`docs/runbook.md` has the demo accounts and the things that will confuse you once.

## Before opening a pull request

Use `.github/pull_request_template.md` — every field is required, and
`docs/traceability.md` is updated in the same pull request.
