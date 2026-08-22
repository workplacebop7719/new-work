import { describe, expect, it } from 'vitest';
import { isOpaqueId, newCorrelationId, newId } from './ids';

describe('identifiers (ENG-003)', () => {
  it('produces well-formed UUIDv7 values', () => {
    expect(isOpaqueId(newId())).toBe(true);
  });

  it('is not sequential in a way that reveals tenant ordering', () => {
    // Ids created back-to-back must not differ only by an increment: the random
    // tail is what stops a client from enumerating neighbouring tenants.
    const a = newId();
    const b = newId();
    expect(a).not.toEqual(b);
    expect(a.slice(-12)).not.toEqual(b.slice(-12));
  });

  it('rejects sequential integers and v4 uuids as opaque ids', () => {
    expect(isOpaqueId('1')).toBe(false);
    expect(isOpaqueId('00000000-0000-4000-8000-000000000000')).toBe(false);
  });

  it('keeps correlation ids visually distinct from entity ids', () => {
    const correlation = newCorrelationId();
    expect(correlation.startsWith('cor_')).toBe(true);
    expect(isOpaqueId(correlation)).toBe(false);
  });
});
