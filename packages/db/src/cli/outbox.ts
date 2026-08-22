/**
 * The outbox worker, as a command — ADR-0006, ARC-003.
 *
 * Dry-run by default, like the retention sweep: it prints what it would deliver
 * and delivers nothing. `--apply` sends. `--dead` prints the dead-letter queue
 * that ARC-003 requires somebody to review, and prints nothing else, because a
 * review buried in a delivery log is not a review.
 *
 * In production this runs on a schedule. Until that infrastructure exists it is
 * a command, and `docs/runbook.md` says so rather than implying a worker is
 * running when none is.
 */
import { createFakeIntegrations, deliverOutbound } from '@northstar/integrations';
import { closePool } from '../client';
import { countPending, drainOutbox, listDeadLetters, MAX_ATTEMPTS } from '../outbox';

const apply = process.argv.includes('--apply');
const deadOnly = process.argv.includes('--dead');

if (deadOnly) {
  const dead = await listDeadLetters();
  console.log(`Dead-letter queue (${dead.length} message${dead.length === 1 ? '' : 's'})`);
  if (dead.length === 0) {
    console.log('  nothing to review.');
  }
  for (const message of dead) {
    console.log(`  ${message.messageType}  after ${message.attempts}/${MAX_ATTEMPTS} attempts`);
    console.log(`    id:     ${message.id}`);
    console.log(`    tenant: ${message.organizationId ?? '(none)'}`);
    // Already redacted on the way in; printed in full because the reason is the
    // whole point of the review.
    console.log(`    error:  ${message.lastError}`);
  }
  console.log(
    '\nNothing here is retried automatically. A message that failed ' +
      `${MAX_ATTEMPTS} times over several hours usually failed for a reason waiting does not fix.`,
  );
  await closePool();
} else {
  const before = await countPending();
  console.log(`Outbox (${apply ? 'APPLYING' : 'dry run'})`);
  console.log(`  due now:            ${before.due}`);
  console.log(`  scheduled for later: ${before.scheduled}`);

  // The fakes, matching `pnpm dev`. A real adapter is a change to this line and
  // nothing else — which is the claim ADR-0006 makes, kept honest by there
  // being exactly one line to change.
  const integrations = createFakeIntegrations();
  const report = await drainOutbox((envelope) => deliverOutbound(integrations, envelope), { apply });

  console.log(`  claimed:   ${report.claimed}`);
  console.log(`  delivered: ${report.delivered}`);
  console.log(`  retrying:  ${report.retried}`);
  console.log(`  dead:      ${report.died}`);

  if (!apply) console.log('\nNothing was sent. Re-run with --apply to deliver.');
  if (report.died > 0) console.log('\nRun with --dead to review what gave up and why.');

  await closePool();
}
