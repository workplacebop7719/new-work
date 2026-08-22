/**
 * The demo bootstrap — CMD-003, and the accounts `docs/runbook.md` promises.
 *
 * `pnpm db:seed` creates the Maple Grove tenant and its people. It cannot create
 * their *credentials*, because those live with the identity provider and the
 * provider in a local build is in-memory (ADR-0002, ADR-0006). This module fills
 * that gap once per process.
 *
 * Two guards keep it out of anything real:
 *
 *   - It does nothing unless `usingFakeIdentity()` — a check on the object in
 *     use, not on an environment variable someone can set wrongly.
 *   - It sets a password only on accounts it has just provisioned in the fake.
 *     Against a real adapter it is inert, and there is no branch in which it
 *     writes a credential anywhere but the fake.
 */
import { linkIdentitySubject, withSystemContext } from '@northstar/db';
import { integrations, usingFakeIdentity } from './integrations';

/** Shown on the sign-in page in a local build so the accounts are discoverable. */
export const DEMO_PASSWORD = 'northstar demo passphrase';

export interface DemoAccount {
  readonly email: string;
  readonly displayName: string;
  readonly role: string;
  readonly organizationName: string;
  readonly subjectId: string;
}

let provisioned: readonly DemoAccount[] | undefined;
let inFlight: Promise<readonly DemoAccount[]> | undefined;

/**
 * Provisions every seeded account at the fake provider, once.
 *
 * Concurrent callers share one promise: Next.js renders several server
 * components in parallel, and without this the first page load would run the
 * bootstrap three or four times over.
 */
export async function ensureDemoAccounts(): Promise<readonly DemoAccount[]> {
  if (!usingFakeIdentity()) return [];
  if (provisioned) return provisioned;
  inFlight ??= provision();
  provisioned = await inFlight;
  return provisioned;
}

/**
 * What counts as a demo account.
 *
 * Only addresses in the reserved `.example` top-level domain, which is exactly
 * what `db:seed` uses. RFC 2606 sets that TLD aside so it can never belong to
 * anyone, which makes it a predicate that cannot accidentally match a real
 * person — including someone who signs up on a local build to try the product.
 *
 * This condition is load-bearing rather than cosmetic. Without it the bootstrap
 * enumerated every user and reset each one's password to the demo passphrase,
 * silently locking out anyone who had created a real account locally. An
 * end-to-end test signing in immediately after signing up is what caught it.
 */
const DEMO_ADDRESS_SUFFIX = '.example';

async function provision(): Promise<readonly DemoAccount[]> {
  const rows = await withSystemContext('demo account bootstrap (local fake provider)', async (tx) => {
    const result = await tx.query<{
      id: string;
      email: string;
      display_name: string;
      preferred_language: 'en' | 'fr';
      role: string;
      legal_name: string;
    }>(
      `SELECT u.id, u.email, u.display_name, u.preferred_language, m.role, o.legal_name
         FROM users u
         JOIN memberships m ON m.user_id = u.id
         JOIN organizations o ON o.id = m.organization_id
        WHERE u.email LIKE $1
        ORDER BY o.legal_name, u.display_name`,
      [`%${DEMO_ADDRESS_SUFFIX}`],
    );
    return result.rows;
  });

  const identity = integrations().identity;
  const accounts: DemoAccount[] = [];
  for (const row of rows) {
    const subject = await identity.createSubject(
      {
        email: row.email,
        displayName: row.display_name,
        locale: row.preferred_language,
      },
      { idempotencyKey: `demo-subject:${row.id}` },
    );
    await identity.setPassword({ subjectId: subject.externalId, password: DEMO_PASSWORD });
    // The fake derives subject ids from the address, so this link survives a
    // restart and re-linking is a no-op rather than a conflict.
    await linkIdentitySubject(row.id, subject.externalId);
    accounts.push({
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      organizationName: row.legal_name,
      subjectId: subject.externalId,
    });
  }
  return accounts;
}

/**
 * The code the fake provider would accept right now, for a secret that is
 * already on screen during enrolment.
 *
 * This exists because a local build has no authenticator app in it. Printing the
 * current code next to the setup key is what makes `pnpm dev` and the
 * end-to-end suite able to complete a real enrolment rather than only its
 * failure branch.
 *
 * It returns undefined unless the fake is the provider in use, so no real
 * secret can reach it — and it takes the secret that the enrolment screen is
 * already displaying, so it reveals nothing that page did not already show.
 */
export async function demoTotpFor(secret: string | undefined): Promise<string | undefined> {
  if (!secret || !usingFakeIdentity()) return undefined;
  const { totp } = await import('@northstar/integrations');
  try {
    return totp(secret);
  } catch {
    return undefined;
  }
}
