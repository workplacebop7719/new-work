-- ============================================================
-- 0004 — NEWSLETTER, WITH A CONSENT RECORD
--
-- PRD §40: "Canada-first architecture should consider CASL."
--
-- Under CASL the obligation is evidentiary: you must be able to SHOW, per
-- address, that consent was given, when, how, and from where. A boolean
-- column cannot do that, so consent lives in an append-only event log and
-- the subscriber's status is derived from it.
--
-- This schema does not make us compliant. It makes compliance provable,
-- which is the part software can actually contribute. (§70: no compliance
-- claims without legal review.)
-- ============================================================

create table newsletter_subscribers (
  id             uuid primary key default gen_random_uuid(),
  email          citext not null unique,
  -- PENDING until a confirmation link is followed (express consent)
  status         text not null default 'PENDING' check (status in
                   ('PENDING','SUBSCRIBED','UNSUBSCRIBED','BOUNCED','COMPLAINED')),
  -- where the address came from; required for a CASL record
  signup_source  text not null,
  confirmed_at   timestamptz,
  unsubscribed_at timestamptz,
  -- an account is NOT required to receive The Edit (§38)
  profile_id     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),

  constraint confirmed_implies_timestamp check (
    status <> 'SUBSCRIBED' or confirmed_at is not null
  )
);

create table newsletter_consent_events (
  id            bigint generated always as identity primary key,
  subscriber_id uuid not null references newsletter_subscribers(id) on delete restrict,
  event         text not null check (event in
                  ('REQUESTED','CONFIRMED','UNSUBSCRIBED','BOUNCED','COMPLAINED')),
  occurred_at   timestamptz not null default now(),
  -- evidence: the page, the wording shown, the IP, the user agent
  evidence      jsonb not null default '{}'::jsonb
);
create index newsletter_consent_subscriber_idx
  on newsletter_consent_events (subscriber_id, occurred_at desc);

-- The consent record is evidence. It cannot be edited or erased.
create trigger newsletter_consent_no_update
  before update on newsletter_consent_events
  for each row execute function reject_mutation();

create trigger newsletter_consent_no_delete
  before delete on newsletter_consent_events
  for each row execute function reject_mutation();

create table newsletter_preferences (
  subscriber_id uuid primary key references newsletter_subscribers(id) on delete cascade,
  -- 'DAILY' | 'WEEKLY' | 'ALERTS_ONLY'
  cadence       text not null default 'WEEKLY' check (cadence in ('DAILY','WEEKLY','ALERTS_ONLY')),
  categories    text[] not null default '{}',
  updated_at    timestamptz not null default now()
);
