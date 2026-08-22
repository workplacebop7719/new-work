/**
 * Identity storage against live PostgreSQL — CLP-013, SEC-002, SEC-003.
 *
 * Run as the `NOBYPASSRLS` application role. That detail is the whole point: a
 * superuser bypasses row-level security however the policy is written, so a
 * suite connecting as the owner would pass while proving nothing.
 *
 * The valuable cases are the refusals — a cross-tenant invitation read, a
 * foreign-tenant insert, a second pending invitation to the same address, and a
 * membership change that would leave nobody able to administer the organization.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { newId } from '@northstar/domain';
import { closePool, withSystemContext, withTenant } from '../src/client';
import { migrate } from '../src/migrate';
import { DEMO_ORGANIZATION_IDS, seed } from '../src/seed';
import {
  changeMembership,
  createUser,
  LastAdministratorError,
  listTeam,
  loadActor,
} from '../src/accounts';
import {
  acceptInvitation,
  createInvitation,
  findInvitationByToken,
  listInvitations,
  revokeInvitation,
} from '../src/invitations';
import {
  createAuthSession,
  evaluateSession,
  findAuthSession,
  markMfaSatisfied,
  revokeAllUserSessions,
  revokeAuthSession,
} from '../src/auth-session';
import {
  checkSignInThrottle,
  clearSignInFailures,
  recordSignInFailure,
  SIGN_IN_ATTEMPT_LIMIT,
} from '../src/sign-in-throttle';

const { MAPLE_GROVE, RIVERSIDE } = DEMO_ORGANIZATION_IDS;
const MAPLE_ADMIN = '0199a000-0000-7000-8000-0000000c0001';
const RIVERSIDE_ADMIN = '0199a000-0000-7000-8000-0000000d0001';

beforeAll(async () => {
  await migrate();
  await seed();
});

afterAll(async () => {
  await closePool();
});

/** Removes every invitation, so each test starts from a known state. */
beforeEach(async () => {
  await withSystemContext('test fixture reset', async (tx) => {
    await tx.query('DELETE FROM invitations');
    await tx.query('DELETE FROM auth_sessions');
    await tx.query('DELETE FROM sign_in_throttle');
  });
});

async function uniqueUser(prefix: string) {
  return createUser({
    email: `${prefix}-${newId()}@example.org`,
    displayName: 'Test Person',
    preferredLanguage: 'en',
    identitySubjectId: `sub_${newId()}`,
  });
}

