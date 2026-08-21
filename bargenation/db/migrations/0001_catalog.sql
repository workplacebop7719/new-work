-- ============================================================
-- 0001 — CATALOG
--
-- What we sell intelligence about: retailers, products, offers, and the
-- append-only record of prices we have observed ourselves.
--
-- Nothing in this migration is customer data and nothing is commercial.
-- Affiliate economics live in a separate schema created in 0005, which the
-- scoring role is deliberately not granted access to.
-- ============================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive email

-- ---------- where our data comes from (PRD §44 priority ladder) ----------
create table data_sources (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  -- 1 retailer API · 2 affiliate feed · 3 merchant feed
  -- 4 structured public · 5 permitted monitoring
  tier            smallint not null check (tier between 1 and 5),
  terms_url       text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create table retailers (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  -- true ONLY where a real agreement exists. Never set from a feed.
  verified_partner boolean not null default false,
  created_at       timestamptz not null default now()
);

create table brands (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null
);

create table categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  sort_order smallint not null default 0
);

create table products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  brand_id    uuid references brands(id) on delete set null,
  category_id uuid not null references categories(id) on delete restrict,
  created_at  timestamptz not null default now()
);

create table product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size       text,
  color      text,
  sku        text,
  unique (product_id, size, color, sku)
);

-- ---------- an offer is one retailer's current price for one product ----------
create table offers (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references products(id) on delete cascade,
  variant_id       uuid references product_variants(id) on delete set null,
  retailer_id      uuid not null references retailers(id) on delete restrict,
  source_id        uuid not null references data_sources(id) on delete restrict,

  -- money is integer minor units, never floating point
  price_cents      integer not null check (price_cents >= 0),
  currency         char(3) not null default 'USD',

  in_stock         boolean not null default true,
  url              text,

  -- null means UNKNOWN, never "no deadline". The UI must not invent urgency.
  offer_ends_at    timestamptz,
  limited_stock    boolean,

  last_verified_at timestamptz not null default now(),
  is_sample_data   boolean not null default false,
  created_at       timestamptz not null default now(),

  unique (retailer_id, product_id, variant_id)
);

create index offers_product_idx  on offers (product_id);
create index offers_retailer_idx on offers (retailer_id);

-- ---------- the record the whole product rests on ----------
-- Append-only, enforced by trigger in 0002.
create table price_observations (
  id          bigint generated always as identity primary key,
  offer_id    uuid not null references offers(id) on delete restrict,
  price_cents integer not null check (price_cents >= 0),
  in_stock    boolean not null,
  observed_at timestamptz not null,
  source_id   uuid not null references data_sources(id) on delete restrict
);

-- the query the scoring engine actually makes: a window of one offer's history
create index price_observations_offer_time_idx
  on price_observations (offer_id, observed_at desc);

create table verification_events (
  id          bigint generated always as identity primary key,
  offer_id    uuid not null references offers(id) on delete cascade,
  verified_at timestamptz not null default now(),
  outcome     text not null check (outcome in ('confirmed','price_changed','gone','unreachable')),
  note        text
);

-- ---------- published scores, kept for audit ----------
-- Stores what we published and the inputs behind it, so any past call can be
-- reconstructed and defended. `components` holds the normalised 0..1 inputs.
create table value_index_scores (
  id          bigint generated always as identity primary key,
  offer_id    uuid not null references offers(id) on delete cascade,
  score       numeric(3,1) check (score between 0 and 10),
  band        text not null check (band in
                ('EXCEPTIONAL','STRONG_BUY','GOOD_VALUE','CONSIDER','HOLD','SKIP','WITHHELD')),
  coverage    numeric(4,3) not null check (coverage between 0 and 1),
  published   boolean not null,
  withheld_reason text,
  components  jsonb not null,
  computed_at timestamptz not null default now(),

  -- a withheld score must carry its reason and no number; a published one
  -- must carry a number. Neither state can be recorded incoherently.
  constraint score_shape check (
    (published and score is not null and withheld_reason is null) or
    (not published and score is null and withheld_reason is not null)
  )
);

create index value_index_scores_offer_idx on value_index_scores (offer_id, computed_at desc);
