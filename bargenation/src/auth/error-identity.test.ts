/**
 * THE REGRESSION THAT UNIT TESTS COULD NOT SEE (PRD §29).
 *
 * `messageFor` used `err instanceof AuthError`, and every test passed, because
 * inside one Vitest module graph there is exactly one AuthError class.
 *
 * In the running server there are two. `actions.ts` is `'use server'`, which
 * Next bundles into a different graph from the one the adapters are reached
 * through, so `types.ts` is instantiated twice and the prototype check fails.
 * The result was that EVERY auth failure — wrong password, address already
 * taken, password too short — rendered "We couldn't reach our sign-in
 * service", and AUTH_MESSAGE was dead code in practice.
 *
 * These tests reproduce the duplication with vi.resetModules(), which is the
 * only honest way to assert this from inside a test runner.
 */
import { describe, it, expect, vi } from 'vitest';
import { isAuthError, AUTH_MESSAGE, AuthError } from './types';

/** A second, genuinely separate instantiation of the same module. */
async function duplicateModule() {
  vi.resetModules();
  return import('./types');
}

describe('an AuthError is recognised across module instances', () => {
  it('the duplication is real — the two classes are not the same object', async () => {
    const other = await duplicateModule();
    expect(other.AuthError).not.toBe(AuthError);
  });

  /** The exact failure: this is the check the code used to make. */
  it('instanceof FAILS across the boundary, which is why it is not used', async () => {
    const other = await duplicateModule();
    const thrown = new other.AuthError('INVALID_CREDENTIALS');
    expect(thrown instanceof AuthError).toBe(false);
  });

  it('isAuthError succeeds across the boundary', async () => {
    const other = await duplicateModule();
    const thrown = new other.AuthError('INVALID_CREDENTIALS');
    expect(isAuthError(thrown)).toBe(true);
  });

  it('carries the code through, so the right copy is chosen', async () => {
    const other = await duplicateModule();
    for (const code of Object.keys(AUTH_MESSAGE) as (keyof typeof AUTH_MESSAGE)[]) {
      const thrown = new other.AuthError(code);
      expect(isAuthError(thrown)).toBe(true);
      if (!isAuthError(thrown)) throw new Error('unreachable');
      expect(AUTH_MESSAGE[thrown.code]).toBe(AUTH_MESSAGE[code]);
    }
  });
});

describe('isAuthError does not simply trust the shape it is handed', () => {
  it('refuses a plain object wearing the same fields', () => {
    expect(isAuthError({ code: 'INVALID_CREDENTIALS' })).toBe(false);
    expect(isAuthError({ name: 'AuthError', code: 'INVALID_CREDENTIALS' })).toBe(false);
  });

  /**
   * A duck-typed guard that trusted `code` would index AUTH_MESSAGE with an
   * unknown key and render the literal string "undefined" to a customer.
   */
  it('refuses a branded error carrying a code we have no copy for', () => {
    const forged = { brand: 'bargenation.AuthError', code: 'SOMETHING_NEW' };
    expect(isAuthError(forged)).toBe(false);
  });

  it('refuses a code that is not a string', () => {
    expect(isAuthError({ brand: 'bargenation.AuthError', code: 42 })).toBe(false);
  });

  it('refuses non-objects and ordinary errors', () => {
    for (const value of [null, undefined, 'INVALID_CREDENTIALS', 42, new Error('boom')]) {
      expect(isAuthError(value)).toBe(false);
    }
  });

  /** Prototype-less objects reach catch blocks from JSON and structured clone. */
  it('handles an object with no prototype rather than throwing', () => {
    const bare = Object.create(null) as Record<string, unknown>;
    bare.brand = 'bargenation.AuthError';
    bare.code = 'INVALID_CREDENTIALS';
    expect(isAuthError(bare)).toBe(true);
  });
});

describe('every code still has copy', () => {
  it('has a message for each code isAuthError will accept', () => {
    for (const message of Object.values(AUTH_MESSAGE)) {
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(/undefined/);
    }
  });
});
