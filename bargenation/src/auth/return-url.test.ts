import { describe, it, expect } from 'vitest';
import { isSafeReturnTo, safeReturnTo, loginHref, DEFAULT_RETURN_TO } from './return-url';

describe('accepts genuine in-app destinations', () => {
  it.each([
    '/today',
    '/deals/calder-trail-sneaker',
    '/categories/shoes',
    '/search?q=winter%20coat',
    '/deals/x?ref=edit&utm=1',
    '/today#standout',
    '/',
  ])('%s', (path) => {
    expect(isSafeReturnTo(path)).toBe(true);
    expect(safeReturnTo(path)).toBe(path);
  });
});

describe('refuses anything that could leave our origin', () => {
  it.each([
    ['absolute http', 'http://evil.com'],
    ['absolute https', 'https://evil.com'],
    ['protocol relative', '//evil.com'],
    ['triple slash', '///evil.com'],
    ['backslash pair', '/\\evil.com'],
    ['mixed slash backslash', '/\\/evil.com'],
    ['backslash anywhere', '/deals\\..\\evil'],
    ['encoded slashes', '/%2F%2Fevil.com'],
    ['encoded backslashes', '/%5C%5Cevil.com'],
    ['lowercase encoded slash', '/%2f%2fevil.com'],
    ['encoded tab', '/%09/evil.com'],
    ['encoded null', '/%00/evil.com'],
    ['userinfo trick', 'https://bargenation.com@evil.com'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:text/html,<script>alert(1)</script>'],
    ['no leading slash', 'today'],
    ['relative traversal', '../admin'],
    ['empty string', ''],
  ])('%s', (_label, candidate) => {
    expect(isSafeReturnTo(candidate)).toBe(false);
    expect(safeReturnTo(candidate)).toBe(DEFAULT_RETURN_TO);
  });

  it('refuses CR/LF response header injection', () => {
    expect(isSafeReturnTo('/today\r\nSet-Cookie: session=stolen')).toBe(false);
    expect(isSafeReturnTo('/today\nLocation: https://evil.com')).toBe(false);
  });

  it('refuses null bytes and other raw control characters', () => {
    expect(isSafeReturnTo('/today\u0000')).toBe(false);
    expect(isSafeReturnTo('/to\u0009day')).toBe(false);
    expect(isSafeReturnTo('/today\u001F')).toBe(false);
    expect(isSafeReturnTo('/today\u007F')).toBe(false);
  });

  it('refuses non-strings rather than coercing them', () => {
    for (const value of [null, undefined, 42, {}, [], true, () => '/today']) {
      expect(isSafeReturnTo(value)).toBe(false);
      expect(safeReturnTo(value)).toBe(DEFAULT_RETURN_TO);
    }
  });

  it('refuses an absurdly long value rather than carrying it around', () => {
    expect(isSafeReturnTo(`/${'a'.repeat(600)}`)).toBe(false);
  });
});

describe('never returns into the auth flow itself', () => {
  it.each([
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/auth/callback',
  ])('%s', (path) => {
    expect(isSafeReturnTo(path)).toBe(false);
  });

  it('is not fooled by case or a trailing query string', () => {
    expect(isSafeReturnTo('/LOGIN?next=/today')).toBe(false);
    expect(isSafeReturnTo('/Signup')).toBe(false);
  });

  it('still allows a path that merely starts with the same letters', () => {
    expect(isSafeReturnTo('/loginary')).toBe(true);
    expect(isSafeReturnTo('/authors')).toBe(true);
  });
});

describe('loginHref', () => {
  it('remembers a safe destination', () => {
    expect(loginHref('/deals/x')).toBe('/login?returnTo=%2Fdeals%2Fx');
  });

  it('drops an unsafe one silently rather than erroring', () => {
    expect(loginHref('https://evil.com')).toBe('/login');
    expect(loginHref(undefined)).toBe('/login');
  });

  /** The round trip matters: what we encode must still validate on the way back. */
  it('produces a link whose target survives validation again', () => {
    const href = loginHref('/search?q=coat&size=4');
    const returned = new URL(href, 'https://x.test').searchParams.get('returnTo');
    expect(returned).toBe('/search?q=coat&size=4');
    expect(isSafeReturnTo(returned)).toBe(true);
  });
});
