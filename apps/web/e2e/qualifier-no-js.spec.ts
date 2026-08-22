import { expect, test } from '@playwright/test';

/**
 * ARC-006 — the qualifier is the most interactive thing on the public site, so
 * it is the strongest test of "renders useful primary content without waiting
 * for client-side JavaScript". Every step here is a plain form POST.
 */
test.describe('qualifier without JavaScript', () => {
  test('completes end to end and reaches an explained result', async ({ page }) => {
    await page.goto('/en/check');
    await page.getByRole('button', { name: 'Start' }).click();

    for (const [key, value] of [
      ['ontario_presence', 'yes'],
      ['organization_type', 'nonprofit'],
      ['employee_band', '50_to_199'],
      ['reporting_history', 'never_filed'],
      ['public_website', 'yes_we_own'],
      ['website_work_done', 'nothing_yet'],
      ['evidence_availability', 'scattered'],
      ['support_needed', 'policy'],
    ]) {
      await page.locator(`#${key}-${value}`).check();
      await page.getByRole('button', { name: /Continue|See my suggested next step/ }).click();
    }

    await expect(page).toHaveURL(/\/en\/check\/result$/);
    await expect(page.getByRole('heading', { name: 'Why we suggested this' })).toBeVisible();
  });

  test('records a consent decision without scripting', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: 'No analytics' }).click();
    await expect(page.getByRole('heading', { name: 'Analytics on this site' })).toBeHidden();
  });
});
