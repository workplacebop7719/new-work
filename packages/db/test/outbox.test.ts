/**
 * The transactional outbox against live PostgreSQL — ADR-0006, ARC-003, ARC-004.
 *
 * The first test is the one the whole design exists for: when the transaction
 * that enqueued a message rolls back, nothing is ever delivered. Everything else
 * is about what happens when a vendor is having a bad day.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutboundContractError } from '@northstar/domain';
import { closePool, withSystemContext, withTenant } from '../src/client';
import { migrate } from '../src/migrate';
import { DEMO_ORGANIZATION_IDS, seed } from '../src/seed';
import { provisionOrganization } from '../src/accounts';
import {
  countPending,
  currentMarketingConsent,
  drainOutbox,
  enqueue,
  listDeadLetters,
  MAX_ATTEMPTS,
  recordMarketingConsent,
  type OutboundDeliverer,
} from '../src/outbox';

const { MAPLE_GROVE, RIVERSIDE } = DEMO_ORGANIZATION_IDS;
const MAPLE_ADMIN = '0199a000-0000-7000-8000-0000000c0001';

const invitation = {
  to: 'someone@maplegrove.example',
  locale: 'en',
  acceptUrl: '/en/join?token=abc',
};

/** Records every call, so a test can assert a message reached a vendor exactly once. */
function recordingDeliverer(): OutboundDeliverer & { calls: { idempotencyKey: string }[] } {
  const calls: { idempotencyKey: string }[] = [];
  const deliver = (async (envelope) => {
    calls.push({ idempotencyKey: envelope.idempotencyKey });
    return { externalId: `ext_${calls.length}` };
  }) as OutboundDeliverer & { calls: { idempotencyKey: string }[] };
  deliver.calls = calls;
  return deliver;
}

const failingDeliverer: OutboundDeliverer = async () => {
  throw new Error('provider unavailable for someone@maplegrove.example');
};

beforeAll(async () => {
  await migrate();
  await seed();
});

afterAll(async () => {
  await closePool();
});

beforeEach(async () => {
  await withSystemContext('test fixture reset', async (tx) => {
    await tx.query('DELETE FROM outbox_messages');
    await tx.query('SET LOCAL ROLE NONE');
    await tx.query('ALTER TABLE marketing_consents DISABLE TRIGGER marketing_consents_no_update');
    await tx.query('DELETE FROM marketing_consents');
    await tx.query('ALTER TABLE marketing_consents ENABLE TRIGGER marketing_consents_no_update');
  });
});

describe('the guarantee the outbox exists for', () => {
  it('delivers nothing when the transaction that enqueued it rolls back', async () => {
    const deliver = recordingDeliverer();

    await expect(
      withTenant(MAPLE_GROVE, async (tx) => {
        await enqueue(tx, {
          organizationId: MAPLE_GROVE,
          messageType: 'email.invitation',
          payload: invitation,
        });
        // The domain change fails after the message was enqueued. This is the
        // exact shape of OPS-009: a side effect promised for something that did
        // not happen.
        throw new Error('the domain write failed');
      }),
    ).rejects.toThrow('the domain write failed');

    const report = await drainOutbox(deliver, { apply: true });
    expect(report.claimed).toBe(0);
    expect(deliver.calls).toEqual([]);
  });

  it('delivers exactly once when the transaction commits', async () => {
    const deliver = recordingDeliverer();
    await withTenant(MAPLE_GROVE, async (tx) => {
      await enqueue(tx, {
        organizationId: MAPLE_GROVE,
        messageType: 'email.invitation',
        payload: invitation,
      });
    });

    const first = await drainOutbox(deliver, { apply: true });
    expect(first).toMatchObject({ claimed: 1, delivered: 1, retried: 0, died: 0 });

    // A second drain finds nothing: the message is delivered, not pending.
    const second = await drainOutbox(deliver, { apply: true });
    expect(second.claimed).toBe(0);
    expect(deliver.calls).toHaveLength(1);
  });

  it('is dry-run by default, like every other job that touches client data', async () => {
    const deliver = recordingDeliverer();
    await withTenant(MAPLE_GROVE, async (tx) => {
      await enqueue(tx, {
        organizationId: MAPLE_GROVE,
        messageType: 'email.invitation',
        payload: invitation,
      });
    });

    const report = await drainOutbox(deliver);
    expect(report).toMatchObject({ claimed: 1, delivered: 0, applied: false });
    expect(deliver.calls).toEqual([]);
  });
});

