/**
 * WATCHDOG (PRD §46) — the gate in front of an immutable record.
 *
 * Every other guard in this codebase can be corrected later. This one cannot:
 * `price_observations` is append-only by design, enforced by database
 * triggers, so an observation that gets through here is part of the product's
 * memory forever. A single bogus $0.01 row becomes a permanent "recorded low"
 * that every future Value Index is measured against.
 *
 * So screening happens BEFORE the insert, and the bar is deliberately
 * conservative. Three outcomes:
 *
 *   ACCEPT      — record it
 *   REJECT      — never record it; something is definitely wrong
 *   QUARANTINE  — might be real, might be a feed glitch. Hold it until a
 *                 second independent observation agrees.
 *
 * QUARANTINE is the interesting one. A genuine 85% crash and a broken feed
 * look identical in a single row, and we would rather be a day late than
 * permanently wrong. Two independent sightings of the same extraordinary
 * price is evidence; one is a rumour.
 */
import type { PriceObservation } from '@/domain/price-history';

/** A one-step fall this deep is extraordinary and must be confirmed. */
export const SUSPICIOUS_DROP_FRACTION = 0.8;

/** A one-step rise this large is extraordinary and must be confirmed. */
export const SUSPICIOUS_RISE_FACTOR = 5;

/** Two sightings that agree within this are "the same price". */
export const CONFIRMATION_TOLERANCE = 0.02;

export interface Candidate {
  priceCents: number;
  inStock: boolean;
  observedAt: string;
  /** Which source produced it — confirmation must come from a second one. */
  sourceId: string;
}

export type Verdict =
  | { decision: 'ACCEPT' }
  | { decision: 'REJECT'; reason: string }
  | { decision: 'QUARANTINE'; reason: string };

/**
 * Decides whether a candidate may enter the permanent record.
 *
 * `history` is that offer's existing observations, in any order.
 */
export function screenObservation(input: {
  candidate: Candidate;
  history: readonly PriceObservation[];
  now: Date;
}): Verdict {
  const { candidate, history, now } = input;

  if (!Number.isInteger(candidate.priceCents) || candidate.priceCents <= 0) {
    return { decision: 'REJECT', reason: 'price is not a positive integer number of cents' };
  }

  const at = new Date(candidate.observedAt).getTime();
  if (Number.isNaN(at)) return { decision: 'REJECT', reason: 'timestamp could not be read' };
  if (at > now.getTime() + 10 * 60_000) {
    return { decision: 'REJECT', reason: 'timestamp is in the future' };
  }

  if (history.length === 0) {
    // Nothing to compare against. A first sighting cannot be extraordinary.
    return { decision: 'ACCEPT' };
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
  );
  const newest = sorted[sorted.length - 1] as PriceObservation;
  const newestAt = new Date(newest.observedAt).getTime();

  // Exact duplicate timestamp: a re-run of the same feed. Idempotent, not an
  // error, but it must not double-count.
  if (at === newestAt) {
    return { decision: 'REJECT', reason: 'an observation already exists at this timestamp' };
  }

  /**
   * Out-of-order arrivals are refused rather than appended.
   *
   * Edge detection in the signal engine reads "the latest two observations".
   * Inserting a point behind the newest silently changes what that pair is,
   * so a late-arriving backfill row could manufacture or erase a signal.
   */
  if (at < newestAt) {
    return { decision: 'REJECT', reason: 'observation is older than the newest already recorded' };
  }

  if (newest.priceCents > 0) {
    const drop = (newest.priceCents - candidate.priceCents) / newest.priceCents;
    if (drop >= SUSPICIOUS_DROP_FRACTION) {
      return {
        decision: 'QUARANTINE',
        reason: `price fell ${Math.round(drop * 100)}% in one step; holding for confirmation`,
      };
    }
    if (candidate.priceCents / newest.priceCents >= SUSPICIOUS_RISE_FACTOR) {
      return {
        decision: 'QUARANTINE',
        reason: `price rose ${(candidate.priceCents / newest.priceCents).toFixed(1)}x in one step; holding for confirmation`,
      };
    }
  }

  return { decision: 'ACCEPT' };
}

/**
 * Whether a held observation has been corroborated.
 *
 * Confirmation must come from a DIFFERENT source. Re-reading the same broken
 * feed twice is not evidence — it reproduces the same error, which is exactly
 * what a naive "seen twice" rule would accept.
 */
export function isConfirmed(held: Candidate, later: readonly Candidate[]): boolean {
  return later.some((other) => {
    if (other.sourceId === held.sourceId) return false;
    if (held.priceCents <= 0) return false;
    const gap = Math.abs(other.priceCents - held.priceCents) / held.priceCents;
    return gap <= CONFIRMATION_TOLERANCE;
  });
}
