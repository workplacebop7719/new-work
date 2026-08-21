-- ============================================================
-- 0002 — PRICE OBSERVATIONS ARE APPEND-ONLY
--
-- The entire product rests on the claim "this is what we recorded". If a row
-- can be edited after the fact, that claim is worthless — a bad score could
-- be quietly improved by rewriting history, and nobody could tell.
--
-- So UPDATE, DELETE and TRUNCATE are rejected at the database, for every
-- role including the table owner. A correction is a new observation.
-- ============================================================

create or replace function reject_mutation() returns trigger
language plpgsql as $$
begin
  raise exception
    'price_observations is append-only: % is not permitted. Record a new observation instead.',
    tg_op
    using errcode = 'restrict_violation';
end;
$$;

create trigger price_observations_no_update
  before update on price_observations
  for each row execute function reject_mutation();

create trigger price_observations_no_delete
  before delete on price_observations
  for each row execute function reject_mutation();

-- statement-level: TRUNCATE fires no row triggers
create trigger price_observations_no_truncate
  before truncate on price_observations
  for each statement execute function reject_mutation();

-- Verification events are evidence too, and equally immutable.
create trigger verification_events_no_update
  before update on verification_events
  for each row execute function reject_mutation();

create trigger verification_events_no_delete
  before delete on verification_events
  for each row execute function reject_mutation();
