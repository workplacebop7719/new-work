import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Automated accessibility coverage — `pnpm test:a11y`.
 *
 * ENG-005: this never closes an accessibility item. It catches regressions
 * between the manual keyboard, screen-reader and zoom passes recorded in
 * docs/accessibility-test-plan.md, which is where conformance is evidenced.
 */
const PAGES = ['/en', '/fr', '/en/check', '/fr/check', '/en/contact', '/fr/contact', '/en/check/1', '/fr/check/1', '/en/too-many-requests', '/fr/too-many-requests', '/en/how-it-works', '/fr/how-it-works', '/en/resources', '/fr/resources', '/en/resources/evidence-checklist', '/fr/resources/liste-de-preuves'];

for (const path of PAGES) {
  test(`${path} has no automatically detectable WCAG 2.2 AA violations @a11y`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(
      results.violations,
      results.violations.map((v) => `${v.id}: ${v.help}`).join('\n'),
    ).toEqual([]);
  });

  test(`${path} reflows at 400% zoom without horizontal scrolling @a11y`, async ({ page }) => {
    // WCAG 1.4.10 reflow: 320 CSS px wide is equivalent to 400% zoom at 1280px.
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows, 'page scrolls horizontally at 320px width').toBe(false);
  });

  test(`${path} has exactly one h1 and a main landmark @a11y`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
  });
}
