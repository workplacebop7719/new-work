/**
 * Who is asking.
 *
 * An Actor is assembled from database state on every request (ADR-0002), never
 * from a token claim. That is what makes revocation immediate (SEC-003) rather
 * than bounded by token lifetime.
 */
import type { Role } from '@northstar/domain';

export interface TenantMembership {
  readonly organizationId: string;
  readonly role: Role;
}

/**
 * A contractor's access is a per-assignment grant with an expiry (CTR-004).
 * It is deliberately not a membership: a contractor never "belongs to" a client
 * tenant, so no code path can widen their access by reading memberships.
 */
export interface ContractorGrant {
  readonly organizationId: string;
  readonly projectId: string;
  readonly assignmentId: string;
  readonly expiresAt: Date;
  /** Only evidence explicitly attached to the assignment brief (CTR-003). */
  readonly evidenceIds: readonly string[];
}

/** Time-bound emergency access for platform admins (DAT-005). */
export interface BreakGlassGrant {
  readonly organizationId: string;
  readonly reason: string;
  readonly expiresAt: Date;
}

export interface Actor {
  readonly userId: string;
  readonly memberships: readonly TenantMembership[];
  readonly contractorGrants: readonly ContractorGrant[];
  readonly breakGlass?: BreakGlassGrant | undefined;
}

/** The unauthenticated actor. Named so that "no actor" is never `undefined`. */
export const ANONYMOUS: Actor = {
  userId: 'anonymous',
  memberships: [],
  contractorGrants: [],
};

export function roleIn(actor: Actor, organizationId: string): Role | undefined {
  return actor.memberships.find((m) => m.organizationId === organizationId)?.role;
}

export function activeGrant(
  actor: Actor,
  organizationId: string,
  projectId: string,
  now: Date,
): ContractorGrant | undefined {
  return actor.contractorGrants.find(
    (g) =>
      g.organizationId === organizationId &&
      g.projectId === projectId &&
      // Expiry is re-checked on every request, not only by the revocation job
      // (assumption A-16): a failed job must not leave evidence reachable.
      g.expiresAt.getTime() > now.getTime(),
  );
}

export function activeBreakGlass(
  actor: Actor,
  organizationId: string,
  now: Date,
): BreakGlassGrant | undefined {
  const grant = actor.breakGlass;
  if (!grant) return undefined;
  if (grant.organizationId !== organizationId) return undefined;
  return grant.expiresAt.getTime() > now.getTime() ? grant : undefined;
}
