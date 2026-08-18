import { closePool } from '../client';
import { migrate } from '../migrate';

const applied = await migrate();
if (applied.length === 0) {
  console.log('No pending migrations.');
} else {
  for (const name of applied) console.log(`applied ${name}`);
}
await closePool();
