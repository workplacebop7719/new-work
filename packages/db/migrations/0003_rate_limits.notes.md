# 0003_rate_limits — migration notes

Required by ENG-006. Closes question Q-27.

## What it does

Adds fixed-window counters so the anonymous qualifier endpoints can refuse abuse.

The table stores **no personal data**. The key is an HMAC of the client
identifier with a server secret and the current UTC date, so:

- a raw IP address is never written (SEC-007 data minimization);
- the daily salt rotation means counters from different days cannot be
  correlated with each other, including by us;
- a database disclosure reveals request *volume* per opaque key, nothing more.

## Rollback

```sql
DROP TABLE IF EXISTS rate_limit_counters;
```

Fully safe at any time: the table holds only transient counters, and dropping it
removes rate limiting rather than losing data. The application fails **closed**
if the table is missing (the limiter treats a database error as "deny"), so a
rollback in production would make the qualifier reject traffic — roll the
application back with it.

## Roll-forward

Additive. If limits need to change, they are constants in
`packages/db/src/rate-limit.ts`, not rows — no migration required.

## Backup impact

Negligible and self-pruning: rows outside the current window are deleted by the
retention sweep (`pnpm db:retention`).

## Tested against representative data

Yes — `packages/db/test/rate-limit.test.ts` covers allow/deny at the boundary,
window rollover, per-action independence, per-client independence, and the
expiry sweep. `apps/web/e2e/rate-limit.spec.ts` drives the limit through the real
endpoint and asserts the refusal is an accessible page, not a challenge.
