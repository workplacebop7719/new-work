/**
 * Not an assertion of specific scores — a guard that the fixture set still
 * exercises every path the UI has to render, including the withheld one.
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { FIXTURE_OFFERS, FIXTURE_NOW } from './fixtures';
import { scoreOffer } from '@/domain/score-offer';

describe('fixture spread', () => {
  const deals = FIXTURE_OFFERS.map((o) => scoreOffer(o, FIXTURE_NOW));

  it('prints the computed table', () => {
    const rows = deals.map((d) => {
      const idx = d.publishable && d.index.scorable ? d.index.score.toFixed(1) : '  — ';
      const band = d.publishable && d.index.scorable ? d.index.band : 'WITHHELD';
      return `${d.offer.product.name.padEnd(32).slice(0, 32)} $${(d.offer.priceCents / 100).toFixed(2).padStart(7)}  idx ${idx.padStart(4)}  ${band.padEnd(11)} conf ${d.confidence.level.padEnd(8)} → ${d.recommendation.recommendation}`;
    });
    writeFileSync('/tmp/spread.txt', rows.join('\n'));
    expect(rows.length).toBe(FIXTURE_OFFERS.length);
  });

  it('produces at least one withheld offer so the honest path ships', () => {
    expect(deals.some((d) => !d.publishable)).toBe(true);
  });

  it('produces at least one HOLD or SKIP so we are not just cheerleading', () => {
    expect(deals.some((d) => ['HOLD', 'SKIP'].includes(d.recommendation.recommendation))).toBe(true);
  });

  it('never renders a score for a withheld offer', () => {
    for (const d of deals) if (!d.publishable) expect(d.withheldReason).toBeTruthy();
  });
});
