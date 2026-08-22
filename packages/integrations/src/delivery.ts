/**
 * The one place that turns an outbound message into a vendor call.
 *
 * The queue lives in `@northstar/db` and knows nothing about ports; this knows
 * about ports and nothing about the queue. That split is what keeps
 * `packages/db` free of vendor adapters — a database package that performs HTTP
 * is a database package that cannot be tested without a network.
 */
import { type OutboundMessageType } from '@northstar/domain';
import type { Integrations, OutboundResult } from './ports';

export interface OutboundEnvelope {
  readonly messageType: OutboundMessageType;
  readonly payload: Readonly<Record<string, unknown>>;
  /** ARC-004. Stable across every retry of this message, unique across messages. */
  readonly idempotencyKey: string;
}

/**
 * Delivers one message.
 *
 * The `switch` is exhaustive over the declared message types, so adding an entry
 * to the allowlist without a delivery path is a compile error rather than a
 * queue full of messages nothing will ever send.
 */
export async function deliverOutbound(
  integrations: Integrations,
  envelope: OutboundEnvelope,
): Promise<OutboundResult> {
  const write = { idempotencyKey: envelope.idempotencyKey };
  const payload = envelope.payload;
  const locale = payload['locale'] === 'fr' ? 'fr' : 'en';

  switch (envelope.messageType) {
    case 'email.invitation':
      return integrations.email.send(
        {
          to: String(payload['to']),
          templateKey: 'invitation',
          locale,
          variables: { acceptUrl: String(payload['acceptUrl'] ?? '') },
        },
        write,
      );

    case 'email.qualifier_resume':
      return integrations.email.send(
        {
          to: String(payload['to']),
          templateKey: 'qualifier_resume',
          locale,
          variables: { resumeUrl: String(payload['resumeUrl'] ?? '') },
        },
        write,
      );

    case 'crm.contact_upserted':
      return integrations.crm.upsertContact(
        {
          email: String(payload['email']),
          organizationName: String(payload['organizationName'] ?? ''),
          employeeBand: String(payload['employeeBand'] ?? ''),
          locale,
          resultCategory: '',
          source: String(payload['source'] ?? ''),
          // The allowlist already refused this message if consent was not
          // recorded. Reading it from the payload rather than defaulting it
          // means the value the CRM stores is the one that was checked.
          marketingConsent: payload['marketingConsent'] === true,
          // SEC-011: accommodation data is excluded by default and requires a
          // named exception. Pinned false here so the exclusion is visible at
          // the call site rather than implied by its absence.
          accommodationRequested: false,
        },
        write,
      );

    case 'payment.intent_created':
      return integrations.payment.createIntent(
        {
          amountCents: Number(payload['amountCents']),
          currency: 'CAD',
          offerKey: String(payload['offerKey'] ?? ''),
          organizationRef: String(payload['organizationRef'] ?? ''),
        },
        write,
      );

    default: {
      const unreachable: never = envelope.messageType;
      throw new Error(`No delivery path for outbound message type: ${String(unreachable)}`);
    }
  }
}
