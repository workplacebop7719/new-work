/**
 * The consent form carries a return path. Anything a visitor can put in a form
 * field is attacker-controlled, so the redirect target is validated rather than
 * merely prefix-checked.
 *
 * The logic lives in the server action module; this test exercises the same
 * rules against a local copy of the predicate to keep the action importable
 * without a request context.
 */
import { describe, expect, it } from 'vitest';

function safeReturnTo(value: unknown, locale: 'en' | 'fr'): string {
  const home = `/${locale}`;
  if (typeof value !== 'string') return home;
  if (value.includes('\\') || value.includes(':')) return home;
  return /^\/(en|fr)(\/|\?|$)/.test(value) ? value : home;
}

describe('return-to validation', () => {
  it('accepts a locale route', () => {
    expect(safeReturnTo('/en/check/1', 'en')).toBe('/en/check/1');
    expect(safeReturnTo('/fr', 'fr')).toBe('/fr');
    expect(safeReturnTo('/en?x=1', 'en')).toBe('/en?x=1');
  });

  it('rejects protocol-relative and absolute URLs', () => {
    expect(safeReturnTo('//evil.example', 'en')).toBe('/en');
    expect(safeReturnTo('https://evil.example', 'en')).toBe('/en');
    expect(safeReturnTo('javascript:alert(1)', 'en')).toBe('/en');
  });

  it('rejects backslashes, which some browsers normalise to a host separator', () => {
    expect(safeReturnTo('/en\\evil.example', 'en')).toBe('/en');
    expect(safeReturnTo('\\\\evil.example', 'en')).toBe('/en');
  });

  it('rejects a path that merely starts with the locale string', () => {
    // "/english-lessons" starts with "/en" but is not a locale route.
    expect(safeReturnTo('/english-lessons', 'en')).toBe('/en');
    expect(safeReturnTo('/enevil', 'en')).toBe('/en');
  });

  it('falls back for a missing or non-string value', () => {
    expect(safeReturnTo(undefined, 'en')).toBe('/en');
    expect(safeReturnTo(null, 'fr')).toBe('/fr');
  });
});