describe('retry and the dead-letter queue (ARC-003)', () => {
  it('backs off rather than hammering a failing provider', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await enqueue(tx, {
        organizationId: MAPLE_GROVE,
        messageType: 'email.invitation',
        payload: invitation,
      });
    });

    const first = await drainOutbox(failingDeliverer, { apply: true });
    expect(first).toMatchObject({ delivered: 0, retried: 1, died: 0 });

    // Immediately due again? No — the next attempt is scheduled into the future.
    const { due, scheduled } = await countPending();
    expect(due).toBe(0);
    expect(scheduled).toBe(1);

    const immediate = await drainOutbox(failingDeliverer, { apply: true });
    expect(immediate.claimed).toBe(0);
  });

  it('gives up loudly rather than retrying forever', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await enqueue(tx, {
        organizationId: MAPLE_GROVE,
        messageType: 'email.invitation',
        payload: invitation,
      });
    });

    // Drain repeatedly with the clock moved far enough forward each time that
    // the backoff has elapsed.
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const future = new Date(Date.now() + attempt * 4 * 60 * 60 * 1000);
      await drainOutbox(failingDeliverer, { apply: true, now: future });
    }

    const dead = await listDeadLetters();
    expect(dead).toHaveLength(1);
    expect(dead[0]!.attempts).toBe(MAX_ATTEMPTS);
    // dead_requires_error: a review queue of rows with no reason is not a review.
    expect(dead[0]!.lastError).toBeTruthy();
  });

  it('redacts the address out of a provider error before storing it', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await enqueue(tx, {
        organizationId: MAPLE_GROVE,
        messageType: 'email.invitation',
        payload: invitation,
      });
    });
    await drainOutbox(failingDeliverer, { apply: true });

    const stored = await withSystemContext('reading the error for the test', async (tx) => {
      const { rows } = await tx.query<{ last_error: string }>(
        'SELECT last_error FROM outbox_messages',
      );
      return rows[0]!.last_error;
    });
    // A provider error routinely quotes the request back. The address must not
    // survive into a table that is read during incident review.
    expect(stored).toContain('provider unavailable');
    expect(stored).not.toContain('someone@maplegrove.example');
  });

  it('keeps one idempotency key across every retry (ARC-004)', async () => {
    const deliver = recordingDeliverer();
    let failuresLeft = 2;
    const flaky: OutboundDeliverer = async (envelope) => {
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw new Error('transient');
      }
      return deliver(envelope);
    };

    await withTenant(MAPLE_GROVE, async (tx) => {
      await enqueue(tx, {
        organizationId: MAPLE_GROVE,
        messageType: 'email.invitation',
        payload: invitation,
      });
    });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const future = new Date(Date.now() + attempt * 4 * 60 * 60 * 1000);
      await drainOutbox(flaky, { apply: true, now: future });
    }

    expect(deliver.calls).toHaveLength(1);
    // The key is derived from the row id, so a provider that saw an earlier
    // partially-successful attempt can recognize this one as the same write.
    expect(deliver.calls[0]!.idempotencyKey).toMatch(/^email\.invitation:/);
  });
});

