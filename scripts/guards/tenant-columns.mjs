/**
 * DAT-002 — "Tenant ID on tenant-owned data with database-level enforcement."
 *
 * Every CREATE TABLE must either carry organization_id or be explicitly marked
 * global with a reason, and every tenant-owned table must have row-level
 * security enabled and forced. Adding a table without either is the single
 * easiest way to create a cross-tenant leak, so it fails the build.
 */
import { ROOT, read, rel, report, walk } from './lib.mjs';

const migrations = await walk(ROOT, (p) => /packages\/db\/migrations\/.*\.sql$/.test(p));
const failures = [];

// Tables the runner itself owns, which are not tenant data.
const INFRASTRUCTURE = new Set(['schema_migrations']);

// The tenant root: `organizations.id` IS the tenant key, so it has no
// organization_id column but still needs RLS and a policy of its own.
const TENANT_ROOT = new Set(['organizations']);

for (const file of migrations) {
  const sql = await read(file);
  const name = rel(file);
  const lines = sql.split('\n');

  lines.forEach((line, index) => {
    const match = /^\s*CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-z_][a-z0-9_]*)\s*\(/i.exec(line);
    if (!match) return;
    const table = match[1];
    if (INFRASTRUCTURE.has(table)) return;

    // A "-- global:" comment in the preceding five lines declares the exemption
    // and states why, which is what a reviewer needs to judge it.
    const preceding = lines.slice(Math.max(0, index - 5), index).join('\n');
    const declaredGlobal = /--\s*global:/i.test(preceding);

    // Body of the CREATE TABLE statement.
    const body = sql.slice(sql.indexOf(line));
    const end = body.indexOf('\n);');
    const columns = end === -1 ? body : body.slice(0, end);
    const hasTenantColumn = TENANT_ROOT.has(table) || /\borganization_id\b/.test(columns);

    if (!hasTenantColumn && !declaredGlobal) {
      failures.push(
        `${name}:${index + 1} table "${table}" has no organization_id and is not declared global. ` +
          `Add the column, or precede the statement with "-- global: <reason>" (DAT-002).`,
      );
      return;
    }

    if (hasTenantColumn) {
      const enabled = new RegExp(`ALTER TABLE\\s+${table}\\s+ENABLE ROW LEVEL SECURITY`, 'i').test(sql);
      const forced = new RegExp(`ALTER TABLE\\s+${table}\\s+FORCE ROW LEVEL SECURITY`, 'i').test(sql);
      const policy = new RegExp(`(CREATE POLICY[\\s\\S]*?ON\\s+${table}\\b)|'${table}'`, 'i').test(sql);
      if (!enabled) failures.push(`${name}: table "${table}" is tenant-owned but RLS is not ENABLEd (DAT-002)`);
      if (!forced) failures.push(`${name}: table "${table}" is tenant-owned but RLS is not FORCEd (ADR-0003)`);
      if (!policy) failures.push(`${name}: table "${table}" has no tenant_isolation policy (DAT-002)`);
    }
  });
}

process.exit(report('tenant columns and RLS on every tenant table (DAT-002)', failures) ? 0 : 1);
