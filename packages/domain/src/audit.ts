/**
 * Audit events — PRD §16 Auditability, §18 "Audit event".
 *
 * SEC-006 requires immutable security-relevant logs for sign-in, access,
 * download, export, permission change, report release, AI use and deletion.
 * The action list is closed: an unlisted action cannot be recorded, which forces
 * new security-relevant behaviour to be named here and reviewed.
 */
import { z } from 'zod';

export const AUDIT_ACTIONS = [
  // Identity and access
  'auth.sign_in_succeeded',
  'auth.sign_in_failed',
  'auth.mfa_enrolled',
  'auth.mfa_challenge_failed',
  'auth.account_locked',
  'auth.recovery_codes_issued',
  'auth.recovery_code_redeemed',
  'auth.signed_out',
  'auth.sessions_revoked',
  'access.permission_granted',
  'access.permission_revoked',
  'access.invitation_sent',
  'access.invitation_accepted',
  'access.invitation_revoked',
  'organization.created',
  'access.break_glass_opened',
  'access.break_glass_closed',
  // Evidence and deliverables
  'evidence.uploaded',
  'evidence.scan_completed',
  'evidence.downloaded',
  'evidence.classification_changed',
  'deliverable.released',
  'deliverable.download',
  // Data rights
  'data.export_requested',
  'data.export_completed',
  'data.deletion_requested',
  'data.deletion_completed',
  'consent.granted',
  'consent.withdrawn',
  // Governance
  'requirement.version_published',
  'content.claim_held',
  'content.claim_published',
  'ai.task_invoked',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * `actorId` is null only for unauthenticated events (a failed sign-in against an
 * unknown address). `organizationId` is null only for events outside any tenant.
 */
export const auditEventInput = z.object({
  action: z.enum(AUDIT_ACTIONS),
  actorId: z.string().nullable(),
  organizationId: z.string().nullable(),
  objectType: z.string().min(1).max(64),
  objectId: z.string().nullable(),
  correlationId: z.string().min(1).max(64),
  /**
   * Context is for reconstructing what happened, not for storing the thing that
   * happened. Redaction is applied by @northstar/observability before write;
   * document contents, file names and secrets must never reach this field.
   */
  context: z.record(z.string(), z.unknown()).default({}),
});

export type AuditEventInput = z.infer<typeof auditEventInput>;
