-- ============================================================
-- 0006 — THE APPLICATION ROLE
--
-- Server code connects as bargenation_app, never as a superuser.
--
-- This is not housekeeping. Superusers — and any role with BYPASSRLS —
-- ignore row level security completely, so an application connecting as
-- postgres would silently read every household in the database no matter how
-- carefully 0003's policies were written. The policies only mean anything
-- because the connection is made by a role that is subject to them.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'bargenation_app') then
    create role bargenation_app login password 'local-development-only';
  end if;
end
$$;

grant usage on schema public to bargenation_app;
grant usage on schema auth   to bargenation_app;
grant execute on function auth.uid() to bargenation_app;

grant select, insert, update, delete on all tables in schema public to bargenation_app;
grant usage, select on all sequences in schema public to bargenation_app;
alter default privileges in schema public
  grant select, insert, update, delete on tables to bargenation_app;

-- Price history is written by the ingestion pipeline and read by everyone
-- else. The append-only triggers in 0002 apply to this role too.
-- No grant on schema commerce: the app serves scores, so it lives under the
-- same firewall the scoring role does. Outbound click logging will get its
-- own narrowly-granted role when /go/[offer] is built.
revoke all on schema commerce from bargenation_app;
revoke all on all tables in schema commerce from bargenation_app;
