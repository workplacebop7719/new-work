-- ============================================================
-- 0013 — SUBSCRIBING WITHOUT BEING ABLE TO READ SUBSCRIBERS
--
-- The subscribe path has to answer "does this address already exist?" in order
-- to avoid resetting somebody who is already subscribed. But reading
-- newsletter_subscribers by email is exactly the capability 0012 withholds,
-- because it turns the signup form into an address-enumeration oracle.
--
-- The first attempt used `insert ... on conflict do update`, which fails: an
-- upsert needs the UPDATE policy as well as the INSERT one, and UPDATE is
-- token-gated. Loosening that policy would have granted read access by email
-- to get an insert working — trading the actual protection for convenience.
--
-- Instead the OPERATION is permitted while the CAPABILITY is not. This
-- function runs as its owner, performs the upsert, and returns only a state
-- and a confirmation token. The application still cannot read anybody's row.
-- ============================================================

create or replace function newsletter_request_subscription(
  p_email    citext,
  p_source   text,
  p_evidence jsonb default '{}'::jsonb
)
returns table (state text, confirm_token uuid)
language plpgsql
security definer
-- Pinned so a caller cannot shadow the tables this resolves against.
set search_path = public, pg_temp
as $$
declare
  v_id      uuid;
  v_status  text;
  v_token   uuid;
begin
  select id, status, newsletter_subscribers.confirm_token
    into v_id, v_status, v_token
    from newsletter_subscribers
   where email = p_email;

  if v_id is null then
    insert into newsletter_subscribers (email, signup_source)
    values (p_email, p_source)
    returning id, status, newsletter_subscribers.confirm_token
      into v_id, v_status, v_token;
  end if;

  -- Already subscribed: say so, change nothing, and record nothing. Logging a
  -- fresh REQUESTED here would make the consent history misleading.
  if v_status = 'SUBSCRIBED' then
    return query select 'ALREADY_SUBSCRIBED'::text, null::uuid;
    return;
  end if;

  insert into newsletter_consent_events (subscriber_id, event, evidence)
  values (v_id, 'REQUESTED', jsonb_build_object('source', p_source) || coalesce(p_evidence, '{}'::jsonb));

  return query select 'PENDING_CONFIRMATION'::text, v_token;
end;
$$;

revoke all on function newsletter_request_subscription(citext, text, jsonb) from public;
grant execute on function newsletter_request_subscription(citext, text, jsonb) to bargenation_app;
