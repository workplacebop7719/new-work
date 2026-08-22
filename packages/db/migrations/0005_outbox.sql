-- 0005_outbox
--
-- The transactional outbox (ADR-0006 decision 2, ARC-003, ARC-004) and the
-- marketing consent register it depends on (CNV-004, SEC-012).
--
-- The problem this solves, in one sentence: an outbound side effect and the
-- domain change that caused it must either both happen or neither, and an HTTP
-- call cannot join a database transaction. So the *intent* to call is written
-- transactionally, and a worker performs the call afterwards.
--
-- Rollback and roll-forward notes: 0005_outbox.notes.md (required by ENG-006).

-- ---------------------------------------------------------------------------
-- Outbox
-- ---------------------------------------------------------------------------
CREATE TABLE outbox_messages (
  id               uuid PRIMARY KEY,
  -- Nullable, as on audit_events: a message may be enqueued before any tenant
  -- exists (the CRM contact created during sign-up). A NULL never matches
  -- `= app_current_organization()`, so such a row is visible only under system
  -- context — which is exactly where the worker runs.
  organization_id  uuid REFERENCES organizations (id) ON DELETE CASCADE,
  destination      text NOT NULL CHECK (destination IN ('email', 'crm', 'payment', 'signature')),
  message_type     text NOT NULL,
  -- Checked against the per-type field allowlist before it is written
  -- (packages/integrations/src/allowlists.ts). The column is jsonb rather than
  -- typed columns because each destination's shape differs; the allowlist is
  -- what makes that safe rather than a hole.
  payload          jsonb NOT NULL,
  -- ARC-004: derived from this row's own id, so a retry is recognizable as a
  -- duplicate by the provider. Unique here as well, so a caller cannot enqueue
  -- the same logical write twice.
  idempotency_key  text NOT NULL UNIQUE,
  state            text NOT NULL DEFAULT 'pending'
                     CHECK (state IN ('pending', 'delivering', 'delivered', 'dead')),
  attempts         integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at  timestamptz NOT NULL DEFAULT now(),
  -- Redacted before it is stored: a provider error can quote the request body.
  last_error       text,
  external_id      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  delivered_at     timestamptz,
  -- A delivered message has an outcome. Without this a bug could mark something
  -- delivered while the provider never saw it, and nothing would notice.
  CONSTRAINT delivered_requires_timestamp
    CHECK (state <> 'delivered' OR delivered_at IS NOT NULL),
  -- A dead message has a reason. The dead-letter queue is reviewed (ARC-003),
  -- and a review of rows with no error text is not a review.
  CONSTRAINT dead_requires_error
    CHECK (state <> 'dead' OR last_error IS NOT NULL)
);

-- The worker's claim query: pending, due, oldest first.
CREATE INDEX outbox_due_idx
  ON outbox_messages (next_attempt_at)
  WHERE state = 'pending';

-- The dead-letter review queue.
CREATE INDEX outbox_dead_idx
  ON outbox_messages (updated_at DESC)
  WHERE state = 'dead';

ALTER TABLE outbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON outbox_messages
  USING (organization_id = app_current_organization() OR app_is_system_context())
  WITH CHECK (organization_id = app_current_organization() OR app_is_system_context());

-- ---------------------------------------------------------------------------
-- Marketing consent register (CNV-004, SEC-012)
-- ---------------------------------------------------------------------------
-- ADR-0006 decision 5: "consent is a precondition, not a filter applied later.
-- The CRM adapter refuses to send marketing-scope data without a valid consent
-- record, and consent withdrawal produces an outbound event."
--
-- This is that record. It is append-only in spirit — a withdrawal is a new row,
-- not an edit — so the question "what had they consented to on this date?" has
-- an answer, which is what makes a consent claim defensible rather than merely
-- asserted.
CREATE TABLE marketing_consents (
  id               uuid PRIMARY KEY,
  organization_id  uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id          uuid REFERENCES users (id) ON DELETE SET NULL,
  -- The address the consent was given for. Held because consent attaches to a
  -- contactable address, not to an account: a person may leave the organization
  -- while their consent record must remain answerable.
  email            text NOT NULL,
  granted          boolean NOT NULL,
  -- Where the decision was made, so a person asking "when did I agree to this?"
  -- can be given a real answer rather than a date.
  source           text NOT NULL CHECK (source IN ('sign_up', 'qualifier', 'account_settings', 'support_request')),
  decided_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX marketing_consents_email_idx ON marketing_consents (lower(email), decided_at DESC);
CREATE INDEX marketing_consents_org_idx ON marketing_consents (organization_id, decided_at DESC);

ALTER TABLE marketing_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_consents FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON marketing_consents
  USING (organization_id = app_current_organization() OR app_is_system_context())
  WITH CHECK (organization_id = app_current_organization() OR app_is_system_context());

-- A consent record must not be rewritten. Withdrawing is a new row with
-- `granted = false`; editing the old one would destroy the answer to "what did
-- they agree to, and when?".
CREATE OR REPLACE FUNCTION marketing_consents_append_only() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'marketing_consents is append-only; record a withdrawal as a new row (CNV-004)';
END
$$;

CREATE TRIGGER marketing_consents_no_update
  BEFORE UPDATE ON marketing_consents
  FOR EACH ROW EXECUTE FUNCTION marketing_consents_append_only();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON outbox_messages TO northstar_app;
GRANT SELECT, INSERT ON marketing_consents TO northstar_app;
-- No UPDATE grant, matching the trigger. DELETE stays, because a tenant
-- deletion request (SEC-013) must be able to remove the rows.
GRANT DELETE ON marketing_consents TO northstar_app;
