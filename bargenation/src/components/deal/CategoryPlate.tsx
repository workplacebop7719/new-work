import type { CategorySlug } from '@/domain/types';

/**
 * Stands in for product photography.
 *
 * We have no photograph of a fictional product, and attaching stock imagery
 * to an invented retailer and an invented price would be a small lie in
 * service of a prettier card (§45, §73). So the plate is honest: hairline
 * geometry and one piece of type.
 *
 * PAPER FIRST. An earlier version used a pink ground on every plate and a
 * grid of cards became a wall of pink — the exact "amateur bubblegum" failure
 * §07 guards against. Pink is now a single accent mark per plate, and only
 * one category in four carries a pink ground at all, so a grid breathes.
 */
type Glyph = 'arc' | 'rule' | 'grid' | 'bar';

const MARKS: Record<CategorySlug, { ground: 'paper' | 'pink'; glyph: Glyph }> = {
  kids:      { ground: 'paper', glyph: 'arc' },
  baby:      { ground: 'paper', glyph: 'rule' },
  school:    { ground: 'paper', glyph: 'grid' },
  shoes:     { ground: 'pink',  glyph: 'bar' },
  home:      { ground: 'paper', glyph: 'arc' },
  groceries: { ground: 'paper', glyph: 'rule' },
  toys:      { ground: 'paper', glyph: 'grid' },
  seasonal:  { ground: 'paper', glyph: 'bar' },
};

export function CategoryPlate({
  category,
  label,
  className = '',
}: {
  category: CategorySlug;
  label: string;
  className?: string;
}) {
  const mark = MARKS[category];
  const onPink = mark.ground === 'pink';

  return (
    <div
      className={`relative flex aspect-[4/3] items-end overflow-hidden border border-line ${
        onPink ? 'bg-pink text-ink' : 'bg-wash text-ink'
      } ${className}`}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 300"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {mark.glyph === 'arc' && (
          <circle cx="298" cy="86" r="112" stroke="currentColor" strokeWidth="1" opacity="0.22" />
        )}
        {mark.glyph === 'rule' && (
          <g stroke="currentColor" strokeWidth="1" opacity="0.2">
            <line x1="0" y1="92" x2="400" y2="92" />
            <line x1="0" y1="108" x2="400" y2="108" />
            <line x1="0" y1="124" x2="400" y2="124" />
          </g>
        )}
        {mark.glyph === 'grid' && (
          <g stroke="currentColor" strokeWidth="1" opacity="0.18">
            {[80, 160, 240, 320].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="300" />)}
            <line x1="0" y1="150" x2="400" y2="150" />
          </g>
        )}
        {mark.glyph === 'bar' && (
          <rect x="262" y="0" width="138" height="300" fill="currentColor" opacity="0.12" />
        )}

        {/* the single pink accent on a paper plate */}
        {!onPink && <rect x="0" y="0" width="10" height="64" fill="var(--color-pink)" />}
      </svg>

      <p className="display relative px-5 pb-4 text-[1.625rem] leading-none opacity-55">{label}</p>
    </div>
  );
}
