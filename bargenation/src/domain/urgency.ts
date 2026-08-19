/**
 * URGENCY — a third, independent signal (PRD §16: "Urgency must NOT
 * artificially increase Value Index").
 *
 * Kept in its own module with its own type so it is structurally impossible
 * to pass an urgency value into computeValueIndex(): the Index accepts only
 * ValueComponents, and UrgencyResult is not assignable to it.
 *
 * Urgency describes TIME, never worth. A low-value deal can be urgent; that
 * combination must read as "expiring, still not worth it".
 */

export type UrgencyLevel = 'NONE' | 'EASING' | 'CLOSING' | 'ENDING';

export interface UrgencyEvidence {
  /** whole days until the offer is known to end; null when unknown */
  daysUntilOfferEnds: number | null;
  /** whether stock is known to be limited; null when unknown */
  limitedStock: boolean | null;
  /** a customer-set deadline on a Watchlist item, in whole days */
  daysUntilCustomerDeadline: number | null;
}

export interface UrgencyResult {
  level: UrgencyLevel;
  /** plain statement of the time fact, or null when we know nothing */
  note: string | null;
}

/**
 * Never invents a deadline. Unknown end date + unknown stock = NONE, and the
 * UI shows no timing pressure at all rather than manufacturing some (§52).
 */
export function computeUrgency(e: UrgencyEvidence): UrgencyResult {
  const days = e.daysUntilOfferEnds;

  if (e.daysUntilCustomerDeadline !== null && e.daysUntilCustomerDeadline <= 3) {
    return { level: 'CLOSING', note: 'Your deadline for this is close.' };
  }
  if (days !== null) {
    if (days <= 1) return { level: 'ENDING', note: 'This offer ends today.' };
    if (days <= 3) return { level: 'CLOSING', note: `This offer ends in ${days} days.` };
    if (days <= 7) return { level: 'EASING', note: `This offer runs for another ${days} days.` };
    return { level: 'NONE', note: null };
  }
  if (e.limitedStock === true) {
    return { level: 'CLOSING', note: 'The retailer lists limited stock.' };
  }
  return { level: 'NONE', note: null };
}
