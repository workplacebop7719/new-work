import { describe, expect, it } from 'vitest';
import { FakePayment, FakeStorage, createFakeIntegrations } from './fakes';

describe('idempotency (ARC-004)', () => {
  it('does not repeat an outbound write when the same key is retried', async () => {
    const payment = new FakePayment();
    const intent = { amountCents: 49500, currency: 'CAD', offerKey: 'assessment', organizationRef: 'o1' } as const;
    const first = await payment.createIntent(intent, { idempotencyKey: 'evt-1' });
    const retry = await payment.createIntent(intent, { idempotencyKey: 'evt-1' });
    expect(retry.externalId).toBe(first.externalId);
    expect(payment.intents).toHaveLength(1);
  });

  it('refuses a write with no idempotency key', async () => {
    const payment = new FakePayment();
    await expect(
      payment.createIntent(
        { amountCents: 1, currency: 'CAD', offerKey: 'x', organizationRef: 'o1' },
        { idempotencyKey: '' },
      ),
    ).rejects.toThrow(/idempotency key/);
  });
});

describe('storage contract (ADR-0004)', () => {
  it('only issues upload URLs into quarantine', async () => {
    const storage = new FakeStorage();
    const { object } = await storage.createUploadUrl({
      bucket: 'quarantine',
      contentType: 'application/pdf',
      maxBytes: 25_000_000,
      expiresInSeconds: 300,
    });
    expect(object.bucket).toBe('quarantine');
  });

  it('never issues a download URL for a quarantined object', async () => {
    const storage = new FakeStorage();
    await expect(
      storage.createDownloadUrl({ key: 'quarantine/1', bucket: 'quarantine' }, 300),
    ).rejects.toThrow(/never downloadable/);
  });

  it('caps signed URL lifetime', async () => {
    const storage = new FakeStorage();
    await expect(
      storage.createDownloadUrl({ key: 'evidence/1', bucket: 'evidence' }, 3600),
    ).rejects.toThrow(/expire/);
  });
});

describe('local development integrations', () => {
  it('provides a fake for every declared port (CMD-001 dev)', () => {
    const integrations = createFakeIntegrations();
    expect(Object.keys(integrations).sort()).toEqual(
      ['crm', 'email', 'malwareScan', 'payment', 'signature', 'storage'].sort(),
    );
  });
});
