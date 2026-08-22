/**
 * The policy layer — the single place that answers "may this actor do this?".
 *
 * ENG-001 (PRD §27): "Never place authorization solely in UI components; enforce
 * it at server/domain and storage boundaries." This module is the server/domain
 * boundary. The storage boundary is Row-Level Security (ADR-0003) and, for
 * files, per-request signed URLs (ADR-0004). All three are required; none of
 * them is sufficient alone.
 *
 * The function is pure and synchronous so the whole role matrix can be exercised
 * by `test:authz` without a database, an IdP or a running server.
 */
import { type Actor, activeBreakGlass, activeGrant, roleIn } from './actor';
import type { Action, Resource } from './resources';

export interface Decision {
  readonly allowed: boolean;
  /**
   * Human-readable and safe to log. Never include object contents here — this
   * string reaches structured logs, which are redacted but not secret-bearing.
   */
  readonly reason: string;
}

const allow = (reason: string): Decision => ({ allowed: true, reason });
const deny = (reason: string): Decision => ({ allowed: false, reason });

/** Actions that move something toward a client. Never available to clients themselves. */
const RELEASE_ACTIONS: ReadonlySet<Action> = new Set(['release']);

export function can(
  actor: Actor,
  action: Action,
  resource: Resource,
  now: Date = new Date(),
): Decision {
  if (actor.userId === 'anonymous') {
    return deny('unauthenticated');
  }

  // Contractors are evaluated first and exclusively: an external specialist must
  // never pick up permissions from a membership path (CTR-004).
  const grant = resource.projectId
    ? activeGrant(actor, resource.organizationId, resource.projectId, now)
    : undefined;
  if (grant) {
    return contractorPolicy(action, resource, grant.evidenceIds);
  }
  if (actor.contractorGrants.length > 0 && !roleIn(actor, resource.organizationId)) {
    // Held a grant, but not for this tenant/project, or it has expired.
    return deny('contractor grant does not cover this resource');
  }

  const role = roleIn(actor, resource.organizationId);
  if (!role) {
    const breakGlass = activeBreakGlass(actor, resource.organizationId, now);
    if (breakGlass && actor.memberships.some((m) => m.role === 'platform_admin')) {
      return breakGlassPolicy(action, resource);
    }
    // Cross-tenant: the caller has no standing in this tenant at all. The caller
    // is told nothing about whether the resource exists (ADR-0003).
    return deny('no membership in tenant');
  }

  switch (role) {
    case 'client_admin':
      return clientAdminPolicy(action, resource);
    case 'client_contributor':
      return clientContributorPolicy(action, resource);
    case 'client_executive':
      return clientExecutivePolicy(action, resource);
    case 'contractor':
      // A contractor role with no active grant has nothing.
      return deny('contractor without an active assignment grant');
    case 'internal_pm':
      return internalPmPolicy(action, resource);
    case 'qualified_reviewer':
      return qualifiedReviewerPolicy(actor, action, resource);
    case 'platform_admin':
      return platformAdminPolicy(actor, action, resource, now);
    default:
      // Deny by default. A new role that reaches here is denied until its policy
      // is written, which is the intended failure mode.
      return deny('no policy for role');
  }
}

/** PRD §18: cannot alter released findings or internal QA records. */
function clientAdminPolicy(action: Action, resource: Resource): Decision {
  switch (resource.class) {
    case 'internal_note':
    case 'contractor_rate':
      return deny('internal working records are not client-visible');
    case 'assignment':
      // Contractor visibility is "controlled" (PRD §9 work plan) and is designed
      // in CC-06. Until then the safe default is no visibility.
      return deny('contractor assignment visibility is introduced in CC-06');
    case 'finding':
      if (resource.released === true && action !== 'read') {
        return deny('released findings cannot be altered by the client');
      }
      return action === 'delete' ? deny('findings are not client-deletable') : allow('client admin');
    case 'deliverable':
      return action === 'read' || action === 'export'
        ? allow('client admin may read and export deliverables')
        : deny('deliverable lifecycle is controlled internally');
    case 'audit_event':
      return action === 'read' ? allow('client admin has audit-log access (CLP-012)') : deny('audit log is append-only');
    case 'invitation':
      // Revoking is an update, never a delete: the record of who was invited and
      // by whom outlives the invitation itself (CLP-013, SEC-006).
      if (action === 'delete') return deny('invitations are revoked, not deleted');
      return RELEASE_ACTIONS.has(action) || action === 'export'
        ? deny('not an invitation action')
        : allow('client admin manages the team (CLP-013)');
    case 'organization':
    case 'membership':
    case 'project':
    case 'evidence':
    case 'billing':
      return RELEASE_ACTIONS.has(action) ? deny('release is an internal action') : allow('client admin');
    case 'requirement':
      return action === 'read' ? allow('client admin may read the requirements matrix') : deny('requirement versions are set by qualified review');
    default:
      return deny('no policy for resource class');
  }
}

/** PRD §18: no billing, user administration or unrestricted exports. */
function clientContributorPolicy(action: Action, resource: Resource): Decision {
  if (action === 'export') return deny('contributors may not export');
  switch (resource.class) {
    case 'evidence':
      return action === 'delete' ? deny('evidence deletion is an admin action') : allow('contributor may contribute evidence');
    case 'finding':
      if (resource.released === true && action !== 'read') return deny('released findings cannot be altered');
      return action === 'read' || action === 'update' ? allow('contributor may work findings') : deny('not permitted');
    case 'organization':
    case 'project':
    case 'requirement':
    case 'membership':
    case 'deliverable':
      return action === 'read' ? allow('contributor read access') : deny('not permitted');
    case 'billing':
      return deny('contributors have no billing access');
    case 'invitation':
    case 'assignment':
    case 'internal_note':
    case 'contractor_rate':
    case 'audit_event':
      return deny('not visible to contributors');
    default:
      return deny('no policy for resource class');
  }
}

