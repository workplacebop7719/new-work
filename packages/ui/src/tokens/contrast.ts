/**
 * WCAG 2.2 contrast maths.
 *
 * ACC-004 requires text and non-text contrast. Rather than trusting a palette
 * that "looks accessible", every semantic token pair is asserted against these
 * functions in CI (BRD-001), so a designer or developer cannot introduce a
 * failing combination without the build saying so.
 *
 * Ratios per WCAG 2.2:
 *   4.5:1 normal text (1.4.3)   3:1 large text and UI components (1.4.3, 1.4.11)
 */

export type Hex = `#${string}`;

export function parseHex(hex: Hex): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function channelLuminance(channel8Bit: number): number {
  const c = channel8Bit / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: Hex): number {
  const [r, g, b] = parseHex(hex);
  return (
    0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(foreground: Hex, background: Hex): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

export const WCAG_AA_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3;
export const WCAG_AA_NON_TEXT = 3;

/**
 * Strict: the computed ratio is compared as-is, with no rounding step.
 *
 * This matters more than it looks. The PRD's brand teal #00A6A6 computes to
 * 2.9978:1 on white — a value that "passes" 3:1 only if you round to two
 * decimals first. A palette that clears a threshold by rounding has not cleared
 * it, so the design system darkens the token instead (see tokens.ts).
 */
export function meets(foreground: Hex, background: Hex, minimum: number): boolean {
  return contrastRatio(foreground, background) >= minimum;
}
