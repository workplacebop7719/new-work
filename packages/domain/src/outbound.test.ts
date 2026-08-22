/**
 * ADR-0006 decision 4: "a test asserts the serialized payload equals the
 * allowlist — adding a field to a domain model can never silently start
 * exporting it."
 *
 * This is that test. The valuable cases are the refusals.
 */
import { describe, expect, it } from 'vitest';
import {
  assertAllowlisted,
  assertConsentSatisfied,
  destinationOf,
  FORBIDDEN_OUTBOUND_KEYS,
  OUTBOUND_ALLOWLIST,
  OUTBOUND_DESTINATIONS,
  OUTBOUND_MESSAGE_TYPES,
  OutboundContractError,
} from './outbound';

describe('the allowlist itself', () => {
  it('names a known destination for every message type', () => {
    for (const type of OUTBOUND_MESSAGE_TYPES) {
      expect(OUTBOUND_DESTINATIONS).toContain(destinationOf(type));
    }
  });

  it('declares no field that the global denylist forbids', () => {
    // The two lists could contradict each other. If they ever do, the denylist
    // wins at runtime — but a contradiction is a mistake worth failing on.
    for (const [type, fields] of Object.entries(OUTBOUND_ALLOWLIST)) {
      for (const field of fields as readonly string[]) {
        const forbidden = FORBIDDEN_OUTBOUND_KEYS.find((pattern) => pattern.test(field));
        expect(forbidden, `${type}.${field} is both allowed and forbidden`).toBeUndefined();
      }
    }
  });

  it('never lets a person’s identity travel to the payment processor', () => {
    // The processor needs an amount and an opaque reference. It does not need to
    // know who is paying — that is the merchant's record, not the vendor's.
    const fields = OUTBOUND_ALLOWLIST['payment.intent_created'] as readonly string[];
    expect(fields).not.toContain('email');
    expect(fields).not.toContain('displayName');
    expect(fields).not.toContain('organizationName');
  });
});

describe('assertAllowlisted', () => {
  it('accepts a payload made only of declared fields', () => {
    expect(() =>
      assertAllowlisted('email.invitation', {
        to: 'someone@example.org',
        locale: 'en',
        acceptUrl: '/en/join?token=x',
      }),
    ).not.toThrow();
  });

  it('refuses a field that is merely undeclared', () => {
    // The realistic accident: someone adds `role` to the invitation payload
    // because it would be convenient in the email template.
    expect(() =>
      assertAllowlisted('email.invitation', {
        to: 'someone@example.org',
        locale: 'en',
        acceptUrl: '/en/join?token=x',
        role: 'client_admin',
      }),
    ).toThrow(OutboundContractError);
  });

  it('refuses a forbidden field even where the destination might want it', () => {
    for (const key of ['accommodationRequested', 'disabilityNotes', 'storageKey', 'apiToken']) {
      expect(() => assertAllowlisted('crm.contact_upserted', { [key]: 'x' })).toThrow(
        /may never leave the platform/,
      );
    }
  });

  it('refuses commercial fields that must not reach a contractor-facing system', () => {
    // ENG-003 / CTR-006: retail pricing and internal margin are unreachable.
    for (const key of ['margin', 'wholesaleRate', 'cost', 'contractorRate']) {
      expect(() => assertAllowlisted('crm.contact_upserted', { [key]: 1 })).toThrow(
        /may never leave the platform/,
      );
    }
  });

  it('refuses an undeclared message type outright', () => {
    expect(() =>
      assertAllowlisted('crm.something_new' as 'crm.contact_upserted', {}),
    ).toThrow(/Undeclared outbound message type/);
  });

  it('accepts an empty payload, because absence is never a leak', () => {
    expect(() => assertAllowlisted('email.invitation', {})).not.toThrow();
  });
});

describe('consent as a precondition (CNV-004)', () => {
  const contact = {
    email: 'someone@example.org',
    organizationName: 'Example Org',
    employeeBand: '20_to_49',
    locale: 'en',
    source: 'sign_up',
  };

  it('refuses a CRM contact with no consent flag at all', () => {
    expect(() => assertConsentSatisfied('crm.contact_upserted', contact)).toThrow(
      OutboundContractError,
    );
  });

  it('refuses a CRM contact with consent explicitly declined', () => {
    expect(() =>
      assertConsentSatisfied('crm.contact_upserted', { ...contact, marketingConsent: false }),
    ).toThrow(/marketing consent/);
  });

  it('refuses a truthy value that is not the boolean true', () => {
    // `'false'` is truthy. A consent check that accepted it would be worse than
    // no check, because it would look correct in review.
    expect(() =>
      assertConsentSatisfied('crm.contact_upserted', { ...contact, marketingConsent: 'false' }),
    ).toThrow();
  });

  it('accepts a CRM contact with recorded consent', () => {
    expect(() =>
      assertConsentSatisfied('crm.contact_upserted', { ...contact, marketingConsent: true }),
    ).not.toThrow();
  });

  it('does not impose a consent precondition on transactional messages', () => {
    // An invitation is not marketing. Requiring consent for it would mean an
    // administrator could not invite a colleague who had not opted in.
    expect(() => assertConsentSatisfied('email.invitation', { to: 'x@example.org' })).not.toThrow();
  });
});