/** PRD §18: no contractor details or working notes unless explicitly shared. */
function clientExecutivePolicy(action: Action, resource: Resource): Decision {
  switch (resource.class) {
    case 'deliverable':
      if (resource.released !== true) return deny('executives see released deliverables only');
      return action === 'read' || action === 'export' ? allow('executive report access') : deny('not permitted');
    case 'finding':
      if (resource.released !== true) return deny('executives do not see working findings');
      return action === 'read' ? allow('executive may read released findings') : deny('not permitted');
    case 'billing':
      return action === 'read' || action === 'approve'
        ? allow('executive approves scopes and change orders')
        : deny('not permitted');
    case 'project':
      return action === 'read' || action === 'approve' ? allow('executive approval') : deny('not permitted');
    case 'organization':
    case 'requirement':
    case 'membership':
    case 'evidence':
      return action === 'read' ? allow('executive read access') : deny('not permitted');
    case 'invitation':
    case 'assignment':
    case 'internal_note':
    case 'contractor_rate':
    case 'audit_event':
      return deny('not visible to executives');
    default:
      return deny('no policy for resource class');
  }
}

/**
 * PRD §18 / CTR-004: assigned project inputs only, and only the evidence the
 * assignment brief names. No other clients, no retail pricing, no release.
 */
function contractorPolicy(
  action: Action,
  resource: Resource,
  grantedEvidenceIds: readonly string[],
): Decision {
  if (action === 'export') return deny('contractors may not export');
  if (RELEASE_ACTIONS.has(action)) return deny('contractors have no release control');

  switch (resource.class) {
    case 'evidence':
      if (resource.id === undefined || !grantedEvidenceIds.includes(resource.id)) {
        return deny('evidence is not attached to this assignment');
      }
      return action === 'read' ? allow('assignment evidence') : deny('evidence is read-only for contractors');
    case 'finding':
      return action === 'delete' ? deny('findings are not deletable') : allow('contractor submits findings');
    case 'deliverable':
      return action === 'approve' ? deny('contractors do not approve their own work') : allow('contractor drafts deliverables');
    case 'assignment':
      return action === 'read' || action === 'update' ? allow('own assignment') : deny('not permitted');
    case 'project':
    case 'requirement':
      return action === 'read' ? allow('assignment context') : deny('not permitted');
    case 'organization':
    case 'membership':
    case 'invitation':
    case 'billing':
    case 'contractor_rate':
    case 'internal_note':
    case 'audit_event':
      return deny('outside the assignment scope');
    default:
      return deny('no policy for resource class');
  }
}

/** PRD §18: cannot override required independent review alone. */
function internalPmPolicy(action: Action, resource: Resource): Decision {
  if (action === 'approve' && resource.highRisk === true) {
    return deny('high-risk approval requires a qualified reviewer');
  }
  switch (resource.class) {
    case 'audit_event':
      return action === 'read' ? allow('internal oversight') : deny('audit log is append-only');
    case 'requirement':
      return action === 'read' ? allow('internal read') : deny('requirement versions are published by qualified review');
    case 'invitation':
      // Assisted onboarding (§9): staff seat a client organization's first users.
      // The role they may name is constrained separately by `invitableRoles`.
      return action === 'delete' || action === 'export'
        ? deny('not an invitation action')
        : allow('assisted onboarding');
    default:
      return action === 'delete' ? deny('deletion is not a routine internal action') : allow('internal project management');
  }
}

/** PRD §18: cannot approve their own high-risk work where segregation is required (DAT-004). */
function qualifiedReviewerPolicy(actor: Actor, action: Action, resource: Resource): Decision {
  if (
    (action === 'approve' || action === 'release') &&
    resource.highRisk === true &&
    resource.authorUserId === actor.userId
  ) {
    return deny('segregation of duties: reviewer may not approve their own high-risk work');
  }
  switch (resource.class) {
    case 'contractor_rate':
    case 'billing':
      return deny('commercial detail is not part of qualified review');
    case 'invitation':
    case 'membership':
      return deny('team administration is not part of qualified review');
    case 'audit_event':
      return action === 'read' ? allow('review oversight') : deny('audit log is append-only');
    default:
      if (action === 'delete') return deny('reviewers do not delete');
      return allow('qualified review');
  }
}

/** PRD §18: no routine client-content access; break-glass is time-bound and reviewed. */
function platformAdminPolicy(actor: Actor, action: Action, resource: Resource, now: Date): Decision {
  if (resource.class === 'audit_event') {
    return action === 'read' ? allow('platform oversight') : deny('audit log is append-only');
  }
  const grant = activeBreakGlass(actor, resource.organizationId, now);
  if (!grant) {
    return deny('platform admins have no routine client-content access');
  }
  return breakGlassPolicy(action, resource);
}

/**
 * Under break-glass an admin can look, to diagnose an incident. They still
 * cannot approve, release or export: emergency access is for understanding a
 * problem, not for taking client-facing action unreviewed.
 */
function breakGlassPolicy(action: Action, resource: Resource): Decision {
  if (resource.class === 'contractor_rate' || resource.class === 'billing') {
    return deny('commercial data is out of scope for break-glass');
  }
  return action === 'read'
    ? allow('break-glass read access (time-bound, logged)')
    : deny('break-glass grants read access only');
}

/** Throwing variant for call sites that should abort rather than branch. */
export function assertCan(actor: Actor, action: Action, resource: Resource, now?: Date): void {
  const decision = can(actor, action, resource, now);
  if (!decision.allowed) {
    const error = new Error(decision.reason);
    error.name = 'ForbiddenError';
    throw error;
  }
}
