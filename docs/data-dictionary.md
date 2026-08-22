# Data dictionary

- **Status:** v2 (CC-03a). Every slice that adds a table or column updates this file in the same pull request.
- **Source:** `packages/db/migrations/`, `packages/domain/src/entities.ts`.
- **Classification key:** **P** personal data · **S** business-sensitive · **I** internal-only (never client-visible) · **G** general.

## Global tables

Not owned by a tenant. Each is declared `-- global:` in the migration with a reason; the CI guard requires that declaration.

| Table | Purpose | Notable columns | Class | Retention |
|---|---|---|---|---|
| `users` | A person, who may hold memberships in several organizations. | `email` (unique), `display_name`, `preferred_language` | P | While any membership exists, then per the offboarding workflow (SEC-013). |
| `regulatory_claims` | Versioned, source-backed regulatory statements shared across tenants. | `claim_key`+`version` (unique), `source_url`, `effective_date`, `last_verified_at`, `next_review_at`, two reviewer ids, `status` | G | Permanent; superseded versions retained for traceability. |
| `schema_migrations` | Applied migration ledger. | `name`, `applied_at` | G | Permanent. |
| `qualifier_sessions` | An anonymous visitor's qualifier answers, consent decision and result. Exists before any organization does, which is what CNV-001 requires. | `resume_token_hash` (unique), `answers`, `consent_analytics` + `consent_decided_at`, `contact_email` + `contact_consent_at`, `result_category`, `rule_version` | P | Abandoned 30 days, completed 90 days. |
| `auth_sessions` | A session this platform issued. Global because one session serves every organization the person belongs to; the tenant is chosen per request. | `token_hash` (unique), `created_at`, `last_seen_at`, `mfa_satisfied_at`, `revoked_at` + `revoked_reason`, `client_hash`, `user_agent_family` | P | 90 days from last activity — wider than the window in which a session still works, so "signed in from a new place" stays answerable. |
| `user_mfa_factors` | Which second-factor methods a person has enrolled. Global: someone administering two organizations enrols once. | `method` (`totp` \| `passkey`), `label`, `enrolled_at`, `last_used_at` | P | With the user. |
| `sign_in_throttle` | Failed-attempt counters per address. Global: the key frequently corresponds to no user at all. | `subject_key` (daily-rotating HMAC), `failed_attempts`, `last_failure_at` | G | 2 days. |

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
| `invitations` | An offer of membership, addressed to one address and single-use. | P | `token_hash` only. Partial unique index allows one live invitation per address per organization. The `role` CHECK accepts client roles only — the third layer under the domain rule and the policy layer. |
| `audit_events` | Security-relevant actions. | P, I | Append-only: no UPDATE/DELETE grant **and** a trigger that raises. |

### Columns that deliberately do not exist

`0004_identity` adds no column anywhere for a password, a password hash, a TOTP
seed, a passkey credential or a recovery code. Those live with the identity
provider (ADR-0002), and their absence is the control: a future code path cannot
write a secret into a field that is not there. `users.recovery_codes_issued_at`
records only *when* a set was issued.

## Fields that must never leave the platform

Enforced by the analytics denylist (`packages/observability/src/events.ts`) and the CI guards.

- `evidence.storage_key`, any signed URL
- `organizations.id` / `organization_id` in analytics payloads (references are opaque per-event refs)
- `users.email`, `display_name`, phone numbers
- Any contractor rate, internal margin or wholesale cost
- Any document content, file name or private audit note
- Any session, invitation or resume token — including its hash
- `users.identity_subject_id` (the provider's handle for a person)

## Retention

| Data | Schedule | Basis |
|---|---|---|
| Abandoned qualifier sessions | 30 days (assumption **A-15** — the PRD says "short" without a number; the privacy lead may set a different figure, question Q-26) | CNV-001 |
| Completed qualifier sessions | 90 days — a visitor may legitimately return to a result they were sent | CNV-001 |
| Evidence | `retention_until` per object, suspended by `legal_hold` | SEC-007, SEC-013 |
| Audit events | Retained beyond tenant deletion where lawfully required | SEC-006 |
| Auth sessions | 90 days from last activity | SEC-006 |
| Closed invitations | 30 days after acceptance or revocation — which removes the stored address with them | SEC-007 |
| Sign-in throttle counters | 2 days | SEC-007 |
| Financial records | Retained through tenant deletion (lawful basis) | §24 offboarding scenario |

Retention jobs are dry-runnable and log before deleting (assumption A-14).

## Protection of `qualifier_sessions`

It is the one table with no tenant to scope it to, so it is protected differently
and the difference is deliberate:

- rows are reachable only by an unguessable resume token, and only its hash is stored;
- there is no listing, searching or enumerating function in the codebase;
- the analytics denylist keeps its contents out of every event payload;
- the retention sweep bounds how long any of it exists.

Rate limiting on the endpoints that write to it was added in the CC-02 hardening
pass. `auth_sessions` and `invitations` are protected the same way, for the same
reason: each is reachable only by a bearer token whose hash is all that is
stored, and neither has a listing function that takes anything but a user id
already established by a session.

## Open

- `evidence.classification` is a free text CHECK-less column in CC-01; it becomes an enum with the classifier in CC-04.
- Orders, payments, agreements and the transactional outbox have no tables yet — they arrive with CC-03b, and the demo scenario's "one approved change order" waits on them.
- Change orders and commercial records have no tables yet (CC-03b/CC-07). The seed therefore cannot yet include the "one approved change order" the PRD's demo scenario asks for — tracked as a known gap against CMD-003.
