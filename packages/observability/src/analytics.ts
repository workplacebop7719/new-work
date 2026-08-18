/**
 * The dispatcher. One way in, so consent and the event contract are unavoidable.
 */
import { mayDispatch, type ConsentState } from './consent';
import { type EventName, type EventPayload, validateEvent } from './events';

export interface AnalyticsSink {
  /** First-party, server-side. Destinations are adapters (ADR-0007). */
  record(name: EventName, payload: Record<string, unknown>, occurredAt: Date): Promise<void>;
}

export class Analytics {
  constructor(
    private readonly sink: AnalyticsSink,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Returns whether the event was dispatched. A `false` here is a consent
   * outcome, not an error: the caller must behave identically either way, since
   * PUB-006 requires equivalent service after opt-out.
   */
  async track<N extends EventName>(
    name: N,
    payload: EventPayload<N>,
    consent: ConsentState,
  ): Promise<boolean> {
    // Validate first, so a contract violation is caught in development even
    // when the developer happens to be testing without consent.
    const validated = validateEvent(name, payload);
    if (!mayDispatch('analytics', consent)) return false;
    await this.sink.record(name, validated as Record<string, unknown>, this.now());
    return true;
  }
}

/** In-memory sink for tests and local development. */
export class MemorySink implements AnalyticsSink {
  readonly events: { name: EventName; payload: Record<string, unknown>; occurredAt: Date }[] = [];

  record(name: EventName, payload: Record<string, unknown>, occurredAt: Date): Promise<void> {
    this.events.push({ name, payload, occurredAt });
    return Promise.resolve();
  }
}
