-- ============================================================
-- 0017 — WHEN A SIGNAL MAY LEAVE THE BUILDING
--
-- Quiet hours DEFER delivery. They never suppress a signal.
--
-- What happened to a price is a fact about the world, and the record of it
-- must not depend on when somebody sleeps: a price that crossed a target at
-- three in the morning crossed it at three in the morning, and the portal
-- should say so. So the sweep still evaluates, still records, and the customer
-- still sees it. `deliver_after` is the moment it becomes sendable.
--
-- Null means "now" — no quiet hours set, or the signal arrived outside them.
-- The ordinary case costs nothing.
-- ============================================================

alter table deal_signals
  add column deliver_after timestamptz;

comment on column deal_signals.deliver_after is
  'Quiet hours defer delivery; they never suppress the signal (§36). Null = sendable now.';

-- The delivery job, when it exists, asks "what is sendable and unsent".
create index deal_signals_sendable_idx
  on deal_signals (deliver_after)
  where delivered_at is null;