describe('invitation tenancy', () => {
  it('hides another tenant’s invitations entirely', async () => {
    await createInvitation({
      organizationId: MAPLE_GROVE,
      email: 'newcomer@maplegrove.example',
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });

    // Riverside asks for every invitation it can see. Row-level security
    // supplies the WHERE clause the query does not have.
    const seen = await withTenant(RIVERSIDE, async (tx) => {
      const { rows } = await tx.query('SELECT id FROM invitations');
      return rows;
    });
    expect(seen).toEqual([]);
    expect(await listInvitations(RIVERSIDE)).toEqual([]);
  });

  it('refuses to write an invitation into another tenant', async () => {
    await expect(
      withTenant(RIVERSIDE, async (tx) => {
        await tx.query(
          `INSERT INTO invitations (id, organization_id, email, role, token_hash)
           VALUES (gen_random_uuid(), $1, 'smuggled@example.org', 'client_admin', 'hash-1')`,
          [MAPLE_GROVE],
        );
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  it('cannot revoke another tenant’s invitation even with its id', async () => {
    const { invitation } = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: 'target@maplegrove.example',
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });

    const revoked = await revokeInvitation({
      organizationId: RIVERSIDE,
      invitationId: invitation.id,
      revokedByUserId: RIVERSIDE_ADMIN,
    });
    expect(revoked).toBe(false);

    const still = await listInvitations(MAPLE_GROVE);
    expect(still[0]?.state).toBe('pending');
  });

  it('refuses a role the database CHECK does not allow, whatever the caller intends', async () => {
    // The third layer, after the domain's `invitableRoles` and the policy layer.
    await expect(
      withTenant(MAPLE_GROVE, async (tx) => {
        await tx.query(
          `INSERT INTO invitations (id, organization_id, email, role, token_hash)
           VALUES (gen_random_uuid(), $1, 'escalate@example.org', 'platform_admin', 'hash-2')`,
          [MAPLE_GROVE],
        );
      }),
    ).rejects.toThrow(/invitations_role_check|violates check constraint/i);
  });
});

describe('invitation lifecycle', () => {
  it('replaces a live invitation rather than accumulating working links', async () => {
    const first = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: 'twice@maplegrove.example',
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });
    const second = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: 'twice@maplegrove.example',
      role: 'client_admin',
      invitedByUserId: MAPLE_ADMIN,
    });

    expect((await findInvitationByToken(first.token))?.state).toBe('revoked');
    expect((await findInvitationByToken(second.token))?.state).toBe('pending');
  });

  it('accepts once and refuses the replay', async () => {
    const user = await uniqueUser('joiner');
    const { token } = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: user.email,
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });

    const first = await acceptInvitation({ token, userId: user.id, userEmail: user.email });
    expect(first).toEqual({
      outcome: 'accepted',
      organizationId: MAPLE_GROVE,
      role: 'client_contributor',
    });

    const replay = await acceptInvitation({ token, userId: user.id, userEmail: user.email });
    expect(replay).toEqual({ outcome: 'not_pending', state: 'accepted' });
  });

  it('refuses an invitation forwarded to a different address', async () => {
    const invited = await uniqueUser('invited');
    const forwarded = await uniqueUser('forwarded');
    const { token } = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: invited.email,
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });

    // Otherwise a forwarded email is a transferable membership credential.
    const result = await acceptInvitation({
      token,
      userId: forwarded.id,
      userEmail: forwarded.email,
    });
    expect(result).toEqual({ outcome: 'wrong_address' });

    const team = await listTeam(MAPLE_GROVE);
    expect(team.some((m) => m.userId === forwarded.id)).toBe(false);
  });

  it('refuses an expired invitation', async () => {
    const user = await uniqueUser('late');
    const { token, invitation } = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: user.email,
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });
    const wellPastExpiry = new Date(invitation.createdAt.getTime() + 8 * 24 * 60 * 60 * 1000);

    const result = await acceptInvitation({
      token,
      userId: user.id,
      userEmail: user.email,
      now: wellPastExpiry,
    });
    expect(result).toEqual({ outcome: 'not_pending', state: 'expired' });
  });

  it('refuses a revoked invitation, even one revoked after the page was opened', async () => {
    const user = await uniqueUser('racer');
    const { token, invitation } = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: user.email,
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });
    // Simulates the real race: the person loaded the acceptance form while the
    // invitation was live, and an administrator revoked it before they submitted.
    await revokeInvitation({
      organizationId: MAPLE_GROVE,
      invitationId: invitation.id,
      revokedByUserId: MAPLE_ADMIN,
    });

    const result = await acceptInvitation({ token, userId: user.id, userEmail: user.email });
    expect(result).toEqual({ outcome: 'not_pending', state: 'revoked' });
  });

  it('says nothing about an unknown token', async () => {
    expect(
      await acceptInvitation({ token: 'not-a-real-token', userId: MAPLE_ADMIN, userEmail: 'x@y.z' }),
    ).toEqual({ outcome: 'unknown_token' });
  });
});

describe('membership changes', () => {
  it('adds the accepted member to the actor immediately (SEC-003)', async () => {
    const user = await uniqueUser('actor');
    const { token } = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: user.email,
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });
    await acceptInvitation({ token, userId: user.id, userEmail: user.email });

    const actor = await loadActor(user.id);
    expect(actor.memberships).toEqual([
      { organizationId: MAPLE_GROVE, role: 'client_contributor' },
    ]);
  });

  it('removes it just as immediately', async () => {
    const user = await uniqueUser('leaver');
    const { token } = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: user.email,
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });
    await acceptInvitation({ token, userId: user.id, userEmail: user.email });
    await changeMembership({
      organizationId: MAPLE_GROVE,
      userId: user.id,
      newRole: null,
      actorUserId: MAPLE_ADMIN,
    });

    expect((await loadActor(user.id)).memberships).toEqual([]);
  });

  it('refuses to remove the last administrator', async () => {
    await expect(
      changeMembership({
        organizationId: RIVERSIDE,
        userId: RIVERSIDE_ADMIN,
        newRole: null,
        actorUserId: RIVERSIDE_ADMIN,
      }),
    ).rejects.toThrow(LastAdministratorError);

    // And the membership is still there — the transaction rolled back.
    const actor = await loadActor(RIVERSIDE_ADMIN);
    expect(actor.memberships).toEqual([{ organizationId: RIVERSIDE, role: 'client_admin' }]);
  });

  it('refuses to demote the last administrator', async () => {
    await expect(
      changeMembership({
        organizationId: RIVERSIDE,
        userId: RIVERSIDE_ADMIN,
        newRole: 'client_executive',
        actorUserId: RIVERSIDE_ADMIN,
      }),
    ).rejects.toThrow(LastAdministratorError);
  });

  it('cannot change a membership in another tenant', async () => {
    // Row-level security means the UPDATE matches no rows rather than erroring.
    await changeMembership({
      organizationId: RIVERSIDE,
      userId: MAPLE_ADMIN,
      newRole: 'client_executive',
      actorUserId: RIVERSIDE_ADMIN,
    });
    const actor = await loadActor(MAPLE_ADMIN);
    expect(actor.memberships).toEqual([{ organizationId: MAPLE_GROVE, role: 'client_admin' }]);
  });
});

