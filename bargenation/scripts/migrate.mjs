#!/usr/bin/env node
/**
 * Migration runner.
 *
 * Each migration runs in its own transaction and is recorded in
 * schema_migrations, so a failure leaves the database on the last good
 * version rather than half-applied.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

await client.query(`
  create table if not exists schema_migrations (
    version    text primary key,
    applied_at timestamptz not null default now()
  )
`);

const { rows } = await client.query('select version from schema_migrations');
const applied = new Set(rows.map((r) => r.version));
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  const sql = readFileSync(join(dir, file), 'utf8');
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into schema_migrations(version) values ($1)', [file]);
    await client.query('commit');
    console.log(`  applied ${file}`);
    count++;
  } catch (err) {
    await client.query('rollback');
    console.error(`  FAILED ${file}\n  ${err.message}`);
    await client.end();
    process.exit(1);
  }
}

console.log(count === 0 ? 'Already up to date.' : `Applied ${count} migration(s).`);
await client.end();
