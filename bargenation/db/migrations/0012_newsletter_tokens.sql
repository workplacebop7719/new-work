-- ============================================================
-- 0012 — SUBSCRIBERS ARE REACHED BY TOKEN, AND THE DATABASE ENFORCES IT
--
-- 0004 created the newsletter tables but left them without row level
-- security, so the application role could read every subscriber's email. That
-- was survivable only because nothing queried them yet.
--
-- The customer tables key their policies on auth.uid(), which cannot work
-- here: §38 requires that The Edit not need an account, so most subscribers
-- have no auth identity at all.
--
-- Instead each subscriber carries two opaque tokens, and access is scoped to
-- whichever one the caller presents — enforced by policy against a GUC, the
-- same shape as auth.uid() elsewhere rather than a WHERE clause the
-- application has to remember.
--
--   confirm_token  single purpose: completing double opt-in
--   manage_token   long-lived: unsubscribe and preferences
--
-- They are separate so that a confirmation link, which travels through email
-- and may sit in an inbox for years, cannot later be used to read or change
-- anything.
-- ============================================================

alter table newsletter_subscribers
  add column confirm_token uuid not null default gen_random_uuid(),
  add column manage_token  uuid not null default gen_random_uuid();

create unique index newsletter_confirm_token_idx on newsletter_subscribers (confirm_token);
create unique index newsletter_manage_token_idx  on newsletter_subscribers (manage_token);

-- ---------- row level security ----------
alter table newsletter_subscribers enable row level security;
alter table newsletter_subscribers force  row level security;
alter table newsletter_preferences enable row level security;
alter table newsletter_preferences force  row level security;

/**
 * The token the caller is currently acting with. Set per transaction, exactly
 * like request.jwt.claim.sub, so it cannot leak to the next borrower of a
 * pooled connection.
 */
create or replace function newsletter_token() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.newsletter_token', true), '')::uuid
$$;

-- Anyone may subscribe. That is the whole point of a public newsletter.
create policy subscribers_insert on newsletter_subscribers
  for insert with check (true);

-- Reading or changing a subscriber requires presenting one of its tokens.
create policy subscribers_by_token on newsletter_subscribers
  for select using (
    confirm_token = newsletter_token() or manage_token = newsletter_token()
  );

-- Confirming uses the confirm token; everything else needs the manage token.
create policy subscribers_update_by_token on newsletter_subscribers
  for update using (
    confirm_token = newsletter_token() or manage_token = newsletter_token()
  ) with check (
    confirm_token = newsletter_token() or manage_token = newsletter_token()
  );

-- Accepts EITHER token, deliberately. Preferences are created during
-- confirmation, when the only token in scope is the confirm token; a policy
-- that accepted only the manage token rejected its own confirmation flow.
create policy preferences_by_token on newsletter_preferences
  for all using (
    subscriber_id in (
      select id from newsletter_subscribers
      where manage_token = newsletter_token() or confirm_token = newsletter_token()
    )
  ) with check (
    subscriber_id in (
      select id from newsletter_subscribers
      where manage_token = newsletter_token() or confirm_token = newsletter_token()
    )
  );

-- The consent log is append-only already (0004). Writing to it must not
-- require reading anyone else's row.
create policy consent_insert on newsletter_consent_events
  for insert with check (true);
create policy consent_by_token on newsletter_consent_events
  for select using (
    subscriber_id in (
      select id from newsletter_subscribers
      where confirm_token = newsletter_token() or manage_token = newsletter_token()
    )
  );
alter table newsletter_consent_events enable row level security;
alter table newsletter_consent_events force  row level security;

grant execute on function newsletter_token() to bargenation_app;
grant select, insert, update on newsletter_subscribers to bargenation_app;
grant select, insert on newsletter_consent_events to bargenation_app;
grant select, insert, update on newsletter_preferences to bargenation_app;

-- Neither the signal job nor the ingestion operator has any business here.
revoke all on newsletter_subscribers, newsletter_consent_events, newsletter_preferences
  from bargenation_jobs, bargenation_admin;
