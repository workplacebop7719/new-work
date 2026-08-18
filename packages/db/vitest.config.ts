import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

/**
 * Loads .env.local from the repository root so `pnpm test` works after
 * `cp .env.example .env.local`, without adding a dotenv dependency.
 *
 * Note what this does NOT do: it never invents a default DATABASE_URL. The
 * tenant-isolation tests must fail loudly when there is no database, because a
 * silently skipped isolation test is worse than no test at all — it reports
 * green while proving nothing.
 */
const envFile = new URL('../../.env.local', import.meta.url).pathname;
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match?.[1] && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2]?.replace(/^["']|["']$/g, '') ?? '';
    }
  }
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // The isolation tests share one database; running them in parallel would let
    // one test's tenant context race another's.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
