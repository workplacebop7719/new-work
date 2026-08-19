import { closePool } from '../client';
import { RETENTION_DAYS, runRetention } from '../retention';

// Dry-run unless --apply is passed. Deleting is an explicit act (A-14).
const apply = process.argv.includes('--apply');
const report = await runRetention({ apply });

console.log(`Retention sweep (${apply ? 'APPLIED' : 'dry run'})`);
console.log(
  `  abandoned qualifier sessions older than ${RETENTION_DAYS.abandonedQualifierSession}d: ${report.abandonedSessions}`,
);
console.log(
  `  completed qualifier sessions older than ${RETENTION_DAYS.completedQualifierSession}d: ${report.completedSessions}`,
);
if (!apply) console.log('\nNothing was deleted. Re-run with --apply to delete.');

await closePool();
