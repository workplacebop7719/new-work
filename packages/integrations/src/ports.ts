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
import type { MfaMethod } from '@northstar/domain';

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
  readonly identity: IdentityPort;
}

/* ------------------------------------------------------------------ */
/* Identity (ADR-0002)                                                */
/* ------------------------------------------------------------------ */

/**
 * Authentication only. This port answers "who is this person", never "what may
 * they do" — memberships live in our database and are read on every request, so
 * a revoked role takes effect immediately rather than at token expiry.
 *
 * There is deliberately no `authenticated` outcome that skips a second factor.
 * SEC-002 requires MFA on every account, and a port that could express a
 * single-factor sign-in would eventually be used to perform one.
 */
export type SignInChallenge =
  /** No reason is given. Distinguishing a wrong password from an unknown
   *  address is an account-enumeration oracle (threat model T-13). */
  | { readonly outcome: 'rejected' }
  | {
      readonly outcome: 'mfa_required';
      readonly challengeId: string;
      readonly subjectId: string;
      readonly availableMethods: readonly MfaMethod[];
    }
  /** Credentials were right but no factor is enrolled yet — the invited-user
   *  path, and the only way a session is ever created without one. */
  | {
      readonly outcome: 'enrolment_required';
      readonly challengeId: string;
      readonly subjectId: string;
    };

export type SecondFactorResult =
  | { readonly outcome: 'verified'; readonly subjectId: string; readonly method: MfaMethod }
  | { readonly outcome: 'rejected' }
  /** The challenge itself timed out; the person starts again rather than
   *  retrying into a challenge that will never succeed. */
  | { readonly outcome: 'challenge_expired' };

export interface EnrolmentOffer {
  readonly enrolmentId: string;
  readonly method: MfaMethod;
  /**
   * For TOTP: the `otpauth://` URI to render as a QR code, and the same secret
   * in text for manual entry. ACC-009 — a QR code alone excludes anyone who
   * cannot see it or is enrolling on the device showing it.
   */
  readonly provisioningUri?: string;
  readonly manualEntrySecret?: string;
}

export interface IdentityPort {
  /**
   * Creates the provider-side account. Returns the same subject for the same
   * idempotency key, so a retried sign-up does not produce a second account
   * with the same address.
   */
  createSubject(
    input: { email: string; displayName: string; locale: 'en' | 'fr' },
    write: IdempotentWrite,
  ): Promise<OutboundResult>;

  /** Sets or replaces the password. Used by sign-up, invitation acceptance and reset. */
  setPassword(input: { subjectId: string; password: string }): Promise<void>;

  beginSignIn(input: { email: string; password: string }): Promise<SignInChallenge>;

  verifySecondFactor(input: {
    challengeId: string;
    method: MfaMethod;
    code: string;
  }): Promise<SecondFactorResult>;

  beginEnrolment(input: {
    subjectId: string;
    method: MfaMethod;
    accountLabel: string;
  }): Promise<EnrolmentOffer>;

  confirmEnrolment(input: {
    enrolmentId: string;
    code: string;
  }): Promise<{ enrolled: boolean; methods: readonly MfaMethod[] }>;

  enrolledMethods(subjectId: string): Promise<readonly MfaMethod[]>;

  /**
   * Issues a fresh set of single-use recovery codes, invalidating any previous
   * set. Returned in plaintext exactly once — the provider stores hashes, and so
   * does this platform's UI, which shows them and never stores them at all.
   */
  issueRecoveryCodes(subjectId: string): Promise<readonly string[]>;

  redeemRecoveryCode(input: {
    email: string;
    code: string;
  }): Promise<{ redeemed: boolean; subjectId?: string }>;

  /**
   * Disables the provider-side account. Membership revocation is a database
   * fact and takes effect first; this is the second layer, for offboarding
   * (SEC-013).
   */
  setSubjectEnabled(input: { subjectId: string; enabled: boolean }): Promise<void>;
}
