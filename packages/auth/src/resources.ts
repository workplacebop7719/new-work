/**
 * What is being asked about.
 *
 * Every protected resource class is declared here. `test:authz` asserts that
 * each one has cross-tenant coverage (CMD-001: "every protected resource class
 * must be covered"), so adding a class without a test fails CI.
 */

export const RESOURCE_CLASSES = [
  'organization',
  'membership',
  'project',
  'requirement',
  'evidence',
  'finding',
  'assignment',
  'deliverable',
  'audit_event',
  'billing',
  'internal_note',
  'contractor_rate',
] as const;

export type ResourceClass = (typeof RESOURCE_CLASSES)[number];

export const ACTIONS = ['read', 'create', 'update', 'delete', 'approve', 'release', 'export'] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * A resource is always addressed with its tenant. There is no overload that
 * omits `organizationId`: a policy question that cannot name a tenant is a bug,
 * not a global query.
 */
export interface Resource {
  readonly class: ResourceClass;
  readonly organizationId: string;
  readonly projectId?: string | undefined;
  readonly id?: string | undefined;
  /** Set on findings and deliverables that have been released to the client. */
  readonly released?: boolean | undefined;
  /** Set on work whose author must not also be its approver (DAT-004). */
  readonly authorUserId?: string | undefined;
  /** Set on findings/deliverables carrying release-critical conclusions. */
  readonly highRisk?: boolean | undefined;
}
