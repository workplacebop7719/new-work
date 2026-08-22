-- 0004_identity
--
-- CC-03a: sessions, second-factor state, sign-in throttling and invitations.
--
-- ADR-0002 keeps credentials, MFA secrets and recovery codes at the identity
-- provider. What this migration adds is the part the platform must own: the
-- link from a provider subject to a user row, the sessions the platform issues,
-- and the invitations that create memberships. No password, no TOTP seed and no
-- recovery code is stored in this database, which is why none of these tables
-- has a column for one.
--
-- Rollback and roll-forward notes: 0004_identity.notes.md (required by ENG-006).

-- ---------------------------------------------------------------------------
-- Users gain an identity link and a lifecycle
-- ---------------------------------------------------------------------------
-- The subject id is the provider's opaque handle. It is stored rather than
-- derived from the address because addresses change, and a change of address
-- must not silently become a change of account.
ALTER TABLE users ADD COLUMN identity_subject_id text UNIQUE;

-- Offboarding (SEC-013) disables the account platform-side first. The provider
-- is disabled too, but the platform must not depend on that call succeeding.
ALTER TABLE users ADD COLUMN status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'disabled'));

ALTER TABLE users ADD COLUMN disabled_at timestamptz;

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
-- global: a session belongs to a person, not to an organization. One session
-- serves every tenant that person is a member of, and the tenant is chosen per
-- request; storing organization_id here would make the session look scoped when
-- it is not, which is a worse lie than an honest global table.
CREATE TABLE auth_sessions (
  id               uuid PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Only the hash. A database dump must not yield working session cookies, and
  -- support staff reading this table must not be able to impersonate anyone.
  token_hash       text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  -- Null until the second factor is satisfied. A row in this state can do
  -- nothing except complete the challenge (SEC-002).
  mfa_satisfied_at timestamptz,
  revoked_at       timestamptz,
  revoked_reason   text CHECK (revoked_reason IN (
                     'signed_out', 'signed_out_everywhere', 'membership_revoked',
                     'password_changed', 'recovery_used', 'account_disabled')),
  -- A daily-rotating HMAC of the client address, not the address. Enough to
  -- show "signed in from a different place" without holding an IP (SEC-011).
  client_hash      text,
  user_agent_family text
);

CREATE INDEX auth_sessions_user_idx ON auth_sessions (user_id, created_at DESC);
-- Retention sweeps by expiry, so the index is on the clock the sweep uses.
CREATE INDEX auth_sessions_last_seen_idx ON auth_sessions (last_seen_at);

-- ---------------------------------------------------------------------------
-- Second-factor state
-- ---------------------------------------------------------------------------
-- This table mirrors *which* methods exist so the account screen can render
-- without a provider round trip. The secrets themselves stay with the provider;
-- there is deliberately no column that could hold one.
--
-- global: enrolment is a property of a person's account, not of a tenant. A
-- person who administers two organizations enrols once.
CREATE TABLE user_mfa_factors (
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  method      text NOT NULL CHECK (method IN ('totp', 'passkey')),
  label       text NOT NULL DEFAULT '',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  PRIMARY KEY (user_id, method)
);

-- Recovery codes are issued by the provider and shown once. What is recorded
-- here is only that a set exists and when — so the account screen can say
-- "issued 3 August" and prompt a reissue after one is spent.
ALTER TABLE users ADD COLUMN recovery_codes_issued_at timestamptz;

-- ---------------------------------------------------------------------------
-- Sign-in throttling
-- ---------------------------------------------------------------------------
-- global: the key is a hash of the address being attempted, which may not
-- correspond to any user and certainly does not correspond to a tenant.
--
-- The response to credential stuffing is a timed lockout, never a puzzle:
-- ACC-005 and PRD §27 rule out an inaccessible barrier as an abuse control.
CREATE TABLE sign_in_throttle (
  subject_key      text PRIMARY KEY,
  failed_attempts  integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  last_failure_at  timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sign_in_throttle_updated_idx ON sign_in_throttle (updated_at);

-- ---------------------------------------------------------------------------
-- Invitations (CLP-013)
-- ---------------------------------------------------------------------------
CREATE TABLE invitations (
  id               uuid PRIMARY KEY,
  organization_id  uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  -- The address is held because the invitation is addressed to it and because
  -- the acceptance path must refuse a different one. It is deleted with the
  -- invitation, which retention sweeps once the invitation is spent or stale.
  email            text NOT NULL,
  role             text NOT NULL CHECK (role IN ('client_admin', 'client_contributor', 'client_executive')),
  invited_by_user_id uuid REFERENCES users (id),
  -- Hash only, as for sessions: the emailed token is the credential.
  token_hash       text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz,
  accepted_user_id uuid REFERENCES users (id),
  revoked_at       timestamptz,
  revoked_by_user_id uuid REFERENCES users (id),
  -- An invitation is single-use. Accepting one twice would create a second
  -- membership row, or worse, re-grant a role an administrator has since
  -- removed. The database refuses rather than trusting the application to.
  CONSTRAINT accepted_requires_user CHECK (accepted_at IS NULL OR accepted_user_id IS NOT NULL),
  CONSTRAINT not_both_accepted_and_revoked CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);

CREATE INDEX invitations_org_idx ON invitations (organization_id, created_at DESC);
-- Only one live invitation per address per organization. Re-inviting revokes
-- the previous one instead of accumulating tokens that all still work.
CREATE UNIQUE INDEX invitations_one_pending_per_email
  ON invitations (organization_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- The role a client administrator may name is constrained in the domain
-- (`invitableRoles`) and in the policy layer. The CHECK above is the third
-- layer: no code path, including a future one, can write `platform_admin` here.

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON invitations
  USING (organization_id = app_current_organization() OR app_is_system_context())
  WITH CHECK (organization_id = app_current_organization() OR app_is_system_context());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_sessions TO northstar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_mfa_factors TO northstar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON sign_in_throttle TO northstar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO northstar_app;
