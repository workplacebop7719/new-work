-- 0002_qualifier_sessions
--
-- CNV-001: save-and-resume without mandatory account creation, with abandoned
-- data on a short retention schedule.
--
-- Rollback and roll-forward notes: 0002_qualifier_sessions.notes.md (ENG-006).

-- global: a qualifier session exists before any organization does — that is the
-- point of CNV-001 ("without mandatory account creation at question one").
-- It therefore has no tenant to belong to. Access is by unguessable resume
-- token only; there is no listing endpoint and no cross-session query.
CREATE TABLE qualifier_sessions (
  id                  uuid PRIMARY KEY,

  -- The raw token lives only in the visitor's cookie and, with explicit consent,
  -- in one emailed link. Storing the hash means a database disclosure does not
  -- hand over working resume links.
  resume_token_hash   text NOT NULL UNIQUE,

  locale              text NOT NULL CHECK (locale IN ('en', 'fr')),
  answers             jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Result is stored with the rule version that produced it, so a recommendation
  -- can be reproduced exactly months later (CNV-002).
  result_category     text CHECK (result_category IN
                        ('likely_self_serve', 'assessment_fit', 'specialist_fit', 'uncertain')),
  rule_version        text,

  -- PUB-006 / SEC-012: analytics consent is a recorded decision with a timestamp.
  -- An absent decision is not consent, which is why both columns are nullable and
  -- checked together rather than defaulting to false.
  consent_analytics   boolean,
  consent_decided_at  timestamptz,

  -- Collected only when the visitor asks for a resume link, and only with the
  -- separate service-communication consent that CNV-001 requires.
  contact_email       text,
  contact_consent_at  timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,

  CONSTRAINT consent_recorded_together
    CHECK ((consent_analytics IS NULL) = (consent_decided_at IS NULL)),
  CONSTRAINT contact_email_requires_consent
    CHECK ((contact_email IS NULL) = (contact_consent_at IS NULL))
);

-- Supports the retention sweep without a sequential scan.
CREATE INDEX qualifier_sessions_retention_idx
  ON qualifier_sessions (completed_at NULLS FIRST, updated_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON qualifier_sessions TO northstar_app;
