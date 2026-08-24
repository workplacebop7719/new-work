/**
 * Loads `.env.local` into the test process.
 *
 * WHY THIS EXISTS. The database suites — every RLS policy, every cross-tenant
 * refusal, every column grant — skip themselves when `TEST_DATABASE_URL` is
 * unset. That is right: the suite has to run on a machine with no PostgreSQL.
 *
 * It is also how 189 tests came to be quietly skipped on a machine that HAD a
 * database, because vitest does not read `.env.local` and `npm test` therefore
 * ran only the pure ones. A skipped negative test reports success in exactly
 * the same green as a passing one, which makes this the most dangerous shape
 * of silence in the whole repository.
 *
 * Deliberately NOT `dotenv`: this needs no dependency, and a parser that
 * handles the five lines of `.env.example` is easier to trust than one that
 * handles everything.
 *
 * An environment variable already set always wins, so CI — which sets them
 * properly — is unaffected by a stray local file.
 */
import { readFileSync, existsSync } from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    // Strip one layer of matching quotes; anything else is taken literally.
    const raw = trimmed.slice(eq + 1).trim();
    process.env[key] = /^(".*"|'.*')$/s.test(raw) ? raw.slice(1, -1) : raw;
  }
}
