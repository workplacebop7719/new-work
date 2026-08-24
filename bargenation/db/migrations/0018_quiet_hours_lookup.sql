-- ============================================================
-- 0018 — ASKING ABOUT QUIET HOURS WITHOUT READING PREFERENCES
--
-- The sweep has to know when each customer it is about to interrupt does not
-- want interrupting. Migration 0007 denies this role `preferences` outright,
-- and 0015 already established the pattern for exactly this problem: the job
-- asks a question instead of reading a table.
--
-- Returns one field for the ids it was given, and nothing else. The job
-- cannot learn what else anybody set — not their behaviour-alert choice, not
-- anything added to that JSON later.
-- ============================================================

create or replace function quiet_hours_for(p_profiles uuid[])
returns table (profile_id uuid, quiet_hours jsonb)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.profile_id, p.settings -> 'quietHours'
  from preferences p
  where p.profile_id = any(p_profiles)
    and p.settings ? 'quietHours'
$$;

comment on function quiet_hours_for(uuid[]) is
  'One setting only. The signal job may not read preferences (0007).';

revoke all on function quiet_hours_for(uuid[]) from public;
grant execute on function quiet_hours_for(uuid[]) to bargenation_jobs;
