/**
 * Users, memberships and organizations — the read side of authorization.
 *
 * `loadActor` is the function ADR-0002 is about: the policy layer's `Actor` is
 * assembled from database rows on every request, never from a token claim. That
 * is the mechanism behind SEC-003's immediate revocation — a membership deleted
 * a second ago is gone from the next request's actor.
 */
import {
  FOUNDING_ROLE,
  newId,
  wouldOrphanOrganization,
  type EmployeeBand,
  type Role,
} from '@northstar/domain';
import type { Actor } from '@northstar/auth';
import { writeAuditEvent } from '@northstar/observability';
import { withSystemContext, withTenant } from './client';

const SYSTEM_REASON = 'actor assembly (memberships span tenants by definition)';

export interface AccountUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly preferredLanguage: 'en' | 'fr';
  readonly identitySubjectId: string | null;
  readonly status: 'active' | 'disabled';
  readonly recoveryCodesIssuedAt: Date | null;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  preferred_language: 'en' | 'fr';
  identity_subject_id: string | null;
  status: 'active' | 'disabled';
  recovery_codes_issued_at: Date | null;
}

const USER_COLUMNS = `id, email, display_name, preferred_language,
                      identity_subject_id, status, recovery_codes_issued_at`;

const toUser = (row: UserRow): AccountUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  preferredLanguage: row.preferred_language,
  identitySubjectId: row.identity_subject_id,
  status: row.status,
  recoveryCodesIssuedAt: row.recovery_codes_issued_at,
});

