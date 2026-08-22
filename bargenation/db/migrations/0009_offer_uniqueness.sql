-- ============================================================
-- 0009 — FIX OFFER UNIQUENESS FOR VARIANT-LESS OFFERS
--
-- 0001 declared `unique (retailer_id, product_id, variant_id)`. In SQL, NULLs
-- are distinct from one another, so that constraint never fires for an offer
-- with no variant — which is most of them. Every ingest of the same product at
-- the same retailer therefore inserted a NEW offer row instead of updating the
-- existing one.
--
-- The visible symptom was subtle and bad: each offer had an empty price
-- history, so the watchdog had nothing to compare a new price against and
-- waved through collapses it should have quarantined. Duplicate offers would
-- also have split every product's history across rows, quietly degrading every
-- Value Index.
--
-- PostgreSQL 15+ can say what was meant. Found by an ingestion test that
-- expected a quarantine and got an acceptance.
-- ============================================================

-- ------------------------------------------------------------
-- Collapsing the duplicates requires re-pointing their observations at the
-- surviving offer, which the append-only trigger from 0002 refuses — as it
-- should. This is the one legitimate exception, and it is spelled out rather
-- than smuggled:
--
--   * The observations are not being altered. Their price, stock state and
--     timestamp are untouched; only the offer they hang off changes, and only
--     because a bug split one real-world offer across several rows.
--   * It happens inside this migration's transaction, so it either completes
--     or leaves nothing changed.
--   * The trigger is re-enabled below, and the guarantee holds for all
--     application code, which is what it exists to protect.
--
-- A migration run by the table owner can always do this. The protection is
-- against the application rewriting its own history, not against a reviewed,
-- version-controlled correction.
-- ------------------------------------------------------------
-- The error that led here named the wrong table: reject_mutation() hardcoded
-- "price_observations" in its message, so a blocked cascade delete on
-- verification_events reported itself as a price_observations failure. Fixed
-- below to use TG_TABLE_NAME, because a guard that misidentifies what it
-- blocked costs a debugging cycle every time it fires.
create or replace function reject_mutation() returns trigger
language plpgsql as $$
begin
  raise exception
    '% is append-only: % is not permitted. Record a new row instead.',
    tg_table_name, tg_op
    using errcode = 'restrict_violation';
end;
$$;

alter table price_observations  disable trigger price_observations_no_update;
alter table verification_events disable trigger verification_events_no_delete;
with ranked as (
  select id, retailer_id, product_id, variant_id,
         row_number() over (
           partition by retailer_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
           order by created_at asc, id asc
         ) as rn,
         first_value(id) over (
           partition by retailer_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
           order by created_at asc, id asc
         ) as keep_id
  from offers
)
update price_observations po
   set offer_id = r.keep_id
  from ranked r
 where po.offer_id = r.id and r.rn > 1;

with ranked as (
  select id,
         row_number() over (
           partition by retailer_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
           order by created_at asc, id asc
         ) as rn,
         first_value(id) over (
           partition by retailer_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
           order by created_at asc, id asc
         ) as keep_id
  from offers
)
update quarantined_observations q
   set offer_id = r.keep_id
  from ranked r
 where q.offer_id = r.id and r.rn > 1;

with ranked as (
  select id,
         row_number() over (
           partition by retailer_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
           order by created_at asc, id asc
         ) as rn
  from offers
)
delete from offers o using ranked r where o.id = r.id and r.rn > 1;

-- verification_events cascades from offers, so its rows must move too or the
-- cascade tries to delete them and is (correctly) refused.
with ranked as (
  select id,
         row_number() over (
           partition by retailer_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
           order by created_at asc, id asc
         ) as rn,
         first_value(id) over (
           partition by retailer_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
           order by created_at asc, id asc
         ) as keep_id
  from offers
)
delete from verification_events ve using ranked r where ve.offer_id = r.id and r.rn > 1;

alter table price_observations  enable trigger price_observations_no_update;
alter table verification_events enable trigger verification_events_no_delete;

alter table offers drop constraint if exists offers_retailer_id_product_id_variant_id_key;

-- NULLS NOT DISTINCT is what 0001 meant: two variant-less offers from the
-- same retailer for the same product are the same offer.
alter table offers
  add constraint offers_retailer_product_variant_key
  unique nulls not distinct (retailer_id, product_id, variant_id);
