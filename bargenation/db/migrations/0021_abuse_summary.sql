-- ============================================================
-- 0021 — LETTING THE OPERATOR SEE AN ATTACK WITHOUT SEEING A PERSON
--
-- RATE-LIMITING.md recorded this as the gap: the limits work, and nobody can
-- tell whether they are being hit. A protection with no visibility is a
-- protection you find out about from a customer complaint.
--
-- The obvious build hands staff a select on rate_limit_hits. Refuse it, for
-- the same reason 0020 refuses a users table: the operator would then be
-- reading a per-token activity log, and a token plus a timestamp plus a
-- second surface is how a "not personal" identifier stops being one.
--
-- What an operator actually needs to answer is not "who" but "is something
-- happening, and how big is it":
--
--   ATTEMPTS      is the volume unusual for this bucket?
--   DISTINCT      one source hammering, or thousands of sources each trying
--                 a little? Those are different attacks and want different
--                 answers — a block versus a password-strength campaign.
--   BUSIEST       how concentrated is it? A thousand attempts spread over
--                 nine hundred callers is traffic; a thousand from one is an
--                 incident.
--   OVER_LIMIT    how many tokens are past the allowance and are therefore
--                 being refused right now.
--
-- None of those is a row, a token, an address or a person, and BUSIEST is a
-- magnitude with no subject attached. You can see the shape of an attack and
-- you still cannot look anybody up.
--
-- WHY THE THRESHOLD IS PASSED IN. The allowances live in
-- src/security/rate-limit.ts, which is where they are enforced. Copying them
-- into SQL would create a second set that drifts, and the drifted copy would
-- be the one drawing the dashboard — so the caller supplies the number it
-- actually enforces and the function counts against that.
--
-- -- global: rate_limit_hits is not customer-owned (see 0016) and this
-- function reads nothing else. It returns aggregates only.
-- ============================================================

create or replace function abuse_summary(
  window_minutes integer default 60,
  limit_per_token integer default 20
)
returns table (
  bucket        text,
  dimension     text,
  attempts      bigint,
  distinct_tokens bigint,
  busiest_token_attempts bigint,
  tokens_over_limit bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with recent as (
    select h.bucket, h.dimension, h.token, count(*)::bigint as hits
    from rate_limit_hits h
    -- Bounded rather than open: an operator asking for a year of this would
    -- turn a dashboard into a table scan, and nothing older than a day
    -- survives prune_rate_limits() anyway.
    where h.occurred_at > now() - make_interval(mins => least(greatest(window_minutes, 1), 1440))
    group by h.bucket, h.dimension, h.token
  )
  select
    r.bucket,
    r.dimension,
    sum(r.hits)                                            as attempts,
    count(*)::bigint                                       as distinct_tokens,
    max(r.hits)                                            as busiest_token_attempts,
    count(*) filter (where r.hits >= greatest(limit_per_token, 1))::bigint
                                                           as tokens_over_limit
  from recent r
  group by r.bucket, r.dimension
  order by r.bucket, r.dimension;
$$;

comment on function abuse_summary(integer, integer) is
  'Aggregates over rate_limit_hits. Returns no token, address or row — magnitudes only (§69).';

revoke all on function abuse_summary(integer, integer) from public;
grant execute on function abuse_summary(integer, integer) to bargenation_admin;

-- Deliberately NOT granted to bargenation_app. Request-handling code counts
-- and decides; it has no reason to survey the whole table, and a survey
-- reachable from a request handler is a survey reachable from a bug.
