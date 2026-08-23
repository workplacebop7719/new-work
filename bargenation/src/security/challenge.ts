import { createHmac, randomBytes, createHash, timingSafeEqual } from 'node:crypto';

/**
 * BOT RESISTANCE WITHOUT A THIRD PARTY (PRD §01, §06).
 *
 * Sign-up, password reset and newsletter subscription are the three forms
 * worth automating against: fake accounts, mail-bombing a real address, and
 * poisoning a subscriber list. All three need something between them and a
 * script.
 *
 * WHY NOT A CAPTCHA VENDOR. reCAPTCHA, hCaptcha and Turnstile are all
 * third-party scripts, and /privacy states plainly that we do not load any.
 * Adding one would make a published promise false — that is a founder
 * decision about the promise, not a technical detail to slip in. So this is
 * first-party and self-contained.
 *
 * WHAT IT ACTUALLY DOES. Three cheap checks that cost an automated caller
 * far more than a person:
 *
 *   1. PROOF OF WORK. The browser must find a string whose hash starts with
 *      a run of zero bits. A person waits a few hundred milliseconds without
 *      noticing; somebody creating ten thousand accounts pays for all ten
 *      thousand. It does not stop a determined attacker — it prices bulk.
 *
 *   2. A HONEYPOT FIELD. Hidden from people and from screen readers, filled
 *      in by form-filling bots that read the DOM and ignore CSS.
 *
 *   3. SERVER-MEASURED DWELL TIME. The gap between issuing the challenge and
 *      receiving it back, measured by OUR clock, never a number the client
 *      sends. A form returned in under a second was not typed by a person.
 *
 * WHAT IT IS NOT. It is not an identity check and it does not decide who is
 * human. There is deliberately no puzzle, no image grid and no audio
 * alternative, because there is nothing for anyone to solve — which is a
 * better accessibility answer than any of those, not a worse one.
 */

/**
 * Leading zero BITS the hash must have.
 *
 * 16 bits is roughly 65,000 hashes: a few hundred milliseconds in a browser,
 * unnoticed by somebody filling in a form, and about eighteen hours of CPU
 * for a million sign-ups. Raising it hurts the slowest real phone long before
 * it troubles a server farm, which is why it is not higher.
 */
export const DIFFICULTY_BITS = 16;

/** A challenge is useless after this long, so a stockpile of them spoils. */
export const MAX_AGE_MS = 10 * 60 * 1000;

/** Below this, nobody typed anything. Measured by our clock, never theirs. */
export const MIN_AGE_MS = 1_200;

/** Binds a challenge to one form, so a cheap one cannot be spent on a costly one. */
export type ChallengePurpose = 'SIGN_UP' | 'PASSWORD_RESET' | 'SUBSCRIBE';

export interface IssuedChallenge {
  purpose: ChallengePurpose;
  nonce: string;
  bits: number;
  issuedAt: number;
  /** HMAC over everything above. The client cannot mint its own. */
  signature: string;
}

export interface ChallengeSubmission {
  purpose: ChallengePurpose;
  nonce: string;
  bits: number;
  issuedAt: number;
  signature: string;
  /** The value the browser found. */
  solution: string;
  /** The honeypot's contents, which must be empty. */
  trap: string;
}

export type ChallengeVerdict =
  | { ok: true }
  | { ok: false; reason: ChallengeFailure };

export type ChallengeFailure =
  | 'MALFORMED'
  | 'BAD_SIGNATURE'
  | 'WRONG_PURPOSE'
  | 'EXPIRED'
  | 'TOO_FAST'
  | 'TRAP_FILLED'
  | 'BAD_SOLUTION';

/**
 * One message for every failure.
 *
 * Deliberately identical, and deliberately vague. Telling a caller WHICH
 * check it failed is a tuning signal — "too fast" and "bad solution" together
 * describe exactly how to get through. A person who somehow trips this needs
 * to know to try again, and nothing more.
 */
export const CHALLENGE_MESSAGE =
  'Something went wrong checking this form. Reload the page and try again.';

/**
 * The signing key.
 *
 * With CHALLENGE_SECRET set, challenges survive a restart and are valid across
 * every instance. Without it, a per-process key is generated: challenges still
 * work, they just stop being valid if the process restarts or if a second
 * instance answers — which is correct behaviour for development and wrong for
 * production, so `challengeSecretConfigured` reports which one is in use.
 */
let ephemeral: Buffer | undefined;

