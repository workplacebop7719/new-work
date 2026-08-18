# 0001_foundation — migration notes

Required by ENG-006: *"Never create a production migration without rollback/roll-forward
notes, backup impact and tested representative data."* CI refuses a migration that
has no paired notes file.

## What it does

Creates the CC-01 skeleton of the PRD §18 core entities, the append-only audit log,
row-level security on every tenant-owned table, and the non-superuser `northstar_app`
role the application connects as.

## Rollback

Safe to roll back in full while no environment holds client data — this is the first
migration, so rollback is `DROP` of everything it created:

```sql
DROP TABLE IF EXISTS audit_events, deliverables, assignment_evidence, assignments,
  finding_evidence, findings, evidence, requirements, projects, memberships,
  organizations, regulatory_claims, users CASCADE;
DROP FUNCTION IF EXISTS audit_events_immutable, app_is_system_context, app_current_organization;
-- The role is left in place: dropping a role that other databases may reference
-- is not reversible from inside a single database.
```

**After any environment holds client evidence, this migration is not rollable back.**
The forward path at that point is a new migration, not a revert.

## Roll-forward

Additive. Later slices add columns and tables; none of them rewrite these ones.
Two constraints here are deliberately load-bearing and must not be relaxed by a later
migration without a security review:

- `released_requires_approver` on `deliverables` (OPS-011)
- the `audit_events_no_update` trigger and the revoked UPDATE/DELETE grant (SEC-006)

## Backup impact

None beyond normal WAL volume; no data is rewritten. First-run schema creation only.

## Tested against representative data

Yes — `pnpm db:seed` loads the Maple Grove Learning Group demo tenant (CMD-003) and
`packages/db/test/tenant-isolation.test.ts` exercises the policies against two tenants
with overlapping data.

## Known limitation

The `northstar_app` role is created by this migration for environment parity. In
production the role and its password are owned by infrastructure (`/infra`), and the
`DO $$ ... $$` block is a no-op because the role already exists.
