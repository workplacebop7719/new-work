import { expect, test } from '@playwright/test';
import { totp } from '@northstar/integrations';

/**
 * ARC-006 for the authentication surface.
 *
 * The public qualifier already has this coverage. Sign-in needs it more: an
 * authentication gate that requires JavaScript does not degrade to a slower
 * experience, it locks a person out of the product entirely — including anyone
 * whose assistive setup, corporate policy or network breaks a bundle.
 *
 * This project runs with `javaScriptEnabled: false`, so every interaction below
 * is a native form submission. No hidden field is filled by hydration and no
 * button waits on a handler.
 */

const PASSWORD = 'a quiet afternoon in august';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.org`;
}

test('the whole account journey works with JavaScript disabled', async ({ page }) => {
  const email = uniqueEmail('nojs');

  // Create the organization.
  await page.goto('/en/sign-up');
  await page.getByLabel('Legal name of the organization').fill('No Script Collective');
  await page.getByLabel('What kind of organization is it?').selectOption('association');
  await page.getByLabel('How many employees?').selectOption('under_20');
  await page.getByLabel('Your name').fill('Script Free');
  await page.getByLabel('Your email address').fill(email);
  await page.getByLabel('Choose a password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create the organization' }).click();
  await page.waitForURL(/\/en\/sign-in\?created=1/);

  // Sign in with the password — which routes to enrolment, never to a session.
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL(/\/en\/sign-in\/enrol/);

  // Enrol a factor.
  await page.getByRole('button', { name: 'Set up an authenticator app' }).click();
  await page.waitForURL(/enrolment=/);
  const secret = (await page.locator('.ns-enrol__secret-value').innerText()).replace(/\s/g, '');
  await page.getByLabel('Six-digit code').fill(totp(secret));
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.waitForURL(/\/en\/sign-in\?enrolled=1/);

  // Sign in properly.
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL(/\/en\/sign-in\/verify/);
  await page.getByLabel('Six-digit code').fill(totp(secret));
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await page.waitForURL(/\/en\/account/);

  // Administer the team.
  await page.goto('/en/organization/team');
  await page.getByLabel('Their email address').fill(uniqueEmail('nojs-colleague'));
  await page.getByLabel('Contributor', { exact: true }).check();
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await page.waitForURL(/invited=1/);

  // And sign out.
  await page.goto('/en/account');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(/\/en$/);
  await page.goto('/en/account');
  await expect(page).toHaveURL(/\/en\/sign-in/);
});

test('the alternative verification method is reachable without scripting', async ({ page }) => {
  // ACC-009 asks for an alternative method. A script-driven tab switch would
  // meet the letter of that and fail here, which is the point of the test.
  await page.goto('/en/sign-in/verify');
  await page.getByRole('link', { name: 'Use a passkey instead' }).click();
  await expect(page).toHaveURL(/method=passkey/);
  await expect(page.getByRole('button', { name: 'Confirm with passkey' })).toBeVisible();
});