export async function findUserByEmail(email: string): Promise<AccountUser | undefined> {
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = lower($1)`,
      [email.trim()],
    );
    return rows[0] ? toUser(rows[0]) : undefined;
  });
}

export async function findUserById(userId: string): Promise<AccountUser | undefined> {
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [
      userId,
    ]);
    return rows[0] ? toUser(rows[0]) : undefined;
  });
}

export async function createUser(input: {
  email: string;
  displayName: string;
  preferredLanguage: 'en' | 'fr';
  identitySubjectId: string;
}): Promise<AccountUser> {
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<UserRow>(
      `INSERT INTO users (id, email, display_name, preferred_language, identity_subject_id)
       VALUES ($1, lower($2), $3, $4, $5)
       RETURNING ${USER_COLUMNS}`,
      [newId(), input.email.trim(), input.displayName, input.preferredLanguage, input.identitySubjectId],
    );
    return toUser(rows[0]!);
  });
}

/**
 * Attaches a provider subject to an existing user row.
 *
 * Used by the demo bootstrap and by the assisted-onboarding path, where a user
 * row exists before anyone has signed in. It refuses to move a link that is
 * already set: re-pointing a user at a different provider subject would be an
 * account takeover with a database update.
 */
export async function linkIdentitySubject(userId: string, subjectId: string): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(
      `UPDATE users SET identity_subject_id = $2
        WHERE id = $1 AND (identity_subject_id IS NULL OR identity_subject_id = $2)`,
      [userId, subjectId],
    );
  });
}

export async function recordRecoveryCodesIssued(userId: string): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(`UPDATE users SET recovery_codes_issued_at = now() WHERE id = $1`, [userId]);
  });
}

export async function setUserStatus(
  userId: string,
  status: 'active' | 'disabled',
): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(
      `UPDATE users SET status = $2, disabled_at = CASE WHEN $2 = 'disabled' THEN now() ELSE NULL END
        WHERE id = $1`,
      [userId, status],
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Second-factor state                                                        */
/* -------------------------------------------------------------------------- */

export interface EnrolledFactor {
  readonly method: 'totp' | 'passkey';
  readonly label: string;
  readonly enrolledAt: Date;
  readonly lastUsedAt: Date | null;
}

export async function listFactors(userId: string): Promise<readonly EnrolledFactor[]> {
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<{
      method: 'totp' | 'passkey';
      label: string;
      enrolled_at: Date;
      last_used_at: Date | null;
    }>(
      `SELECT method, label, enrolled_at, last_used_at FROM user_mfa_factors
        WHERE user_id = $1 ORDER BY enrolled_at`,
      [userId],
    );
    return rows.map((r) => ({
      method: r.method,
      label: r.label,
      enrolledAt: r.enrolled_at,
      lastUsedAt: r.last_used_at,
    }));
  });
}

export async function recordFactorEnrolled(input: {
  userId: string;
  method: 'totp' | 'passkey';
  label: string;
}): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(
      `INSERT INTO user_mfa_factors (user_id, method, label)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, method) DO UPDATE SET label = EXCLUDED.label, enrolled_at = now()`,
      [input.userId, input.method, input.label],
    );
  });
}

export async function clearFactors(userId: string): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(`DELETE FROM user_mfa_factors WHERE user_id = $1`, [userId]);
  });
}

/* -------------------------------------------------------------------------- */
/* Memberships                                                                */
/* -------------------------------------------------------------------------- */

export interface MembershipRecord {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly role: Role;
}

/**
 * Assembles the policy layer's actor.
 *
 * Contractor grants are an empty list until CC-06 builds assignments. The field
 * is present rather than omitted so that the shape the policy layer sees is the
 * final one, and so that a contractor with no grants is denied by the existing
 * `contractor without an active assignment grant` branch rather than by a
 * missing property.
 */
export async function loadActor(userId: string): Promise<Actor> {
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<{ organization_id: string; role: Role }>(
      `SELECT m.organization_id, m.role
         FROM memberships m
         JOIN users u ON u.id = m.user_id
        WHERE m.user_id = $1 AND u.status = 'active'`,
      [userId],
    );
    return {
      userId,
      memberships: rows.map((r) => ({ organizationId: r.organization_id, role: r.role })),
      contractorGrants: [],
    };
  });
}

export async function listMembershipsForUser(userId: string): Promise<readonly MembershipRecord[]> {
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<{ organization_id: string; legal_name: string; role: Role }>(
      `SELECT m.organization_id, o.legal_name, m.role
         FROM memberships m
         JOIN organizations o ON o.id = m.organization_id
        WHERE m.user_id = $1
        ORDER BY o.legal_name`,
      [userId],
    );
    return rows.map((r) => ({
      organizationId: r.organization_id,
      organizationName: r.legal_name,
      role: r.role,
    }));
  });
}

export interface TeamMember {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: Role;
  readonly joinedAt: Date;
  readonly status: 'active' | 'disabled';
}

/**
 * The team list, read inside the tenant.
 *
 * Note the join to the global `users` table: row-level security filters
 * `memberships`, and the user rows reachable through it are exactly the members
 * of this tenant. A user who is not a member cannot be reached from here, which
 * is why there is no separate "search all users" function.
 */
export async function listTeam(organizationId: string): Promise<readonly TeamMember[]> {
  return withTenant(organizationId, async (tx) => {
    const { rows } = await tx.query<{
      user_id: string;
      email: string;
      display_name: string;
      role: Role;
      created_at: Date;
      status: 'active' | 'disabled';
    }>(
      `SELECT m.user_id, u.email, u.display_name, m.role, m.created_at, u.status
         FROM memberships m
         JOIN users u ON u.id = m.user_id
        WHERE m.organization_id = $1
        ORDER BY u.display_name`,
      [organizationId],
    );
    return rows.map((r) => ({
      userId: r.user_id,
      email: r.email,
      displayName: r.display_name,
      role: r.role,
      joinedAt: r.created_at,
      status: r.status,
    }));
  });
}

export class LastAdministratorError extends Error {
  constructor() {
    super('An organization must keep at least one administrator.');
    this.name = 'LastAdministratorError';
  }
}

/**
 * Changes a role, or removes a membership when `newRole` is null.
 *
 * The orphan check runs inside the same transaction as the write, against rows
 * read in that transaction. Doing it in the action handler instead would leave a
 * window in which two administrators demote each other concurrently and the
 * organization ends up with none.
 */
export async function changeMembership(input: {
  organizationId: string;
  userId: string;
  newRole: Role | null;
  actorUserId: string;
  correlationId?: string;
}): Promise<void> {
  await withTenant(input.organizationId, async (tx) => {
    const { rows } = await tx.query<{ user_id: string; role: Role }>(
      `SELECT user_id, role FROM memberships WHERE organization_id = $1 FOR UPDATE`,
      [input.organizationId],
    );
    const current = rows.map((r) => ({ userId: r.user_id, role: r.role }));
    if (wouldOrphanOrganization(current, { userId: input.userId, newRole: input.newRole })) {
      throw new LastAdministratorError();
    }
    const previous = current.find((m) => m.userId === input.userId)?.role ?? null;
    if (input.newRole === null) {
      await tx.query(`DELETE FROM memberships WHERE organization_id = $1 AND user_id = $2`, [
        input.organizationId,
        input.userId,
      ]);
    } else {
      await tx.query(
        `UPDATE memberships SET role = $3 WHERE organization_id = $1 AND user_id = $2`,
        [input.organizationId, input.userId, input.newRole],
      );
    }
    await writeAuditEvent(tx, {
      action: input.newRole === null ? 'access.permission_revoked' : 'access.permission_granted',
      actorId: input.actorUserId,
      organizationId: input.organizationId,
      objectType: 'membership',
      objectId: input.userId,
      correlationId: input.correlationId ?? input.userId,
      // Both roles, because "what changed" is the question this row is read to
      // answer, and a new role alone does not answer it.
      context: { previousRole: previous, newRole: input.newRole },
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Organization creation                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Creates an organization and seats its first administrator.
 *
 * Both writes happen in one transaction under system context, because until the
 * organization row exists there is no tenant to scope to — this is the
 * bootstrap case ADR-0003 anticipates. Everything afterwards runs inside
 * `withTenant`.
 */
export async function createOrganizationWithFounder(input: {
  legalName: string;
  organizationType: string;
  employeeBand: EmployeeBand;
  jurisdiction: string;
  preferredLanguage: 'en' | 'fr';
  founderUserId: string;
  correlationId?: string;
}): Promise<{ organizationId: string }> {
  return withSystemContext('organization bootstrap (no tenant exists yet)', async (tx) => {
    const organizationId = newId();
    await tx.query(
      `INSERT INTO organizations (id, legal_name, organization_type, employee_band, jurisdiction, preferred_language)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        organizationId,
        input.legalName,
        input.organizationType,
        input.employeeBand,
        input.jurisdiction,
        input.preferredLanguage,
      ],
    );
    await tx.query(
      `INSERT INTO memberships (organization_id, user_id, role) VALUES ($1, $2, $3)`,
      [organizationId, input.founderUserId, FOUNDING_ROLE],
    );
    await writeAuditEvent(tx, {
      action: 'organization.created',
      actorId: input.founderUserId,
      organizationId,
      objectType: 'organization',
      objectId: organizationId,
      correlationId: input.correlationId ?? organizationId,
      // The band, not the legal name: the audit log answers "what happened",
      // and the organizations table already holds who it happened to.
      context: { employeeBand: input.employeeBand, jurisdiction: input.jurisdiction },
    });
    await writeAuditEvent(tx, {
      action: 'access.permission_granted',
      actorId: input.founderUserId,
      organizationId,
      objectType: 'membership',
      objectId: input.founderUserId,
      correlationId: input.correlationId ?? organizationId,
      context: { role: FOUNDING_ROLE, via: 'organization_creation' },
    });
    return { organizationId };
  });
}