describe('what may be enqueued', () => {
  it('refuses a field that is not on the allowlist, before it is stored', async () => {
    await expect(
      withTenant(MAPLE_GROVE, async (tx) => {
        await enqueue(tx, {
          organizationId: MAPLE_GROVE,
          messageType: 'email.invitation',
          payload: { ...invitation, role: 'client_admin' },
        });
      }),
    ).rejects.toThrow(OutboundContractError);

    expect((await countPending()).due).toBe(0);
  });

  it('refuses a CRM contact with no recorded consent (CNV-004)', async () => {
    await expect(
      withTenant(MAPLE_GROVE, async (tx) => {
        await enqueue(tx, {
          organizationId: MAPLE_GROVE,
          messageType: 'crm.contact_upserted',
          payload: {
            email: 'lead@maplegrove.example',
            organizationName: 'Maple Grove Learning Group',
            employeeBand: '50_to_199',
            locale: 'en',
            source: 'sign_up',
            marketingConsent: false,
          },
        });
      }),
    ).rejects.toThrow(/marketing consent/);

    // There is no state in which the platform holds a queued message it is not
    // permitted to send.
    expect((await countPending()).due).toBe(0);
  });

  it('accepts the same CRM contact once consent is recorded', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await enqueue(tx, {
        organizationId: MAPLE_GROVE,
        messageType: 'crm.contact_upserted',
        payload: {
          email: 'lead@maplegrove.example',
          organizationName: 'Maple Grove Learning Group',
          employeeBand: '50_to_199',
          locale: 'en',
          source: 'sign_up',
          marketingConsent: true,
        },
      });
    });
    expect((await countPending()).due).toBe(1);
  });
});

describe('tenancy', () => {
  it('hides another tenant’s queued messages', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await enqueue(tx, {
        organizationId: MAPLE_GROVE,
        messageType: 'email.invitation',
        payload: invitation,
      });
    });

    const seen = await withTenant(RIVERSIDE, async (tx) => {
      const { rows } = await tx.query('SELECT id FROM outbox_messages');
      return rows;
    });
    expect(seen).toEqual([]);
  });

  it('refuses to enqueue into another tenant', async () => {
    await expect(
      withTenant(RIVERSIDE, async (tx) => {
        await enqueue(tx, {
          organizationId: MAPLE_GROVE,
          messageType: 'email.invitation',
          payload: invitation,
        });
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  it('lets the worker see every tenant, which is why it runs under system context', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await enqueue(tx, {
        organizationId: MAPLE_GROVE,
        messageType: 'email.invitation',
        payload: invitation,
      });
    });
    await withTenant(RIVERSIDE, async (tx) => {
      await enqueue(tx, {
        organizationId: RIVERSIDE,
        messageType: 'email.invitation',
        payload: { ...invitation, to: 'someone@riverside.example' },
      });
    });

    const deliver = recordingDeliverer();
    const report = await drainOutbox(deliver, { apply: true });
    expect(report.delivered).toBe(2);
  });
});

