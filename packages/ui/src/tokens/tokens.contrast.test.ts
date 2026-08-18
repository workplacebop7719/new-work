/**
 * BRD-001 / ACC-004: the palette is proven, not assumed.
 *
 * These tests fail the build when a token pair drops below its WCAG 2.2
 * threshold. The negative assertions at the end are equally important: they
 * record *why* brand teal and warm gold are restricted, so a future change that
 * promotes either to body text fails here with an explanation rather than
 * shipping and being caught by an audit.
 */
import { describe, expect, it } from 'vitest';
import { contrastRatio, WCAG_AA_NON_TEXT, WCAG_AA_TEXT } from './contrast';
import { BRAND, COLOR, NON_TEXT_PAIRS, TEXT_PAIRS, TYPE } from './tokens';

describe('contrast maths', () => {
  it('matches known WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 2);
    expect(contrastRatio('#767676', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('text token pairs meet WCAG 2.2 AA (4.5:1)', () => {
  for (const [fg, bg] of TEXT_PAIRS) {
    it(`${fg} on ${bg}`, () => {
      const ratio = contrastRatio(COLOR[fg], COLOR[bg]);
      expect(ratio, `${COLOR[fg]} on ${COLOR[bg]} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        WCAG_AA_TEXT,
      );
    });
  }
});

describe('non-text token pairs meet WCAG 2.2 AA (3:1)', () => {
  for (const [fg, bg] of NON_TEXT_PAIRS) {
    it(`${fg} on ${bg}`, () => {
      const ratio = contrastRatio(COLOR[fg], COLOR[bg]);
      expect(ratio, `${COLOR[fg]} on ${COLOR[bg]} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        WCAG_AA_NON_TEXT,
      );
    });
  }
});

describe('brand colour restrictions (documented in tokens.ts)', () => {
  it('brand teal is graphic-only: it does not reach AA as text on white', () => {
    // 3.00:1. If this ever passes 4.5, the restriction can be revisited — but it
    // must be revisited deliberately, not discovered in an audit.
    expect(contrastRatio(BRAND.teal, '#FFFFFF')).toBeLessThan(WCAG_AA_TEXT);
  });

  it('white text on brand teal also fails AA, so teal is not a button surface', () => {
    expect(contrastRatio('#FFFFFF', BRAND.teal)).toBeLessThan(WCAG_AA_TEXT);
  });

  it('the interactive teal used instead of brand teal does pass, both ways', () => {
    expect(contrastRatio(COLOR.interactive, COLOR['surface-page'])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    expect(contrastRatio(COLOR['text-on-interactive'], COLOR['interactive-surface'])).toBeGreaterThanOrEqual(
      WCAG_AA_TEXT,
    );
  });

  it('warm gold cannot carry a boundary against a white page, hence the ink border', () => {
    expect(contrastRatio(BRAND.gold, '#FFFFFF')).toBeLessThan(WCAG_AA_NON_TEXT);
    expect(contrastRatio(COLOR['emphasis-border'], COLOR['surface-page'])).toBeGreaterThanOrEqual(
      WCAG_AA_NON_TEXT,
    );
  });

  it('warm gold is usable as a surface under ink text', () => {
    expect(contrastRatio(COLOR['text-on-emphasis'], COLOR.emphasis)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
});

describe('type scale (BRD-002)', () => {
  it('sets a 16px minimum body size', () => {
    expect(TYPE['font-size-base']).toBe('1rem');
  });

  it('caps the reading measure at 70ch', () => {
    expect(TYPE.measure).toBe('70ch');
  });
});
