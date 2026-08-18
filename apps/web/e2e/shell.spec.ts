import { expect, test } from '@playwright/test';

test.describe('application shell', () => {
  test('serves both locales with a correct lang attribute (PUB-001)', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.goto('/fr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('offers a language switch on every page (PUB-001)', async ({ page }) => {
    await page.goto('/en');
    const toFrench = page.getByRole('link', { name: 'Français' });
    await expect(toFrench).toBeVisible();
    await toFrench.click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('redirects the bare root to a locale', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/en$/);
  });

  test('returns 404 for an unknown locale rather than guessing', async ({ page }) => {
    const response = await page.goto('/de');
    expect(response?.status()).toBe(404);
  });

  test('keeps CC-01 out of search indexes (CNT-007)', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

test.describe('keyboard operation @a11y', () => {
  test('the skip link is the first stop and moves focus to main (ACC-002)', async ({ page }) => {
    await page.goto('/en');
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('every interactive element shows a visible focus indicator', async ({ page }) => {
    await page.goto('/en');
    const focusable = page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await focusable.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const element = focusable.nth(i);
      await element.focus();
      const outlineWidth = await element.evaluate(
        (node) => window.getComputedStyle(node).outlineWidth,
      );
      expect(Number.parseFloat(outlineWidth), `element ${i} has no focus outline`).toBeGreaterThan(0);
    }
  });
});

test.describe('regulatory content (CNT-005, ENG-007)', () => {
  test('an unreviewed claim renders its hold state, never its statement', async ({ page }) => {
    await page.goto('/en');
    // The seeded claim is `in_review` pending counsel sign-off (Q-04), so the
    // safety path is what ships.
    await expect(page.getByRole('heading', { name: 'This guidance is being reviewed' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Completing your accessibility compliance report/ }),
    ).toBeVisible();
  });
});
