/**
 * PRODUCT MATCHING (PRD §46).
 *
 * Resolves an incoming feed record to a product we already track.
 *
 * The asymmetry that shapes this module: a MISSED match costs us a duplicate
 * product row, which is tidy-up work. A FALSE match merges two different
 * products' price histories — and since observations are append-only, the two
 * timelines can never be untangled again. Every Value Index computed from the
 * merged history is then wrong, and confidently so.
 *
 * So matching is conservative by construction. It matches on identifiers when
 * it has them, falls back to similarity, and when similarity lands in the
 * uncertain middle it refuses to decide and asks for a human instead of
 * guessing.
 */
import { normaliseTitle } from './normalise';

export interface ExistingProduct {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  /** Retailer SKUs already known for this product, by retailer slug. */
  skus?: Record<string, string>;
}

export interface IncomingProduct {
  title: string;
  brand: string | null;
  retailerSlug: string;
  sku: string | null;
}

export type MatchResult =
  | { kind: 'MATCHED'; product: ExistingProduct; confidence: number; via: 'sku' | 'exact' | 'similarity' }
  | { kind: 'NEEDS_REVIEW'; candidates: Array<{ product: ExistingProduct; confidence: number }> }
  | { kind: 'NEW' };

/** At or above this, a similarity match is safe to make automatically. */
export const AUTO_MATCH_CONFIDENCE = 0.9;

/** Below this, it is not the same product; treat it as new. */
export const NEW_PRODUCT_CONFIDENCE = 0.55;

/** Words that carry no identifying information and skew short titles. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'with', 'for', 'of', 'in', 'by', 'new', 'set', 'pack',
]);

/**
 * Folds the singular/plural distinction, which is the most common way two
 * feeds describe the identical product ("Kids Sneaker" vs "Kids Sneakers").
 * Without this they scored 0.75 and fell short of an automatic match.
 *
 * Deliberately crude rather than a real stemmer: it is applied identically to
 * both sides, so the only thing that matters is that it is consistent. Words
 * ending in "ss" are left alone so "dress" does not become "dres".
 *
 * Known limitation: it does not fold "-es" plurals, so "dress"/"dresses" still
 * read as different tokens. Stripping "es" would break "shoes"/"shoe", which
 * is far more common in this catalogue, and the cost of the miss is only a
 * duplicate product row — the safe direction to fail in.
 */
function stem(token: string): string {
  if (token.length >= 4 && token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

function tokens(text: string): Set<string> {
  return new Set(
    normaliseTitle(text)
      .split(' ')
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
      .map(stem),
  );
}

/**
 * Dice coefficient over title tokens — symmetric, and more forgiving of length
 * differences than Jaccard, which matters because feeds pad titles with
 * marketing words.
 */
export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return (2 * shared) / (ta.size + tb.size);
}

export function matchProduct(
  incoming: IncomingProduct,
  existing: readonly ExistingProduct[],
): MatchResult {
  // 1. A retailer SKU is an identifier, not a guess. Trust it outright.
  if (incoming.sku) {
    const bySku = existing.find(
      (p) => p.skus?.[incoming.retailerSlug] === incoming.sku,
    );
    if (bySku) return { kind: 'MATCHED', product: bySku, confidence: 1, via: 'sku' };
  }

  const incomingTitle = normaliseTitle(incoming.title);
  const incomingBrand = incoming.brand ? normaliseTitle(incoming.brand) : null;

  // 2. Exact normalised title plus matching brand.
  const exact = existing.find(
    (p) =>
      normaliseTitle(p.title) === incomingTitle &&
      (incomingBrand === null || p.brand === null || normaliseTitle(p.brand) === incomingBrand),
  );
  if (exact) return { kind: 'MATCHED', product: exact, confidence: 1, via: 'exact' };

  // 3. Similarity, with brand as a hard gate rather than a scoring nudge.
  const scored = existing
    .filter((p) => {
      if (incomingBrand === null || p.brand === null) return true;
      // Different stated brands are different products, however similar the
      // titles read. This is the cheapest way to avoid the worst false match.
      return normaliseTitle(p.brand) === incomingBrand;
    })
    .map((p) => ({ product: p, confidence: titleSimilarity(p.title, incoming.title) }))
    .filter((c) => c.confidence >= NEW_PRODUCT_CONFIDENCE)
    .sort((a, b) => b.confidence - a.confidence);

  if (scored.length === 0) return { kind: 'NEW' };

  const best = scored[0]!;
  const runnerUp = scored[1];

  // Two candidates that score almost the same means the title does not
  // distinguish them. Picking the marginally higher one is a coin flip with a
  // permanent consequence.
  if (runnerUp && best.confidence - runnerUp.confidence < 0.05) {
    return { kind: 'NEEDS_REVIEW', candidates: scored.slice(0, 5) };
  }

  if (best.confidence >= AUTO_MATCH_CONFIDENCE) {
    return { kind: 'MATCHED', product: best.product, confidence: best.confidence, via: 'similarity' };
  }

  return { kind: 'NEEDS_REVIEW', candidates: scored.slice(0, 5) };
}
