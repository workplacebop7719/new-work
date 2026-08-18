/**
 * Design tokens — PRD §14, BRD-001/002/003.
 *
 * ## A finding from building this file
 *
 * The palette named in PRD §14 does not survive WCAG 2.2 contrast checking when
 * used naively, and the numbers are not close:
 *
 *   brand teal #00A6A6 on white ........... 2.998:1  (fails AA text at 4.5:1 AND
 *                                                     non-text at 3:1 — by 0.002)
 *   white on brand teal #00A6A6 ........... 2.998:1  (a teal button with a white label fails)
 *   warm gold  #F0B44D on white ............ 1.85:1  (fails even the 3:1 non-text threshold)
 *   deep ink   #0B2239 on white ........... 16.13:1  (comfortable)
 *   deep ink   on warm gold ................ 8.71:1  (comfortable)
 *
 * This is not a reason to change the brand. It is a reason to be precise about
 * where each brand colour may appear, which is what the semantic tokens below
 * encode:
 *
 *   - Brand teal #00A6A6 is DECORATIVE ONLY. It came within 0.002 of the 3:1
 *     non-text threshold, which means it cannot carry meaning against a white
 *     page — not a chart mark, not a status rule, not an icon that matters.
 *     `graphic-brand` (#00A0A0, 3.21:1) is the near-identical token used
 *     wherever a teal graphic conveys information.
 *   - `interactive` (#00706F, 5.92:1 on white) is the teal used for links,
 *     buttons and focus. It reads as the same brand colour and passes AA both as
 *     a foreground on white and as a background under white text.
 *   - Warm gold is a BACKGROUND colour only, always with ink text. Because it is
 *     1.85:1 against white it cannot even carry a shape boundary against a white
 *     page, so any gold surface also needs an ink border (see `--color-emphasis-border`).
 *
 * `tokens.contrast.test.ts` asserts all of this, including the negative rules,
 * so the constraint cannot be lost to a later "simplification".
 */
import type { Hex } from './contrast';

/** Raw brand palette exactly as PRD §14 states it. Not used directly by components. */
export const BRAND = {
  ink: '#0B2239',
  teal: '#00A6A6',
  gold: '#F0B44D',
  white: '#FFFFFF',
  black: '#000000',
} as const satisfies Record<string, Hex>;

/**
 * Semantic tokens. Components reference only these, never BRAND, so that a
 * palette change is a change to this file and its test — not a search across the
 * codebase.
 */
export const COLOR = {
  // Surfaces
  'surface-page': '#FFFFFF',
  'surface-raised': '#F4F6F8',
  'surface-inverse': '#0B2239',

  // Text
  'text-primary': '#0B2239',
  'text-secondary': '#425466',
  'text-on-inverse': '#FFFFFF',
  'text-on-interactive': '#FFFFFF',
  'text-on-emphasis': '#0B2239',

  // Interaction — the AA-safe teal.
  interactive: '#00706F',
  'interactive-hover': '#00625F',
  'interactive-surface': '#00706F',

  // Focus. A single high-contrast colour used on every focusable element, so
  // focus never has to be re-derived per component (ACC-002).
  focus: '#0B2239',
  'focus-inverse': '#FFFFFF',

  // Borders
  border: '#5A6B7A',
  'border-subtle': '#C7D0D8',

  // Emphasis (warm gold): background only, always with ink text and an ink border.
  emphasis: '#F0B44D',
  'emphasis-border': '#0B2239',

  // Status. Colour is never the only carrier (ENG-004); these accompany an icon
  // and a text label in every component that uses them.
  'status-critical': '#8C1D18',
  'status-warning': '#7A4E00',
  'status-success': '#166534',
  'status-info': '#00625F',

  // Meaningful graphics only (3:1 on white). Two steps darker than BRAND.teal,
  // which misses the threshold by 0.002 — visually indistinguishable, and the
  // difference between a chart a low-vision user can read and one they cannot.
  'graphic-brand': '#00A0A0',
  // Decorative teal, for fills that carry no meaning and no boundary.
  'graphic-brand-decorative': '#00A6A6',
} as const satisfies Record<string, Hex>;

/**
 * Pairs asserted at 4.5:1. Every foreground/background combination a component
 * is allowed to render must appear here — the test treats this list as the
 * definition of "allowed", not as a sample.
 */
export const TEXT_PAIRS: readonly (readonly [keyof typeof COLOR, keyof typeof COLOR])[] = [
  ['text-primary', 'surface-page'],
  ['text-primary', 'surface-raised'],
  ['text-secondary', 'surface-page'],
  ['text-secondary', 'surface-raised'],
  ['text-on-inverse', 'surface-inverse'],
  ['text-on-interactive', 'interactive-surface'],
  ['text-on-emphasis', 'emphasis'],
  ['interactive', 'surface-page'],
  ['interactive', 'surface-raised'],
  ['status-critical', 'surface-page'],
  ['status-warning', 'surface-page'],
  ['status-success', 'surface-page'],
  ['status-info', 'surface-page'],
];

/** Pairs asserted at 3:1 — borders, focus rings, graphic marks (WCAG 1.4.11). */
export const NON_TEXT_PAIRS: readonly (readonly [keyof typeof COLOR, keyof typeof COLOR])[] = [
  ['border', 'surface-page'],
  ['border', 'surface-raised'],
  ['focus', 'surface-page'],
  ['focus-inverse', 'surface-inverse'],
  ['graphic-brand', 'surface-page'],
  ['emphasis-border', 'emphasis'],
  ['interactive', 'surface-page'],
];

/** Type scale. 16px minimum body and a ~70ch measure (BRD-002, PRD §14). */
export const TYPE = {
  'font-size-xs': '0.875rem', // 14px — metadata and captions only, never body copy
  'font-size-base': '1rem', // 16px minimum body
  'font-size-lg': '1.125rem',
  'font-size-xl': '1.5rem',
  'font-size-2xl': '2rem',
  'font-size-3xl': '2.5rem',
  'line-height-tight': '1.2',
  'line-height-body': '1.6',
  'measure': '70ch',
  'font-family-sans':
    "'Inter var', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

/** Spacing scale, 4px base. */
export const SPACE = {
  'space-1': '0.25rem',
  'space-2': '0.5rem',
  'space-3': '0.75rem',
  'space-4': '1rem',
  'space-6': '1.5rem',
  'space-8': '2rem',
  'space-12': '3rem',
  'space-16': '4rem',
} as const;

/**
 * Motion. PRD §14: most transitions 120–240 ms, reduced-motion honoured with an
 * equivalent non-motion state, no auto-advancing or infinite decorative motion.
 */
export const MOTION = {
  'duration-fast': '120ms',
  'duration-base': '180ms',
  'duration-slow': '240ms',
  'easing-standard': 'cubic-bezier(0.2, 0, 0.2, 1)',
} as const;

/**
 * Minimum target size. WCAG 2.2 SC 2.5.8 requires 24x24 CSS px; PRD §15 asks for
 * "adequate target sizes", so the design system sets a more generous 44px floor
 * for primary controls and keeps 24px as the absolute minimum for inline ones.
 */
export const TARGET = {
  'target-min': '24px',
  'target-comfortable': '44px',
} as const;
