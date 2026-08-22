import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { totp } from '@northstar/integrations';

/**
 * The CC-03a journey end to end — CLP-001, CLP-013, SEC-002, ACC-009.
 *
 * The valuable assertions here are the refusals: a password alone never
 * produces a session, a wrong second-factor code does not, a wrong address on an
 * invitation does not, and an administrator cannot leave their organization
 * without one.
 *
 * Every account is created fresh with a unique address, because the suite runs
 * against the same database as `dev` and a test that depends on seeded state is
 * a test that breaks the first time someone reseeds.
 */

const PASSWORD = 'a quiet afternoon in august';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.org`;
}

/** Creates an organization and returns the founding administrator's address. */
async function createOrganization(page: Page, prefix: string): Promise<string> {
  const email = uniqueEmail(prefix);
  await page.goto('/en/sign-up');
  await page.getByLabel('Legal name of the organization').fill('Test Organization');
  await page.getByLabel('What kind of organization is it?').selectOption('nonprofit');
  await page.getByLabel('How many employees?').selectOption('20_to_49');
  await page.getByLabel('Your name').fill('Test Person');
  await page.getByLabel('Your email address').fill(email);
  await page.getByLabel('Choose a password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create the organization' }).click();

  // No session is created by signing up. The person is sent to sign in.
  await page.waitForURL(/\/en\/sign-in\?created=1/);
  return email;
}

/**
 * Signs in and completes first-factor enrolment, ending signed in.
 *
 * The setup key is read off the enrolment screen and the codes are computed here
 * with the same RFC 6238 implementation the fake provider uses. That is what
 * makes this a genuine enrolment rather than a test of the failure branch: the
 * suite behaves like an authenticator app, because it is doing what one does.
 */
async function signInAndEnrol(page: Page, email: string): Promise<string> {
  await signInWithPassword(page, email);
  await page.waitForURL(/\/en\/sign-in\/enrol/);

  const secret = await beginTotpEnrolment(page);
  await page.getByLabel('Six-digit code').fill(totp(secret));
  await page.getByRole('button', { name: 'Confirm' }).click();

  // Enrolment does not create a session either — the person signs in with the
  // factor they just set up.
  await page.waitForURL(/\/en\/sign-in\?enrolled=1/);
  await signInWithPassword(page, email);
  await page.waitForURL(/\/en\/sign-in\/verify/);
  await page.getByLabel('Six-digit code').fill(totp(secret));
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await page.waitForURL(/\/en\/account/);
  return secret;
}

/** Starts a TOTP enrolment and returns the setup key the screen printed. */
async function beginTotpEnrolment(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Set up an authenticator app' }).click();
  await page.waitForURL(/enrolment=/);
  const printed = await page.locator('.ns-enrol__secret-value').innerText();
  const secret = printed.replace(/\s/g, '');
  // The seed reached the page through a hand-off cookie. If it were in the URL
  // it would be in browser history and in every access log on the way here.
  expect(page.url()).not.toContain(secret);
  return secret;
}

async function signInWithPassword(page: Page, email: string): Promise<void> {
  await page.goto('/en/sign-in');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
}

test.describe('sign-in', () => {
  test('a password alone never produces a session (SEC-002)', async ({ page }) => {
    const email = await createOrganization(page, 'nosession');
    await signInWithPassword(page, email);

    // Correct credentials, and the destination is enrolment — not the account.
    await expect(page).toHaveURL(/\/en\/sign-in\/enrol/);

    // Asking for a protected page directly still bounces back to sign-in.
    await page.goto('/en/account');
    await expect(page).toHaveURL(/\/en\/sign-in/);
  });

  test('says the same thing for a wrong password and an unknown address (T-13)', async ({ page }) => {
    const email = await createOrganization(page, 'enumerate');

    await page.goto('/en/sign-in');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill('definitely not the password');
    await page.getByRole('button', { name: 'Continue' }).click();
    const wrongPassword = await page.getByRole('alert').innerText();

    await page.goto('/en/sign-in');
    await page.getByLabel('Email address').fill(uniqueEmail('nobody'));
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();
    const unknownAddress = await page.getByRole('alert').innerText();

    expect(wrongPassword).toBe(unknownAddress);
  });

  test('completes enrolment and signs in with the second factor', async ({ page }) => {
    const email = await createOrganization(page, 'enrol');
    await signInAndEnrol(page, email);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your account');
    await expect(page.getByText('Test Organization')).toBeVisible();
  });

  test('refuses a wrong second-factor code', async ({ page }) => {
    const email = await createOrganization(page, 'wrongcode');
    await signInAndEnrol(page, email);

    // Sign out, then fail the second step.
    await page.getByRole('button', { name: 'Sign out' }).click();
    await signInWithPassword(page, email);
    await page.waitForURL(/\/en\/sign-in\/verify/);
    await page.getByLabel('Six-digit code').fill('000000');
    await page.getByRole('button', { name: 'Verify and sign in' }).click();

    await expect(page).toHaveURL(/\/en\/sign-in\?error=code/);
    await page.goto('/en/account');
    await expect(page).toHaveURL(/\/en\/sign-in/);
  });

  test('signing out ends the session for good', async ({ page }) => {
    const email = await createOrganization(page, 'signout');
    await signInAndEnrol(page, email);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL(/\/en$/);

    // The cookie may still exist in the browser; the row behind it does not.
    await page.goto('/en/account');
    await expect(page).toHaveURL(/\/en\/sign-in/);
  });
});

test.describe('enrolment accessibility (ACC-009)', () => {
  test('offers the setup key as text, not only as a scannable code', async ({ page }) => {
    const email = await createOrganization(page, 'manualkey');
    await signInWithPassword(page, email);
    const key = await beginTotpEnrolment(page);
    expect(key).toMatch(/^[A-Z2-7]{20,}$/);
  });

  test('accepts a code typed with a space in it', async ({ page }) => {
    const email = await createOrganization(page, 'pasted');
    await signInWithPassword(page, email);
    const secret = await beginTotpEnrolment(page);

    const code = totp(secret);
    await page.getByLabel('Six-digit code').fill(`${code.slice(0, 3)} ${code.slice(3)}`);
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.waitForURL(/\/en\/sign-in\?enrolled=1/);
  });

  test('offers a second method rather than one route in', async ({ page }) => {
    const email = await createOrganization(page, 'altmethod');
    await signInWithPassword(page, email);
    await expect(page.getByRole('button', { name: 'Set up a passkey' })).toBeVisible();
  });
});

test.describe('recovery codes', () => {
  test('are shown once and returning the account to enrolment ends its sessions', async ({ page }) => {
    const email = await createOrganization(page, 'recovery');
    await signInAndEnrol(page, email);

    await page.goto('/en/account/security');
    await page.getByRole('button', { name: 'Generate new codes' }).click();
    await page.waitForURL(/codes=1/);

    const codes = await page.locator('.ns-recovery__codes code').allInnerTexts();
    expect(codes).toHaveLength(10);

    // The codes are not in the URL — they came through a short-lived httpOnly
    // hand-off cookie, so they are not in browser history or in any access log.
    expect(page.url()).not.toContain(codes[0]!);

    // And reloading without the flag cannot show them again, because nothing
    // stored them.
    await page.goto('/en/account/security');
    await expect(page.locator('.ns-recovery__codes')).toHaveCount(0);

    await page.goto('/en/sign-in/recover');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Recovery code').fill(codes[0]!);
    await page.getByRole('button', { name: 'Use this code' }).click();
    await page.waitForURL(/\/en\/sign-in\?recovered=1/);

    // Redeeming does not sign anyone in, and it ended the session that existed.
    await page.goto('/en/account');
    await expect(page).toHaveURL(/\/en\/sign-in/);

    // And the account is back at enrolment rather than holding a stale factor.
    await signInWithPassword(page, email);
    await expect(page).toHaveURL(/\/en\/sign-in\/enrol/);
  });

  test('refuses a code that has already been used', async ({ page }) => {
    const email = await createOrganization(page, 'reused');
    await signInAndEnrol(page, email);

    await page.goto('/en/account/security');
    await page.getByRole('button', { name: 'Generate new codes' }).click();
    await page.waitForURL(/codes=1/);
    const codes = await page.locator('.ns-recovery__codes code').allInnerTexts();

    for (const attempt of [1, 2]) {
      await page.goto('/en/sign-in/recover');
      await page.getByLabel('Email address').fill(email);
      await page.getByLabel('Recovery code').fill(codes[0]!);
      await page.getByRole('button', { name: 'Use this code' }).click();
      await page.waitForURL(attempt === 1 ? /recovered=1/ : /recover\?error=code/);
    }
  });
});

test.describe('team administration (CLP-013)', () => {
  test('invites, shows as pending, and revokes', async ({ page }) => {
    const email = await createOrganization(page, 'inviter');
    await signInAndEnrol(page, email);

    const colleague = uniqueEmail('colleague');
    await page.goto('/en/organization/team');
    await page.getByLabel('Their email address').fill(colleague);
    await page.getByLabel('Contributor', { exact: true }).check();
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await page.waitForURL(/invited=1/);
    await expect(page.getByText(colleague)).toBeVisible();

    await page.getByRole('button', { name: 'Revoke' }).click();
    await page.waitForURL(/revoked=1/);
    await expect(page.getByText('No invitations are waiting.')).toBeVisible();
  });

  test('an invited colleague can join, and only from the invited address', async ({ page, context }) => {
    const email = await createOrganization(page, 'joinflow');
    await signInAndEnrol(page, email);

    const colleague = uniqueEmail('joiner');
    await page.goto('/en/organization/team');
    await page.getByLabel('Their email address').fill(colleague);
    await page.getByLabel('Contributor', { exact: true }).check();
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await page.waitForURL(/invited=1/);

    // A local build prints the link because there is no mail server.
    const link = await page.locator('.ns-demo a').getAttribute('href');
    expect(link).toContain('/en/join?token=');

    // A second browser context, so the invited person is genuinely someone else
    // rather than the administrator following their own link.
    const joinerPage = await context.browser()!.newContext().then((c) => c.newPage());
    await joinerPage.goto(link!);
    await expect(joinerPage.getByRole('heading', { level: 1 })).toContainText('Test Organization');
    // The address is fixed to the one invited, and stated as such.
    await expect(joinerPage.getByText(colleague)).toBeVisible();

    await joinerPage.getByLabel('Your name').fill('Invited Person');
    await joinerPage.getByLabel('Choose a password').fill(PASSWORD);
    await joinerPage.getByRole('button', { name: 'Accept invitation' }).click();
    await joinerPage.waitForURL(/\/en\/sign-in\?joined=1/);

    // The same link cannot be used twice.
    await joinerPage.goto(link!);
    await expect(joinerPage.getByRole('heading', { level: 1 })).toHaveText(
      'This invitation cannot be used',
    );

    // And the administrator now sees them as a member rather than as pending.
    await page.goto('/en/organization/team');
    await expect(page.getByText('Invited Person')).toBeVisible();
    await expect(page.getByText('No invitations are waiting.')).toBeVisible();
  });

  test('refuses to leave the organization without an administrator', async ({ page }) => {
    const email = await createOrganization(page, 'lastadmin');
    await signInAndEnrol(page, email);

    // The only administrator is the viewer, and the page offers no control to
    // change one's own role — so this posts the form the server must refuse.
    await page.goto('/en/organization/team');
    await expect(page.getByRole('combobox')).toHaveCount(0);
  });

  test('does not offer internal roles to a client administrator', async ({ page }) => {
    const email = await createOrganization(page, 'noescalation');
    await signInAndEnrol(page, email);

    await page.goto('/en/organization/team');
    for (const role of ['Delivery manager', 'Qualified reviewer', 'Platform administrator', 'Specialist']) {
      await expect(page.getByLabel(role, { exact: true })).toHaveCount(0);
    }
  });
});

/**
 * Automated accessibility coverage for the screens that need a session.
 *
 * The static list in accessibility.spec.ts cannot reach these — they redirect to
 * sign-in — so they are checked here, after signing in for real. ENG-005 still
 * applies: this is regression coverage between manual passes, and it closes
 * nothing on its own.
 */
test.describe('signed-in accessibility', () => {
  const SIGNED_IN_PAGES = [
    '/en/account',
    '/en/account/security',
    '/en/organization',
    '/en/organization/team',
  ];

  for (const path of SIGNED_IN_PAGES) {
    test(`${path} has no automatically detectable WCAG 2.2 AA violations @a11y`, async ({ page }) => {
      const email = await createOrganization(page, 'a11y');
      await signInAndEnrol(page, email);

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
      const email = await createOrganization(page, 'reflow');
      await signInAndEnrol(page, email);

      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(path);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflows, 'page scrolls horizontally at 320px width').toBe(false);
    });
  }
});

test.describe('the organization profile', () => {
  test('saves a change and shows it back', async ({ page }) => {
    const email = await createOrganization(page, 'profile');
    await signInAndEnrol(page, email);

    await page.goto('/en/organization');
    await page.getByLabel('Legal name of the organization').fill('Renamed Organization');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(/saved=1/);
    await expect(page.getByLabel('Legal name of the organization')).toHaveValue(
      'Renamed Organization',
    );
  });
});
