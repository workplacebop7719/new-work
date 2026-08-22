/**
 * Migration runner.
 *
 * Deliberately small and dependency-free: migrations are plain reviewable SQL
 * (PRD §27 "migrations under review"), applied in filename order, recorded in a
 * ledger, each inside its own transaction.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { withMigrationClient } from './client';

export const MIGRATIONS_DIR = new URL('../migrations/', import.meta.url).pathname;

export interface AppliedMigration {
  readonly name: string;
  readonly appliedAt: Date;
}

export async function listMigrations(dir = MIGRATIONS_DIR): Promise<string[]> {
  const entries = await readdir(dir);
  return entries.filter((f) => f.endsWith('.sql')).sort();
}

export async function migrate(dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = await listMigrations(dir);
  const applied: string[] = [];

  await withMigrationClient(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`, { cause: error });
      }
    }
  });

  return applied;
}
