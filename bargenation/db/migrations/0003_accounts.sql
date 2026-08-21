-- ============================================================
-- 0003 — CUSTOMER ACCOUNTS, WITH ROW LEVEL SECURITY
--
-- PRD §48: "Do not rely on hiding UI. Authorization must be enforced
-- server-side/database-side."
--
-- Every table here is RLS ENABLED and FORCED. `force` matters: without it the
-- table owner bypasses its own policies, so a bug in server code running as
-- the owner would read every household in the system.
--
-- Policies are written against auth.uid() so they run unchanged on Supabase.
-- Locally we provide a compatible shim reading the same GUC that Supabase's
-- own auth.uid() reads, so what we test here is what runs in production.
-- ============================================================

create schema if not exists auth;

-- On Supabase this function already exists; do not replace it there.
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    execute $fn$
      create function auth.uid() returns uuid
      language sql stable
      as $body$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $body$;
    $fn$;
  end if;
end
$$;

-- ---------- profiles ----------
create table profiles (
  id           uuid primary key,          -- mirrors auth.users(id)
  display_name text,
  created_at   timestamptz not null default now()
);
comment on table profiles is
  'One row per authenticated customer. id mirrors auth.users(id).';

-- ---------- households ----------
create table households (
  id               uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references profiles(id) on delete cascade,
  name             text,
  created_at       timestamptz not null default now()
);
create index households_owner_idx on households (owner_profile_id);

-- ---------- household members ----------
-- PRD §35. Read the ABSENCES here as deliberate design:
--
--   no legal_name        — a nickname is enough to size a coat
--   no date_of_birth     — birth_year is enough to judge age-appropriateness
--   no school, no address, no medical, no government identifier
--
-- We cannot leak, subpoena or mis-sell a field we never collected. If a
-- future feature seems to need one of these, that is a product conversation,
-- not a migration.
create table household_members (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  nickname      text,
  birth_year    smallint check (birth_year between 1900 and 2200),
  clothing_size text,
  shoe_size     text,
  created_at    timestamptz not null default now()
);
create index household_members_household_idx on household_members (household_id);

-- ---------- saved ("remember this") ----------
create table saved_items (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  offer_id   uuid not null references offers(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now(),
  unique (profile_id, offer_id)
);

-- ---------- watchlist ("monitor this") ----------
-- Distinct from saved by intent, which is why it is a distinct table (§25).
create table watchlists (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name       text not null default 'My Watchlist',
  created_at timestamptz not null default now()
);
create index watchlists_profile_idx on watchlists (profile_id);

create table watchlist_items (
  id                 uuid primary key default gen_random_uuid(),
  watchlist_id       uuid not null references watchlists(id) on delete cascade,

  -- exactly one subject: a product, or a broader standing interest
  product_id         uuid references products(id) on delete cascade,
  brand_id           uuid references brands(id) on delete cascade,
  category_id        uuid references categories(id) on delete cascade,
  retailer_id        uuid references retailers(id) on delete cascade,
  keyword            text,

  target_price_cents integer check (target_price_cents >= 0),
  deadline           date,
  size               text,
  color              text,
  household_member_id uuid references household_members(id) on delete set null,
  note               text,

  state              text not null default 'WATCHING' check (state in
                       ('WATCHING','PRICE_DROPPED','MATCH_FOUND','BUY','HOLD',
                        'BACK_IN_STOCK','OUT_OF_STOCK','EXPIRED')),
  paused             boolean not null default false,
  created_at         timestamptz not null default now(),

  -- a watch with no subject would silently never match
  constraint watchlist_item_has_subject check (
    num_nonnulls(product_id, brand_id, category_id, retailer_id, keyword) >= 1
  )
);
create index watchlist_items_watchlist_idx on watchlist_items (watchlist_id);

-- ---------- deal signals ----------
create table deal_signals (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  watchlist_item_id uuid references watchlist_items(id) on delete cascade,
  offer_id          uuid references offers(id) on delete cascade,
  kind              text not null check (kind in
                      ('TARGET_REACHED','PRICE_DROPPED','BETTER_RETAILER_PRICE',
                       'MATCH_FOUND','BACK_IN_STOCK','UNUSUALLY_STRONG','INDEX_CHANGED')),
  message           text not null,
  created_at        timestamptz not null default now(),
  read_at           timestamptz,
  -- when the signal was actually delivered; null = not sent yet
  delivered_at      timestamptz
);
create index deal_signals_profile_idx on deal_signals (profile_id, created_at desc);

-- ---------- preferences ----------
create table preferences (
  profile_id uuid primary key references profiles(id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Tables owned directly by a profile.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','households','saved_items','watchlists','deal_signals','preferences'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force  row level security', t);
  end loop;
end
$$;

create policy profiles_own on profiles
  using (id = auth.uid()) with check (id = auth.uid());

create policy households_own on households
  using (owner_profile_id = auth.uid()) with check (owner_profile_id = auth.uid());

create policy saved_items_own on saved_items
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy watchlists_own on watchlists
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy deal_signals_own on deal_signals
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy preferences_own on preferences
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Tables owned transitively. The subquery is the boundary: a row is visible
-- only if its parent chain terminates at the caller's own profile.
alter table household_members enable row level security;
alter table household_members force  row level security;
create policy household_members_own on household_members
  using (household_id in (select id from households where owner_profile_id = auth.uid()))
  with check (household_id in (select id from households where owner_profile_id = auth.uid()));

alter table watchlist_items enable row level security;
alter table watchlist_items force  row level security;
create policy watchlist_items_own on watchlist_items
  using (watchlist_id in (select id from watchlists where profile_id = auth.uid()))
  with check (watchlist_id in (select id from watchlists where profile_id = auth.uid()));
