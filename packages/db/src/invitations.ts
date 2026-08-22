/**
 * Invitations — CLP-013.
 *
 * The emailed token is a bearer credential, so only its hash is stored and no
 * function here returns one after creation. `acceptInvitation` is the single
 * cross-tenant read in this slice: the token is what *determines* the tenant, so
 * the lookup necessarily precedes knowing it. Everything after that runs inside
 * `withTenant`.
 */
import { createHash, randomBytes } from 'node:crypto';
import {
  invitationState,
  newId,
  type InvitationState,
  type Role,
} from '@northstar/domain';
import { writeAuditEvent } from '@northstar/observability';
import { withSystemContext, withTenant } from './client';
import { enqueue } from './outbox';

export interface Invitation {
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly role: Role;
  readonly invitedByUserId: string | null;
  readonly createdAt: Date;
  readonly acceptedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly state: InvitationState;
}

interface Row {
  id: string;
  organization_id: string;
  email: string;
  role: Role;
  invited_by_user_id: string | null;
  created_at: Date;
  accepted_at: Date | null;
  revoked_at: Date | null;
}

const COLUMNS = `id, organization_id, email, role, invited_by_user_id,
                 created_at, accepted_at, revoked_at`;

function toInvitation(row: Row, now: Date): Invitation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    role: row.role,
    invitedByUserId: row.invited_by_user_id,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    // Expiry is computed from the clock, not stored. A stored `expired` flag
    // would be wrong for exactly as long as it took a job to run.
    state: invitationState(
      { createdAt: row.created_at, acceptedAt: row.accepted_at, revokedAt: row.revoked_at },
      now,
    ),
  };
}

export function newInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates an invitation, replacing any live one for the same address.
 *
 * The replacement is deliberate: a partial unique index means a second pending
 * invitation to one address in one organization is impossible, and an
 * administrator who clicks "invite" twice expects the newest link to work — not
 * an error, and not two working links.
 */
export async function createInvitation(input: {
  organizationId: string;
  email: string;
  role: Role;
  invitedByUserId: string;
  correlationId?: string;
  /**
   * Builds the link the email carries. The caller owns it because the path is
   * locale-dependent and this package knows nothing about routing.
   *
   * When supplied, the intent to send that email is enqueued in the **same**
   * transaction as the invitation row — so an invitation either exists with a
   * message queued for it, or does not exist at all. Sent directly, a mail
   * outage would leave a row nobody was ever told about.
   */
  acceptUrlFor?: (token: string) => string;
  locale?: 'en' | 'fr';
}): Promise<{ token: string; invitation: Invitation; acceptUrl: string | undefined }> {
  const token = newInvitationToken();
  const acceptUrl = input.acceptUrlFor?.(token);
  const invitation = await withTenant(input.organizationId, async (tx) => {
    await tx.query(
      `UPDATE invitations
          SET revoked_at = now(), revoked_by_user_id = $3
        WHERE organization_id = $1 AND lower(email) = lower($2)
          AND accepted_at IS NULL AND revoked_at IS NULL`,
      [input.organizationId, input.email, input.invitedByUserId],
    );
    const { rows } = await tx.query<Row>(
      `INSERT INTO invitations (id, organization_id, email, role, invited_by_user_id, token_hash)
       VALUES ($1, $2, lower($3), $4, $5, $6)
       RETURNING ${COLUMNS}`,
      [
        newId(),
        input.organizationId,
        input.email.trim(),
        input.role,
        input.invitedByUserId,
        hashInvitationToken(token),
      ],
    );
    const created = toInvitation(rows[0]!, new Date());
    // Same transaction as the action (A-11). An audit row that survives a rolled
    // back invitation would be evidence of something that did not happen.
    await writeAuditEvent(tx, {
      action: 'access.invitation_sent',
      actorId: input.invitedByUserId,
      organizationId: input.organizationId,
      objectType: 'invitation',
      objectId: created.id,
      correlationId: input.correlationId ?? created.id,
      // The role is recorded because it is the security-relevant part. The
      // address is not: redaction would strip it anyway, and the invitation row
      // already holds it under a retention schedule.
      context: { role: created.role },
    });

    if (acceptUrl) {
      await enqueue(tx, {
        organizationId: input.organizationId,
        messageType: 'email.invitation',
        payload: { to: created.email, locale: input.locale ?? 'en', acceptUrl },
      });
    }

    return created;
  });
  return { token, invitation, acceptUrl };
}

