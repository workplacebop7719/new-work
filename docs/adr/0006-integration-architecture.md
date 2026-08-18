# ADR-0006 — Integration architecture

- **Status:** Proposed
- **Date:** 2026-08-18
- **Deciders:** Engineering lead, COO (system-of-record ownership), privacy lead (consent propagation)
- **Blocks:** CC-03
- **PRD basis:** §17 Integration layer + Initial integration set; §8 CNV-004; §16 Privacy; §27 API posture (idempotency for external writes)

## Context

Seven external systems are named: CRM, payments, scheduling/calendar, e-signature, transactional email/SMS, support desk, accounting. Each is a data-processing relationship (subprocessor register, SEC-007), a consent-propagation risk (CNV-004: "never unneeded sensitive data"), and a lock-in risk (§25 "Vendor lock-in").

The PRD also draws a hard line: government reporting is **links and guided handoff only** — no automated filing without explicit authorization and legal review (§17, §3 non-goals).

## Decision

**Typed adapters behind domain-owned interfaces, with an outbox and an explicit field allowlist per destination.**

1. **`/packages/integrations` holds adapters only.** The domain defines the interface (`CrmPort`, `PaymentPort`, `SignaturePort`, …); adapters implement it. No domain code imports a vendor SDK type. This is what makes ARC-002's "replaceable behind domain interfaces" testable — the domain compiles with a fake adapter.
2. **Transactional outbox for outbound writes.** Domain state changes and their integration events commit in the same database transaction; a worker delivers them with retries, exponential backoff and a dead-letter queue that is reviewed (ARC-003). This prevents the classic failure where a payment succeeds and the project shell is never created (OPS-009).
3. **Idempotency is mandatory** on every external write: a stable idempotency key derived from the domain event ID, plus a stored record of the provider's response so a retry never double-charges, double-invites or double-sends (ARC-004).
4. **Field allowlists, not object dumps.** Each adapter declares exactly which fields may leave the platform. A test asserts the serialized payload equals the allowlist — adding a field to a domain model can never silently start exporting it (CNV-004, ANL-002). Disability/accommodation data (SEC-011) is excluded by default and requires a named exception.
5. **Consent is a precondition, not a filter applied later.** The CRM adapter refuses to send marketing-scope data without a valid consent record, and consent withdrawal produces an outbound event (SEC-012).
6. **Inbound webhooks** are signature-verified, replay-protected, processed idempotently, and never trusted for authorization decisions — a webhook may signal that payment succeeded; the domain re-verifies with the provider before granting entitlement.
7. **System-of-record map** is documented and enforced by direction-of-flow: the platform owns organizations, projects, evidence, findings, assignments, deliverables; the CRM owns lead lifecycle and marketing consent history; the payment processor owns transactions; accounting owns the ledger. Two-way sync is avoided; where unavoidable, one side is declared authoritative per field.
8. **Government reporting:** an outbound link plus a guided checklist. No credentials for a government portal are collected or stored. This is a code-level absence, not a policy note.
9. **Every vendor gets an exit note** in its adapter: what data lives there, how to export it, what breaks if it is removed.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Direct SDK calls from route handlers | Fastest. Rejected: no idempotency story, no allowlist enforcement, vendor types leak into the domain, and every integration failure becomes a user-facing 500. |
| An iPaaS (Zapier/Make/Workato) for the CRM and accounting hops | Genuinely reasonable for accounting sync and low-volume ops flows, and worth revisiting at CC-07. Rejected as the primary mechanism because consent and field-allowlist enforcement would move outside our test suite and outside code review. |
| A message broker (SQS/Kafka) instead of a database outbox | Better at scale; adds infrastructure and an at-least-once semantics burden before there is volume to justify it. Rejected for now — the outbox is a table and a worker, and the port interface allows swapping later. |
| Two-way CRM sync | Attractive to sales; creates conflict-resolution bugs and consent ambiguity. Rejected. |
| Building payments/e-signature in-house | Rejected; PCI and legal surface far exceed the benefit. Note the exception in Q-19: an in-product *signing* flow may be necessary if no e-sign vendor passes accessibility review — that is a UI decision, with the vendor still doing the legal signature where possible. |

## Consequences

- **Positive:** an integration outage degrades to a queued retry rather than a lost sale or a lost project shell.
- **Positive:** privacy review has one file per destination to read.
- **Negative:** the outbox adds latency between a domain action and its external effect; user-facing copy must not promise instant CRM/email delivery.
- **Negative:** field allowlists make legitimate additions slower. That friction is the point.
- **Risk:** e-signature accessibility (Q-19) is unresolved and can force a build decision at CC-03.
- **Risk:** each vendor without a Canadian region adds a residency exception under Q-17.

## Requirements satisfied

CNV-004, CLP-008, OPS-009, SEC-007, SEC-012, ARC-002, ARC-003, ARC-004, ENG-003.

## Review triggers

Revisit if: outbox volume outgrows a database-backed worker; a vendor requires two-way sync; or e-signature accessibility review fails.
