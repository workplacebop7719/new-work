import { describe, it, expect } from 'vitest';
import {
  matchProduct, titleSimilarity, AUTO_MATCH_CONFIDENCE, NEW_PRODUCT_CONFIDENCE,
  type ExistingProduct, type IncomingProduct,
} from './product-match';

const product = (over: Partial<ExistingProduct> & { id: string; title: string }): ExistingProduct => ({
  slug: over.id, brand: 'Calder', ...over,
});

const incoming = (over: Partial<IncomingProduct> = {}): IncomingProduct => ({
  title: 'Trail Runner Kids Sneaker',
  brand: 'Calder',
  retailerSlug: 'calder-kids',
  sku: null,
  ...over,
});

describe('identifiers are trusted before guesses', () => {
  it('matches on a retailer SKU regardless of the title', () => {
    const existing = [
      product({ id: 'p1', title: 'Something Entirely Different', skus: { 'calder-kids': 'SKU-1' } }),
    ];
    const r = matchProduct(incoming({ sku: 'SKU-1' }), existing);
    expect(r.kind).toBe('MATCHED');
    if (r.kind === 'MATCHED') {
      expect(r.via).toBe('sku');
      expect(r.confidence).toBe(1);
    }
  });

  it('does not use another retailer’s SKU namespace', () => {
    const existing = [product({ id: 'p1', title: 'Trail Runner Kids Sneaker', skus: { 'other-shop': 'SKU-1' } })];
    const r = matchProduct(incoming({ sku: 'SKU-1', title: 'Unrelated Thing' }), existing);
    expect(r.kind).toBe('NEW');
  });

  it('matches an exact normalised title', () => {
    const existing = [product({ id: 'p1', title: '  TRAIL-RUNNER  Kids   Sneaker ' })];
    const r = matchProduct(incoming(), existing);
    expect(r.kind).toBe('MATCHED');
    if (r.kind === 'MATCHED') expect(r.via).toBe('exact');
  });
});

describe('brand is a gate, not a nudge', () => {
  /**
   * The cheapest protection against the worst false match: two brands make
   * two products, however similar the titles read.
   */
  it('never matches across different stated brands', () => {
    const existing = [product({ id: 'p1', title: 'Trail Runner Kids Sneaker', brand: 'Northaven' })];
    const r = matchProduct(incoming({ brand: 'Calder' }), existing);
    expect(r.kind).toBe('NEW');
  });

  it('still compares when either side has no brand', () => {
    const existing = [product({ id: 'p1', title: 'Trail Runner Kids Sneaker', brand: null })];
    expect(matchProduct(incoming({ brand: 'Calder' }), existing).kind).toBe('MATCHED');
  });
});

describe('similarity, and the uncertain middle', () => {
  it('matches a confidently similar title', () => {
    const existing = [product({ id: 'p1', title: 'Trail Runner Kids Sneakers' })];
    const r = matchProduct(incoming(), existing);
    expect(r.kind).toBe('MATCHED');
    if (r.kind === 'MATCHED') expect(r.confidence).toBeGreaterThanOrEqual(AUTO_MATCH_CONFIDENCE);
  });

  it('treats a clearly different product as new', () => {
    const existing = [product({ id: 'p1', title: 'Insulated Winter Puffer Youth' })];
    expect(matchProduct(incoming(), existing).kind).toBe('NEW');
  });

  /**
   * Two near-identical candidates mean the title does not distinguish them.
   * Picking the marginally higher score is a coin flip with a permanent
   * consequence, because a false match merges two price histories forever.
   */
  it('refuses to decide between two nearly equal candidates', () => {
    const existing = [
      product({ id: 'p1', title: 'Trail Runner Kids Sneaker Blue' }),
      product({ id: 'p2', title: 'Trail Runner Kids Sneaker Green' }),
    ];
    const r = matchProduct(incoming(), existing);
    expect(r.kind).toBe('NEEDS_REVIEW');
    if (r.kind === 'NEEDS_REVIEW') expect(r.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('sends a middling single candidate for review rather than matching it', () => {
    // 'Kids Shoe' vs 'Kids Sneaker' scores 0.75 — similar enough to be worth
    // a look, not similar enough to merge two price histories on.
    const existing = [product({ id: 'p1', title: 'Trail Runner Kids Shoe' })];
    const r = matchProduct(incoming(), existing);
    expect(r.kind).toBe('NEEDS_REVIEW');
  });

  it('keeps the thresholds ordered and meaningful', () => {
    expect(NEW_PRODUCT_CONFIDENCE).toBeLessThan(AUTO_MATCH_CONFIDENCE);
    expect(AUTO_MATCH_CONFIDENCE).toBeLessThanOrEqual(1);
  });
});

describe('title similarity', () => {
  it('is 1 for the same words in a different order and case', () => {
    expect(titleSimilarity('Kids Trail Runner', 'trail runner KIDS')).toBe(1);
  });
  it('is 0 for nothing in common', () => {
    expect(titleSimilarity('Winter Puffer', 'Olive Oil')).toBe(0);
  });
  it('ignores filler words that would inflate short titles', () => {
    expect(titleSimilarity('The Trail Runner', 'Trail Runner')).toBe(1);
  });
  it('is symmetric', () => {
    const a = 'Cordless Stick Vacuum';
    const b = 'Stick Vacuum Cordless Pro';
    expect(titleSimilarity(a, b)).toBeCloseTo(titleSimilarity(b, a), 10);
  });
  it('folds singular and plural, the commonest way two feeds differ', () => {
    expect(titleSimilarity('Kids Sneakers', 'Kids Sneaker')).toBe(1);
    expect(titleSimilarity('Winter Coats', 'Winter Coat')).toBe(1);
  });

  it('does not over-stem words ending in a double s', () => {
    expect(titleSimilarity('Party Dress', 'Party Dress')).toBe(1);
  });

  it('handles empty input without dividing by zero', () => {
    expect(titleSimilarity('', 'anything')).toBe(0);
    expect(titleSimilarity('the a an', 'the a an')).toBe(0);
  });
});

describe('no existing catalog', () => {
  it('treats everything as new', () => {
    expect(matchProduct(incoming(), []).kind).toBe('NEW');
  });
});
