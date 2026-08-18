/**
 * Tenant-scoped database access.
 *
 * ADR-0003: every query runs inside a transaction that has declared its tenant.
 * The pool never hands out a bare client, because a query without a tenant
 * context is the bug that row-level security exists to catch — and catching it
 * at the call site is better than discovering it as a confusing empty result.
 */
import pg from 'pg';
import { loadConfig } from './config';

export interface TenantClient {
  query<R extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<pg.QueryResult<R>>;
}

let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    const { url } = loadConfig();
    pool = new pg.Pool({
      connectionString: url,
      // Transaction-scoped pooling is a deployment requirement (ADR-0003):
      // `SET LOCAL` must not survive into another caller's transaction.
      max: Number(process.env['DB_POOL_MAX'] ?? 10),
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/**
 * The role the application acts as. It must be NOBYPASSRLS. In production the
 * connection user is already this role; locally and in tests the connection is
 * made as the owner and dropped into the app role for the transaction, because
 * a superuser bypasses row-level security no matter how the policy is written.
 */
function appRole(): string {
  return process.env['DB_APP_ROLE'] ?? 'northstar_app';
}

/**
 * Runs `fn` in a transaction scoped to one tenant.
 *
 * Anything `fn` reads or writes is filtered by the `tenant_isolation` policies;
 * a missing WHERE clause yields zero rows rather than another tenant's data.
 */
export async function withTenant<T>(
  organizationId: string,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  if (!organizationId) {
    throw new Error('withTenant requires an organization id');
  }
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${quoteIdent(appRole())}`);
    await client.query('SELECT set_config($1, $2, true)', ['app.organization_id', organizationId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * The audited escape hatch, for background jobs and internal read models that
 * legitimately cross tenants (ADR-0003).
 *
 * `reason` is required and is written to the audit trail by the caller. This is
 * deliberately awkward to use: reaching for it should feel like a decision.
 */
export async function withSystemContext<T>(
  reason: string,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  if (!reason || reason.length < 8) {
    throw new Error('withSystemContext requires a stated reason');
  }
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${quoteIdent(appRole())}`);
    await client.query('SELECT set_config($1, $2, true)', ['app.system_context', 'on']);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Owner-level connection for migrations only. Never used to serve a request. */
export async function withMigrationClient<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

function quoteIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Unsafe role name: ${name}`);
  }
  return `"${name}"`;
}
