import type { RetailerVerdict } from '@/domain/retailer-profile';

/**
 * The verdict on a named business (PRD §43, §45).
 *
 * Same visual grammar as BUY / HOLD: solid fill for the positive call,
 * outline for a cautious one, muted for "we are not saying". No red, no
 * warning triangle — calling a retailer's discounts shallow is a finding
 * from our own record, not an accusation, and it should not be dressed as
 * one.
 *
 * NOT_ENOUGH_EVIDENCE renders quietly rather than not at all. The absence of
 * a verdict is itself information the reader is owed (§01).
 */
const LABEL: Record<RetailerVerdict, string> = {
  GENUINE_DISCOUNTS: 'Discounts hold up',
  MIXED: 'Mixed record',
  SHALLOW_DISCOUNTS: 'Shallow discounts',
  NOT_ENOUGH_EVIDENCE: 'No verdict yet',
};

const STYLE: Record<RetailerVerdict, string> = {
  GENUINE_DISCOUNTS: 'on-pink',
  MIXED: 'border border-ink text-ink',
  SHALLOW_DISCOUNTS: 'border border-ink text-ink',
  NOT_ENOUGH_EVIDENCE: 'border border-line-strong text-ink-70',
};

export function RetailerVerdictMark({
  verdict,
  className = '',
}: {
  verdict: RetailerVerdict;
  className?: string;
}) {
  return (
    <span className={['eyebrow inline-flex items-center px-2.5 py-1.5', STYLE[verdict], className].join(' ')}>
      {LABEL[verdict]}
    </span>
  );
}

export { LABEL as RETAILER_VERDICT_LABEL };
