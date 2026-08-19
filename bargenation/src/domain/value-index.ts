/**
 * VALUE INDEX™ — the deterministic core of BARGENATION (PRD §16).
 *
 * Rules this module exists to guarantee:
 *
 *  1. The number is arithmetic. Nothing here calls a model, a network or a
 *     clock. Same inputs, same output, forever. AI may write prose *around*
 *     a score; AI never produces the score.
 *  2. A component that cannot be measured is EXCLUDED and the remaining
 *     weights are renormalised. Missing evidence must never inflate a score
 *     — it reduces Confidence instead, which is computed separately.
 *  3. Urgency is not an input. Time pressure cannot buy a better Index.
 *     `WEIGHTS` is asserted in tests to contain exactly the eight PRD
 *     components and nothing else.
 *  4. Affiliate economics are not an input. There is deliberately no
 *     parameter here through which commission could reach the number.
 */

/** The eight PRD §16 components, each normalised to 0..1 by the caller. */
export const WEIGHTS = {
  discountStrength: 0.24,
  historicalPriceQuality: 0.22,
  promotionRarity: 0.16,
  marketCompetitiveness: 0.14,
  shopperRelevance: 0.1,
  stackability: 0.07,
  seasonality: 0.04,
  inventoryBreadth: 0.03,
} as const;

export type ComponentKey = keyof typeof WEIGHTS;

/** `null` means "we could not measure this", NOT "this scored zero". */
export type ValueComponents = Record<ComponentKey, number | null>;

export const BANDS = [
  { min: 9.0, band: 'EXCEPTIONAL' },
  { min: 8.0, band: 'STRONG_BUY' },
  { min: 7.0, band: 'GOOD_VALUE' },
  { min: 6.0, band: 'CONSIDER' },
  { min: 4.0, band: 'HOLD' },
  { min: 0.0, band: 'SKIP' },
] as const;

export type ValueBand = (typeof BANDS)[number]['band'];

export const BAND_LABEL: Record<ValueBand, string> = {
  EXCEPTIONAL: 'Exceptional',
  STRONG_BUY: 'Strong Buy',
  GOOD_VALUE: 'Good Value',
  CONSIDER: 'Consider',
  HOLD: 'Hold',
  SKIP: 'Skip',
};

export interface Contribution {
  key: ComponentKey;
  /** normalised 0..1 input */
  value: number;
  /** weight after renormalisation for missing components */
  effectiveWeight: number;
  /** points this component added to the 0..10 score */
  points: number;
}

export type ValueIndexResult =
  | {
      scorable: true;
      /** 0..10, rounded to one decimal. This is the published number. */
      score: number;
      band: ValueBand;
      label: string;
      /** share of total weight actually measured, 0..1 */
      coverage: number;
      contributions: Contribution[];
      excluded: ComponentKey[];
    }
  | {
      scorable: false;
      reason: 'no-measurable-components';
      excluded: ComponentKey[];
    };

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Round half-up to one decimal, avoiding binary float surprises. */
export const toOneDecimal = (n: number): number =>
  Math.round((n + Number.EPSILON) * 10) / 10;

/**
 * Band is derived from the ROUNDED score, so the badge can never contradict
 * the number printed beside it (8.96 displays 9.0 and reads EXCEPTIONAL).
 */
export function bandFor(score: number): ValueBand {
  const rounded = toOneDecimal(score);
  for (const b of BANDS) if (rounded >= b.min) return b.band;
  return 'SKIP';
}

export function computeValueIndex(components: ValueComponents): ValueIndexResult {
  const measured: Array<{ key: ComponentKey; value: number; weight: number }> = [];
  const excluded: ComponentKey[] = [];

  for (const key of Object.keys(WEIGHTS) as ComponentKey[]) {
    const raw = components[key];
    if (raw === null || raw === undefined || !Number.isFinite(raw)) {
      excluded.push(key);
      continue;
    }
    measured.push({ key, value: clamp01(raw), weight: WEIGHTS[key] });
  }

  const availableWeight = measured.reduce((sum, m) => sum + m.weight, 0);
  if (availableWeight === 0) {
    return { scorable: false, reason: 'no-measurable-components', excluded };
  }

  // Renormalise: the measured components share the full 100%.
  const contributions: Contribution[] = measured.map((m) => {
    const effectiveWeight = m.weight / availableWeight;
    return {
      key: m.key,
      value: m.value,
      effectiveWeight,
      points: m.value * effectiveWeight * 10,
    };
  });

  const raw = contributions.reduce((sum, c) => sum + c.points, 0);
  const score = toOneDecimal(raw);
  const band = bandFor(raw);

  return {
    scorable: true,
    score,
    band,
    label: BAND_LABEL[band],
    coverage: availableWeight, // weights sum to 1, so this is already a share
    contributions: contributions.sort((a, b) => b.points - a.points),
    excluded,
  };
}
