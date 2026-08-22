/**
 * What may leave the platform — ADR-0006 decision 4, CNV-004, SEC-011.
 *
 * This lives in the domain rather than with the adapters on purpose. It is a
 * policy about data, not about vendors: it would read the same if every
 * integration were replaced tomorrow, and putting it here means the check runs
 * where a message is written rather than where it is finally sent.
 *
 * "Each adapter declares exactly which fields may leave the platform. A test
 * asserts the serialized payload equals the allowlist — adding a field to a
 * domain model can never silently start exporting it."
 *
 * This is the mechanism. Every outbound message is checked against the list for
 * its type before it is written to the outbox, so a field that is not declared
 * here cannot reach a vendor even if a caller puts it in the payload object.
 *
 * The friction is the point (ADR-0006 consequences). Adding a field to a
 * destination is a deliberate edit to this file, which is one file a privacy
 * reviewer can read in full.
 */

/**
 * Message types, and exactly what may travel in each.
 *
 * Read this as a data-export register, not as a type definition. Anyone asking
 * "what does this platform send to third parties?" should get their whole answer
 * from these twenty lines.
 */
export const OUTBOUND_ALLOWLIST = {
  /** The invitation link. No name, no role, no organization — the link carries the context. */
  'email.invitation': ['to', 'locale', 'acceptUrl'],
  /** A qualifier visitor who asked for their progress by email (CNV-001). */
  'email.qualifier_resume': ['to', 'locale', 'resumeUrl'],
  /**
   * A marketing contact. CNV-004: consent status travels with the record,
   * always, and the adapter refuses the message without it.
   */
  'crm.contact_upserted': [
    'email',
    'organizationName',
    'employeeBand',
    'locale',
    'source',
    'marketingConsent',
  ],
  /** A payment intent. Amount and offer only — never a person. */
  'payment.intent_created': ['amountCents', 'currency', 'offerKey', 'organizationRef'],
} as const satisfies Record<string, readonly string[]>;

export type OutboundMessageType = keyof typeof OUTBOUND_ALLOWLIST;

export const OUTBOUND_MESSAGE_TYPES = Object.keys(OUTBOUND_ALLOWLIST) as OutboundMessageType[];

/** Which port delivers each type. Derived from the name so the two cannot drift. */
export const OUTBOUND_DESTINATIONS = ['email', 'crm', 'payment', 'signature'] as const;
export type OutboundDestination = (typeof OUTBOUND_DESTINATIONS)[number];

export function destinationOf(type: OutboundMessageType): OutboundDestination {
  const prefix = type.split('.')[0] as OutboundDestination;
  return prefix;
}

/**
 * Field names that may never leave the platform, whatever the destination.
 *
 * Checked in addition to the per-type allowlist, so a future entry in that list
 * cannot introduce one by declaring it. SEC-011 puts accommodation and
 * disability data here explicitly: it is excluded by default, and an exception
 * would require a named decision rather than an added key.
 */
export const FORBIDDEN_OUTBOUND_KEYS: readonly RegExp[] = [
  /accommodation/i,
  /disabilit/i,
  /health/i,
  /storage_?key/i,
  /signed_?url/i,
  /password/i,
  /secret/i,
  /token/i,
  /margin/i,
  /wholesale/i,
  /\bcost\b/i,
  /contractor_?rate/i,
  /internal_?note/i,
];

export class OutboundContractError extends Error {}

/**
 * Validates a payload against its type's allowlist.
 *
 * Rejects rather than strips. Silently dropping an undeclared field would let a
 * caller believe it was sent, and the resulting bug — a vendor missing data
 * nobody realizes was never delivered — is harder to find than a loud failure at
 * the point of the mistake.
 */
export function assertAllowlisted(
  type: OutboundMessageType,
  payload: Readonly<Record<string, unknown>>,
): void {
  const allowed = OUTBOUND_ALLOWLIST[type] as readonly string[];
  if (!allowed) {
    throw new OutboundContractError(`Undeclared outbound message type: ${String(type)}`);
  }

  for (const key of Object.keys(payload)) {
    const forbidden = FORBIDDEN_OUTBOUND_KEYS.find((pattern) => pattern.test(key));
    if (forbidden) {
      throw new OutboundContractError(
        `Field "${key}" may never leave the platform (matched ${forbidden}).`,
      );
    }
    if (!allowed.includes(key)) {
      throw new OutboundContractError(
        `Field "${key}" is not on the allowlist for ${type}. ` +
          `Allowed: ${allowed.join(', ')}. Add it deliberately in allowlists.ts.`,
      );
    }
  }
}

/**
 * CNV-004 / ADR-0006 decision 5: consent is a precondition, not a later filter.
 *
 * A marketing-scope message without a positive consent flag is refused here,
 * before it is ever written to the outbox — so there is no state in which the
 * platform is holding a queued message it is not permitted to send.
 */
export function assertConsentSatisfied(
  type: OutboundMessageType,
  payload: Readonly<Record<string, unknown>>,
): void {
  if (type !== 'crm.contact_upserted') return;
  if (payload['marketingConsent'] !== true) {
    throw new OutboundContractError(
      'A CRM contact may not be sent without recorded marketing consent (CNV-004).',
    );
  }
}
