import { expect, test } from '@playwright/test';

/**
 * Editorial resources — CNT-003, CNT-004, ENG-007.
 */

test.describe('resource index', () => {
  test('lists the published resources in both locales', async ({ page }) => {
    for (const locale of ['en', 'fr']) {
      await page.goto(`/${locale}/resources`);
      await expect(page.locator('h1')).toHaveCount(1);
      // Three real pieces, not a category grid pointing at nothing.
      await expect(page.locator('.ns-resource')).toHaveCount(3);
    }
  });

  test('is reachable from the header and the homepage', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('#resources')).toBeVisible();
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Resources' }).click();
    await expect(page).toHaveURL(/\/en\/resources$/);
  });
});

test.describe('an article', () => {
  test('renders its body and states the reading time', async ({ page }) => {
    await page.goto('/en/resources/evidence-checklist');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/minute read/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What we do not ask for' })).toBeVisible();
  });

  test('states plainly when it has no manual accessibility review (CNT-004)', async ({ page }) => {
    await page.goto('/en/resources/evidence-checklist');
    // An unstated absence would read as a completed check.
    await expect(page.getByText(/has not yet had a manual accessibility check/)).toBeVisible();
  });

  test('renders a cited regulatory claim through the content model, on hold (ENG-007)', async ({
    page,
  }) => {
    await page.goto('/en/resources/briefing-a-website-audit');
    // The article cites a claim by key; the claim is unreviewed, so its hold
    // notice appears in place of any regulatory sentence.
    await expect(page.getByRole('heading', { name: 'This guidance is being reviewed' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(
      'Organizations of a certain size in Ontario are required to file',
    );
  });

  test('returns 404 for an unknown slug rather than an empty page', async ({ page }) => {
    const response = await page.goto('/en/resources/not-a-real-article');
    expect(response?.status()).toBe(404);
  });

  test('has a French counterpart with its own slug', async ({ page }) => {
    await page.goto('/fr/resources/liste-de-preuves');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });
});
