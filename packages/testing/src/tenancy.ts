/**
 * Tenant-isolation fixtures.
 *
 * Shared so that the application-layer authorization tests (@northstar/auth) and
 * the storage-layer row-level-security tests (@northstar/db) exercise the same
 * two tenants. When they drift apart, a gap opens between the inner door and the
 * outer wall — which is precisely the gap an attacker looks for.
 */
import type { Role } from '@northstar/domain';

export const TENANT_A = '0199a000-0000-7000-8000-00000000a001';
export const TENANT_B = '0199a000-0000-7000-8000-00000000b001';

export interface TenantCase {
  readonly label: string;
  readonly actorTenant: string;
  readonly targetTenant: string;
  readonly role: Role;
}

/**
 * Every (role × cross-tenant) combination. Iterating this rather than
 * hand-writing cases is what keeps coverage complete when a role is added.
 */
export function crossTenantCases(roles: readonly Role[]): TenantCase[] {
  return roles.map((role) => ({
    label: `${role} from tenant A against tenant B`,
    actorTenant: TENANT_A,
    targetTenant: TENANT_B,
    role,
  }));
}
