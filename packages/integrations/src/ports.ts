/**
 * Integration ports — ADR-0006.
 *
 * The domain defines the interface; adapters implement it. No vendor SDK type
 * appears in a port signature, which is what makes ARC-002's "replaceable behind
 * domain interfaces" testable: the whole application compiles and runs against
 * the fakes in ./fakes.ts.
 *
 * CC-01 declares the ports and ships fakes only. Real adapters arrive in CC-03
 * (payments, identity, CRM) once ADR-0006's vendor questions (Q-14) are answered.
 */

export interface OutboundResult {
  /** Provider-side identifier, stored so a retry can be recognized as a duplicate. */
  readonly externalId: string;
}

/**
 * Every outbound write carries an idempotency key derived from the domain event
 * id (ARC-004). It is a required parameter rather than an option: an
 * accidentally omitted key is how a client gets charged twice.
 */
export interface IdempotentWrite {
  readonly idempotencyKey: string;
}

/* ------------------------------------------------------------------ */

export interface CrmContact {
  readonly email: string;
  readonly organizationName: string;
  readonly employeeBand: string;
  readonly locale: 'en' | 'fr';
  readonly resultCategory: string;
  readonly source: string;
  /** CNV-004: consent status travels with the record, always. */
  readonly marketingConsent: boolean;
  readonly accommodationRequested: boolean;
}

export interface CrmPort {
  upsertContact(contact: CrmContact, write: IdempotentWrite): Promise<OutboundResult>;
}

export interface PaymentIntent {
  readonly amountCents: number;
  readonly currency: 'CAD';
  readonly offerKey: string;
  readonly organizationRef: string;
}

export interface PaymentPort {
  createIntent(intent: PaymentIntent, write: IdempotentWrite): Promise<OutboundResult>;
}

export interface EmailMessage {
  readonly to: string;
  readonly templateKey: string;
  readonly locale: 'en' | 'fr';
  readonly variables: Readonly<Record<string, string>>;
}

export interface EmailPort {
  send(message: EmailMessage, write: IdempotentWrite): Promise<OutboundResult>;
}

export interface StoredObject {
  readonly key: string;
  readonly bucket: 'quarantine' | 'evidence' | 'derivatives';
}

export interface StoragePort {
  /** Presigned PUT into quarantine, constrained by content type and size (ADR-0004). */
  createUploadUrl(input: {
    bucket: 'quarantine';
    contentType: string;
    maxBytes: number;
    expiresInSeconds: number;
  }): Promise<{ url: string; object: StoredObject }>;

  /** Short-lived, single-object, issued only after a policy check. */
  createDownloadUrl(object: StoredObject, expiresInSeconds: number): Promise<string>;
}

export type ScanVerdict = 'clean' | 'infected' | 'failed';

export interface MalwareScanPort {
  scan(object: StoredObject): Promise<{ verdict: ScanVerdict; detail?: string }>;
}

export interface SignaturePort {
  requestSignature(input: {
    documentKey: string;
    signerEmail: string;
    locale: 'en' | 'fr';
  }, write: IdempotentWrite): Promise<OutboundResult>;
}

/**
 * The full set of external dependencies, injected as one object so a test or a
 * local `dev` run can supply fakes for all of them (CMD-001: "start the full
 * local experience with safe mock integrations").
 */
export interface Integrations {
  readonly crm: CrmPort;
  readonly payment: PaymentPort;
  readonly email: EmailPort;
  readonly storage: StoragePort;
  readonly malwareScan: MalwareScanPort;
  readonly signature: SignaturePort;
}
