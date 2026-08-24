-- ============================================================
-- 0019 — A HELD PRICE THAT NOBODY EVER LOOKS AT
--
-- The watchdog quarantines an observation it cannot confirm, and an operator
-- releases or discards it. Nothing happened to the ones nobody got to: they
-- sat in the queue forever, and the queue grew until it was too long to read
-- — at which point the whole review surface stops being used at all.
--
-- WHY EXPIRY IS A DISCARD AND NOT A RELEASE. A held observation is one we
-- could not confirm. Time does not confirm it. Releasing on a timer would
-- mean an unverified price silently entering the record precisely because
-- nobody had time to check it, which is the opposite of what the queue is
-- for.
--
-- So the expiry discards, and says so: the reason is recorded in the same
-- audit trail an operator's decision goes to, attributed to the system rather
-- than to a person who never saw it.
-- ============================================================

-- Fourteen days. Long enough that a fortnight's holiday does not silently
-- empty the queue; short enough that the queue stays readable.
create or replace function expire_quarantine(p_days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expired integer;
begin
  with gone as (
    update quarantined_observations
       set discarded_at = now()
     where released_at is null
       and discarded_at is null
       and created_at < now() - make_interval(days => p_days)
    returning id, reason
  )
  insert into admin_actions (actor_id, action, target, reason)
  select null, 'DISCARD_QUARANTINE', 'quarantined_observations:' || g.id,
         'Expired unreviewed after ' || p_days || ' days. Held because: ' || g.reason
  from gone g;

  get diagnostics expired = row_count;
  return expired;
end;
$$;

comment on function expire_quarantine(integer) is
  'Discards, never releases: time does not confirm a price nobody checked (§44).';

-- admin_actions.actor_id was NOT NULL and references a profile. An expiry has
-- no actor — inventing one would attribute a decision to somebody who never
-- made it, which is worse than an honest null in an audit trail.
alter table admin_actions
  alter column actor_id drop not null;

comment on column admin_actions.actor_id is
  'Null means the system did it on a timer, not a person. Never invent an actor.';

grant execute on function expire_quarantine(integer) to bargenation_jobs, bargenation_admin;
