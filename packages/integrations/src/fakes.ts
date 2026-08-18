/**
 * In-memory fakes, used by `dev`, tests and preview environments.
 *
 * They enforce the same contracts the real adapters must honour — most
 * importantly idempotency, so a missing key fails locally rather than in
 * production against a payment provider.
 */
import type {
  CrmContact,
  CrmPort,
  EmailMessage,
  EmailPort,
  IdempotentWrite,
  Integrations,
  MalwareScanPort,
  OutboundResult,
  PaymentIntent,
  PaymentPort,
  ScanVerdict,
  SignaturePort,
  StoragePort,
  StoredObject,
} from './ports';

class IdempotencyLedger {
  private readonly seen = new Map<string, OutboundResult>();

  run(write: IdempotentWrite, make: () => OutboundResult): OutboundResult {
    if (!write.idempotencyKey) {
      throw new Error('Outbound writes require an idempotency key (ARC-004).');
    }
    const existing = this.seen.get(write.idempotencyKey);
    if (existing) return existing;
    const result = make();
    this.seen.set(write.idempotencyKey, result);
    return result;
  }

  get size(): number {
    return this.seen.size;
  }
}

export class FakeCrm implements CrmPort {
  readonly contacts: CrmContact[] = [];
  private readonly ledger = new IdempotencyLedger();

  // async, so a contract violation surfaces as a rejected promise exactly as it
  // would from a real HTTP adapter — not as a synchronous throw the caller's
  // error handling would miss.
  async upsertContact(contact: CrmContact, write: IdempotentWrite): Promise<OutboundResult> {
    return this.ledger.run(write, () => {
      this.contacts.push(contact);
      return { externalId: `crm_${this.contacts.length}` };
    });
  }
}

export class FakePayment implements PaymentPort {
  readonly intents: PaymentIntent[] = [];
  private readonly ledger = new IdempotencyLedger();

  async createIntent(intent: PaymentIntent, write: IdempotentWrite): Promise<OutboundResult> {
    return this.ledger.run(write, () => {
      this.intents.push(intent);
      return { externalId: `pay_${this.intents.length}` };
    });
  }
}

export class FakeEmail implements EmailPort {
  readonly messages: EmailMessage[] = [];
  private readonly ledger = new IdempotencyLedger();

  async send(message: EmailMessage, write: IdempotentWrite): Promise<OutboundResult> {
    return this.ledger.run(write, () => {
      this.messages.push(message);
      return { externalId: `eml_${this.messages.length}` };
    });
  }
}

export class FakeStorage implements StoragePort {
  private counter = 0;

  async createUploadUrl(input: {
    bucket: 'quarantine';
    contentType: string;
    maxBytes: number;
    expiresInSeconds: number;
  }): Promise<{ url: string; object: StoredObject }> {
    if (input.bucket !== 'quarantine') {
      // ADR-0004: uploads land in quarantine, never directly in the evidence
      // bucket. Encoded here so a fake cannot teach a wrong habit.
      throw new Error('Uploads must target the quarantine bucket.');
    }
    this.counter += 1;
    const object: StoredObject = { key: `quarantine/${this.counter}`, bucket: 'quarantine' };
    return { url: `https://fake.local/upload/${this.counter}`, object };
  }

  async createDownloadUrl(object: StoredObject, expiresInSeconds: number): Promise<string> {
    if (object.bucket === 'quarantine') {
      throw new Error('Quarantined objects are never downloadable (ADR-0004).');
    }
    if (expiresInSeconds > 900) {
      throw new Error('Signed URLs expire within 15 minutes.');
    }
    return `https://fake.local/download/${object.key}?expires=${expiresInSeconds}`;
  }
}

export class FakeMalwareScan implements MalwareScanPort {
  /** Objects whose key contains this marker are reported infected, for tests. */
  static readonly INFECTED_MARKER = 'eicar';

  async scan(object: StoredObject): Promise<{ verdict: ScanVerdict; detail?: string }> {
    return object.key.includes(FakeMalwareScan.INFECTED_MARKER)
      ? { verdict: 'infected', detail: 'test signature' }
      : { verdict: 'clean' };
  }
}

export class FakeSignature implements SignaturePort {
  private readonly ledger = new IdempotencyLedger();

  async requestSignature(
    input: { documentKey: string; signerEmail: string; locale: 'en' | 'fr' },
    write: IdempotentWrite,
  ): Promise<OutboundResult> {
    return this.ledger.run(write, () => ({ externalId: `sig_${input.documentKey}` }));
  }
}

export function createFakeIntegrations(): Integrations {
  return {
    crm: new FakeCrm(),
    payment: new FakePayment(),
    email: new FakeEmail(),
    storage: new FakeStorage(),
    malwareScan: new FakeMalwareScan(),
    signature: new FakeSignature(),
  };
}
