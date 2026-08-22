# 0005_outbox — migration notes

Required by ENG-006. Implements ADR-0006 decisions 2, 3, 4 and 5.

## What it does

Adds two tables:

- **`outbox_messages`** — the transactional outbox. A domain change and its
  intent to call a vendor commit together; a worker delivers afterwards with
  exponential backoff and a dead-letter state.
- **`marketing_consents`** — the consent register the CRM adapter checks before
  any marketing-scope message is enqueued. Append-only by trigger and by grant:
  a withdrawal is a new row, never an edit.

## Why an outbox rather than "just call the API"

An HTTP call cannot join a database transaction, so a direct call has two
failure modes and both are bad. Call first and the write may fail, leaving a
vendor holding a record of something that did not happen. Write first and the
call may fail, leaving the platform's state ahead of the world's. OPS-009 names
the specific case: a payment succeeds and the project shell is never created.

Writing the *intent* transactionally removes the choice. The worker then has
exactly one job — deliver, retry, or give up loudly.

## Idempotency

`idempotency_key` is derived from the message's own id, so it is stable across
every retry of that message and unique across messages. It is what the port's
`IdempotentWrite` carries, and the fake adapters already refuse a write without
one (ARC-004). The `UNIQUE` constraint means a caller who enqueues the same
logical write twice gets a violation rather than two deliveries.

## The dead-letter state

A message that exhausts its attempts moves to `dead` and stops. It is never
silently dropped, and the `dead_requires_error` CHECK means it always carries the
reason. ARC-003 asks for a dead-letter queue that is **reviewed**; a partial
index gives that review a cheap query, and `pnpm db:outbox --dead` prints it.

Nothing automatically retries a dead message. Reviving one is a deliberate act,
because the reason it died is usually not something time fixes.

## What is deliberately not stored

`payload` is checked against a per-type field allowlist before it is written
(`packages/integrations/src/allowlists.ts`), and against a global denylist that
excludes accommodation and disability data (SEC-011), storage keys, signed URLs,
secrets, and any commercial figure. A field that is not declared cannot reach the
table, so the outbox cannot become an accidental export of the domain model.

`last_error` is redacted before it is stored: a provider error message routinely
quotes the request body back.

## Rollback

```sql
DROP TABLE IF EXISTS marketing_consents;
DROP FUNCTION IF EXISTS marketing_consents_append_only();
DROP TABLE IF EXISTS outbox_messages;
```

**Destructive in one respect, and worth pausing on.** Dropping
`outbox_messages` discards any message not yet delivered — undelivered
invitations, unsent CRM contacts. Before rolling back, drain it:

```bash
pnpm db:outbox            # dry run: shows what is pending and what is dead
pnpm db:outbox --apply    # deliver everything pending
```

Dropping `marketing_consents` destroys the record of who agreed to what and
when. That is a compliance record, not application state: **export it before
rolling back**, and treat its loss as a reportable event rather than a
housekeeping detail.

## Roll-forward

Additive. Both tables are new; nothing existing is altered, so the migration
applies to a populated database without a rewrite or a lock of consequence.

Adding a new outbound message type is a change to the allowlist file and not a
migration — `message_type` is unconstrained text on purpose, because the
constraint that matters is the allowlist, and a CHECK here would only duplicate
it in a place that is harder to review.

`destination` *is* constrained, because it maps to a port that must exist.

## Backup impact

Small. `outbox_messages` is worked down to near-empty by the drain job; the
retention sweep removes delivered rows after 30 days. `marketing_consents` grows
slowly and must be included in any backup used to answer a consent question —
which is every backup.

## Tested against representative data

Yes — `packages/db/test/outbox.test.ts` runs against live PostgreSQL as the
`NOBYPASSRLS` application role and covers: enqueue-and-rollback (nothing is
delivered when the transaction that enqueued it fails), cross-tenant invisibility,
the delivery happy path, retry with backoff, the transition to dead after the
attempt limit, idempotency across retries, refusal of a disallowed field, refusal
of a CRM message without consent, and the append-only refusal on
`marketing_consents`.
