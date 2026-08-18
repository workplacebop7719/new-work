# Data dictionary

- **Status:** v0 (CC-01). Every slice that adds a table or column updates this file in the same pull request.
- **Source:** `packages/db/migrations/`, `packages/domain/src/entities.ts`.
- **Classification key:** **P** personal data · **S** business-sensitive · **I** internal-only (never client-visible) · **G** general.

## Global tables

Not owned by a tenant. Each is declared `-- global:` in the migration with a reason; the CI guard requires that declaration.

| Table | Purpose | Notable columns | Class | Retention |
|---|---|---|---|---|
| `users` | A person, who may hold memberships in several organizations. | `email` (unique), `display_name`, `preferred_language` | P | While any membership exists, then per the offboarding workflow (SEC-013). |
| `regulatory_claims` | Versioned, source-backed regulatory statements shared across tenants. | `claim_key`+`version` (unique), `source_url`, `effective_date`, `last_verified_at`, `next_review_at`, two reviewer ids, `status` | G | Permanent; superseded versions retained for traceability. |
| `schema_migrations` | Applied migration ledger. | `name`, `applied_at` | G | Permanent. |

## Tenant-owned tables

Every one carries `organization_id`, has RLS `ENABLE`d and `FORCE`d, and a `tenant_isolation` policy. `organizations` is the tenant root: its own `id` is the tenant key.

| Table | Purpose | Class | Notes |
|---|---|---|---|
| `organizations` | The client organization. | S | `employee_band` is an enum, never an exact headcount (A-03). `jurisdiction` is first-class from CC-01 (A-01). |
| `organization_websites` | Public sites in scope. | S | |
| `memberships` | User ↔ organization ↔ role. | P | The authoritative source for authorization. Never read from a token claim. |
| `projects` | An engagement. | S | `authorized_signer_user_id` is the person permitted to bind the organization. |
| `requirements` | Applicability of a claim version to this tenant. | S | `applicability` is tri-state and includes `needs_review`: the product never collapses uncertainty into pass/fail. |
| `evidence` | Uploaded client evidence. | **P, S** | `storage_key` is **never** client-visible (ENG-003). `scan_state` gates all access. `legal_hold` suspends deletion. |
| `findings` | A documented issue or gap. | S | `released` freezes client editing. |
| `finding_evidence` | Finding ↔ evidence traceability (CLP-014). | S | |
| `assignments` | Contractor scope of work. | S, I | `access_expires_at` drives automatic revocation (CTR-004). |
| `assignment_evidence` | The exact evidence a contractor may see. | S | Absence is the default; presence is the grant. |
| `deliverables` | A client-facing artefact and its release state. | S | `released_requires_approver` CHECK: a release always names its approver. |
| `audit_events` | Security-relevant actions. | P, I | Append-only: no UPDATE/DELETE grant **and** a trigger that raises. |

## Fields that must never leave the platform

Enforced by the analytics denylist (`packages/observability/src/events.ts`) and the CI guards.

- `evidence.storage_key`, any signed URL
- `organizations.id` / `organization_id` in analytics payloads (references are opaque per-event refs)
- `users.email`, `display_name`, phone numbers
- Any contractor rate, internal margin or wholesale cost
- Any document content, file name or private audit note

## Retention

| Data | Schedule | Basis |
|---|---|---|
| Abandoned qualifier sessions | 30 days (assumption **A-15** — the PRD says "short" without a number; the privacy lead may set a different figure) | CNV-001 |
| Evidence | `retention_until` per object, suspended by `legal_hold` | SEC-007, SEC-013 |
| Audit events | Retained beyond tenant deletion where lawfully required | SEC-006 |
| Financial records | Retained through tenant deletion (lawful basis) | §24 offboarding scenario |

Retention jobs are dry-runnable and log before deleting (assumption A-14).

## Open

- `evidence.classification` is a free text CHECK-less column in CC-01; it becomes an enum with the classifier in CC-04.
- Change orders and commercial records have no tables yet (CC-03/CC-07). The seed therefore cannot yet include the "one approved change order" the PRD's demo scenario asks for — tracked as a known gap against CMD-003.
