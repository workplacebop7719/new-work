<!--
PRD §27 pull-request evidence template. Every field is required; "n/a" is an
acceptable answer when accompanied by a reason.
-->

## Scope

Requirement IDs, user journey, and explicit non-scope.

- **Requirements:**
- **Journey:**
- **Not in scope:**

## Decision

Relevant ADR and alternatives considered.

## Evidence

Test output, accessibility evidence, analytics event validation, screenshots or
video where useful.

- **Automated checks:** `lint` / `typecheck` / `test` / `test:e2e` / `test:a11y` / `test:authz`
- **Manual accessibility evidence** (ENG-005 — automated tooling alone never closes an
  accessibility item): named reviewer, assistive technology and version, what was tested.
- **Analytics:** events emitted, payload verified against the contract.

## Security / privacy

Authorization cases, data touched, threat model or PIA impact, logging and
redaction check.

## Migration

Schema or content changes, rollback / roll-forward plan, seed impact.
Every migration needs a paired `.notes.md` (ENG-006) — CI enforces this.

## Risk

Known limitations, deferred work, owner, target milestone.

## Traceability

- [ ] `docs/traceability.md` updated in this pull request.
