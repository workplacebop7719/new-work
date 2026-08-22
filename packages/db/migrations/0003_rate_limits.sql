-- 0003_rate_limits
--
-- Q-27: the CC-02 qualifier exposes anonymous POST endpoints that write rows and
-- accept an email address, with no abuse control. This adds one.
--
-- Rollback and roll-forward notes: 0003_rate_limits.notes.md (ENG-006).

-- global: a rate-limit counter is keyed by a hashed client identifier and an
-- action name. It exists before — and independently of — any organization, and
-- deliberately holds nothing that identifies a person.
CREATE TABLE rate_limit_counters (
  -- HMAC of the client identifier with a server secret and the current UTC date
  -- (SEC-007 minimization): raw IP addresses are personal data and are never
  -- stored. The daily salt rotation means yesterday's counters cannot be
  -- correlated with today's, even by us.
  client_hash   text NOT NULL,
  action        text NOT NULL,
  -- Start of the fixed window this counter belongs to.
  window_start  timestamptz NOT NULL,
  count         integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (client_hash, action, window_start)
);

-- Supports the expiry sweep.
CREATE INDEX rate_limit_counters_window_idx ON rate_limit_counters (window_start);

GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limit_counters TO northstar_app;
