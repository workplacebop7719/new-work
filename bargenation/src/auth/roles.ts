/**
 * Staff roles (PRD §49).
 *
 * Pure, so the rules can be tested without a database or a session. The
 * database is still the authority — `profiles.role` is not updatable by the
 * application role at all (migration 0010) — this module only decides what a
 * given role is allowed to do once it has been read.
 */

export const ROLES = ['customer', 'operator', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * Anything unrecognised is treated as a customer.
 *
 * Deny by default: a corrupt or unexpected value must never widen access, and
 * a future role added to the database but not to this list should have no
 * privileges here until someone grants them deliberately.
 */
export function toRole(value: unknown): Role {
  return isRole(value) ? value : 'customer';
}

/** May reach the admin surface at all. */
export function canAccessAdmin(role: Role): boolean {
  return role === 'operator' || role === 'admin';
}

/** May resolve an ambiguous product match. */
export function canResolveMatches(role: Role): boolean {
  return role === 'operator' || role === 'admin';
}

/**
 * May release a quarantined price into the permanent record.
 *
 * Restricted to admin. Releasing writes into append-only history, so the
 * decision cannot be undone by anyone — that is a different weight of action
 * from resolving a match, which only re-points future records.
 */
export function canReleaseQuarantine(role: Role): boolean {
  return role === 'admin';
}

/** May discard a held observation without recording it. */
export function canDiscardQuarantine(role: Role): boolean {
  return role === 'operator' || role === 'admin';
}
