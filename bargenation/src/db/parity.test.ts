/**
 * Adapter parity.
 *
 * The claim in the README is that both data paths feed the same engine and a
 * surface cannot tell them apart. This is the test that keeps that claim
 * honest — it scores the identical fixture set through the in-memory adapter
 * and through PostgreSQL and compares the results.
 *
 * Needs TEST_DATABASE_URL pointing at a migrated, seeded database.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fixtureRepository } from '@/data/fixture-repository';
import type { Deal } from '@/domain/types';

const live = Boolean(process.env.TEST_DATABASE_URL);
const d = live ? describe : describe.skip;

d('fixture and postgres adapters agree', () => {
  let pgDeals: Map<string, Deal>;
  let memDeals: Map<string, Deal>;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const { postgresRepository } = await import('@/data/postgres-repository');
    const [fromPg, fromMem] = await Promise.all([
      postgresRepository.getDeals(),
      fixtureRepository.getDeals(),
    ]);
    // Scope to sample-data rows. Parity is a claim about the FIXTURE dataset,
    // and the schema suite writes its own catalog rows into the same database;
    // those are not part of what is being compared.
    pgDeals = new Map(
      fromPg
        .filter((x) => x.offer.dataMode === 'FIXTURE')
        .map((x) => [x.offer.product.slug, x]),
    );
    memDeals = new Map(fromMem.map((x) => [x.offer.product.slug, x]));
  });

  afterAll(async () => {
    const { getPool } = await import('@/db/client');
    await getPool().end();
  });

  it('loads the same set of products', () => {
    expect([...pgDeals.keys()].sort()).toEqual([...memDeals.keys()].sort());
  });

  it('reads identical prices and observation counts', () => {
    for (const [slug, mem] of memDeals) {
      const pg = pgDeals.get(slug)!;
      expect(pg.offer.priceCents, slug).toBe(mem.offer.priceCents);
      expect(pg.offer.observations.length, slug).toBe(mem.offer.observations.length);
    }
  });

  /**
   * The components derived purely from our own recorded history must match
   * exactly. These are the ones the product's central claim rests on.
   */
  it('derives identical history-based components', () => {
    const historyDerived = [
      'discountStrength', 'historicalPriceQuality', 'promotionRarity', 'inventoryBreadth',
    ];

    for (const [slug, mem] of memDeals) {
      const pg = pgDeals.get(slug)!;
      if (!mem.index.scorable || !pg.index.scorable) {
        expect(mem.index.scorable, slug).toBe(pg.index.scorable);
        continue;
      }
      const memBy = new Map(mem.index.contributions.map((c) => [c.key, c.value]));
      const pgBy = new Map(pg.index.contributions.map((c) => [c.key, c.value]));

      for (const key of historyDerived) {
        const a = memBy.get(key as never);
        const b = pgBy.get(key as never);
        // A component excluded in both is agreement, not a gap: thin history
        // (meridian-duvet) is legitimately unmeasurable on either path.
        if (a === undefined || b === undefined) {
          expect(b === undefined, `${slug}.${key} excluded on only one adapter`)
            .toBe(a === undefined);
          continue;
        }
        expect(b, `${slug}.${key}`).toBeCloseTo(a, 10);
      }
    }
  });

  it('withholds the same offers for the same reason', () => {
    for (const [slug, mem] of memDeals) {
      const pg = pgDeals.get(slug)!;
      expect(pg.publishable, slug).toBe(mem.publishable);
      if (!mem.publishable) expect(pg.withheldReason, slug).toBe(mem.withheldReason);
    }
  });

  /**
   * A KNOWN, DELIBERATE DIVERGENCE.
   *
   * Market Competitiveness is the one component the two adapters compute from
   * different evidence. The fixture carries a hardcoded list of competitor
   * prices as a shortcut; the database derives it properly, from other
   * retailers' live offers on the same product — and the seeded set has one
   * offer per product, so there is nothing to compare against.
   *
   * The database model is the correct one. This test pins the divergence so
   * it stays visible and cannot be mistaken for parity, and it should be
   * deleted once fixtures carry multiple offers per product.
   */
  it('diverges only on market competitiveness, for a documented reason', () => {
    for (const [slug, pg] of pgDeals) {
      expect(pg.offer.competitorPriceCents, slug).toEqual([]);
      if (pg.index.scorable) {
        expect(
          pg.index.excluded.includes('marketCompetitiveness'),
          `${slug} should exclude marketCompetitiveness in postgres`,
        ).toBe(true);
      }
    }
  });
});
