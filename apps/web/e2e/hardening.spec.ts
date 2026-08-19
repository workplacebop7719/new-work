import { expect, test } from '@playwright/test';
import { RATE_LIMITS } from '@northstar/db';

const RESUME_EMAIL_LIMIT = RATE_LIMITS.resume_email.limit;

/**
 * Rate limiting (Q-27) and Content-Security-Policy (SEC-001).
 */

test.describe('Content-Security-Policy', () => {
  test('is served on every page', async ({ page }) => {
    const response = await page.goto('/en');
    const csp = response?.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  test('allows no third-party connect target (ARC-007)', async ({ page }) => {
    const response = await page.goto('/en');
    const csp = response?.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("connect-src 'self'");
  });

  test('does not break the page: no CSP violations while using the qualifier', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (/content security policy/i.test(text)) violations.push(text);
    });

    await page.goto('/en/check');
    await page.getByRole('button', { name: 'Start' }).click();
    await page.locator('#ontario_presence-yes').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    expect(violations, violations.join('\n')).toEqual([]);
  });
});

test.describe('rate limiting (Q-27)', () => {
  // The resume-email endpoint has the tightest budget, so it is the cheapest to
  // drive to its limit in a test.
  test('refuses the resume-email form once the limit is reached, with a page not a puzzle @a11y', async ({
    page,
  }) => {
    // Its own client address, so driving this budget to zero cannot starve any
    // other test — and so the limit under test is the real one, not a leftover.
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.100.99-${Date.now()}` });
    await page.goto('/en/check');
    await page.getByRole('button', { name: 'Start' }).click();

    // One more than the limit, so the refusal is reached deterministically.
    for (let attempt = 0; attempt < RESUME_EMAIL_LIMIT + 2; attempt += 1) {
      await page.locator('.ns-resume summary').click();
      await page.locator('#resume-email').fill('visitor@example.com');
      await page.locator('#email-consent').check();

      // Wait for a URL that differs from the one we are already on. Waiting for
      // /check\/1/ would resolve instantly against the current page and race the
      // redirect — every outcome of this submit changes the query or the path.
      await Promise.all([
        page.waitForURL(/saved=1|error=resume|too-many-requests/),
        page.getByRole('button', { name: 'Email me a link' }).click(),
      ]);

      if (/too-many-requests/.test(page.url())) break;
      await page.goto('/en/check/1');
    }

    await expect(page).toHaveURL(/too-many-requests/);
    await expect(page.getByRole('heading', { name: /Too many requests/ })).toBeVisible();

    // ACC-005: the refusal must never become an inaccessible challenge.
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('captcha');
    expect(body).toContain('will not ask you to solve a puzzle');

    // A person is still reachable immediately.
    await expect(page.getByRole('link', { name: 'Talk to a person now' })).toBeVisible();
  });

  test('does not stop a normal visitor completing the qualifier', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.100.98-${Date.now()}` });
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
  });
});
