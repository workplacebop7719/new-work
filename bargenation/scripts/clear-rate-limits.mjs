#!/usr/bin/env node
/**
 * Clears the rate-limit counters on a LOCAL database.
 *
 * WHY THIS EXISTS. Every browser smoke signs up an account, and they all
 * arrive from one connection, so they share one caller bucket. `smoke:all`
 * spends most of the hourly SIGN_UP allowance in a single pass — run it twice
 * in an hour and it fails on the second, with a timeout waiting for a form
 * that was quietly refused.
 *
 * The wrong fixes were tempting and both were rejected: raising the allowance
 * would weaken a real protection to suit a test, and exempting localhost would
 * mean the smokes stopped exercising the limiter at all. Clearing the counters
 * between runs leaves the limiter exactly as it ships and just stops the
 * operator's own verification from being treated as an attack.
 *
 * Refuses anywhere that is not clearly a local database, on the same reasoning
 * as reset-db.mjs: deleting somebody's live abuse counters mid-attack is a
 * gift to whoever is attacking them.
 */
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  // Not an error: the fixture-only path has no database and no limiter.
  console.log('No DATABASE_URL — nothing to clear.');
  process.exit(0);
}
if (!/localhost|127\.0\.0\.1/.test(url)) {
  console.error('Refusing to clear rate limits on a non-local database.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
const hits = await client.query('delete from rate_limit_hits');
const spent = await client.query('delete from challenge_uses');
await client.end();
console.log(
  `Cleared ${hits.rowCount} rate-limit hits and ${spent.rowCount} spent challenges.`,
);