export async function listInvitations(
  organizationId: string,
  now: Date = new Date(),
): Promise<readonly Invitation[]> {
  return withTenant(organizationId, async (tx) => {
    const { rows } = await tx.query<Row>(
      `SELECT ${COLUMNS} FROM invitations
        WHERE organization_id = $1
        ORDER BY created_at DESC`,
      [organizationId],
    );
    return rows.map((row) => toInvitation(row, now));
  });
}

export async function revokeInvitation(input: {
  organizationId: string;
  invitationId: string;
  revokedByUserId: string;
  correlationId?: string;
}): Promise<boolean> {
  return withTenant(input.organizationId, async (tx) => {
    const { rowCount } = await tx.query(
      `UPDATE invitations SET revoked_at = now(), revoked_by_user_id = $3
        WHERE id = $2 AND organization_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL`,
      [input.organizationId, input.invitationId, input.revokedByUserId],
    );
    const revoked = (rowCount ?? 0) > 0;
    if (revoked) {
      await writeAuditEvent(tx, {
        action: 'access.invitation_revoked',
        actorId: input.revokedByUserId,
        organizationId: input.organizationId,
        objectType: 'invitation',
        objectId: input.invitationId,
        correlationId: input.correlationId ?? input.invitationId,
        context: {},
      });
    }
    return revoked;
  });
}

/**
 * Resolves a token to an invitation without accepting it, so the acceptance page
 * can show who invited whom before asking for a password.
 *
 * Returns the invitation whatever its state, including revoked and expired: the
 * page needs to say *why* a link no longer works. Nothing here grants anything.
 */
export async function findInvitationByToken(
  token: string,
  now: Date = new Date(),
): Promise<Invitation | undefined> {
  if (!token) return undefined;
  return withSystemContext('invitation token lookup (token determines the tenant)', async (tx) => {
    const { rows } = await tx.query<Row>(
      `SELECT ${COLUMNS} FROM invitations WHERE token_hash = $1`,
      [hashInvitationToken(token)],
    );
    return rows[0] ? toInvitation(rows[0], now) : undefined;
  });
}

export type AcceptOutcome =
  | { readonly outcome: 'accepted'; readonly organizationId: string; readonly role: Role }
  | { readonly outcome: 'not_pending'; readonly state: InvitationState }
  | { readonly outcome: 'wrong_address' }
  | { readonly outcome: 'unknown_token' };

/**
 * Accepts an invitation and creates the membership, in one transaction.
 *
 * The state is re-read `FOR UPDATE` inside the transaction rather than trusted
 * from the page that rendered the form. Between someone opening an invitation
 * link and submitting it, an administrator may have revoked it — and the answer
 * to that race must be the revocation, every time.
 *
 * The address must match. Otherwise a forwarded invitation email would let
 * whoever received it join under their own account, which turns an invitation
 * into a transferable credential.
 */
export async function acceptInvitation(input: {
  token: string;
  userId: string;
  userEmail: string;
  now?: Date;
  correlationId?: string;
}): Promise<AcceptOutcome> {
  const now = input.now ?? new Date();
  return withSystemContext('invitation token acceptance (token determines the tenant)', async (tx) => {
    const { rows } = await tx.query<Row>(
      `SELECT ${COLUMNS} FROM invitations WHERE token_hash = $1 FOR UPDATE`,
      [hashInvitationToken(input.token)],
    );
    const row = rows[0];
    if (!row) return { outcome: 'unknown_token' };

    const invitation = toInvitation(row, now);
    if (invitation.state !== 'pending') {
      return { outcome: 'not_pending', state: invitation.state };
    }
    if (invitation.email.toLowerCase() !== input.userEmail.trim().toLowerCase()) {
      return { outcome: 'wrong_address' };
    }

    await tx.query(
      `INSERT INTO memberships (organization_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [invitation.organizationId, input.userId, invitation.role],
    );
    await tx.query(
      `UPDATE invitations SET accepted_at = now(), accepted_user_id = $2 WHERE id = $1`,
      [invitation.id, input.userId],
    );
    await writeAuditEvent(tx, {
      action: 'access.invitation_accepted',
      actorId: input.userId,
      organizationId: invitation.organizationId,
      objectType: 'invitation',
      objectId: invitation.id,
      correlationId: input.correlationId ?? invitation.id,
      context: { role: invitation.role },
    });
    // Two events, because they answer different questions later: who accepted an
    // invitation, and when this person gained this role (SEC-006).
    await writeAuditEvent(tx, {
      action: 'access.permission_granted',
      actorId: input.userId,
      organizationId: invitation.organizationId,
      objectType: 'membership',
      objectId: input.userId,
      correlationId: input.correlationId ?? invitation.id,
      context: { role: invitation.role, via: 'invitation' },
    });
    return { outcome: 'accepted', organizationId: invitation.organizationId, role: invitation.role };
  });
}