function secret(): Buffer {
  const configured = process.env.CHALLENGE_SECRET;
  if (configured && configured.length >= 16) return Buffer.from(configured, 'utf8');
  ephemeral ??= randomBytes(32);
  return ephemeral;
}

export const challengeSecretConfigured = (): boolean =>
  Boolean(process.env.CHALLENGE_SECRET && process.env.CHALLENGE_SECRET.length >= 16);

const sign = (purpose: string, nonce: string, bits: number, issuedAt: number): string =>
  createHmac('sha256', secret())
    .update(`${purpose}.${nonce}.${bits}.${issuedAt}`)
    .digest('hex');

/** Constant time, so the signature cannot be recovered a byte at a time. */
function signatureMatches(expected: string, given: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(given, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueChallenge(
  purpose: ChallengePurpose,
  now: Date = new Date(),
): IssuedChallenge {
  const nonce = randomBytes(16).toString('hex');
  const issuedAt = now.getTime();
  return {
    purpose,
    nonce,
    bits: DIFFICULTY_BITS,
    issuedAt,
    signature: sign(purpose, nonce, DIFFICULTY_BITS, issuedAt),
  };
}

/**
 * How many leading zero BITS a hex digest starts with.
 *
 * Bits rather than characters, because a hex character is four bits and
 * counting characters would only let difficulty move in steps of sixteen.
 */
export function leadingZeroBits(hex: string): number {
  let bits = 0;
  for (const char of hex) {
    const value = parseInt(char, 16);
    if (Number.isNaN(value)) return bits;
    if (value === 0) {
      bits += 4;
      continue;
    }
    // 8 -> 0 zeros, 4 -> 1, 2 -> 2, 1 -> 3
    bits += Math.clz32(value) - 28;
    break;
  }
  return bits;
}

/** The one definition of a solved challenge, shared by browser and server. */
export const challengeDigest = (nonce: string, solution: string): string =>
  createHash('sha256').update(`${nonce}:${solution}`).digest('hex');

export function verifyChallenge(
  submission: Partial<ChallengeSubmission> | null | undefined,
  expectedPurpose: ChallengePurpose,
  now: Date = new Date(),
): ChallengeVerdict {
  const fail = (reason: ChallengeFailure): ChallengeVerdict => ({ ok: false, reason });

  if (!submission) return fail('MALFORMED');
  const { purpose, nonce, bits, issuedAt, signature, solution, trap } = submission;

  if (
    typeof purpose !== 'string' || typeof nonce !== 'string' ||
    typeof signature !== 'string' || typeof solution !== 'string' ||
    typeof bits !== 'number' || typeof issuedAt !== 'number' ||
    !Number.isFinite(bits) || !Number.isFinite(issuedAt) ||
    nonce.length !== 32 || solution.length > 64
  ) {
    return fail('MALFORMED');
  }

  // The honeypot is checked first because it costs nothing and a filled trap
  // means the rest of the submission is not worth reasoning about.
  if (typeof trap === 'string' && trap.length > 0) return fail('TRAP_FILLED');

  if (purpose !== expectedPurpose) return fail('WRONG_PURPOSE');

  // Signature before anything derived from the values it protects: until this
  // passes, `bits` and `issuedAt` are attacker-chosen numbers, and trusting
  // `bits` first would let a caller ask for a difficulty of zero.
  if (!signatureMatches(sign(purpose, nonce, bits, issuedAt), signature)) {
    return fail('BAD_SIGNATURE');
  }

  const age = now.getTime() - issuedAt;
  if (age > MAX_AGE_MS || age < 0) return fail('EXPIRED');
  if (age < MIN_AGE_MS) return fail('TOO_FAST');

  if (leadingZeroBits(challengeDigest(nonce, solution)) < bits) return fail('BAD_SOLUTION');

  return { ok: true };
}

/**
 * Reads a challenge out of submitted form data.
 *
 * Every value here came from the page, so nothing is trusted — this only
 * shapes it. verifyChallenge does the deciding.
 */
export function challengeFromForm(form: FormData): Partial<ChallengeSubmission> {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === 'string' ? value : undefined;
  };
  const number = (key: string) => {
    const value = text(key);
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    purpose: text('challengePurpose') as ChallengePurpose | undefined,
    nonce: text('challengeNonce'),
    bits: number('challengeBits'),
    issuedAt: number('challengeIssuedAt'),
    signature: text('challengeSignature'),
    solution: text('challengeSolution'),
    trap: text('website') ?? '',
  };
}
