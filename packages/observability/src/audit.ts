/**
 * Audit writer — SEC-006.
 *
 * The event is written in the same transaction as the action it records
 * (assumption A-11). This module therefore takes a transaction rather than
 * opening one: an audit event that can commit while its action rolls back is
 * worse than no audit event, because it is evidence of something that did not
 * happen.
 */
import { auditEventInput, type AuditEventInput, newId } from '@northstar/domain';
import { redact } from './redaction';

export interface AuditTransaction {
  query(text: string, values?: readonly unknown[]): Promise<unknown>;
}

export async function writeAuditEvent(tx: AuditTransaction, input: AuditEventInput): Promise<string> {
  const parsed = auditEventInput.parse(input);
  const id = newId();
  await tx.query(
    `INSERT INTO audit_events (id, organization_id, actor_id, action, object_type, object_id, correlation_id, context)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      parsed.organizationId,
      parsed.actorId,
      parsed.action,
      parsed.objectType,
      parsed.objectId,
      parsed.correlationId,
      JSON.stringify(redact(parsed.context)),
    ],
  );
  return id;
}
