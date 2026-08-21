#!/usr/bin/env node
/**
 * Drops and recreates the schema, then you re-migrate and re-seed.
 *
 * Price history is append-only, so there is no way to clear it in place —
 * that is the point. Starting over means dropping the schema outright, and
 * this refuses to do that anywhere that is not clearly a local database.
 */
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
if (!/localhost|127\.0\.0\.1/.test(url)) {
  console.error('Refusing to drop a schema on a non-local database.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query('drop schema if exists commerce cascade');
await client.query('drop schema public cascade');
await client.query('create schema public');
await client.end();
console.log('Schema dropped and recreated. Run db:migrate, then db:seed.');
