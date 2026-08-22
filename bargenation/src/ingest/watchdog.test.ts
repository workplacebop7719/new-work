import { describe, it, expect } from 'vitest';
import {
  screenObservation, isConfirmed, SUSPICIOUS_DROP_FRACTION, SUSPICIOUS_RISE_FACTOR,
  type Candidate,
} from './watchdog';
import type { PriceObservation } from '@/domain/price-history';

const NOW = new Date('2026-08-22T12:00:00Z');
const ago = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

const history = (prices: number[]): PriceObservation[] =>
  prices.map((p, i) => ({
    priceCents: p,
    inStock: true,
    observedAt: ago(prices.length - i),
  }));

const candidate = (over: Partial<Candidate> = {}): Candidate => ({
  priceCents: 5000,
  inStock: true,
  observedAt: NOW.toISOString(),
  sourceId: 'feed-a',
  ...over,
});

const screen = (c: Candidate, h: PriceObservation[]) =>
  screenObservation({ candidate: c, history: h, now: NOW });

describe('ordinary movement is recorded', () => {
  it('accepts a first sighting, which cannot be extraordinary', () => {
    expect(screen(candidate(), []).decision).toBe('ACCEPT');
  });

  it('accepts an unchanged price', () => {
    expect(screen(candidate({ priceCents: 6000 }), history([6000, 6000])).decision).toBe('ACCEPT');
  });

  it('accepts a normal sale', () => {
    expect(screen(candidate({ priceCents: 4000 }), history([6000])).decision).toBe('ACCEPT');
  });

  it('accepts a normal rise', () => {
    expect(screen(candidate({ priceCents: 7000 }), history([6000])).decision).toBe('ACCEPT');
  });
});

describe('things that must never enter an append-only record', () => {
  it.each([
    ['zero', 0],
    ['negative', -100],
    ['fractional cents', 50.5],
  ])('rejects a %s price', (_label, price) => {
    const v = screen(candidate({ priceCents: price }), history([6000]));
    expect(v.decision).toBe('REJECT');
  });

  it('rejects a future timestamp', () => {
    const later = new Date(NOW.getTime() + 6 * 3_600_000).toISOString();
    const v = screen(candidate({ observedAt: later }), history([6000]));
    expect(v.decision).toBe('REJECT');
    if (v.decision === 'REJECT') expect(v.reason).toMatch(/future/i);
  });

  it('rejects an unreadable timestamp', () => {
    expect(screen(candidate({ observedAt: 'yesterday' }), history([6000])).decision).toBe('REJECT');
  });

  /** A re-run of the same feed must not double-count. */
  it('rejects a duplicate of the newest timestamp', () => {
    const h = history([6000]);
    const v = screen(candidate({ observedAt: h[0]!.observedAt }), h);
    expect(v.decision).toBe('REJECT');
    if (v.decision === 'REJECT') expect(v.reason).toMatch(/already exists/i);
  });

  /**
   * Edge detection reads "the latest two observations". A row inserted behind
   * the newest silently changes which pair that is, so a late backfill could
   * manufacture or erase a Deal Signal.
   */
  it('rejects an out-of-order arrival rather than appending behind the newest', () => {
    const v = screen(candidate({ observedAt: ago(10) }), history([6000, 6100]));
    expect(v.decision).toBe('REJECT');
    if (v.decision === 'REJECT') expect(v.reason).toMatch(/older than the newest/i);
  });
});

describe('extraordinary prices are held, not trusted and not discarded', () => {
  it('quarantines a collapse rather than recording a permanent false low', () => {
    // $60.00 -> $0.50
    const v = screen(candidate({ priceCents: 50 }), history([6000]));
    expect(v.decision).toBe('QUARANTINE');
    if (v.decision === 'QUARANTINE') expect(v.reason).toMatch(/fell \d+%/);
  });

  it('quarantines an implausible spike', () => {
    const v = screen(candidate({ priceCents: 60000 }), history([6000]));
    expect(v.decision).toBe('QUARANTINE');
    if (v.decision === 'QUARANTINE') expect(v.reason).toMatch(/rose/);
  });

  it('accepts a steep but believable discount just inside the threshold', () => {
    const justInside = Math.round(6000 * (1 - SUSPICIOUS_DROP_FRACTION) + 1);
    expect(screen(candidate({ priceCents: justInside }), history([6000])).decision).toBe('ACCEPT');
  });

  it('holds one just past the threshold', () => {
    const justPast = Math.round(6000 * (1 - SUSPICIOUS_DROP_FRACTION) - 1);
    expect(screen(candidate({ priceCents: justPast }), history([6000])).decision).toBe('QUARANTINE');
  });

  it('holds a rise exactly at the suspicious factor', () => {
    expect(screen(candidate({ priceCents: 6000 * SUSPICIOUS_RISE_FACTOR }), history([6000])).decision)
      .toBe('QUARANTINE');
  });
});

describe('confirmation has to be independent', () => {
  const held = candidate({ priceCents: 500, sourceId: 'feed-a' });

  /**
   * The load-bearing test. Re-reading the same broken feed reproduces the same
   * error; a naive "we saw it twice" rule would accept exactly the failure
   * this gate exists to catch.
   */
  it('does NOT accept the same source repeating itself', () => {
    expect(isConfirmed(held, [candidate({ priceCents: 500, sourceId: 'feed-a' })])).toBe(false);
  });

  it('accepts agreement from a different source', () => {
    expect(isConfirmed(held, [candidate({ priceCents: 500, sourceId: 'feed-b' })])).toBe(true);
  });

  it('tolerates a small difference between sources', () => {
    expect(isConfirmed(held, [candidate({ priceCents: 505, sourceId: 'feed-b' })])).toBe(true);
  });

  it('rejects a materially different second reading', () => {
    expect(isConfirmed(held, [candidate({ priceCents: 900, sourceId: 'feed-b' })])).toBe(false);
  });

  it('is not confirmed by nothing at all', () => {
    expect(isConfirmed(held, [])).toBe(false);
  });
});
