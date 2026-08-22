import { describe, it, expect } from 'vitest';
import {
  toRole, isRole, canAccessAdmin, canResolveMatches,
  canReleaseQuarantine, canDiscardQuarantine, ROLES,
} from './roles';

describe('unknown values never widen access', () => {
  it.each([null, undefined, '', 'ADMIN', 'superuser', 42, {}, ['admin'], 'admin ', true])(
    'treats %s as a customer',
    (value) => {
      expect(toRole(value)).toBe('customer');
      expect(canAccessAdmin(toRole(value))).toBe(false);
    },
  );

  it('recognises only the declared roles', () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true);
    expect(isRole('root')).toBe(false);
  });
});

describe('what each role may do', () => {
  it('a customer may do nothing operational', () => {
    expect(canAccessAdmin('customer')).toBe(false);
    expect(canResolveMatches('customer')).toBe(false);
    expect(canReleaseQuarantine('customer')).toBe(false);
    expect(canDiscardQuarantine('customer')).toBe(false);
  });

  it('an operator may work the queue but not write to permanent history', () => {
    expect(canAccessAdmin('operator')).toBe(true);
    expect(canResolveMatches('operator')).toBe(true);
    expect(canDiscardQuarantine('operator')).toBe(true);
    // Releasing writes an append-only row nobody can ever undo.
    expect(canReleaseQuarantine('operator')).toBe(false);
  });

  it('an admin may release into permanent history', () => {
    expect(canReleaseQuarantine('admin')).toBe(true);
  });

  /**
   * Discarding is reversible in the sense that the price can be observed
   * again; releasing is not, because the record is append-only. The
   * permissions reflect that asymmetry rather than treating both as "edit
   * quarantine".
   */
  it('separates the reversible action from the irreversible one', () => {
    expect(canDiscardQuarantine('operator')).toBe(true);
    expect(canReleaseQuarantine('operator')).toBe(false);
  });
});
