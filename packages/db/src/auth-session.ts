/**
 * Session store — SEC-002, SEC-003, ACC-004.
 *
 * A session cookie is a bearer token: whoever holds it is treated as the person.
 * So only its hash is stored, exactly as for qualifier resume tokens, and there
 * is no function here that returns a token — a caller can create one or verify
 * one, never read one back.
 *
 * Sessions are global rather than tenant-scoped (see 0004_identity.notes.md), so
 * every function in this module uses `withSystemContext` with a stated reason.
 * The tenant is chosen per request, from memberships, after the session
 * resolves to a user.
 */
import { createHash, randomBytes } from 'node:crypto';
import {
  newId,
  sessionPolicyFor,
  sessionState,
  shouldWarnAboutTimeout,
  type MfaMethod,
  type Role,
  type SessionState,
} from '@northstar/domain';
import { withSystemContext } from './client';

const SYSTEM_REASON = 'auth session (global by design, resolved by token hash)';

export const SESSION_REVOKED_REASONS = [
  'signed_out',
  'signed_out_everywhere',
  'membership_revoked',
  'password_changed',
  'recovery_used',
  'account_disabled',
] as const;
export type SessionRevokedReason = (typeof SESSION_REVOKED_REASONS)[number];

export interface AuthSession {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  readonly mfaSatisfiedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly revokedReason: SessionRevokedReason | null;
  readonly clientHash: string | null;
  readonly userAgentFamily: string | null;
}

interface Row {
  id: string;
  user_id: string;
  created_at: Date;
  last_seen_at: Date;
  mfa_satisfied_at: Date | null;
  revoked_at: Date | null;
  revoked_reason: SessionRevokedReason | null;
  client_hash: string | null;
  user_agent_family: string | null;
}

const COLUMNS = `id, user_id, created_at, last_seen_at, mfa_satisfied_at,
                 revoked_at, revoked_reason, client_hash, user_agent_family`;

const toSession = (row: Row): AuthSession => ({
  id: row.id,
  userId: row.user_id,
  createdAt: row.created_at,
  lastSeenAt: row.last_seen_at,
  mfaSatisfiedAt: row.mfa_satisfied_at,
  revokedAt: row.revoked_at,
  revokedReason: row.revoked_reason,
  clientHash: row.client_hash,
  userAgentFamily: row.user_agent_family,
});

/** 32 bytes, base64url. The same size as a qualifier resume token, for the same reason. */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a session that cannot yet do anything.
 *
 * `mfa_satisfied_at` is null on creation without exception. The only transition
 * out of that state is `markMfaSatisfied`, called after the identity provider
 * has verified a second factor — so a code path that forgets the second factor
 * produces a session that fails every request rather than one that works.
 */
export async function createAuthSession(input: {
  userId: string;
  clientHash?: string | null;
  userAgentFamily?: string | null;
}): Promise<{ token: string; session: AuthSession }> {
  const token = newSessionToken();
  const session = await withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<Row>(
      `INSERT INTO auth_sessions (id, user_id, token_hash, client_hash, user_agent_family)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUMNS}`,
      [
        newId(),
        input.userId,
        hashSessionToken(token),
        input.clientHash ?? null,
        input.userAgentFamily ?? null,
      ],
    );
    return toSession(rows[0]!);
  });
  return { token, session };
}

export async function findAuthSession(token: string): Promise<AuthSession | undefined> {
  if (!token) return undefined;
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<Row>(
      `SELECT ${COLUMNS} FROM auth_sessions WHERE token_hash = $1`,
      [hashSessionToken(token)],
    );
    return rows[0] ? toSession(rows[0]) : undefined;
  });
}

export async function markMfaSatisfied(sessionId: string, method: MfaMethod): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    // The guard on `revoked_at` matters: an administrator may have revoked this
    // session in the seconds between the password and the second factor.
    await tx.query(
      `UPDATE auth_sessions
          SET mfa_satisfied_at = now(), last_seen_at = now()
        WHERE id = $1 AND revoked_at IS NULL`,
      [sessionId],
    );
    if (method !== 'recovery_code') {
      await tx.query(
        `UPDATE user_mfa_factors SET last_used_at = now()
          WHERE user_id = (SELECT user_id FROM auth_sessions WHERE id = $1) AND method = $2`,
        [sessionId, method],
      );
    }
  });
}

/**
 * Records activity, which is what pushes the idle clock forward.
 *
 * Deliberately not called on every request: writing a row on each page view
 * turns a read-mostly table into a write-heavy one and makes the idle timeout
 * un-testable. Callers touch a session at most once a minute, which is precise
 * enough for a 12-hour window.
 */
export const TOUCH_INTERVAL_MS = 60 * 1000;

export async function touchAuthSession(sessionId: string): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    await tx.query(
      `UPDATE auth_sessions SET last_seen_at = now()
        WHERE id = $1 AND revoked_at IS NULL
          AND last_seen_at < now() - ($2 || ' milliseconds')::interval`,
      [sessionId, String(TOUCH_INTERVAL_MS)],
    );
  });
}

export async function revokeAuthSession(
  sessionId: string,
  reason: SessionRevokedReason,
): Promise<void> {
  await withSystemContext(SYSTEM_REASON, async (tx) => {
    // Revocation is idempotent but never overwritten: the first reason recorded
    // is the true one, and a later sign-out must not relabel a forced revocation.
    await tx.query(
      `UPDATE auth_sessions SET revoked_at = now(), revoked_reason = $2
        WHERE id = $1 AND revoked_at IS NULL`,
      [sessionId, reason],
    );
  });
}

/**
 * Revokes every session a person holds.
 *
 * This is what makes SEC-003's "immediate revocation" true rather than
 * aspirational: removing a membership, disabling an account or redeeming a
 * recovery code all end the sessions that already exist, not just the ability to
 * create new ones.
 */
export async function revokeAllUserSessions(
  userId: string,
  reason: SessionRevokedReason,
  options: { exceptSessionId?: string } = {},
): Promise<number> {
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rowCount } = await tx.query(
      `UPDATE auth_sessions SET revoked_at = now(), revoked_reason = $2
        WHERE user_id = $1 AND revoked_at IS NULL
          AND ($3::uuid IS NULL OR id <> $3::uuid)`,
      [userId, reason, options.exceptSessionId ?? null],
    );
    return rowCount ?? 0;
  });
}

export async function listUserSessions(userId: string): Promise<readonly AuthSession[]> {
  return withSystemContext(SYSTEM_REASON, async (tx) => {
    const { rows } = await tx.query<Row>(
      `SELECT ${COLUMNS} FROM auth_sessions
        WHERE user_id = $1 AND revoked_at IS NULL
        ORDER BY last_seen_at DESC`,
      [userId],
    );
    return rows.map(toSession);
  });
}

/**
 * The whole session decision in one call: is it usable, and should the interface
 * warn about a timeout (ACC-004)?
 *
 * The roles come from memberships, because the policy depends on them — an
 * internal reviewer gets a short session wherever they are working.
 */
export function evaluateSession(
  session: AuthSession,
  roles: readonly Role[],
  now: Date = new Date(),
): { state: SessionState; warnAboutTimeout: boolean } {
  const policy = sessionPolicyFor(roles);
  const times = {
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    mfaSatisfiedAt: session.mfaSatisfiedAt,
    revokedAt: session.revokedAt,
  };
  return {
    state: sessionState(times, policy, now),
    warnAboutTimeout: shouldWarnAboutTimeout(times, policy, now),
  };
}
