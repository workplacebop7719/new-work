/**
 * Non-production reset — CMD-001 `db:reset-safe`.
 *
 * The "safe" in the name is load-bearing: this refuses to run anywhere that
 * could be production (assumption A-19), and that refusal is tested.
 */
import { assertSafeToDestroy, loadConfig } from './config';
import { withMigrationClient } from './client';
import { migrate } from './migrate';
import { seed } from './seed';

export async function resetSafe(): Promise<void> {
  const config = loadConfig();
  assertSafeToDestroy(config);

  await withMigrationClient(async (client) => {
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
  });

  await migrate();
  await seed();
}
