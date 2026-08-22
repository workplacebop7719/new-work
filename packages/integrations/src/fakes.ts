/**
 * In-memory fakes, used by `dev`, tests and preview environments.
 *
 * They enforce the same contracts the real adapters must honour — most
 * importantly idempotency, so a missing key fails locally rather than in
 * production against a payment provider.
 */
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { passwordProblems, RECOVERY_CODE_COUNT, type MfaMethod } from '@northstar/domain';
import { encodeBase32, totp, totpUri, verifyTotp } from './totp';
import type {
  CrmContact,
  CrmPort,
  EmailMessage,
  EmailPort,
  EnrolmentOffer,
  IdempotentWrite,
  IdentityPort,
  Integrations,
  MalwareScanPort,
  OutboundResult,
  PaymentIntent,
  PaymentPort,
  ScanVerdict,
  SecondFactorResult,
  SignaturePort,
  SignInChallenge,
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

/**
 * An in-memory identity provider.
 *
 * ADR-0002 chose a managed provider with our own authentication UI. This fake
 * stands in for it so that `dev`, `test` and preview environments run the real
 * screens — enrolment, a wrong code, a locked account, recovery — without a
 * vendor account and without anyone's real address.
 *
 * It is strict on purpose. Every rule the real provider will enforce is enforced
 * here too, because a permissive fake produces code that only works locally: the
 * password policy is applied, the challenge expires, the recovery code is
 * single-use, and no method returns a reason for a rejection.
 */
export class FakeIdentity implements IdentityPort {
  private readonly subjects = new Map<string, FakeSubject>();
  private readonly byEmail = new Map<string, string>();
  private readonly challenges = new Map<string, FakeChallenge>();
  private readonly enrolments = new Map<string, FakeEnrolment>();
  private readonly ledger = new IdempotencyLedger();

  /** Five minutes: long enough to find a phone, short enough to be worth stealing. */
  static readonly CHALLENGE_TTL_MS = 5 * 60 * 1000;

  /** Injectable so tests can drive expiry without waiting. */
  now: () => Date = () => new Date();

  async createSubject(
    input: { email: string; displayName: string; locale: 'en' | 'fr' },
    write: IdempotentWrite,
  ): Promise<OutboundResult> {
    return this.ledger.run(write, () => {
      const email = normalizeEmail(input.email);
      const existing = this.byEmail.get(email);
      if (existing) return { externalId: existing };
      // Derived from the address rather than random, so a restart of the process
      // produces the same subject ids. The database stores those ids; random
      // ones would orphan every seeded account on every reload, and "sign-in
      // works until you restart the dev server" is not a working local
      // experience (CMD-001).
      const subjectId = `sub_${createHash('sha256').update(email).digest('hex').slice(0, 32)}`;
      this.subjects.set(subjectId, {
        subjectId,
        email,
        displayName: input.displayName,
        locale: input.locale,
        passwordHash: null,
        enabled: true,
        factors: new Map(),
        recoveryHashes: new Set(),
      });
      this.byEmail.set(email, subjectId);
      return { externalId: subjectId };
    });
  }

  async setPassword(input: { subjectId: string; password: string }): Promise<void> {
    const subject = this.require(input.subjectId);
    const problems = passwordProblems(input.password);
    if (problems.length > 0) {
      // The real provider rejects too. Failing here means a weak password is
      // impossible to set locally, so the UI's error path is exercised in dev.
      throw new Error(`Password rejected: ${problems.join(', ')}`);
    }
    subject.passwordHash = hashPassword(input.password);
  }

  async beginSignIn(input: { email: string; password: string }): Promise<SignInChallenge> {
    const subjectId = this.byEmail.get(normalizeEmail(input.email));
    const subject = subjectId ? this.subjects.get(subjectId) : undefined;
    // The password is hashed even when the address is unknown, so the response
    // time does not distinguish the two cases (threat model T-13).
    const candidate = hashPassword(input.password, subject?.passwordHash ?? undefined);
    if (!subject || !subject.enabled || subject.passwordHash === null) return { outcome: 'rejected' };
    if (!constantTimeEquals(candidate, subject.passwordHash)) return { outcome: 'rejected' };

    const challengeId = `chl_${randomUUID()}`;
    this.challenges.set(challengeId, {
      subjectId: subject.subjectId,
      expiresAt: new Date(this.now().getTime() + FakeIdentity.CHALLENGE_TTL_MS),
    });
    const methods = [...subject.factors.keys()];
    return methods.length === 0
      ? { outcome: 'enrolment_required', challengeId, subjectId: subject.subjectId }
      : { outcome: 'mfa_required', challengeId, subjectId: subject.subjectId, availableMethods: methods };
  }

  async verifySecondFactor(input: {
    challengeId: string;
    method: MfaMethod;
    code: string;
  }): Promise<SecondFactorResult> {
    const challenge = this.challenges.get(input.challengeId);
    if (!challenge) return { outcome: 'rejected' };
    if (challenge.expiresAt.getTime() <= this.now().getTime()) {
      this.challenges.delete(input.challengeId);
      return { outcome: 'challenge_expired' };
    }
    const subject = this.subjects.get(challenge.subjectId);
    const factor = subject?.factors.get(input.method);
    if (!subject || !factor) return { outcome: 'rejected' };

    const ok =
      input.method === 'totp'
        ? verifyTotp(factor.secret ?? '', input.code, this.now())
        : // A passkey assertion is a signature the browser produces. There is no
          // honest way to fake that shape, so the fake accepts a fixed token and
          // the real adapter replaces this branch entirely.
          input.code === FakeIdentity.PASSKEY_ASSERTION;
    if (!ok) return { outcome: 'rejected' };

    // Single use: a replayed challenge id fails even with a still-valid code.
    this.challenges.delete(input.challengeId);
    return { outcome: 'verified', subjectId: subject.subjectId, method: input.method };
  }

  /** Stands in for the browser's WebAuthn assertion in dev and tests. */
  static readonly PASSKEY_ASSERTION = 'fake-passkey-assertion';

  async beginEnrolment(input: {
    subjectId: string;
    method: MfaMethod;
    accountLabel: string;
  }): Promise<EnrolmentOffer> {
    const subject = this.require(input.subjectId);
    if (input.method === 'recovery_code') {
      throw new Error('Recovery codes are issued, not enrolled.');
    }
    const enrolmentId = `enr_${randomUUID()}`;
    const secret = encodeBase32(randomBytes(20));
    this.enrolments.set(enrolmentId, { subjectId: subject.subjectId, method: input.method, secret });
    return input.method === 'totp'
      ? {
          enrolmentId,
          method: input.method,
          provisioningUri: totpUri({ secret, accountLabel: input.accountLabel, issuer: 'Northstar' }),
          manualEntrySecret: secret,
        }
      : { enrolmentId, method: input.method };
  }

  async confirmEnrolment(input: {
    enrolmentId: string;
    code: string;
  }): Promise<{ enrolled: boolean; methods: readonly MfaMethod[] }> {
    const enrolment = this.enrolments.get(input.enrolmentId);
    if (!enrolment) return { enrolled: false, methods: [] };
    const subject = this.require(enrolment.subjectId);

    const ok =
      enrolment.method === 'totp'
        ? verifyTotp(enrolment.secret, input.code, this.now())
        : input.code === FakeIdentity.PASSKEY_ASSERTION;
    if (!ok) return { enrolled: false, methods: [...subject.factors.keys()] };

    subject.factors.set(enrolment.method, { secret: enrolment.secret });
    this.enrolments.delete(input.enrolmentId);
    return { enrolled: true, methods: [...subject.factors.keys()] };
  }

  async enrolledMethods(subjectId: string): Promise<readonly MfaMethod[]> {
    return [...this.require(subjectId).factors.keys()];
  }

  async issueRecoveryCodes(subjectId: string): Promise<readonly string[]> {
    const subject = this.require(subjectId);
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => formatRecoveryCode(randomBytes(10)));
    // Replaces rather than adds: an old printed sheet stops working the moment
    // a new one is issued, which is what someone regenerating codes expects.
    subject.recoveryHashes = new Set(codes.map(hashRecoveryCode));
    return codes;
  }

  async redeemRecoveryCode(input: {
    email: string;
    code: string;
  }): Promise<{ redeemed: boolean; subjectId?: string }> {
    const subjectId = this.byEmail.get(normalizeEmail(input.email));
    const subject = subjectId ? this.subjects.get(subjectId) : undefined;
    if (!subject || !subject.enabled) return { redeemed: false };
    const hash = hashRecoveryCode(input.code);
    if (!subject.recoveryHashes.has(hash)) return { redeemed: false };

    subject.recoveryHashes.delete(hash);
    // Redeeming returns the account to enrolment rather than signing anyone in.
    // A recovery code is how someone who lost a device gets back to enrolling a
    // new one — it is not a factor they may keep using (MIN_ENROLLED_FACTORS).
    subject.factors.clear();
    return { redeemed: true, subjectId: subject.subjectId };
  }

  async setSubjectEnabled(input: { subjectId: string; enabled: boolean }): Promise<void> {
    this.require(input.subjectId).enabled = input.enabled;
  }

  /* -- test affordances -------------------------------------------------- */

  /** The current valid code for an enrolled subject, for tests and `dev` seeds. */
  currentTotp(subjectId: string): string {
    const secret = this.require(subjectId).factors.get('totp')?.secret;
    if (!secret) throw new Error('Subject has no TOTP factor.');
    return totp(secret, this.now());
  }

  subjectIdForEmail(email: string): string | undefined {
    return this.byEmail.get(normalizeEmail(email));
  }

  private require(subjectId: string): FakeSubject {
    const subject = this.subjects.get(subjectId);
    if (!subject) throw new Error(`Unknown subject: ${subjectId}`);
    return subject;
  }
}

