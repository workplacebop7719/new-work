-- ============================================================
-- 0014 — WHAT WE NOTICED, AND WHO GETS TOLD
--
-- Two things, because they only make sense together: a record of what a
-- customer has shown interest in, and the membership flag that decides
-- whether we act on it.
--
-- THE RULE THIS SCHEMA EXISTS TO KEEP (PRD §52). Membership adds INFERENCE.
-- It never subtracts SERVICE. A free customer's explicit Watchlist signals
-- fire identically, at the same moment, with the same wording, whether or not
-- anybody is paying. What a member buys is that we also look at things they
-- never got round to adding — not that free customers are made to wait.
--
-- The Value Index and the Buy / Hold call are untouched by either table.
-- Nothing here can reach a score, and there is no column through which it
-- could.
--
-- WHAT WE DELIBERATELY DO NOT RECORD. No clickstream, no per-request row, no
-- IP address, no user agent, no referrer, no session identifier, no dwell
-- time. One row per customer per subject per DAY, carrying a count. That is
-- enough to tell "came back to this four times" from "glanced once", and it
-- is not enough to reconstruct somebody's afternoon.
-- ============================================================

-- ---------- membership ----------
-- A flag, not a payments integration. There is no way to buy this: no
-- provider is configured and the price is not decided. An operator can set it
-- for a real member once both exist. The account page says exactly that
-- rather than showing an upgrade button that goes nowhere (§01).
alter table profiles
  add column membership text not null default 'FREE'
    check (membership in ('FREE', 'MEMBER'));

comment on column profiles.membership is
  'Adds inference only. Never gates, delays or downgrades an explicit watch signal (§52).';

-- ---------- interest ----------
create table interest_events (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,

  -- exactly one subject, mirroring watchlist_items
  product_id   uuid references products(id) on delete cascade,
  category_id  uuid references categories(id) on delete cascade,

  kind         text not null check (kind in ('VIEWED', 'SEARCHED', 'CONSIDERED')),

  -- the DAY, not the instant. A timestamp here would be a clickstream.
  observed_on  date not null default current_date,
  occurrences  integer not null default 1 check (occurrences > 0),

  constraint interest_has_subject check (num_nonnulls(product_id, category_id) = 1),
  -- one row per customer, subject, kind and day: repeat visits increment.
  unique nulls not distinct (profile_id, product_id, category_id, kind, observed_on)
);

create index interest_events_profile_idx on interest_events (profile_id, observed_on desc);

comment on table interest_events is
  'Day-bucketed counts. No clickstream, no IP, no user agent, no session id (§37).';

-- ---------- retention ----------
-- Interest is a recent-behaviour signal, so old rows are not merely useless,
-- they are a liability. Ninety days, enforced by a function the sweep calls
-- rather than by a comment nobody runs.
create or replace function prune_interest_events()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from interest_events where observed_on < current_date - interval '90 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- ---------- row level security ----------
alter table interest_events enable row level security;
alter table interest_events force  row level security;

create policy interest_events_own on interest_events
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- The sweep reads across customers, exactly as it does for watches, through a
-- role-scoped policy rather than BYPASSRLS.
grant select on interest_events to bargenation_jobs;
create policy jobs_read_interest on interest_events
  for select to bargenation_jobs using (true);

grant select, insert, update, delete on interest_events to bargenation_app;
grant execute on function prune_interest_events() to bargenation_jobs;

-- The signal kind this produces.
alter table deal_signals drop constraint deal_signals_kind_check;
alter table deal_signals add constraint deal_signals_kind_check check (kind in
  ('TARGET_REACHED','PRICE_DROPPED','BETTER_RETAILER_PRICE',
   'MATCH_FOUND','BACK_IN_STOCK','UNUSUALLY_STRONG','INDEX_CHANGED',
   'NOTICED'));
