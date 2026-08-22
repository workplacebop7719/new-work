/**
 * Tenant isolation at the storage boundary — ADR-0003, DAT-002, SEC-003.
 *
 * These tests are the reason row-level security is worth its cost: they prove
 * that a query which FORGETS its WHERE clause still cannot read another tenant.
 * The application-layer policy tests in @northstar/auth prove the inner door;
 * these prove the outer wall.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closePool, withSystemContext, withTenant } from '../src/client';
import { migrate } from '../src/migrate';
import { DEMO_ORGANIZATION_IDS, seed } from '../src/seed';

const { MAPLE_GROVE, RIVERSIDE } = DEMO_ORGANIZATION_IDS;

beforeAll(async () => {
  await migrate();
  await seed();
});

afterAll(async () => {
  await closePool();
});

describe('row-level security', () => {
  it('returns only the current tenant even when the query has no WHERE clause', async () => {
    const rows = await withTenant(MAPLE_GROVE, async (tx) => {
      const result = await tx.query<{ organization_id: string }>('SELECT organization_id FROM projects');
      return result.rows;
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.organization_id === MAPLE_GROVE)).toBe(true);
  });

  it('hides the other tenant entirely', async () => {
    const rows = await withTenant(RIVERSIDE, async (tx) => {
      const result = await tx.query('SELECT id FROM evidence');
      return result.rows;
    });
    // Every seeded evidence row belongs to Maple Grove.
    expect(rows).toEqual([]);
  });

  it('cannot read another tenant even when its id is supplied explicitly', async () => {
    const rows = await withTenant(RIVERSIDE, async (tx) => {
      const result = await tx.query('SELECT id FROM projects WHERE organization_id = $1', [MAPLE_GROVE]);
      return result.rows;
    });
    expect(rows).toEqual([]);
  });

  it('refuses to write a row into another tenant', async () => {
    await expect(
      withTenant(RIVERSIDE, async (tx) => {
        await tx.query(
          `INSERT INTO projects (id, organization_id, name, state)
           VALUES (gen_random_uuid(), $1, 'smuggled', 'draft')`,
          [MAPLE_GROVE],
        );
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  it('returns nothing at all when no tenant context is set', async () => {
    // Simulates the forgotten `SET LOCAL`: the failure mode is an empty result,
    // never another tenant's data.
    const rows = await withSystemContext('verifying unset tenant context behaviour', async (tx) => {
      await tx.query("SELECT set_config('app.system_context', 'off', true)");
      const result = await tx.query('SELECT id FROM projects');
      return result.rows;
    });
    expect(rows).toEqual([]);
  });

  it('lets the audited system context cross tenants deliberately', async () => {
    const rows = await withSystemContext('internal console read model', async (tx) => {
      const result = await tx.query<{ organization_id: string }>('SELECT organization_id FROM projects');
      return result.rows;
    });
    const tenants = new Set(rows.map((r) => r.organization_id));
    expect(tenants.has(MAPLE_GROVE)).toBe(true);
    expect(tenants.has(RIVERSIDE)).toBe(true);
  });

  it('requires a stated reason to use the system context', async () => {
    await expect(withSystemContext('', async () => undefined)).rejects.toThrow(/stated reason/);
  });
});

describe('audit log is append-only (SEC-006)', () => {
  it('accepts inserts', async () => {
    await withTenant(MAPLE_GROVE, async (tx) => {
      await tx.query(
        `INSERT INTO audit_events (id, organization_id, actor_id, action, object_type, object_id, correlation_id)
         VALUES (gen_random_uuid(), $1, NULL, 'evidence.downloaded', 'evidence', 'demo', 'cor_test')`,
        [MAPLE_GROVE],
      );
    });
    const count = await withTenant(MAPLE_GROVE, async (tx) => {
      const r = await tx.query<{ n: string }>('SELECT count(*) AS n FROM audit_events');
      return Number(r.rows[0]?.n ?? 0);
    });
    expect(count).toBeGreaterThan(0);
  });

  it('refuses updates', async () => {
    await expect(
      withTenant(MAPLE_GROVE, async (tx) => {
        await tx.query("UPDATE audit_events SET action = 'tampered'");
      }),
    ).rejects.toThrow(/append-only|permission denied/i);
  });

  it('refuses deletes', async () => {
    await expect(
      withTenant(MAPLE_GROVE, async (tx) => {
        await tx.query('DELETE FROM audit_events');
      }),
    ).rejects.toThrow(/append-only|permission denied/i);
  });
});

describe('release integrity (OPS-011)', () => {
  it('refuses a released deliverable with no named approver', async () => {
    await expect(
      withTenant(MAPLE_GROVE, async (tx) => {
        await tx.query(
          `INSERT INTO deliverables (id, organization_id, project_id, version, state, released_at)
           VALUES (gen_random_uuid(), $1, (SELECT id FROM projects LIMIT 1), 2, 'released', now())`,
          [MAPLE_GROVE],
        );
      }),
    ).rejects.toThrow(/released_requires_approver/);
  });
});
