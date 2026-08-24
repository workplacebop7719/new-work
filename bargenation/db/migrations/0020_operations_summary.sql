-- ============================================================
-- 0020 — OPERATING THE PRODUCT WITHOUT READING THE CUSTOMERS
--
-- PRD §49 asks for admin views of users and of the newsletter. The obvious
-- build grants staff read access to profiles, watchlists, deal signals and
-- newsletter_subscribers.
--
-- Migration 0010 revokes exactly those, in writing, and 0012 withholds
-- read-by-email specifically so the newsletter cannot become an
-- address-enumeration oracle. Handing all of it back to draw a dashboard
-- would undo five migrations of work for a number on a screen.
--
-- So the operator gets COUNTS AND NOTHING ELSE. No names, no addresses, no
-- rows, no way to ask about one person. Enough to answer "is the product
-- being used and is anything stuck", which is what operating it requires; not
-- enough to look somebody up, which it does not.
--
-- If a future job genuinely needs to reach an individual customer, that is a
-- product conversation about consent, not a wider grant slipped in here.
-- ============================================================

create or replace function operations_summary()
returns table (
  metric text,
  value  bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select 'customers',            count(*)::bigint from profiles
  union all
  select 'members',              count(*)::bigint from profiles where membership = 'MEMBER'
  union all
  select 'households',           count(*)::bigint from households
  union all
  select 'watchlist_items',      count(*)::bigint from watchlist_items
  union all
  select 'watchlist_items_paused', count(*)::bigint from watchlist_items where paused
  union all
  select 'saved_items',          count(*)::bigint from saved_items
  union all
  select 'signals_all_time',     count(*)::bigint from deal_signals
  union all
  select 'signals_last_7d',      count(*)::bigint from deal_signals
    where created_at > now() - interval '7 days'
  union all
  select 'signals_undelivered',  count(*)::bigint from deal_signals where delivered_at is null
  union all
  select 'signals_deferred',     count(*)::bigint from deal_signals
    where delivered_at is null and deliver_after is not null and deliver_after > now()
  union all
  select 'subscribers_confirmed', count(*)::bigint from newsletter_subscribers
    where confirmed_at is not null and unsubscribed_at is null
  union all
  select 'subscribers_pending',  count(*)::bigint from newsletter_subscribers
    where confirmed_at is null and unsubscribed_at is null
  union all
  select 'subscribers_unsubscribed', count(*)::bigint from newsletter_subscribers
    where unsubscribed_at is not null
  union all
  select 'behaviour_alerts_on',  count(*)::bigint from preferences
    where coalesce((settings ->> 'behaviourAlerts')::boolean, false)
  union all
  select 'quiet_hours_set',      count(*)::bigint from preferences
    where settings ? 'quietHours'
$$;

comment on function operations_summary() is
  'Counts only. Staff may not read profiles, watchlists, signals or subscribers (0010, 0012).';

revoke all on function operations_summary() from public;
grant execute on function operations_summary() to bargenation_admin;