describe('the audit trail (SEC-006, A-11)', () => {
  async function auditRows(organizationId: string) {
    return withSystemContext('reading audit rows for the test', async (tx) => {
      const { rows } = await tx.query<{ action: string; object_type: string; context: unknown }>(
        `SELECT action, object_type, context FROM audit_events
          WHERE organization_id = $1 ORDER BY occurred_at`,
        [organizationId],
      );
      return rows;
    });
  }

  beforeEach(async () => {
    await withSystemContext('test fixture reset', async (tx) => {
      // audit_events is append-only for the application role and by trigger.
      // The fixture connects as the owner, which is the one context permitted
      // to clear it — and only because this is a test database.
      await tx.query('SET LOCAL ROLE NONE');
      await tx.query('ALTER TABLE audit_events DISABLE TRIGGER audit_events_no_update');
      await tx.query('DELETE FROM audit_events');
      await tx.query('ALTER TABLE audit_events ENABLE TRIGGER audit_events_no_update');
    });
  });

  it('records an invitation as it is created, in the tenant it belongs to', async () => {
    await createInvitation({
      organizationId: MAPLE_GROVE,
      email: 'audited@maplegrove.example',
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });

    const rows = await auditRows(MAPLE_GROVE);
    expect(rows.map((r) => r.action)).toEqual(['access.invitation_sent']);
    // The role is recorded because it is the security-relevant part; the address
    // is not, because the invitation row already holds it under a retention
    // schedule and the audit log outlives that.
    expect(rows[0]!.context).toEqual({ role: 'client_contributor' });
    expect(JSON.stringify(rows[0]!.context)).not.toContain('audited@maplegrove.example');

    expect(await auditRows(RIVERSIDE)).toEqual([]);
  });

  it('records acceptance as both an invitation event and a permission grant', async () => {
    const user = await uniqueUser('audited');
    const { token } = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: user.email,
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });
    await acceptInvitation({ token, userId: user.id, userEmail: user.email });

    expect((await auditRows(MAPLE_GROVE)).map((r) => r.action)).toEqual([
      'access.invitation_sent',
      'access.invitation_accepted',
      'access.permission_granted',
    ]);
  });

  it('writes no audit row when the action it records is rolled back', async () => {
    // The whole point of A-11. An audit row that survives a refused change is
    // evidence of something that did not happen.
    await expect(
      changeMembership({
        organizationId: RIVERSIDE,
        userId: RIVERSIDE_ADMIN,
        newRole: null,
        actorUserId: RIVERSIDE_ADMIN,
      }),
    ).rejects.toThrow(LastAdministratorError);

    expect(await auditRows(RIVERSIDE)).toEqual([]);
  });

  it('records nothing for a refused cross-tenant revocation', async () => {
    const { invitation } = await createInvitation({
      organizationId: MAPLE_GROVE,
      email: 'crosstenant@maplegrove.example',
      role: 'client_contributor',
      invitedByUserId: MAPLE_ADMIN,
    });
    await revokeInvitation({
      organizationId: RIVERSIDE,
      invitationId: invitation.id,
      revokedByUserId: RIVERSIDE_ADMIN,
    });

    expect(await auditRows(RIVERSIDE)).toEqual([]);
    expect((await auditRows(MAPLE_GROVE)).map((r) => r.action)).toEqual(['access.invitation_sent']);
  });
});

