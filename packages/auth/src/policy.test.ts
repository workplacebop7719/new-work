/**
 * Authorization matrix — `pnpm test:authz`.
 *
 * CMD-001 requires cross-tenant and role matrix tests in which "every protected
 * resource class must be covered". The coverage assertion at the bottom of this
 * file fails when a class is added to RESOURCE_CLASSES without a cross-tenant
 * test, so the requirement is enforced rather than remembered.
 */
import { describe, expect, it } from 'vitest';
import { ROLES } from '@northstar/domain';
import type { Actor } from './actor';
import { can } from './policy';
import { ACTIONS, RESOURCE_CLASSES, type Resource, type ResourceClass } from './resources';

const TENANT_A = 'org_aaaaaaaa-0000-7000-8000-000000000001';
const TENANT_B = 'org_bbbbbbbb-0000-7000-8000-000000000002';
const PROJECT_A = 'prj_aaaaaaaa-0000-7000-8000-000000000010';
const NOW = new Date('2026-09-01T12:00:00Z');

const crossTenantCoverage = new Set<ResourceClass>();

function actorWithRole(role: (typeof ROLES)[number], organizationId = TENANT_A): Actor {
  return {
    userId: `usr_${role}`,
    memberships: [{ organizationId, role }],
    contractorGrants: [],
  };
}

function resource(cls: ResourceClass, organizationId: string, extra: Partial<Resource> = {}): Resource {
  return { class: cls, organizationId, projectId: PROJECT_A, ...extra };
}

describe('tenant isolation', () => {
  for (const cls of RESOURCE_CLASSES) {
    for (const role of ROLES) {
      it(`denies ${role} in tenant A every action on ${cls} in tenant B`, () => {
        const actor = actorWithRole(role, TENANT_A);
        for (const action of ACTIONS) {
          const decision = can(actor, action, resource(cls, TENANT_B), NOW);
          expect(decision.allowed, `${role} ${action} ${cls}`).toBe(false);
        }
        crossTenantCoverage.add(cls);
      });
    }
  }

  it('denies an unauthenticated actor everything', () => {
    for (const cls of RESOURCE_CLASSES) {
      for (const action of ACTIONS) {
        expect(
          can({ userId: 'anonymous', memberships: [], contractorGrants: [] }, action, resource(cls, TENANT_A), NOW)
            .allowed,
        ).toBe(false);
      }
    }
  });

  it('never reveals existence: a cross-tenant denial cites standing, not the object', () => {
    const decision = can(actorWithRole('client_admin'), 'read', resource('evidence', TENANT_B), NOW);
    expect(decision.reason).toBe('no membership in tenant');
  });
});

describe('contractor scoping (CTR-004)', () => {
  const contractor = (expiresAt: Date, evidenceIds: string[] = ['ev_granted']): Actor => ({
    userId: 'usr_contractor',
    memberships: [],
    contractorGrants: [
      {
        organizationId: TENANT_A,
        projectId: PROJECT_A,
        assignmentId: 'asg_1',
        expiresAt,
        evidenceIds,
      },
    ],
  });

  const future = new Date('2026-12-31T00:00:00Z');
  const past = new Date('2026-08-01T00:00:00Z');

  it('grants read on evidence named in the assignment brief', () => {
    expect(can(contractor(future), 'read', resource('evidence', TENANT_A, { id: 'ev_granted' }), NOW).allowed).toBe(true);
  });

  it('denies evidence that is not attached to the assignment', () => {
    expect(can(contractor(future), 'read', resource('evidence', TENANT_A, { id: 'ev_other' }), NOW).allowed).toBe(false);
  });

  it('denies everything once the grant has expired, without waiting for a revocation job (A-16)', () => {
    for (const cls of RESOURCE_CLASSES) {
      for (const action of ACTIONS) {
        expect(can(contractor(past), action, resource(cls, TENANT_A, { id: 'ev_granted' }), NOW).allowed).toBe(false);
      }
    }
  });

  it('denies another project inside the same tenant', () => {
    const other = { ...resource('finding', TENANT_A), projectId: 'prj_other' };
    expect(can(contractor(future), 'read', other, NOW).allowed).toBe(false);
  });

  it('never exposes retail pricing or internal rates (CTR-006)', () => {
    expect(can(contractor(future), 'read', resource('billing', TENANT_A), NOW).allowed).toBe(false);
    expect(can(contractor(future), 'read', resource('contractor_rate', TENANT_A), NOW).allowed).toBe(false);
  });

  it('has no release control', () => {
    expect(can(contractor(future), 'release', resource('deliverable', TENANT_A), NOW).allowed).toBe(false);
  });

  it('gives a bare contractor role with no grant nothing at all', () => {
    const bare = actorWithRole('contractor');
    expect(can(bare, 'read', resource('finding', TENANT_A), NOW).allowed).toBe(false);
  });
});

