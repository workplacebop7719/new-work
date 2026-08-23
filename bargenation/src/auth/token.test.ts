/**
 * A reset or verification token arrives in a link, which makes it exactly as
 * trustworthy as the query string it came from.
 */
import { describe, it, expect } from 'vitest';
import { isPlausibleToken, MAX_TOKEN_LENGTH } from './token';

describe('accepts what a provider actually issues', () => {
  it.each([
    ['dev adapter uuid', '8f14e45f-ceea-467a-9c5b-3a54f2c9b0d1'],
    ['supabase token hash', 'pkce_9f2c4a1b8e7d6f5a4b3c2d1e0f9a8b7c6d5e4f3a'],
    ['base64url', 'abcDEF-_1234567890'],
    ['a single character', 'x'],
  ])('%s', (_label, token) => {
    expect(isPlausibleToken(token)).toBe(true);
  });

  it('accepts a token right at the length limit', () => {
    expect(isPlausibleToken('a'.repeat(MAX_TOKEN_LENGTH))).toBe(true);
  });
});

describe('refuses anything that is not a usable token', () => {
  it('refuses an absent or empty value rather than passing it on', () => {
    for (const value of [undefined, null, '']) {
      expect(isPlausibleToken(value)).toBe(false);
    }
  });

  it('refuses non-strings rather than coercing them', () => {
    for (const value of [42, {}, [], true, () => 'token']) {
      expect(isPlausibleToken(value)).toBe(false);
    }
  });

  /**
   * A mail client that wraps a long link inserts whitespace into it. Passing
   * that through would produce a confusing provider error rather than our own
   * "request a new link".
   */
  it('refuses whitespace, including the newline a wrapped link brings', () => {
    for (const value of ['tok en', 'token\n', '\ttoken', 'token ']) {
      expect(isPlausibleToken(value)).toBe(false);
    }
  });

  it('refuses control characters, which a link should never contain', () => {
    expect(isPlausibleToken('tok\u0000en')).toBe(false);
    expect(isPlausibleToken('token\u001F')).toBe(false);
    expect(isPlausibleToken('token\u007F')).toBe(false);
    expect(isPlausibleToken('token\u009F')).toBe(false);
  });

  it('refuses something absurdly long rather than sending it to a provider', () => {
    expect(isPlausibleToken('a'.repeat(MAX_TOKEN_LENGTH + 1))).toBe(false);
  });
});
