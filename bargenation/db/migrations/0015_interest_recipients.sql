-- ============================================================
-- 0015 — WHO THE SWEEP MAY ASK ABOUT, WITHOUT READING WHO THEY ARE
--
-- The interest sweep needs one fact: which customers have both turned
-- behaviour alerts on and are members. The obvious way to get it is to read
-- `profiles.membership` and `preferences.settings` from the job.
--
-- Migration 0007 forbids exactly that, in writing:
--
--     What it cannot do: read saved items, households, household members,
--                        preferences or profiles.
--
-- That boundary caught the first version of this feature, which is what it is
-- for. Widening it would have handed a batch job read access to every
-- customer's preferences in order to learn a single boolean about some of
-- them — a real loss for no real gain.
--
-- So the job asks a question instead of reading a table. This function
-- returns IDS AND NOTHING ELSE: not the membership value, not the settings
-- object, not a display name. The job learns "these people opted in"; it
-- cannot learn what else anybody set, or that a given id exists at all
-- without already being in the answer.
--
-- SECURITY DEFINER with a pinned search_path, so a caller cannot shadow
-- `profiles` or `preferences` with their own table and change what it reads.
-- ============================================================

create or replace function interest_alert_recipients()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id
  from profiles p
  join preferences pref on pref.profile_id = p.id
  where p.membership = 'MEMBER'
    and coalesce((pref.settings ->> 'behaviourAlerts')::boolean, false)
$$;

comment on function interest_alert_recipients() is
  'Ids only. The signal job may not read profiles or preferences (0007).';

revoke all on function interest_alert_recipients() from public;
grant execute on function interest_alert_recipients() to bargenation_jobs;
