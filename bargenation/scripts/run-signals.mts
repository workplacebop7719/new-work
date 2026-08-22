/**
 * Runs one Deal Signal sweep.
 *
 * Intended to be scheduled (cron, a platform job) rather than run by hand.
 * Connects with SIGNALS_DATABASE_URL, which must name the `bargenation_jobs`
 * role — not the app role and certainly not a superuser. Migration 0007
 * enumerates exactly what that role may touch.
 */
import { sweepDealSignals } from '../src/data/signal-runner';

const url = process.env.SIGNALS_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('SIGNALS_DATABASE_URL is not set.');
  process.exit(1);
}

const started = Date.now();
const result = await sweepDealSignals(url);

console.log(`Examined ${result.watchesExamined} active watch(es) in ${Date.now() - started}ms.`);
if (result.signalsCreated === 0) {
  console.log('Nothing earned a signal. That is the expected result most days.');
} else {
  console.log(`Created ${result.signalsCreated} signal(s):`);
  for (const [kind, count] of Object.entries(result.byKind)) {
    console.log(`  ${count} x ${kind}`);
  }
}
