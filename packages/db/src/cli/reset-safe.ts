import { closePool } from '../client';
import { resetSafe } from '../reset';

try {
  await resetSafe();
  console.log('Database reset and reseeded.');
} catch (error) {
  console.error(`db:reset-safe refused or failed: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