describe('sign-up as one transaction', () => {
  const founder = (suffix: string) => ({
    email: `founder-${suffix}-${Date.now()}@example.org`,
    displayName: 'Founder',
    identitySubjectId: `sub_${suffix}_${Date.now()}`,
  });

  it('records a refusal and queues nothing', async () => {
    const person = founder('declined');
    const { organizationId } = await provisionOrganization({
      legalName: 'Declined Org',
      organizationType: 'nonprofit',
      employeeBand: '20_to_49',
      jurisdiction: 'CA-ON',
      preferredLanguage: 'en',
      founder: person,
      marketingConsent: false,
    });

    expect(await currentMarketingConsent(organizationId, person.email)).toMatchObject({
      granted: false,
      source: 'sign_up',
    });
    expect((await countPending()).due).toBe(0);
  });

  it('records consent and queues exactly one CRM message', async () => {
    const person = founder('agreed');
    const { organizationId } = await provisionOrganization({
      legalName: 'Agreed Org',
      organizationType: 'nonprofit',
      employeeBand: '50_to_199',
      jurisdiction: 'CA-ON',
      preferredLanguage: 'en',
      founder: person,
      marketingConsent: true,
    });

    expect(await currentMarketingConsent(organizationId, person.email)).toMatchObject({
      granted: true,
    });

    const deliver = recordingDeliverer();
    const report = await drainOutbox(deliver, { apply: true });
    expect(report.delivered).toBe(1);
    expect(deliver.calls[0]!.idempotencyKey).toMatch(/^crm\.contact_upserted:/);
  });

  it('leaves no user, no organization and no message when any part fails', async () => {
    const person = founder('conflict');
    await provisionOrganization({
      legalName: 'First Org',
      organizationType: 'nonprofit',
      employeeBand: '20_to_49',
      jurisdiction: 'CA-ON',
      preferredLanguage: 'en',
      founder: person,
      marketingConsent: true,
    });

    // The same address again: the unique index on `users.email` rejects it, and
    // the whole transaction goes with it. Under the CC-03a three-transaction
    // version this left a provider subject and a user row behind.
    await expect(
      provisionOrganization({
        legalName: 'Second Org',
        organizationType: 'nonprofit',
        employeeBand: '20_to_49',
        jurisdiction: 'CA-ON',
        preferredLanguage: 'en',
        founder: person,
        marketingConsent: true,
      }),
    ).rejects.toThrow();

    const organizations = await withSystemContext('counting orgs for the test', async (tx) => {
      const { rows } = await tx.query<{ n: string }>(
        `SELECT count(*) AS n FROM organizations WHERE legal_name = 'Second Org'`,
      );
      return Number(rows[0]!.n);
    });
    expect(organizations).toBe(0);
    // One message from the first sign-up, not two.
    expect((await countPending()).due).toBe(1);
  });
});

describe('the marketing consent register (CNV-004, SEC-012)', () => {
  it('records both answers, because a recorded refusal is the point', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await recordMarketingConsent(tx, {
        organizationId: MAPLE_GROVE,
        userId: MAPLE_ADMIN,
        email: 'Priya@maplegrove.example',
        granted: false,
        source: 'sign_up',
      });
    });

    const current = await currentMarketingConsent(MAPLE_GROVE, 'priya@maplegrove.example');
    expect(current).toMatchObject({ granted: false, source: 'sign_up' });
  });

  it('treats a withdrawal as a new row, and the latest row wins', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await recordMarketingConsent(tx, {
        organizationId: MAPLE_GROVE,
        userId: MAPLE_ADMIN,
        email: 'priya@maplegrove.example',
        granted: true,
        source: 'sign_up',
      });
    });
    await withTenant(MAPLE_GROVE, async (tx) => {
      await recordMarketingConsent(tx, {
        organizationId: MAPLE_GROVE,
        userId: MAPLE_ADMIN,
        email: 'priya@maplegrove.example',
        granted: false,
        source: 'account_settings',
      });
    });

    expect(await currentMarketingConsent(MAPLE_GROVE, 'priya@maplegrove.example')).toMatchObject({
      granted: false,
      source: 'account_settings',
    });

    // Both rows survive: "what did they agree to, and when?" has an answer.
    const history = await withSystemContext('reading consent history for the test', async (tx) => {
      const { rows } = await tx.query('SELECT id FROM marketing_consents');
      return rows;
    });
    expect(history).toHaveLength(2);
  });

  it('refuses to let an existing consent record be rewritten', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await recordMarketingConsent(tx, {
        organizationId: MAPLE_GROVE,
        userId: MAPLE_ADMIN,
        email: 'priya@maplegrove.example',
        granted: false,
        source: 'sign_up',
      });
    });

    await expect(
      withTenant(MAPLE_GROVE, async (tx) => {
        await tx.query('UPDATE marketing_consents SET granted = true');
      }),
    ).rejects.toThrow(/append-only|permission denied/i);
  });

  it('hides another tenant’s consent records', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await recordMarketingConsent(tx, {
        organizationId: MAPLE_GROVE,
        userId: MAPLE_ADMIN,
        email: 'priya@maplegrove.example',
        granted: true,
        source: 'sign_up',
      });
    });

    expect(await currentMarketingConsent(RIVERSIDE, 'priya@maplegrove.example')).toBeUndefined();
  });
});