export interface OrganizationProfile {
  readonly id: string;
  readonly legalName: string;
  readonly organizationType: string;
  readonly employeeBand: EmployeeBand;
  readonly jurisdiction: string;
  readonly preferredLanguage: 'en' | 'fr';
}

export async function findOrganization(
  organizationId: string,
): Promise<OrganizationProfile | undefined> {
  return withTenant(organizationId, async (tx) => {
    const { rows } = await tx.query<{
      id: string;
      legal_name: string;
      organization_type: string;
      employee_band: EmployeeBand;
      jurisdiction: string;
      preferred_language: 'en' | 'fr';
    }>(
      `SELECT id, legal_name, organization_type, employee_band, jurisdiction, preferred_language
         FROM organizations WHERE id = $1`,
      [organizationId],
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          legalName: row.legal_name,
          organizationType: row.organization_type,
          employeeBand: row.employee_band,
          jurisdiction: row.jurisdiction,
          preferredLanguage: row.preferred_language,
        }
      : undefined;
  });
}

/**
 * The organization's name, for the invitation acceptance page.
 *
 * A person accepting an invitation is not yet a member, so this cannot run
 * inside `withTenant` — the tenant they are joining is precisely the one they
 * have no standing in yet. It returns a single name and nothing else, and the
 * caller has already proved it holds a valid invitation token for that tenant.
 */
export async function findOrganizationName(organizationId: string): Promise<string | undefined> {
  return withSystemContext('invitation acceptance page (joiner is not yet a member)', async (tx) => {
    const { rows } = await tx.query<{ legal_name: string }>(
      `SELECT legal_name FROM organizations WHERE id = $1`,
      [organizationId],
    );
    return rows[0]?.legal_name;
  });
}

export async function updateOrganizationProfile(input: {
  organizationId: string;
  legalName: string;
  organizationType: string;
  employeeBand: EmployeeBand;
  jurisdiction: string;
  preferredLanguage: 'en' | 'fr';
}): Promise<void> {
  await withTenant(input.organizationId, async (tx) => {
    // No `WHERE organization_id` clause is needed for isolation — row-level
    // security supplies it — but it is written anyway, because a reader should
    // not have to know the policy to know what this statement touches.
    await tx.query(
      `UPDATE organizations
          SET legal_name = $2, organization_type = $3, employee_band = $4,
              jurisdiction = $5, preferred_language = $6
        WHERE id = $1`,
      [
        input.organizationId,
        input.legalName,
        input.organizationType,
        input.employeeBand,
        input.jurisdiction,
        input.preferredLanguage,
      ],
    );
  });
}
