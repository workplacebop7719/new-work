-- 0001_foundation
--
-- CC-01 skeleton for the PRD §18 core entities, with tenant isolation enforced
-- at the database (ADR-0003) and an append-only audit log (SEC-006).
--
-- Rollback and roll-forward notes: 0001_foundation.notes.md (required by ENG-006).

-- ---------------------------------------------------------------------------
-- Application role
-- ---------------------------------------------------------------------------
-- The application connects as a role that CANNOT bypass row-level security.
-- Created here so that a fresh environment is isolated by default rather than
-- by a later infrastructure step that someone might skip.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'northstar_app') THEN
    CREATE ROLE northstar_app NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Tenant context
-- ---------------------------------------------------------------------------
-- Set per transaction with `SET LOCAL app.organization_id = '<uuid>'`.
-- `true` makes current_setting return NULL instead of raising when unset, so a
-- query issued without a tenant context returns zero rows rather than an error
-- the application might swallow.
CREATE OR REPLACE FUNCTION app_current_organization() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid $$;

-- `app.system_context = 'on'` is the audited escape hatch for jobs and internal
-- console read models. It is deliberately a session setting rather than a role
-- grant, so that using it is visible in the query itself.
CREATE OR REPLACE FUNCTION app_is_system_context() RETURNS boolean
  LANGUAGE sql STABLE
  AS $$ SELECT coalesce(current_setting('app.system_context', true), 'off') = 'on' $$;

-- ---------------------------------------------------------------------------
-- Global tables (no tenant owner)
-- ---------------------------------------------------------------------------

