# 0004_identity — migration notes

Required by ENG-006. Part of CC-03a. Relates to questions Q-13 (identity vendor)
and Q-17 (data residency).

## What it does

Adds the platform's half of ADR-0002's split between authentication and
authorization:

- `users` gains `identity_subject_id` (the provider's opaque handle),
  `status`/`disabled_at` for offboarding, and `recovery_codes_issued_at`.
- `auth_sessions` — the sessions this platform issues, stored as hashes.
- `user_mfa_factors` — which methods a person has enrolled, so the account
  screen renders without a provider round trip.
- `sign_in_throttle` — per-address failure counters behind a timed lockout.
- `invitations` — single-use, expiring, tenant-owned, with row-level security.

## What it deliberately does not add

No password, password hash, TOTP seed, passkey credential or recovery code has a
column anywhere in this migration. Those live with the identity provider
(ADR-0002), and the absence of a column is the control: a future code path
cannot write a secret to a field that does not exist.

`auth_sessions.client_hash` is a daily-rotating HMAC, not an IP address — the
same construction `rate_limit_counters` uses, for the same reason (SEC-011).

## Global tables and why

Three tables are declared `-- global:`. Each is a property of a *person*, not of
a tenant:

- `auth_sessions` — one session serves every organization the person belongs to.
  The tenant is chosen per request. An `organization_id` column here would make
  the session look scoped when it is not.
- `user_mfa_factors` — someone who administers two organizations enrols once.
- `sign_in_throttle` — the key is a hash of an address being attempted, which
  frequently corresponds to no user at all.

`invitations` is tenant-owned and carries the full RLS treatment: enabled,
forced, and a `tenant_isolation` policy.

## The one system-context read

Accepting an invitation looks the row up by token hash *before* the tenant is
known — the token is what determines the tenant. That lookup uses
`withSystemContext('invitation token acceptance')` and is the only cross-tenant
read in this slice. It returns at most one row, matched on a unique hash, and
the acceptance then re-enters `withTenant` for every subsequent write.

## Rollback

```sql
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS sign_in_throttle;
DROP TABLE IF EXISTS user_mfa_factors;
DROP TABLE IF EXISTS auth_sessions;
ALTER TABLE users DROP COLUMN IF EXISTS recovery_codes_issued_at;
ALTER TABLE users DROP COLUMN IF EXISTS disabled_at;
ALTER TABLE users DROP COLUMN IF EXISTS status;
ALTER TABLE users DROP COLUMN IF EXISTS identity_subject_id;
```

**Destructive in one respect:** dropping `auth_sessions` signs everyone out, and
dropping `invitations` invalidates every emailed invitation link that has not yet
been accepted. Neither loses client work, but both are visible to people. If a
rollback is needed after invitations have been sent, export
`invitations (organization_id, email, role, created_at)` first so they can be
re-issued rather than silently disappearing.

Dropping `users.identity_subject_id` severs the link to provider accounts. The
accounts continue to exist at the provider; re-linking on roll-forward is a
lookup by address, which is why the address remains on `users`.

## Roll-forward

Additive. The columns on `users` are nullable or defaulted, so the migration
applies to a populated table without a rewrite. `identity_subject_id` is null for
every row seeded before CC-03a; the sign-in path treats a null subject as "not
yet linked" and routes to provisioning rather than failing.

The `invitations.role` CHECK lists client roles only. Extending it to internal
roles is a future migration and a policy-layer change together — never one
without the other.

## Backup impact

Small and mostly transient. `auth_sessions` and `sign_in_throttle` are swept by
`pnpm db:retention`; expired and accepted invitations are swept 30 days after
they close, which removes the stored address with them.

None of the new tables holds client evidence, so this migration does not change
the restore-testing scope for DAT-006.

## Tested against representative data

Yes — `packages/db/test/identity.test.ts` runs against live PostgreSQL as the
`NOBYPASSRLS` application role and covers: a cross-tenant invitation read
returning zero rows, a foreign-tenant invitation insert being rejected, the
single-pending-invitation index refusing a duplicate, the accepted/revoked
mutual-exclusion constraint, session revocation, and the throttle counter.
