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

  test('every focusable element shows a visible focus indicator', async ({ page }) => {
    await page.goto('/en');

    // Hidden inputs carry form state and are never focused; including them would
    // assert an outline on something a user can never reach.
    const focusable = page.locator(
      'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const count = await focusable.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const element = focusable.nth(i);
      if (!(await element.isVisible())) continue;
      await element.focus();
      const { outlineWidth, describe } = await element.evaluate((node) => ({
        outlineWidth: window.getComputedStyle(node).outlineWidth,
        describe: `${node.tagName.toLowerCase()}${node.getAttribute('type') ? `[type=${node.getAttribute('type')}]` : ''} "${(node.textContent ?? '').trim().slice(0, 40)}"`,
      }));
      expect(Number.parseFloat(outlineWidth), `${describe} has no focus outline`).toBeGreaterThan(0);
    }
  });
});

test.describe('regulatory content (CNT-005, ENG-007)', () => {
  test('an unreviewed claim renders its hold state, never its statement', async ({ page }) => {
    await page.goto('/en');

    // The seeded claim is `in_review` pending counsel sign-off (Q-04), so the
    // notice band shows the hold state rather than the statement.
    const notice = page.locator('.ns-notice');
    await expect(notice).toContainText('being reviewed');
    await expect(
      notice.getByRole('link', { name: /Completing your accessibility compliance report/ }),
    ).toBeVisible();

    // The guarantee under test: the claim's own wording is nowhere on the page.
    // This is the assertion that would catch a regression in resolveClaim.
    await expect(page.locator('body')).not.toContainText(
      'Organizations of a certain size in Ontario are required to file',
    );
  });
});
