-- ============================================================
-- 0010 — OPERATOR ROLES, NARROWLY GRANTED, FULLY AUDITED
--
-- Adds the concept of staff, the database role they act through, and an
-- append-only record of what they did.
--
-- THE TRAP THIS MIGRATION HAS TO AVOID
-- ------------------------------------
-- Migration 0003 gave every customer this policy on their own profile:
--
--     using (id = auth.uid()) with check (id = auth.uid())
--
-- which is correct for a display name. The moment a `role` column exists on
-- that same row, it also means any customer can run
--
--     update profiles set role = 'admin'
--
-- and it satisfies the policy, because they are only touching their own row.
-- RLS answers "which rows", never "which columns".
--
-- So the table-level UPDATE grant is withdrawn and replaced with a
-- column-level one covering display_name alone.
--
-- The subtlety that has to be got right: in PostgreSQL, table-level and
-- column-level privileges are SEPARATE. A table-level UPDATE covers every
-- column, including ones added later, and `revoke update (role)` does not
-- subtract from it — the revoke simply does nothing. The table grant must be
-- dropped first. A first attempt at this migration did only the column revoke,
-- and a customer promoted themselves to admin on the very next query.
-- ============================================================

alter table profiles
  add column role text not null default 'customer'
    check (role in ('customer', 'operator', 'admin'));

comment on column profiles.role is
  'Staff level. bargenation_app has no UPDATE grant on this column — see 0010.';

-- The application may maintain a profile, but never its own privilege level.
-- Order matters: drop the table-level grant, THEN grant the single column.
revoke update on profiles from bargenation_app;
grant update (display_name) on profiles to bargenation_app;

-- 0006 also set default privileges that hand bargenation_app UPDATE on new
-- tables. That is fine for tables, but profiles must not drift back to a
-- table-wide grant if it is ever recreated, so the intent is recorded here.

-- ---------- what staff did, and why ----------
-- Releasing a quarantined price writes into an append-only record, so the
-- decision to release it must itself be attributable and permanent.
create table admin_actions (
  id          bigint generated always as identity primary key,
  actor_id    uuid not null references profiles(id) on delete restrict,
  action      text not null check (action in (
                'RELEASE_QUARANTINE', 'DISCARD_QUARANTINE',
                'RESOLVE_MATCH', 'REJECT_RECORD'
              )),
  -- what was acted on; free-form because targets live in several tables
  target      text not null,
  reason      text not null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index admin_actions_actor_idx on admin_actions (actor_id, created_at desc);

-- An audit trail that can be edited is not an audit trail.
create trigger admin_actions_no_update
  before update on admin_actions
  for each row execute function reject_mutation();
create trigger admin_actions_no_delete
  before delete on admin_actions
  for each row execute function reject_mutation();

-- ---------- the operator database role ----------
-- Scoped like bargenation_jobs: enumerated grants, no bypassrls, and
-- deliberately no reach into customer personal data. An operator resolving a
-- product match has no business reading households or saved items.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'bargenation_admin') then
    create role bargenation_admin login password 'local-development-only';
  end if;
end
$$;

alter role bargenation_admin nobypassrls;

grant usage on schema public to bargenation_admin;
grant usage on schema auth to bargenation_admin;
grant execute on function auth.uid() to bargenation_admin;

-- Catalog and operational tables.
grant select, insert, update on
  products, product_variants, offers, retailers, brands, categories, data_sources
to bargenation_admin;
grant select, insert on price_observations, verification_events to bargenation_admin;
grant select, update on quarantined_observations to bargenation_admin;
grant select, insert on source_runs, ingest_rejections to bargenation_admin;
grant select, insert on admin_actions to bargenation_admin;
grant usage, select on all sequences in schema public to bargenation_admin;

-- Staff need to see who they are; the policy still limits them to their own row.
grant select on profiles to bargenation_admin;
create policy admin_reads_own_profile on profiles
  for select to bargenation_admin using (id = auth.uid());

-- Deliberately absent: households, household_members, saved_items, watchlists,
-- watchlist_items, deal_signals, preferences, newsletter_subscribers.
-- Operating the ingestion queue requires none of them.
revoke all on schema commerce from bargenation_admin;
revoke all on all tables in schema commerce from bargenation_admin;
