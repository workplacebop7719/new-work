import type { Deal } from '@/domain/types';

/**
 * BUY / HOLD™ (PRD §18).
 *
 * No traffic lights. The system has pink, black and white, so emphasis is
 * carried by fill and weight: a positive call is set solid black-on-pink, a
 * cautious call is outlined. A HOLD must never look like a failure state —
 * it is one of the two answers the product exists to give.
 */
const SOLID: ReadonlySet<string> = new Set(['STRONG_BUY', 'BUY', 'GOOD_VALUE']);

export function RecommendationMark({ deal, className = '' }: { deal: Deal; className?: string }) {
  const { recommendation, label } = deal.recommendation;
  const solid = SOLID.has(recommendation);

  return (
    <span
      className={[
        'eyebrow inline-flex items-center px-2.5 py-1.5',
        solid ? 'on-pink' : 'border border-ink text-ink',
        className,
      ].join(' ')}
    >
      {label}
    </span>
  );
}

/** The one-line explanation that always accompanies the mark. */
export function RecommendationLine({ deal }: { deal: Deal }) {
  return (
    <p className="text-[0.9375rem] leading-relaxed text-ink">
      {deal.recommendation.line}
      {deal.recommendation.moderatedByConfidence && (
        <span className="text-ink-70"> We’ve held this back a step — the evidence is thinner than we’d like.</span>
      )}
    </p>
  );
}
