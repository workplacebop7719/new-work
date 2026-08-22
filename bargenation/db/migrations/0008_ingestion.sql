-- ============================================================
-- 0008 — INGESTION BOOKKEEPING
--
-- Three tables that exist so ingestion can be operated rather than merely run:
-- what each sweep did, what it refused and why, and what it is holding back
-- pending confirmation.
--
-- The quarantine table is the important one. price_observations is append-only
-- by design, so anything doubtful has to wait OUTSIDE that record until it is
-- corroborated. Without somewhere to park it, the only options would be to
-- record a possibly-bogus price permanently or to drop a possibly-real one on
-- the floor.
-- ============================================================

create table source_runs (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid not null references data_sources(id) on delete restrict,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'RUNNING'
                 check (status in ('RUNNING','COMPLETED','FAILED')),
  records_seen integer not null default 0,
  accepted     integer not null default 0,
  rejected     integer not null default 0,
  quarantined  integer not null default 0,
  note         text
);
create index source_runs_source_idx on source_runs (source_id, started_at desc);

-- Why a record did not become an observation. An operator needs this to tell
-- a broken feed from a feed that is working and simply has nothing new.
create table ingest_rejections (
  id         bigint generated always as identity primary key,
  run_id     uuid not null references source_runs(id) on delete cascade,
  stage      text not null check (stage in ('EXTRACT','MATCH','SCREEN')),
  reason     text not null,
  -- the raw record, so a rejection can be reproduced without re-fetching
  raw        jsonb not null,
  created_at timestamptz not null default now()
);
create index ingest_rejections_run_idx on ingest_rejections (run_id, created_at desc);

-- Observations held pending independent corroboration.
create table quarantined_observations (
  id           bigint generated always as identity primary key,
  offer_id     uuid not null references offers(id) on delete cascade,
  price_cents  integer not null check (price_cents > 0),
  in_stock     boolean not null,
  observed_at  timestamptz not null,
  source_id    uuid not null references data_sources(id) on delete restrict,
  reason       text not null,
  created_at   timestamptz not null default now(),

  -- exactly one outcome, eventually
  released_at  timestamptz,
  discarded_at timestamptz,
  constraint quarantine_single_outcome check (
    released_at is null or discarded_at is null
  )
);
create index quarantined_open_idx
  on quarantined_observations (offer_id)
  where released_at is null and discarded_at is null;

comment on table quarantined_observations is
  'Prices too extraordinary to trust on one sighting. Released into price_observations only when a DIFFERENT source agrees.';
