/**
 * Shared accessibility assertion for component tests.
 *
 * ENG-005 is explicit that automated checks never close accessibility work.
 * This is regression coverage between the manual keyboard, screen-reader and
 * zoom passes recorded in docs/accessibility-test-plan.md; a passing result is
 * not evidence of conformance on its own.
 */
import axe from 'axe-core';

export interface AxeOptions {
  /** Extra rules to disable, with a reason recorded at the call site. */
  readonly disableRules?: readonly string[];
}

export async function expectNoAxeViolations(
  container: Element,
  options: AxeOptions = {},
): Promise<void> {
  const disabled: Record<string, { enabled: boolean }> = {
    // Landmark rules need a whole page; they are covered by the page-level
    // `test:a11y` Playwright run instead of being half-checked here.
    region: { enabled: false },
    // jsdom has no layout engine or canvas, so axe cannot compute contrast.
    // Disabled deliberately rather than left to emit a misleading pass: contrast
    // is verified numerically in @northstar/ui's token tests and again against
    // the real rendered page in Playwright.
    'color-contrast': { enabled: false },
  };
  for (const rule of options.disableRules ?? []) {
    disabled[rule] = { enabled: false };
  }

  const results = await axe.run(container, { rules: disabled });
  if (results.violations.length > 0) {
    const detail = results.violations
      .map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.html).join('\n  ')}`)
      .join('\n');
    throw new Error(`axe found ${results.violations.length} violation(s):\n${detail}`);
  }
}
