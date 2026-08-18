/**
 * Consent gate — PUB-006, ADR-0007.
 *
 * "Non-essential analytics do not load before valid consent; opt-out is
 * persistent and equivalent service remains available."
 *
 * The gate lives in the dispatcher rather than in a script tag, so a consent
 * bug cannot be introduced by a template change.
 */

export type ConsentCategory = 'essential' | 'analytics';

export interface ConsentState {
  readonly analytics: boolean;
  /** When the choice was recorded. A missing decision is not consent. */
  readonly decidedAt?: Date | undefined;
}

export const NO_CONSENT: ConsentState = { analytics: false };

/**
 * Essential telemetry — errors, latency, security audit events — is not gated:
 * it is what keeps the product debuggable and secure for a visitor who declines
 * everything, and it carries no cross-session identifier.
 */
export function mayDispatch(category: ConsentCategory, consent: ConsentState): boolean {
  if (category === 'essential') return true;
  return consent.analytics === true && consent.decidedAt !== undefined;
}
