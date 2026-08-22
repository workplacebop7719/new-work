/**
 * RFC 6238 conformance and the accessibility behaviour that depends on it.
 *
 * The vectors below are the ones published in RFC 6238 Appendix B for
 * HMAC-SHA1. Getting them right is what makes the fake provider's QR code
 * scannable by a real authenticator app during `dev` — which is the only reason
 * this implementation exists.
 */
import { describe, expect, it } from 'vitest';
import {
  decodeBase32,
  encodeBase32,
  hotp,
  totp,
  totpUri,
  TOTP_STEP_SECONDS,
  verifyTotp,
} from './totp';

/** RFC 6238's shared secret is the ASCII string "12345678901234567890". */
const RFC_SECRET = encodeBase32(new TextEncoder().encode('12345678901234567890'));

describe('RFC 6238 test vectors', () => {
  const vectors: readonly [number, string][] = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ];

  for (const [unixTime, expected] of vectors) {
    it(`matches the published code at t=${unixTime}`, () => {
      expect(totp(RFC_SECRET, new Date(unixTime * 1000))).toBe(expected);
    });
  }
});

describe('base32', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(Array.from(decodeBase32(encodeBase32(bytes)))).toEqual(Array.from(bytes));
  });

  it('accepts the spacing and padding an authenticator app displays', () => {
    const bytes = Uint8Array.from([1, 2, 3, 4, 5]);
    const encoded = encodeBase32(bytes);
    const spaced = `${encoded.slice(0, 4)} ${encoded.slice(4)}`.toLowerCase();
    expect(Array.from(decodeBase32(spaced))).toEqual(Array.from(bytes));
  });

  it('rejects a secret with characters outside the alphabet', () => {
    expect(() => decodeBase32('ABC!')).toThrow();
  });
});

describe('verification (ACC-009)', () => {
  const at = new Date('2026-08-21T12:00:00Z');

  it('accepts the current code', () => {
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, at), at)).toBe(true);
  });

  it('accepts a code pasted with a space in it', () => {
    // Password managers and authenticator apps paste "123 456". Refusing that
    // is an accessibility defect dressed up as input validation.
    const code = totp(RFC_SECRET, at);
    expect(verifyTotp(RFC_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, at)).toBe(true);
  });

  it('accepts a code from the previous step, for someone who needed longer', () => {
    const earlier = new Date(at.getTime() - TOTP_STEP_SECONDS * 1000);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, earlier), at)).toBe(true);
  });

  it('refuses a code two steps stale', () => {
    const stale = new Date(at.getTime() - TOTP_STEP_SECONDS * 2 * 1000 - 1000);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, stale), at)).toBe(false);
  });

  it('refuses a wrong code, a short code and a non-numeric code', () => {
    expect(verifyTotp(RFC_SECRET, '000000', new Date(59 * 1000))).toBe(false);
    expect(verifyTotp(RFC_SECRET, '12345', at)).toBe(false);
    expect(verifyTotp(RFC_SECRET, 'abcdef', at)).toBe(false);
    expect(verifyTotp(RFC_SECRET, '', at)).toBe(false);
  });

  it('refuses a code that is right for a different secret', () => {
    const other = encodeBase32(new TextEncoder().encode('09876543210987654321'));
    expect(verifyTotp(RFC_SECRET, totp(other, at), at)).toBe(false);
  });
});

describe('provisioning URI', () => {
  it('carries the parameters an authenticator app needs', () => {
    const uri = totpUri({ secret: RFC_SECRET, accountLabel: 'dana@example.org', issuer: 'Northstar' });
    expect(uri.startsWith('otpauth://totp/Northstar%3Adana%40example.org?')).toBe(true);
    expect(uri).toContain(`secret=${RFC_SECRET}`);
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});

describe('counter behaviour', () => {
  it('produces a different code on each step', () => {
    expect(hotp(RFC_SECRET, 1)).not.toBe(hotp(RFC_SECRET, 2));
  });

  it('always produces six digits, including when the truncation is small', () => {
    for (let counter = 0; counter < 200; counter += 1) {
      expect(hotp(RFC_SECRET, counter)).toMatch(/^\d{6}$/);
    }
  });
});
