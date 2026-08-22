/**
 * SEC-002 / CLP-013 / ACC-004: the identity rules that must hold whatever the
 * identity provider does.
 *
 * The valuable cases here are the refusals — a privileged session that outlives
 * its ceiling, an administrator naming a role they may not name, a change that
 * would leave an organization with nobody able to administer it.
 */
import { describe, expect, it } from 'vitest';
import {
  canInviteRole,
  enrolmentComplete,
  invitableRoles,
  invitationState,
  isLockedOut,
  isPrivilegedRole,
  methodSatisfies,
  MIN_ENROLLED_FACTORS,
  sessionPolicyFor,
  sessionState,
  shouldWarnAboutTimeout,
  SIGN_IN_ATTEMPT_LIMIT,
  signUpInput,
  wouldOrphanOrganization,
  type SessionTimes,
} from './identity';
import { ROLES, type Role } from './roles';

const NOW = new Date('2026-08-21T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

function times(overrides: Partial<SessionTimes> = {}): SessionTimes {
  return {
    createdAt: ago(HOUR),
    lastSeenAt: ago(MINUTE),
    mfaSatisfiedAt: ago(HOUR),
    revokedAt: null,
    ...overrides,
  };
}

describe('session policy strength (SEC-002)', () => {
  it('gives internal roles the short privileged session', () => {
    const client = sessionPolicyFor(['client_admin']);
    const internal = sessionPolicyFor(['internal_pm']);
    expect(internal.idleMs).toBeLessThan(client.idleMs);
    expect(internal.absoluteMs).toBeLessThan(client.absoluteMs);
    expect(internal.mfa).toBe('phishing_resistant');
  });

  it('takes the strictest policy when a person holds both kinds of role', () => {
    // A staff member who also administers their own organization must not get
    // the longer session merely because a client role is in the list.
    expect(sessionPolicyFor(['client_admin', 'qualified_reviewer'])).toEqual(
      sessionPolicyFor(['qualified_reviewer']),
    );
  });

  it('classifies every declared role as privileged or not without a gap', () => {
    for (const role of ROLES) {
      expect(typeof isPrivilegedRole(role)).toBe('boolean');
    }
    expect(ROLES.filter(isPrivilegedRole)).toEqual(['internal_pm', 'qualified_reviewer', 'platform_admin']);
  });
});

describe('session state', () => {
  const policy = sessionPolicyFor(['client_admin']);

  it('serves an active session', () => {
    expect(sessionState(times(), policy, NOW)).toEqual({ status: 'active' });
  });

  it('withholds service until the second factor is satisfied', () => {
    expect(sessionState(times({ mfaSatisfiedAt: null }), policy, NOW)).toEqual({
      status: 'mfa_required',
    });
  });

  it('expires on idle', () => {
    const state = sessionState(times({ lastSeenAt: ago(policy.idleMs + 1) }), policy, NOW);
    expect(state).toEqual({ status: 'expired', cause: 'idle' });
  });

  it('expires at the absolute ceiling however recently it was used', () => {
    const state = sessionState(
      times({ createdAt: ago(policy.absoluteMs + 1), lastSeenAt: NOW }),
      policy,
      NOW,
    );
    expect(state).toEqual({ status: 'expired', cause: 'absolute' });
  });

  it('reports revocation as revocation, not as a timeout', () => {
    // An administrator removed this person. Saying "your session timed out"
    // would be an interface telling a lie, and the audit trail records
    // something different again.
    const state = sessionState(times({ revokedAt: ago(MINUTE) }), policy, NOW);
    expect(state).toEqual({ status: 'revoked' });
  });

  it('treats a revocation timestamped in the future as not yet in effect', () => {
    const state = sessionState(
      times({ revokedAt: new Date(NOW.getTime() + MINUTE) }),
      policy,
      NOW,
    );
    expect(state).toEqual({ status: 'active' });
  });
});

describe('timeout warning (ACC-004)', () => {
  const policy = sessionPolicyFor(['client_admin']);

  it('warns inside the warning window', () => {
    const nearlyIdle = ago(policy.idleMs - policy.warnBeforeMs + 1000);
    expect(shouldWarnAboutTimeout(times({ lastSeenAt: nearlyIdle }), policy, NOW)).toBe(true);
  });

  it('does not warn while there is plenty of time left', () => {
    expect(shouldWarnAboutTimeout(times(), policy, NOW)).toBe(false);
  });

  it('does not warn about a session that has already gone', () => {
    const state = times({ lastSeenAt: ago(policy.idleMs + 1) });
    expect(shouldWarnAboutTimeout(state, policy, NOW)).toBe(false);
  });

  it('leaves enough idle time that a long accessible task is not interrupted', () => {
    // WCAG 2.2 SC 2.2.1: either 20 hours, or warnable and extendable. The
    // client policy takes the second route, so the warning must actually exist.
    expect(policy.warnBeforeMs).toBeGreaterThan(0);
    expect(policy.idleMs).toBeGreaterThanOrEqual(2 * HOUR);
  });
});

describe('sign-in throttling (T-14)', () => {
  it('does not lock out below the limit', () => {
    expect(isLockedOut(SIGN_IN_ATTEMPT_LIMIT - 1, ago(MINUTE), NOW)).toBe(false);
  });

  it('locks out at the limit', () => {
    expect(isLockedOut(SIGN_IN_ATTEMPT_LIMIT, ago(MINUTE), NOW)).toBe(true);
  });

  it('releases the lock after the window, so the lock is not a denial of service', () => {
    expect(isLockedOut(SIGN_IN_ATTEMPT_LIMIT * 5, ago(HOUR), NOW)).toBe(false);
  });
});

describe('multi-factor enrolment (ACC-009)', () => {
  it('accepts a passkey for a phishing-resistant requirement', () => {
    expect(methodSatisfies('passkey', 'phishing_resistant')).toBe(true);
  });

  it('refuses a time-based code where phishing resistance is required', () => {
    expect(methodSatisfies('totp', 'phishing_resistant')).toBe(false);
  });

  it('never treats a recovery code as a factor', () => {
    // A recovery code returns someone to enrolment. Counting it as a factor
    // would let an account live permanently on single-use printed secrets.
    expect(methodSatisfies('recovery_code', 'any_factor')).toBe(false);
    expect(methodSatisfies('recovery_code', 'phishing_resistant')).toBe(false);
  });

  it('does not call one factor enrolled, because ACC-009 requires an alternative', () => {
    expect(enrolmentComplete(['totp'], 'any_factor')).toBe(false);
    expect(enrolmentComplete(['totp', 'passkey'], 'any_factor')).toBe(true);
    expect(MIN_ENROLLED_FACTORS).toBe(2);
  });

  it('does not let two non-qualifying factors add up to a privileged enrolment', () => {
    expect(enrolmentComplete(['totp', 'totp'], 'phishing_resistant')).toBe(false);
  });
});

describe('invitation lifecycle (CLP-013)', () => {
  const created = { createdAt: ago(HOUR), acceptedAt: null, revokedAt: null };

  it('is pending while fresh', () => {
    expect(invitationState(created, NOW)).toBe('pending');
  });

  it('expires after the window', () => {
    expect(invitationState({ ...created, createdAt: ago(8 * 24 * HOUR) }, NOW)).toBe('expired');
  });

  it('reports revocation ahead of acceptance, so a revoked invitation cannot be replayed', () => {
    const both = { ...created, acceptedAt: ago(MINUTE), revokedAt: ago(2 * MINUTE) };
    expect(invitationState(both, NOW)).toBe('revoked');
  });
});

describe('invitation privilege containment', () => {
  it('lets a client administrator seat only client roles', () => {
    expect(invitableRoles('client_admin')).toEqual([
      'client_admin',
      'client_contributor',
      'client_executive',
    ]);
  });

  it('refuses to let a client administrator create internal staff', () => {
    for (const role of ['internal_pm', 'qualified_reviewer', 'platform_admin'] as Role[]) {
      expect(canInviteRole('client_admin', role)).toBe(false);
    }
  });

  it('never allows a contractor to be invited into a tenant by anyone', () => {
    // Contractor access is a per-assignment grant with an expiry (CTR-004).
    // A membership would be a permanent, un-expiring version of it.
    for (const role of ROLES) {
      expect(canInviteRole(role, 'contractor')).toBe(false);
    }
  });

  it('gives roles with no invitation authority an empty set rather than a default', () => {
    for (const role of ['client_contributor', 'client_executive', 'contractor', 'qualified_reviewer'] as Role[]) {
      expect(invitableRoles(role)).toEqual([]);
    }
  });
});

describe('last administrator protection', () => {
  const members = [
    { userId: 'usr_a', role: 'client_admin' as Role },
    { userId: 'usr_b', role: 'client_contributor' as Role },
  ];

  it('refuses to demote the only administrator', () => {
    expect(wouldOrphanOrganization(members, { userId: 'usr_a', newRole: 'client_executive' })).toBe(
      true,
    );
  });

  it('refuses to remove the only administrator', () => {
    expect(wouldOrphanOrganization(members, { userId: 'usr_a', newRole: null })).toBe(true);
  });

  it('allows the change once a second administrator exists', () => {
    const withSecond = [...members, { userId: 'usr_c', role: 'client_admin' as Role }];
    expect(wouldOrphanOrganization(withSecond, { userId: 'usr_a', newRole: null })).toBe(false);
  });

  it('allows removing someone who was never an administrator', () => {
    expect(wouldOrphanOrganization(members, { userId: 'usr_b', newRole: null })).toBe(false);
  });
});

describe('sign-up input', () => {
  const valid = {
    organizationLegalName: '  Maple Grove Academy ',
    organizationType: 'private_school',
    employeeBand: '50_to_199',
    jurisdiction: 'CA-ON',
    displayName: 'Dana Okonkwo',
    email: '  Dana@Example.ORG ',
    preferredLanguage: 'en' as const,
  };

  it('trims and lowercases the address so two spellings are one account', () => {
    const parsed = signUpInput.parse(valid);
    expect(parsed.email).toBe('dana@example.org');
    expect(parsed.organizationLegalName).toBe('Maple Grove Academy');
  });

  it('defaults marketing consent to false (CNV-004)', () => {
    expect(signUpInput.parse(valid).marketingConsent).toBe(false);
  });

  it('rejects a jurisdiction that is not a subdivision code', () => {
    expect(() => signUpInput.parse({ ...valid, jurisdiction: 'Ontario' })).toThrow();
  });
});
