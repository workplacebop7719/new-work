import type { PriceObservation } from '@/domain/price-history';

/**
 * PRICE HISTORY (PRD §24).
 *
 * Server-rendered inline SVG — no charting library, no client JavaScript.
 * Deliberately austere: one line, one marker for today, two reference rules
 * for the recorded low and typical price. No gridlines, no axis furniture,
 * no tooltips. The argument is "here is what we actually paid attention to",
 * and dashboard chrome would only get in its way.
 */
export function PriceHistoryChart({
  observations,
  currentCents,
  lowCents,
  typicalCents,
}: {
  observations: readonly PriceObservation[];
  currentCents: number;
  lowCents: number;
  typicalCents: number;
}) {
  if (observations.length < 2) return null;

  const W = 900;
  const H = 260;
  const padY = 24;

  const prices = observations.map((o) => o.priceCents);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const span = max - min || 1;

  const x = (i: number) => (i / (observations.length - 1)) * W;
  const y = (c: number) => padY + (1 - (c - min) / span) * (H - padY * 2);

  const line = observations.map((o, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(o.priceCents).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  const first = observations[0];
  const last = observations[observations.length - 1];
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <figure className="mt-8">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Price history across ${observations.length} recorded observations. Lowest recorded price $${(lowCents / 100).toFixed(2)}, typical price $${(typicalCents / 100).toFixed(2)}, today $${(currentCents / 100).toFixed(2)}.`}
      >
        <path d={area} fill="var(--color-pink)" opacity="0.16" />
        <path d={line} fill="none" stroke="var(--color-ink)" strokeWidth="1.5" />

        <line x1="0" y1={y(typicalCents)} x2={W} y2={y(typicalCents)}
              stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="2 4" opacity="0.45" />
        <line x1="0" y1={y(lowCents)} x2={W} y2={y(lowCents)}
              stroke="var(--color-ink)" strokeWidth="1" opacity="0.25" />

        <circle cx={W} cy={y(currentCents)} r="5" fill="var(--color-ink)" />
      </svg>

      <figcaption className="mt-3 flex flex-wrap justify-between gap-4 text-[0.75rem] text-ink-50">
        <span>{first ? fmt(first.observedAt) : ''}</span>
        <span className="tabular">
          Dashed line: typical ${(typicalCents / 100).toFixed(2)} · Solid: recorded low $
          {(lowCents / 100).toFixed(2)}
        </span>
        <span>{last ? fmt(last.observedAt) : ''}</span>
      </figcaption>
    </figure>
  );
}