describe('client role restrictions (PRD §18)', () => {
  it('stops a client admin altering a released finding', () => {
    const released = resource('finding', TENANT_A, { released: true });
    expect(can(actorWithRole('client_admin'), 'read', released, NOW).allowed).toBe(true);
    expect(can(actorWithRole('client_admin'), 'update', released, NOW).allowed).toBe(false);
  });

  it('hides internal QA records and contractor rates from every client role', () => {
    for (const role of ['client_admin', 'client_contributor', 'client_executive'] as const) {
      expect(can(actorWithRole(role), 'read', resource('internal_note', TENANT_A), NOW).allowed).toBe(false);
      expect(can(actorWithRole(role), 'read', resource('contractor_rate', TENANT_A), NOW).allowed).toBe(false);
    }
  });

  it('denies a contributor billing access and any export', () => {
    expect(can(actorWithRole('client_contributor'), 'read', resource('billing', TENANT_A), NOW).allowed).toBe(false);
    expect(can(actorWithRole('client_contributor'), 'export', resource('deliverable', TENANT_A), NOW).allowed).toBe(false);
  });

  it('shows an executive released deliverables but not working findings', () => {
    expect(
      can(actorWithRole('client_executive'), 'read', resource('deliverable', TENANT_A, { released: true }), NOW).allowed,
    ).toBe(true);
    expect(can(actorWithRole('client_executive'), 'read', resource('finding', TENANT_A), NOW).allowed).toBe(false);
  });

  it('lets an executive approve a change order', () => {
    expect(can(actorWithRole('client_executive'), 'approve', resource('billing', TENANT_A), NOW).allowed).toBe(true);
  });
});

describe('segregation of duties (DAT-004)', () => {
  const reviewer: Actor = {
    userId: 'usr_reviewer',
    memberships: [{ organizationId: TENANT_A, role: 'qualified_reviewer' }],
    contractorGrants: [],
  };

  it('refuses a reviewer approving their own high-risk work', () => {
    const own = resource('deliverable', TENANT_A, { highRisk: true, authorUserId: 'usr_reviewer' });
    expect(can(reviewer, 'approve', own, NOW).allowed).toBe(false);
    expect(can(reviewer, 'release', own, NOW).allowed).toBe(false);
  });

  it('allows a reviewer to approve high-risk work authored by someone else', () => {
    const other = resource('deliverable', TENANT_A, { highRisk: true, authorUserId: 'usr_someone_else' });
    expect(can(reviewer, 'approve', other, NOW).allowed).toBe(true);
  });

  it('refuses an internal PM approving high-risk work alone', () => {
    const highRisk = resource('finding', TENANT_A, { highRisk: true });
    expect(can(actorWithRole('internal_pm'), 'approve', highRisk, NOW).allowed).toBe(false);
  });
});

describe('platform admin and break-glass (DAT-005)', () => {
  const admin = (breakGlass?: { expiresAt: Date }): Actor => ({
    userId: 'usr_platform_admin',
    memberships: [{ organizationId: TENANT_A, role: 'platform_admin' }],
    contractorGrants: [],
    breakGlass: breakGlass
      ? { organizationId: TENANT_A, reason: 'incident INC-1', expiresAt: breakGlass.expiresAt }
      : undefined,
  });

  it('denies routine client-content access', () => {
    expect(can(admin(), 'read', resource('evidence', TENANT_A), NOW).allowed).toBe(false);
    expect(can(admin(), 'read', resource('finding', TENANT_A), NOW).allowed).toBe(false);
  });

  it('allows audit-log reading without break-glass', () => {
    expect(can(admin(), 'read', resource('audit_event', TENANT_A), NOW).allowed).toBe(true);
  });

  it('grants read-only access under an active break-glass grant', () => {
    const active = admin({ expiresAt: new Date('2026-09-01T16:00:00Z') });
    expect(can(active, 'read', resource('evidence', TENANT_A), NOW).allowed).toBe(true);
    expect(can(active, 'update', resource('evidence', TENANT_A), NOW).allowed).toBe(false);
    expect(can(active, 'export', resource('deliverable', TENANT_A), NOW).allowed).toBe(false);
  });

  it('expires break-glass access automatically', () => {
    const expired = admin({ expiresAt: new Date('2026-09-01T11:00:00Z') });
    expect(can(expired, 'read', resource('evidence', TENANT_A), NOW).allowed).toBe(false);
  });
});

describe('coverage', () => {
  it('has cross-tenant coverage for every protected resource class (CMD-001)', () => {
    const missing = RESOURCE_CLASSES.filter((cls) => !crossTenantCoverage.has(cls));
    expect(missing, `resource classes with no cross-tenant test: ${missing.join(', ')}`).toEqual([]);
  });
});
