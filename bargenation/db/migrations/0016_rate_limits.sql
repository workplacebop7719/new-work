-- ============================================================
-- 0016 — COUNTING WITHOUT RECORDING WHO
--
-- Two tables that exist so somebody cannot try ten thousand passwords, or
-- bury a real person under a hundred password-reset emails.
--
-- NEITHER TABLE HOLDS AN ADDRESS OR AN IP. Both hold a keyed token derived in
-- the application (security/secret.ts): HMAC-SHA256 under a per-purpose
-- label. /privacy says we do not record your IP address, and this keeps that
-- true — what is stored cannot be turned back into an address without the
-- key, and it is deleted within the hour regardless.
--
-- The key is what makes that claim real rather than decorative. An UNKEYED
-- hash of an IPv4 address is four billion candidates, which is seconds of
-- work on a laptop.
--
-- -- global: neither table is customer-owned. There is no profile_id to scope
-- a policy by, and by construction there is no way to work out whose row is
-- whose. RLS here would protect nothing and would only stop the roles that
-- need to count.
-- ============================================================

create table rate_limit_hits (
  id          bigint generated always as identity primary key,
  bucket      text not null check (bucket in
                ('SIGN_IN','SIGN_UP','PASSWORD_RESET','PASSWORD_RESET_TOKEN','SUBSCRIBE')),
  dimension   text not null check (dimension in ('subject','caller')),
  -- HMAC of the address or the caller. Never the value itself.
  token       text not null check (length(token) = 64),
  occurred_at timestamptz not null default now()
);

-- The read is always "how many for this token in this bucket since then",
-- so the index carries all three in that order.
create index rate_limit_hits_lookup
  on rate_limit_hits (bucket, dimension, token, occurred_at desc);

comment on table rate_limit_hits is
  'Keyed tokens only — never an address or an IP. Pruned hourly (§69).';

-- ---------- challenge replay ----------
-- A solved bot challenge could be submitted more than once inside its
-- ten-minute life, which BOT-RESISTANCE.md documented as an open gap. The
-- signature is already an HMAC, so recording it holds nothing personal.
create table challenge_uses (
  signature text primary key check (length(signature) = 64),
  used_at   timestamptz not null default now()
);

comment on table challenge_uses is
  'Spent challenge signatures, so a solved challenge cannot be replayed.';

-- ---------- retention ----------
-- The longest window is an hour, and a challenge dies after ten minutes. Rows
-- older than a day are useless and are only a liability, so they go — by a
-- function the application calls, not by a comment nobody runs.
create or replace function prune_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed integer;
  spent   integer;
begin
  delete from rate_limit_hits where occurred_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  delete from challenge_uses where used_at < now() - interval '1 day';
  get diagnostics spent = row_count;
  return removed + spent;
end;
$$;

grant select, insert, delete on rate_limit_hits to bargenation_app;
grant usage, select on all sequences in schema public to bargenation_app;
grant select, insert, delete on challenge_uses to bargenation_app;
grant execute on function prune_rate_limits() to bargenation_app, bargenation_jobs;

-- Deliberately NOT granted to bargenation_jobs beyond the prune: the signal
-- sweep has no business counting sign-in attempts.