interface FakeSubject {
  readonly subjectId: string;
  readonly email: string;
  readonly displayName: string;
  readonly locale: 'en' | 'fr';
  passwordHash: string | null;
  enabled: boolean;
  readonly factors: Map<MfaMethod, { secret?: string }>;
  recoveryHashes: Set<string>;
}

interface FakeChallenge {
  readonly subjectId: string;
  readonly expiresAt: Date;
}

interface FakeEnrolment {
  readonly subjectId: string;
  readonly method: MfaMethod;
  readonly secret: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Salted scrypt, with the salt carried in the stored value.
 *
 * A fake could have stored the password as-is. It does not, because preview
 * environments are real environments with real people's chosen passwords in
 * them, and "it was only the fake" is not a sentence worth having to say.
 */
function hashPassword(password: string, existing?: string): string {
  const salt = existing?.split(':')[0] ?? randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

function formatRecoveryCode(bytes: Buffer): string {
  const raw = encodeBase32(bytes).slice(0, 12).toLowerCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.trim().toLowerCase().replace(/\s/g, '')).digest('hex');
}

export function createFakeIntegrations(): Integrations {
  return {
    crm: new FakeCrm(),
    payment: new FakePayment(),
    email: new FakeEmail(),
    storage: new FakeStorage(),
    malwareScan: new FakeMalwareScan(),
    signature: new FakeSignature(),
    identity: new FakeIdentity(),
  };
}