-- global: a user may hold memberships in several organizations, so users are
-- not tenant-owned. Tenant-scoped access to a user is mediated by memberships.
CREATE TABLE users (
  id                 uuid PRIMARY KEY,
  email              text NOT NULL UNIQUE,
  display_name       text NOT NULL,
  preferred_language text NOT NULL CHECK (preferred_language IN ('en', 'fr')),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- global: the requirements library is versioned source-backed content shared
-- across tenants (PRD §11 Requirements library, CNT-001).
CREATE TABLE regulatory_claims (
  id                uuid PRIMARY KEY,
  claim_key         text NOT NULL,
  version           integer NOT NULL CHECK (version > 0),
  jurisdiction      text NOT NULL,
  statement_en      text NOT NULL,
  statement_fr      text,
  source_url        text NOT NULL,
  source_title      text NOT NULL,
  effective_date    date NOT NULL,
  last_verified_at  date NOT NULL,
  next_review_at    date NOT NULL,
  reviewer_user_id  uuid REFERENCES users (id),
  second_reviewer_user_id uuid REFERENCES users (id),
  status            text NOT NULL CHECK (status IN ('draft', 'in_review', 'published', 'hold', 'retired')),
  UNIQUE (claim_key, version)
);

-- ---------------------------------------------------------------------------
-- Tenant-owned tables
-- ---------------------------------------------------------------------------

CREATE TABLE organizations (
  id                 uuid PRIMARY KEY,
  legal_name         text NOT NULL,
  organization_type  text NOT NULL,
  employee_band      text NOT NULL CHECK (employee_band IN ('under_20', '20_to_49', '50_to_199', '200_plus')),
  jurisdiction       text NOT NULL,
  preferred_language text NOT NULL CHECK (preferred_language IN ('en', 'fr')),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_websites (
  id              uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  url             text NOT NULL,
  label           text NOT NULL,
  is_public       boolean NOT NULL DEFAULT true
);

CREATE TABLE memberships (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN (
                    'client_admin', 'client_contributor', 'client_executive',
                    'contractor', 'internal_pm', 'qualified_reviewer', 'platform_admin')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE projects (
  id                        uuid PRIMARY KEY,
  organization_id           uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name                      text NOT NULL,
  state                     text NOT NULL CHECK (state IN ('draft', 'active', 'on_hold', 'closed')),
  authorized_signer_user_id uuid REFERENCES users (id),
  target_date               date,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE requirements (
  id                uuid PRIMARY KEY,
  organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  project_id        uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  claim_id          uuid NOT NULL REFERENCES regulatory_claims (id),
  claim_version     integer NOT NULL,
  applicability     text NOT NULL CHECK (applicability IN ('likely_applies', 'likely_does_not_apply', 'needs_review')),
  rationale         text NOT NULL DEFAULT '',
  owner_user_id     uuid REFERENCES users (id),
  reviewer_user_id  uuid REFERENCES users (id),
  reviewed_at       timestamptz,
  next_review_at    date
);

CREATE TABLE evidence (
  id              uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  version         integer NOT NULL CHECK (version > 0),
  classification  text NOT NULL,
  scan_state      text NOT NULL CHECK (scan_state IN ('quarantined', 'clean', 'infected', 'scan_failed')),
  -- Never rendered to a client (ENG-003); access is a per-request signed URL.
  storage_key     text NOT NULL,
  retention_until date,
  legal_hold      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE findings (
  id               uuid PRIMARY KEY,
  organization_id  uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  project_id       uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  severity         text NOT NULL CHECK (severity IN ('critical', 'serious', 'moderate', 'minor')),
  state            text NOT NULL CHECK (state IN ('open', 'in_remediation', 'awaiting_retest', 'closed', 'accepted_risk')),
  summary          text NOT NULL,
  requirement_id   uuid REFERENCES requirements (id),
  reviewer_user_id uuid REFERENCES users (id),
  released         boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE finding_evidence (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  finding_id      uuid NOT NULL REFERENCES findings (id) ON DELETE CASCADE,
  evidence_id     uuid NOT NULL REFERENCES evidence (id) ON DELETE CASCADE,
  PRIMARY KEY (finding_id, evidence_id)
);

CREATE TABLE assignments (
  id                 uuid PRIMARY KEY,
  organization_id    uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  project_id         uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  contractor_user_id uuid NOT NULL REFERENCES users (id),
  state              text NOT NULL CHECK (state IN ('drafted', 'offered', 'accepted', 'submitted', 'in_qa', 'accepted_final', 'closed')),
  -- CTR-004: access expires automatically at closure.
  access_expires_at  timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assignment_evidence (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  assignment_id   uuid NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  evidence_id     uuid NOT NULL REFERENCES evidence (id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, evidence_id)
);

CREATE TABLE deliverables (
  id                  uuid PRIMARY KEY,
  organization_id     uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  project_id          uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  version             integer NOT NULL CHECK (version > 0),
  state               text NOT NULL CHECK (state IN ('draft', 'in_review', 'approved', 'released')),
  author_user_id      uuid REFERENCES users (id),
  approved_by_user_id uuid REFERENCES users (id),
  high_risk           boolean NOT NULL DEFAULT false,
  released_at         timestamptz,
  -- OPS-011 / §10 quality rule: a release always has a named approver. Enforced
  -- here as well as in the domain so no code path can release anonymously.
  CONSTRAINT released_requires_approver
    CHECK (state <> 'released' OR approved_by_user_id IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- Audit log (SEC-006)
-- ---------------------------------------------------------------------------
CREATE TABLE audit_events (
  id              uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations (id),
  actor_id        uuid REFERENCES users (id),
  action          text NOT NULL,
  object_type     text NOT NULL,
  object_id       text,
  correlation_id  text NOT NULL,
  context         jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_org_time_idx ON audit_events (organization_id, occurred_at DESC);
CREATE INDEX audit_events_correlation_idx ON audit_events (correlation_id);

-- Append-only in the strong sense: even a compromised application role cannot
-- rewrite history, because the privilege is not granted and the trigger refuses.
CREATE OR REPLACE FUNCTION audit_events_immutable() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only (SEC-006)';
END
$$;

CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
-- FORCE applies the policy to the table owner too, so a migration or a
-- misconfigured connection cannot quietly read across tenants.
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations       FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_websites FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships         FORCE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            FORCE ROW LEVEL SECURITY;
ALTER TABLE requirements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements        FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence            ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence            FORCE ROW LEVEL SECURITY;
ALTER TABLE findings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings            FORCE ROW LEVEL SECURITY;
ALTER TABLE finding_evidence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_evidence    FORCE ROW LEVEL SECURITY;
ALTER TABLE assignments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments         FORCE ROW LEVEL SECURITY;
ALTER TABLE assignment_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE deliverables        ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables        FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events        FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON organizations
  USING (id = app_current_organization() OR app_is_system_context())
  WITH CHECK (id = app_current_organization() OR app_is_system_context());

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organization_websites', 'memberships', 'projects', 'requirements', 'evidence', 'findings',
    'finding_evidence', 'assignments', 'assignment_evidence', 'deliverables'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (organization_id = app_current_organization() OR app_is_system_context())
         WITH CHECK (organization_id = app_current_organization() OR app_is_system_context())', t);
  END LOOP;
END
$$;

-- Audit rows with no organization (failed sign-in against an unknown address)
-- are visible only under system context.
CREATE POLICY tenant_isolation ON audit_events
  USING (organization_id = app_current_organization() OR app_is_system_context())
  WITH CHECK (organization_id = app_current_organization() OR app_is_system_context());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO northstar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO northstar_app;
-- The audit log is append-only for the application role as well as by trigger.
REVOKE UPDATE, DELETE ON audit_events FROM northstar_app;
GRANT SELECT ON regulatory_claims TO northstar_app;
