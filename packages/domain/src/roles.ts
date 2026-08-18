/**
 * Role model — PRD §18.
 *
 * Roles are declared here, in the framework-independent domain, so that the
 * policy layer (@northstar/auth), the database seed and the UI all agree on
 * one list. Permissions are NOT declared here: what a role may do is a policy
 * decision (ENG-001), and keeping it out of the domain prevents the common
 * mistake of shipping a role constant that reads like an entitlement.
 */

export const CLIENT_ROLES = ['client_admin', 'client_contributor', 'client_executive'] as const;
export const DELIVERY_ROLES = ['contractor'] as const;
export const INTERNAL_ROLES = ['internal_pm', 'qualified_reviewer', 'platform_admin'] as const;

export const ROLES = [...CLIENT_ROLES, ...DELIVERY_ROLES, ...INTERNAL_ROLES] as const;

export type Role = (typeof ROLES)[number];
export type ClientRole = (typeof CLIENT_ROLES)[number];
export type InternalRole = (typeof INTERNAL_ROLES)[number];

export function isClientRole(role: Role): role is ClientRole {
  return (CLIENT_ROLES as readonly string[]).includes(role);
}

export function isInternalRole(role: Role): role is InternalRole {
  return (INTERNAL_ROLES as readonly string[]).includes(role);
}

/**
 * Contractors are external and scoped per assignment (CTR-004). They never hold
 * an organization membership in a client tenant, which is why they are excluded
 * from both client and internal role sets.
 */
export function isContractorRole(role: Role): boolean {
  return role === 'contractor';
}