describe('sessions', () => {
  it('creates a session that cannot serve a request until the second factor is satisfied', async () => {
    const { token, session } = await createAuthSession({ userId: MAPLE_ADMIN });
    expect(session.mfaSatisfiedAt).toBeNull();
    expect(evaluateSession(session, ['client_admin']).state).toEqual({ status: 'mfa_required' });

    await markMfaSatisfied(session.id, 'totp');
    const after = await findAuthSession(token);
    expect(evaluateSession(after!, ['client_admin']).state).toEqual({ status: 'active' });
  });

  it('stores only a hash, so the row cannot be turned back into a cookie', async () => {
    const { token, session } = await createAuthSession({ userId: MAPLE_ADMIN });
    const stored = await withSystemContext('reading session row for the test', async (tx) => {
      const { rows } = await tx.query<{ token_hash: string }>(
        'SELECT token_hash FROM auth_sessions WHERE id = $1',
        [session.id],
      );
      return rows[0]!;
    });
    expect(stored.token_hash).not.toBe(token);
    expect(stored.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses to satisfy the second factor on a session revoked in the meantime', async () => {
    const { token, session } = await createAuthSession({ userId: MAPLE_ADMIN });
    await revokeAuthSession(session.id, 'membership_revoked');
    await markMfaSatisfied(session.id, 'totp');

    const after = await findAuthSession(token);
    expect(after!.mfaSatisfiedAt).toBeNull();
    expect(evaluateSession(after!, ['client_admin']).state).toEqual({ status: 'revoked' });
  });

  it('keeps the first revocation reason rather than relabelling it', async () => {
    const { token, session } = await createAuthSession({ userId: MAPLE_ADMIN });
    await revokeAuthSession(session.id, 'membership_revoked');
    await revokeAuthSession(session.id, 'signed_out');

    expect((await findAuthSession(token))!.revokedReason).toBe('membership_revoked');
  });

  it('ends every session a person holds, which is what makes revocation immediate', async () => {
    const a = await createAuthSession({ userId: MAPLE_ADMIN });
    const b = await createAuthSession({ userId: MAPLE_ADMIN });
    const kept = await createAuthSession({ userId: MAPLE_ADMIN });

    const revoked = await revokeAllUserSessions(MAPLE_ADMIN, 'account_disabled', {
      exceptSessionId: kept.session.id,
    });
    expect(revoked).toBe(2);
    expect((await findAuthSession(a.token))!.revokedAt).not.toBeNull();
    expect((await findAuthSession(b.token))!.revokedAt).not.toBeNull();
    expect((await findAuthSession(kept.token))!.revokedAt).toBeNull();
  });

  it('returns nothing for a token that was never issued', async () => {
    expect(await findAuthSession('made-up-token')).toBeUndefined();
    expect(await findAuthSession('')).toBeUndefined();
  });
});

describe('sign-in throttling', () => {
  const address = 'stuffed@example.org';

  it('locks out after the limit and reports a wait', async () => {
    for (let i = 0; i < SIGN_IN_ATTEMPT_LIMIT - 1; i += 1) {
      const decision = await recordSignInFailure(address);
      expect(decision.lockedOut).toBe(false);
    }
    const final = await recordSignInFailure(address);
    expect(final.lockedOut).toBe(true);
    expect(final.retryAfterSeconds).toBeGreaterThan(0);

    expect((await checkSignInThrottle(address)).lockedOut).toBe(true);
  });

  it('clears on a successful sign-in', async () => {
    await recordSignInFailure(address);
    await clearSignInFailures(address);
    expect((await checkSignInThrottle(address)).failedAttempts).toBe(0);
  });

  it('counts an address that belongs to nobody without creating a user', async () => {
    // Most addresses in a stuffing run are not real accounts. The counter must
    // work for them, and must not become a record of who was targeted.
    await recordSignInFailure('nobody-at-all@example.org');
    const stored = await withSystemContext('reading throttle rows for the test', async (tx) => {
      const { rows } = await tx.query<{ subject_key: string }>(
        'SELECT subject_key FROM sign_in_throttle',
      );
      return rows;
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]!.subject_key).not.toContain('nobody-at-all');
    expect(stored[0]!.subject_key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('keeps counters for different addresses independent', async () => {
    for (let i = 0; i < SIGN_IN_ATTEMPT_LIMIT; i += 1) {
      await recordSignInFailure('one@example.org');
    }
    expect((await checkSignInThrottle('one@example.org')).lockedOut).toBe(true);
    expect((await checkSignInThrottle('two@example.org')).lockedOut).toBe(false);
  });
});
