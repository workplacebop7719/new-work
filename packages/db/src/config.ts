/**
 * Database configuration and environment safety.
 *
 * `db:reset-safe` must refuse to run against anything that could be production
 * (assumption A-19). The refusal is implemented here, once, so that every
 * destructive command inherits it.
 */

export interface DbConfig {
  readonly url: string;
  readonly environment: 'development' | 'test' | 'preview' | 'production';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): DbConfig {
  const url = env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is not set. See .env.example.');
  }
  const environment = (env['APP_ENV'] ?? 'development') as DbConfig['environment'];
  return { url, environment };
}

const NON_PRODUCTION = new Set(['development', 'test', 'preview']);

/**
 * A destructive command may run only when BOTH signals agree: the declared
 * environment is non-production AND the connection string does not look like a
 * managed production host. Requiring both means a single mis-set variable is not
 * enough to destroy data.
 */
export function assertSafeToDestroy(config: DbConfig): void {
  if (!NON_PRODUCTION.has(config.environment)) {
    throw new Error(
      `Refusing to run a destructive command with APP_ENV="${config.environment}". ` +
        `Allowed: ${[...NON_PRODUCTION].join(', ')}.`,
    );
  }
  const host = safeHost(config.url);
  if (host === null) {
    throw new Error('Refusing to run a destructive command: DATABASE_URL is not a parseable URL.');
  }
  const looksLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.startsWith('/');
  if (!looksLocal) {
    throw new Error(
      `Refusing to run a destructive command against host "${host}". ` +
        'db:reset-safe targets local and preview databases only.',
    );
  }
}

function safeHost(url: string): string | null {
  // Unix socket connection strings are not URL-parseable but are always local.
  if (url.startsWith('/') || url.includes('host=/')) return '/';
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
