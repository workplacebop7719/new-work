-- ============================================================
-- 0011 — RESOLVING AN AMBIGUOUS MATCH, ONCE
--
-- The matcher refuses to choose between two similar products because a wrong
-- choice merges two price histories permanently. That refusal is correct, but
-- until now it produced a queue nothing could empty, and — worse — the same
-- feed would ask the same question again on every single run.
--
-- So a resolution is not a one-off fix applied to one record. It is a fact the
-- system LEARNS: "at this retailer, a record titled X is product Y". The next
-- run consults that before it consults similarity, and never asks again.
--
-- Aliases are keyed on the NORMALISED title (lowercased, punctuation folded,
-- singular/plural stemmed) so trivial feed rewording does not reopen a
-- question somebody already answered.
-- ============================================================

create table product_aliases (
  id               uuid primary key default gen_random_uuid(),
  retailer_id      uuid not null references retailers(id) on delete cascade,
  -- output of normaliseTitle() + stemming, not the raw feed title
  normalised_title text not null,
  product_id       uuid not null references products(id) on delete cascade,

  -- who taught us this, and why. An alias silently redirects future records,
  -- so it needs the same accountability as releasing a quarantined price.
  created_by       uuid references profiles(id) on delete restrict,
  reason           text not null,
  created_at       timestamptz not null default now(),

  -- one answer per question, per retailer
  unique (retailer_id, normalised_title)
);
create index product_aliases_lookup_idx on product_aliases (retailer_id, normalised_title);

comment on table product_aliases is
  'Learned answers to ambiguous product matches. Consulted before similarity.';

-- ---------- closing a queue item ----------
alter table ingest_rejections
  add column resolved_at  timestamptz,
  add column resolved_by  uuid references profiles(id) on delete restrict,
  add column resolution   text check (resolution in ('MATCHED', 'NEW_PRODUCT', 'DISMISSED'));

-- A resolved row must say who and how; an unresolved one must claim neither.
alter table ingest_rejections
  add constraint rejection_resolution_shape check (
    (resolved_at is null and resolved_by is null and resolution is null) or
    (resolved_at is not null and resolved_by is not null and resolution is not null)
  );

create index ingest_rejections_open_idx
  on ingest_rejections (stage, created_at desc)
  where resolved_at is null;

-- ---------- grants ----------
-- The pipeline reads aliases; only staff create them.
grant select on product_aliases to bargenation_app;
grant select, insert, update, delete on product_aliases to bargenation_admin;
grant update on ingest_rejections to bargenation_admin;

-- The signal job has no business here.
revoke all on product_aliases from bargenation_jobs;
