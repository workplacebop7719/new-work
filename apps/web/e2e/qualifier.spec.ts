import { expect, test, type Page } from '@playwright/test';

/**
 * The qualifier journey — PUB-002, PUB-005, PUB-006, CNV-001 to CNV-004.
 */

const ANSWERS: [string, string][] = [
  ['ontario_presence', 'yes'],
  ['organization_type', 'private_school'],
  ['employee_band', '50_to_199'],
  ['reporting_history', 'never_filed'],
  ['public_website', 'yes_we_own'],
  ['website_work_done', 'nothing_yet'],
  ['evidence_availability', 'scattered'],
  ['support_needed', 'web_audit'],
];

async function completeQualifier(page: Page, overrides: Record<string, string> = {}) {
  await page.goto('/en/check');
  await page.getByRole('button', { name: 'Start' }).click();

  for (const [key, value] of ANSWERS) {
    const answer = overrides[key] ?? value;
    await page.locator(`#${key}-${answer}`).check();
    await page.getByRole('button', { name: /Continue|See my suggested next step/ }).click();
  }
}

test.describe('qualifier journey', () => {
  test('completes and produces an explainable result (CNV-002)', async ({ page }) => {
    await completeQualifier(page);

    await expect(page).toHaveURL(/\/en\/check\/result$/);
    await expect(page.getByRole('heading', { name: 'Your suggested next step' })).toBeVisible();

    // The inputs that produced the recommendation are shown.
    await expect(page.getByRole('heading', { name: 'Why we suggested this' })).toBeVisible();
    await expect(page.getByText(/Rule version/)).toBeVisible();

    // An uncertainty notice appears on every result, not just uncertain ones.
    await expect(page.getByRole('heading', { name: 'What this is not' })).toBeVisible();
    await expect(page.getByText(/not a legal opinion/)).toBeVisible();
  });

  test('never states a compliance conclusion (PRD §8, Q-21)', async ({ page }) => {
    await completeQualifier(page);
    const body = (await page.locator('body').innerText()).toLowerCase();
    for (const forbidden of ['you are compliant', 'non-compliant', 'you passed', 'you failed', 'certified']) {
      expect(body, `result page contains "${forbidden}"`).not.toContain(forbidden);
    }
  });

  test('offers the free official route as a first-class link (PRD §2)', async ({ page }) => {
    await completeQualifier(page);
    await expect(page.getByRole('heading', { name: 'The official route' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Completing your accessibility compliance report/ }),
    ).toBeVisible();
  });

  test('routes an out-of-area visitor away rather than keeping them (§8)', async ({ page }) => {
    await completeQualifier(page, { ontario_presence: 'no' });
    await expect(page.getByText('You may not need us')).toBeVisible();
  });

  test('sends an unsure visitor to a person, not to a recommendation', async ({ page }) => {
    await completeQualifier(page, { public_website: 'unsure' });
    await expect(page.getByText('This needs a person')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Arrange a conversation' })).toBeVisible();
  });

  test('shows an accessible error instead of advancing on an empty answer', async ({ page }) => {
    await page.goto('/en/check');
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/en\/check\/1/);
    const error = page.getByText(/Choose an answer to continue/);
    await expect(error).toBeVisible();
    // Programmatically associated with the group, not a detached banner.
    const describedBy = await page.locator('fieldset').getAttribute('aria-describedby');
    expect(describedBy).toContain('ontario_presence-error');
  });

  test('resumes answers after leaving the page (CNV-001)', async ({ page }) => {
    await page.goto('/en/check');
    await page.getByRole('button', { name: 'Start' }).click();
    await page.locator('#ontario_presence-yes').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.goto('/en');
    await page.goto('/en/check/1');
    await expect(page.locator('#ontario_presence-yes')).toBeChecked();
  });

  test('never pre-selects an answer for a new visitor (CNV-003)', async ({ page }) => {
    await page.goto('/en/check');
    await page.getByRole('button', { name: 'Start' }).click();
    expect(await page.locator('input[type="radio"]:checked').count()).toBe(0);
  });

  test('never pre-ticks the email consent box (CNV-001)', async ({ page }) => {
    await page.goto('/en/check');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.locator('#email-consent')).not.toBeChecked();
  });

  test('keeps a person reachable without answering anything (PUB-005)', async ({ page }) => {
    await page.goto('/en/check');
    await page.getByRole('link', { name: 'Skip this and talk to a person instead' }).click();
    await expect(page.getByRole('heading', { name: 'Talk to a person' })).toBeVisible();
    await expect(page.getByRole('link', { name: '+1 555 555 0142' })).toBeVisible();
  });
});

test.describe('consent (PUB-006)', () => {
  test('loads no third-party request before a decision is made', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const host = new URL(request.url()).host;
      if (!host.startsWith('127.0.0.1') && !host.startsWith('localhost')) external.push(request.url());
    });

    await page.goto('/en');
    await page.goto('/en/check');
    expect(external, `third-party requests before consent: ${external.join(', ')}`).toEqual([]);
  });

  test('presents accept and decline as equally weighted controls (CNV-003)', async ({ page }) => {
    await page.goto('/en');
    const accept = page.getByRole('button', { name: 'Allow analytics' });
    const decline = page.getByRole('button', { name: 'No analytics' });
    await expect(accept).toBeVisible();
    await expect(decline).toBeVisible();

    const [acceptClass, declineClass] = await Promise.all([
      accept.getAttribute('class'),
      decline.getAttribute('class'),
    ]);
    // A visually demoted "decline" is the classic consent dark pattern.
    expect(acceptClass).toBe(declineClass);
  });

  test('remembers a refusal and stops asking', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: 'No analytics' }).click();
    await expect(page.getByRole('heading', { name: 'Analytics on this site' })).toBeHidden();

    await page.goto('/en/check');
    await expect(page.getByRole('heading', { name: 'Analytics on this site' })).toBeHidden();
  });

  test('the qualifier works identically after declining (PUB-006)', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: 'No analytics' }).click();
    await completeQualifier(page);
    await expect(page.getByRole('heading', { name: 'Your suggested next step' })).toBeVisible();
  });
});
