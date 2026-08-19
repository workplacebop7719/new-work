/**
 * Server-side analytics dispatch — ADR-0007.
 *
 * There is no client-side analytics SDK and no third-party script anywhere in
 * this application. Events are emitted from the server, through the typed
 * contract, behind the consent gate. An ad-blocker therefore cannot distort the
 * Gate 0 numbers the CA$5M decision rests on.
 */
import { Analytics, type AnalyticsSink, type EventName } from '@northstar/observability';
import { readConsent } from './session';

/**
 * CC-02 sink: structured stdout. Replaced by a first-party warehouse adapter
 * when Q-15 is answered; the port is what keeps that a one-file change.
 */
class ConsoleSink implements AnalyticsSink {
  record(name: EventName, payload: Record<string, unknown>, occurredAt: Date): Promise<void> {
    console.log(JSON.stringify({ type: 'analytics', name, payload, occurredAt }));
    return Promise.resolve();
  }
}

const analytics = new Analytics(new ConsoleSink());

/**
 * Tracks an event if consent allows. Returns whether it was dispatched, but
 * callers should ignore that: PUB-006 requires equivalent service either way, so
 * no behaviour may branch on it.
 */
export async function track(
  name: Parameters<typeof analytics.track>[0],
  payload: Parameters<typeof analytics.track>[1],
): Promise<void> {
  const consent = await readConsent();
  await analytics.track(name, payload, consent);
}
