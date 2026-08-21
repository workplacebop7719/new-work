import 'server-only';
import pg from 'pg';

/**
 * A single pooled client for the app.
 *
 * Cached on globalThis because Next.js dev reloads modules on every edit and
 * would otherwise open a new pool per reload until Postgres refuses more
 * connections.
 *
 * The connection string must name a NON-SUPERUSER role. Superusers and roles
 * with BYPASSRLS ignore row level security entirely, which would silently
 * defeat every policy in migration 0003.
 */
declare global {
  var __bargenationPool: pg.Pool | undefined;
}

export function getPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  globalThis.__bargenationPool ??= new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  return globalThis.__bargenationPool;
}

/**
 * Runs a query as a specific customer, so row level security applies.
 *
 * `set_config(..., true)` scopes the setting to the transaction, so an
 * identity can never leak to the next borrower of a pooled connection.
 */
export async function asCustomer<T>(
  profileId: string | null,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query('select set_config($1,$2,true)', [
      'request.jwt.claim.sub',
      profileId ?? '',
    ]);
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}
