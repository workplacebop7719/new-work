/**
 * RFC 6238 time-based one-time passwords.
 *
 * This exists for the *fake* identity provider. ADR-0002 rejected building our
 * own authentication, and this is not a step back toward that: no secret written
 * here is ever a production credential, and the real adapter delegates the whole
 * of MFA to the provider.
 *
 * It is a real implementation rather than a stub because a stub would make the
 * local experience a lie. Enrolment has a QR code, a manual-entry secret, a
 * "paste allowed" code field and an error path for a wrong code (ACC-009), and
 * an end-to-end test that cannot compute a valid code can only ever exercise the
 * failure branch.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

/**
 * How many steps either side of "now" are accepted.
 *
 * One step back and one forward: clock drift on a phone is real, and so is
 * someone using a screen reader who needs longer than thirty seconds to hear the
 * code, move to the field and paste it. The cost is a 90-second window instead
 * of 30, which is the trade RFC 6238 §5.2 anticipates.
 */
export const TOTP_WINDOW_STEPS = 1;

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function decodeBase32(input: string): Uint8Array {
  const cleaned = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Invalid base32 character in TOTP secret.');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

function counterBuffer(counter: number): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  return buffer;
}

/** The code for one counter step. Exported so tests can address a step directly. */
export function hotp(secretBase32: string, counter: number): string {
  const key = Buffer.from(decodeBase32(secretBase32));
  const digest = createHmac('sha1', key).update(counterBuffer(counter)).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

export function totp(secretBase32: string, at: Date = new Date()): string {
  return hotp(secretBase32, Math.floor(at.getTime() / 1000 / TOTP_STEP_SECONDS));
}

/**
 * Verifies a submitted code.
 *
 * Whitespace is stripped rather than rejected: ACC-009 requires that pasting
 * works, and password managers and authenticator apps paste "123 456" as often
 * as "123456". Refusing that is an accessibility defect dressed as validation.
 *
 * The comparison is constant-time. A six-digit code has 10^6 possibilities and
 * a 90-second life, so a timing oracle is not the likeliest attack here — but
 * writing `===` teaches the habit that matters in the adapter that replaces this.
 */
export function verifyTotp(secretBase32: string, submitted: string, at: Date = new Date()): boolean {
  const normalized = submitted.replace(/\s/g, '');
  if (!/^\d+$/.test(normalized) || normalized.length !== TOTP_DIGITS) return false;

  const step = Math.floor(at.getTime() / 1000 / TOTP_STEP_SECONDS);
  const submittedBytes = Buffer.from(normalized, 'utf8');
  let matched = false;
  for (let drift = -TOTP_WINDOW_STEPS; drift <= TOTP_WINDOW_STEPS; drift += 1) {
    const candidate = Buffer.from(hotp(secretBase32, step + drift), 'utf8');
    // No early return: every candidate is compared so the loop takes the same
    // time whether the first or the last one matches.
    if (candidate.length === submittedBytes.length && timingSafeEqual(candidate, submittedBytes)) {
      matched = true;
    }
  }
  return matched;
}

/**
 * The `otpauth://` URI an authenticator app scans.
 *
 * The label carries the account address so a person with several accounts can
 * tell them apart in the app — which is a usability requirement, not a leak: the
 * URI is only ever shown to the person enrolling.
 */
export function totpUri(input: { secret: string; accountLabel: string; issuer: string }): string {
  const label = encodeURIComponent(`${input.issuer}:${input.accountLabel}`);
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
