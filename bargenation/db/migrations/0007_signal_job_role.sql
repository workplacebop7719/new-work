-- ============================================================
-- 0007 — THE SIGNAL JOB ROLE
--
-- The Deal Signal engine is the one thing in this system that legitimately
-- looks across customers: it has to sweep every active watch, compare it to
-- current prices, and write signals back.
--
-- The blunt way to allow that is BYPASSRLS, which switches row level security
-- off entirely for the role — including on tables the job has no business
-- reading, and including for any future table. Instead this grants exactly
-- what the sweep needs, through role-scoped policies that are visible in
-- pg_policies and can be audited one by one.
--
-- What the job can do:  read active watches, read catalog and price history,
--                       read recent signals (for cooldown), insert new signals.
-- What it cannot do:    read saved items, households, household members,
--                       preferences or profiles; update or delete anything;
--                       touch schema commerce.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'bargenation_jobs') then
    create role bargenation_jobs login password 'local-development-only';
  end if;
end
$$;

-- Explicitly NOT bypassrls. Stated here so a future reader knows it was a
-- decision rather than an oversight.
alter role bargenation_jobs nobypassrls;

grant usage on schema public to bargenation_jobs;
grant usage on schema auth to bargenation_jobs;
grant execute on function auth.uid() to bargenation_jobs;

-- Catalog and price history carry no RLS: they are the same for everyone.
grant select on
  products, product_variants, offers, price_observations,
  retailers, brands, categories, data_sources
to bargenation_jobs;

-- Customer-owned tables the sweep genuinely needs, via role-scoped policies.
grant select on watchlists, watchlist_items to bargenation_jobs;
create policy jobs_read_watchlists on watchlists
  for select to bargenation_jobs using (true);
create policy jobs_read_watchlist_items on watchlist_items
  for select to bargenation_jobs using (true);

-- Signals: read recent ones to honour cooldown, and write new ones.
-- Deliberately no update or delete: the job can start a conversation with a
-- customer but cannot rewrite or erase one.
grant select, insert on deal_signals to bargenation_jobs;
create policy jobs_read_signals on deal_signals
  for select to bargenation_jobs using (true);
create policy jobs_write_signals on deal_signals
  for insert to bargenation_jobs with check (true);

-- The firewall holds for this role too.
revoke all on schema commerce from bargenation_jobs;
revoke all on all tables in schema commerce from bargenation_jobs;
