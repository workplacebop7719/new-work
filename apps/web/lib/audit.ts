/**
 * Audit events for actions that have no database write to share a transaction
 * with — SEC-006, assumption A-11.
 *
 * A-11 says an audit event commits in the same transaction as the action it
 * records, and where the action *is* a database write that is exactly what
 * happens: `createInvitation`, `acceptInvitation`, `changeMembership` and
 * `createOrganizationWithFounder` all write their own audit rows inside their
 * own transactions.
 *
 * Authentication is the honest exception. The thing that happened happened at
 * the identity provider, over HTTP, and there is no local transaction to join.
 * Writing the event afterwards means a crash between the two loses the record —
 * a real gap, recorded in the threat model rather than papered over. The
 * alternative, a local transaction that pretends to enclose a remote call, would
 * be a worse lie.
 */
import { newCorrelationId, type AuditAction } from '@northstar/domain';
import { withSystemContext } from '@northstar/db';
import { writeAuditEvent } from '@northstar/observability';

export interface AuthAuditInput {
  readonly action: AuditAction;
  readonly actorId: string | null;
  readonly organizationId?: string | null;
  readonly objectType: string;
  readonly objectId: string | null;
  readonly correlationId?: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Writes one event.
 *
 * `organizationId` is null for authentication events on purpose: a sign-in is
 * not an act inside a tenant, and a failed sign-in frequently belongs to no
 * tenant at all. The RLS policy on `audit_events` makes those rows visible only
 * under system context, which is where they belong.
 */
export async function auditAuthEvent(input: AuthAuditInput): Promise<void> {
  await withSystemContext('authentication audit (no tenant scope)', async (tx) => {
    await writeAuditEvent(tx, {
      action: input.action,
      actorId: input.actorId,
      organizationId: input.organizationId ?? null,
      objectType: input.objectType,
      objectId: input.objectId,
      correlationId: input.correlationId ?? newCorrelationId(),
      context: input.context ?? {},
    });
  });
}
