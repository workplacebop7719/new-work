import { expect, test } from '@playwright/test';

/**
 * The marketing surface — PRD §7 module composition, PUB-002 personalization.
 */

test.describe('homepage composition', () => {
  test('presents the §7 modules in both locales', async ({ page }) => {
    for (const locale of ['en', 'fr']) {
      await page.goto(`/${locale}`);
      // Hero promise, one h1.
      await expect(page.locator('h1')).toHaveCount(1);
      // The named landmarks each module hangs off.
      for (const id of ['your-organization', 'services', 'method', 'trust', 'proof', 'start']) {
        await expect(page.locator(`#${id}`), `${locale} missing #${id}`).toHaveCount(1);
      }
    }
  });

  test('states exclusions for every offer, not just inclusions (PRD §7)', async ({ page }) => {
    await page.goto('/en#services');
    const notIncluded = page.locator('.ns-offer__detail dt', { hasText: 'Not included' });
    // One per offer in the ladder.
    await expect(notIncluded).toHaveCount(5);
  });

  test('qualifies every price as indicative, never as a quote', async ({ page }) => {
    await page.goto('/en#services');
    await expect(page.getByText(/Prices are indicative/)).toBeVisible();
    const amounts = await page.locator('.ns-offer__price').allInnerTexts();
    for (const amount of amounts) {
      const priced = /\$/.test(amount);
      if (priced) expect(amount.toLowerCase()).toContain('indicative');
    }
  });

  test('publishes no fabricated proof', async ({ page }) => {
    await page.goto('/en#proof');
    // The proof section is an honest empty state until real engagements exist.
    await expect(page.getByRole('heading', { name: /have not published case narratives/ })).toBeVisible();
  });

  test('renders the regulatory notice through the content model, on hold', async ({ page }) => {
    await page.goto('/en');
    const notice = page.locator('.ns-notice');
    await expect(notice).toContainText('being reviewed');
    // No placeholder dash where a verified date would go.
    await expect(notice).not.toContainText('Last reviewed —');
  });
});

test.describe('employee-band personalization (PUB-002)', () => {
  test('persists the choice and reflects it back', async ({ page }) => {
    await page.goto('/en#your-organization');
    await page.getByRole('button', { name: /50 to 199 employees/ }).click();
    await page.waitForURL(/your-organization/);

    await expect(page.getByText(/Showing guidance for/)).toBeVisible();
    await expect(page.getByRole('button', { name: /50 to 199 employees/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Survives a reload — it is a preference, not a session.
    await page.reload();
    await expect(page.getByRole('button', { name: /50 to 199 employees/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('never hides the general site (PUB-002)', async ({ page }) => {
    await page.goto('/en');
    const before = await page.locator('section[id]').count();

    await page.goto('/en#your-organization');
    await page.getByRole('button', { name: /Fewer than 20 employees/ }).click();
    await page.waitForURL(/your-organization/);

    // Personalization annotates and re-emphasises; it removes nothing.
    expect(await page.locator('section[id]').count()).toBe(before);
    await expect(page.locator('#services')).toBeVisible();
  });

  test('works without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/en#your-organization');
    await page.getByRole('button', { name: /20 to 49 employees/ }).click();
    await expect(page.getByText(/Showing guidance for/)).toBeVisible();
    await context.close();
  });
});

test.describe('how it works', () => {
  test('says what we will not do, not only what we will', async ({ page }) => {
    await page.goto('/en/how-it-works');
    await expect(page.getByRole('heading', { name: /What we will not do/ })).toBeVisible();
    await expect(page.getByText(/not affiliated with any government/)).toBeVisible();
  });
});
