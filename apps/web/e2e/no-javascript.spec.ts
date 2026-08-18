import { expect, test } from '@playwright/test';

/**
 * ARC-006 — "Critical public pages should render useful primary content without
 * waiting for client-side JavaScript."
 *
 * Runs in the `no-javascript` Playwright project, where JS is disabled at the
 * browser level. A page that only works with hydration fails here.
 */
test.describe('without client-side JavaScript', () => {
  test('renders the page heading and content', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/design tokens, accessible primitives/)).toBeVisible();
  });

  test('the language switch still works, because it is a link', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: 'Français' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('the skip link is present in the markup', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
  });
});
