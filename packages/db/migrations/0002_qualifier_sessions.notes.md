# 0002_qualifier_sessions — migration notes

Required by ENG-006.

## What it does

Adds the store behind the qualifier's save-and-resume (CNV-001), the recorded
consent decision (PUB-006) and the reproducible result (CNV-002).

The table is **global**, declared with `-- global:` as the CI guard requires. A
qualifier session exists before any organization does — that is precisely what
CNV-001 asks for — so there is no tenant to scope it to. Its protection is a
different mechanism: rows are reachable only by an unguessable resume token
whose hash is stored, and no code path lists or searches sessions.

## Rollback

```sql
DROP TABLE IF EXISTS qualifier_sessions;
```

Safe while no live traffic has used the qualifier. After launch, rolling this
back destroys in-progress visitor sessions: they would lose their answers with
no way to recover them. Treat that as data loss and prefer a forward fix.

## Roll-forward

Additive; nothing existing is rewritten. Two constraints are load-bearing and
must not be relaxed without a privacy review:

- `consent_recorded_together` — consent and its timestamp are set as a pair, so a
  row can never claim consent without recording when it was given.
- `contact_email_requires_consent` — an email address cannot be stored without the
  separate service-communication consent (CNV-001, SEC-012).

## Backup impact

Negligible: one narrow table, actively pruned by the retention job.

## Tested against representative data

Yes — `packages/db/test/qualifier-session.test.ts` covers token hashing, resume,
the consent constraints, and the retention sweep in both dry-run and applied
modes.

## Retention

Abandoned sessions are deleted after **30 days**, completed sessions after **90**.
The 30-day figure is assumption **A-15**: the PRD says "a short retention
schedule" without naming a number, and the privacy lead has not yet confirmed one
(question Q-26). Both values live in one constant in `packages/db/src/retention.ts`.
