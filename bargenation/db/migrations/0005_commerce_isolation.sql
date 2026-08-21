-- ============================================================
-- 0005 — COMMERCE, HELD AT ARM'S LENGTH FROM SCORING
--
-- PRD §52: money must never be able to change a Value Index or a Buy/Hold
-- call. Elsewhere that is enforced by the shape of the code — the scoring
-- functions have no parameter through which commission could arrive.
--
-- This migration makes it structural as well. Affiliate economics live in a
-- separate schema, and the role that runs scoring is granted USAGE on
-- `public` only. If scoring code ever tries to read a commission rate, it
-- does not get a wrong answer or a silently-influenced score — it gets
-- "permission denied for schema commerce" and the query fails loudly.
--
-- Proven by test: see db/rls.test.ts.
-- ============================================================

create schema commerce;

create table commerce.affiliate_links (
  id              uuid primary key default gen_random_uuid(),
  offer_id        uuid not null references public.offers(id) on delete cascade,
  network         text not null,
  destination_url text not null,
  -- the number that must never reach a score
  commission_rate numeric(5,4) check (commission_rate >= 0),
  active          boolean not null default true,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index affiliate_links_offer_idx on commerce.affiliate_links (offer_id);

create table commerce.affiliate_clicks (
  id                bigint generated always as identity primary key,
  affiliate_link_id uuid not null references commerce.affiliate_links(id) on delete cascade,
  -- null for logged-out clicks; we do not require identity to shop
  profile_id        uuid references public.profiles(id) on delete set null,
  clicked_at        timestamptz not null default now(),
  -- coarse attribution only. No IP, no device fingerprint, no email.
  referrer_path     text,
  user_agent_family text
);
create index affiliate_clicks_link_idx on commerce.affiliate_clicks (affiliate_link_id, clicked_at desc);

create table commerce.campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  retailer_id  uuid references public.retailers(id) on delete set null,
  kind         text not null check (kind in
                 ('SPONSORED_PLACEMENT','CATEGORY_SPONSORSHIP','NEWSLETTER_SPONSORSHIP')),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  -- every paid placement is disclosed; there is no "subtle" option
  disclosure_label text not null,
  created_at   timestamptz not null default now(),
  constraint campaign_window check (ends_at > starts_at)
);

-- ---------- the firewall ----------
-- A role for everything that computes or serves a score.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'bargenation_scoring') then
    create role bargenation_scoring nologin;
  end if;
end
$$;

grant usage on schema public to bargenation_scoring;
grant select on all tables in schema public to bargenation_scoring;
alter default privileges in schema public
  grant select on tables to bargenation_scoring;

-- Deliberately absent: any grant on schema commerce.
-- Revoked explicitly as well, so a future default-privilege change cannot
-- quietly hand scoring access to commission data.
revoke all on schema commerce from bargenation_scoring;
revoke all on all tables in schema commerce from bargenation_scoring;
