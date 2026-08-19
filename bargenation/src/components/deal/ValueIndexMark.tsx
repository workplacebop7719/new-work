import type { Deal } from '@/domain/types';

/**
 * VALUE INDEX™ presentation (PRD §17).
 *
 * Explicitly NOT a gauge, star rating, dial or KPI tile. The Index is set as
 * editorial type: a large didone numeral, a hairline, and the band in small
 * caps. The only graphic is a range bar showing where today's price sits in
 * the history WE recorded — which is the actual argument, not decoration.
 *
 * When the Index is withheld this renders the reason instead of a number.
 * That path is not an error state; it is the product working correctly.
 */
export function ValueIndexMark({ deal, size = 'md' }: { deal: Deal; size?: 'sm' | 'md' | 'lg' }) {
  const numeral =
    size === 'lg' ? 'text-[clamp(4rem,10vw,7.5rem)]' : size === 'md' ? 'text-[3.25rem]' : 'text-[2rem]';

  if (!deal.publishable || !deal.index.scorable) {
    return (
      <div>
        <p className="eyebrow text-ink-50">Value Index</p>
        <p className={`display ${size === 'lg' ? 'text-[3rem]' : 'text-[2rem]'} mt-2 text-ink-50`}>
          Not yet
        </p>
        <p className="mt-2 max-w-[30ch] text-[0.8125rem] leading-snug text-ink-70">
          {deal.withheldReason}
        </p>
      </div>
    );
  }

  const { score, label } = deal.index;

  return (
    <div>
      <p className="eyebrow text-ink-50">Value Index</p>
      <p className={`numeral ${numeral} mt-1 leading-[0.85] text-ink`}>
        {score.toFixed(1)}
        <span className="ml-1 align-top text-[0.32em] text-ink-50">/10</span>
      </p>
      <p className="eyebrow mt-3 text-ink">{label}</p>
      {size !== 'sm' && <RangeBar deal={deal} />}
    </div>
  );
}

/**
 * Where today's price sits between the lowest and highest price we have
 * recorded. The tick is the argument; there is no axis furniture.
 */
function RangeBar({ deal }: { deal: Deal }) {
  const h = deal.history;
  if (!h || h.highCents === h.lowCents) return null;

  const pos = Math.max(
    0,
    Math.min(1, (deal.offer.priceCents - h.lowCents) / (h.highCents - h.lowCents)),
  );

  return (
    <div className="mt-6 max-w-[22rem]">
      <div className="relative h-px w-full bg-line-strong">
        <span
          className="absolute -top-[5px] block h-[11px] w-[3px] bg-ink"
          style={{ left: `${pos * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 flex justify-between text-[0.6875rem] text-ink-50 tabular">
        <span>${(h.lowCents / 100).toFixed(2)} recorded low</span>
        <span>${(h.highCents / 100).toFixed(2)} high</span>
      </div>
      <p className="sr-only">
        Today’s price sits {Math.round(pos * 100)} percent of the way between the lowest and
        highest price we have recorded across {h.observationCount} observations.
      </p>
    </div>
  );
}
