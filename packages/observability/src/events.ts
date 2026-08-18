/**
 * Product analytics event taxonomy — PRD §19, ADR-0007.
 *
 * The §19 list is closed. An event that is not declared here cannot be emitted,
 * and a property that is not declared on its event cannot be attached. That is
 * what makes ANL-001 and ANL-002 enforceable rather than aspirational: a
 * developer adding a field to a domain model can never silently start exporting
 * it to an analytics vendor.
 */
import { z } from 'zod';

/** Properties every event may carry. Deliberately tiny. */
const common = {
  /** 'en' | 'fr' — needed for the §19 language drop-off analysis. */
  locale: z.enum(['en', 'fr']),
  /** Opaque, rotating, consent-scoped. Never a user id, never an email. */
  visitorRef: z.string().max(64).optional(),
};

const employeeBand = z.enum(['under_20', '20_to_49', '50_to_199', '200_plus']);

/**
 * The taxonomy. Each entry's schema is the complete list of allowed properties;
 * `.strict()` makes an undeclared property a validation failure rather than a
 * silent passenger.
 */
export const EVENT_SCHEMAS = {
  source_viewed: z.object({ ...common, claimKey: z.string().max(120) }).strict(),
  employee_band_selected: z.object({ ...common, band: employeeBand }).strict(),
  qualifier_started: z.object({ ...common }).strict(),
  qualifier_answered: z
    .object({ ...common, questionKey: z.string().max(120), answered: z.boolean() })
    .strict(),
  qualifier_completed: z.object({ ...common, questionCount: z.number().int().min(1).max(20) }).strict(),
  result_viewed: z
    .object({
      ...common,
      // The rule category, never the reasoning text and never the answers.
      resultCategory: z.enum(['likely_self_serve', 'assessment_fit', 'specialist_fit', 'uncertain']),
      ruleVersion: z.string().max(32),
    })
    .strict(),
  /**
   * Fires when a visitor leaves for the official Ontario resource. This is the
   * measurement of buyers choosing the free route, which ADR-0007 treats as a
   * headline Gate 0 metric rather than a leak to be hidden.
   */
  official_source_opened: z.object({ ...common, claimKey: z.string().max(120) }).strict(),
  assessment_selected: z.object({ ...common, offerKey: z.string().max(64) }).strict(),
  booking_started: z.object({ ...common, offerKey: z.string().max(64) }).strict(),
  purchase_completed: z
    .object({ ...common, offerKey: z.string().max(64), currency: z.literal('CAD'), amountCents: z.number().int() })
    .strict(),
  evidence_requested: z.object({ ...common, projectRef: z.string().max(64) }).strict(),
  evidence_uploaded: z
    // Object reference only. No file name, no size that could fingerprint a
    // document, no classification that could reveal its nature.
    .object({ ...common, projectRef: z.string().max(64), evidenceRef: z.string().max(64) })
    .strict(),
  finding_viewed: z
    .object({ ...common, findingRef: z.string().max(64), severity: z.enum(['critical', 'serious', 'moderate', 'minor']) })
    .strict(),
  task_assigned: z.object({ ...common, projectRef: z.string().max(64) }).strict(),
  change_order_accepted: z.object({ ...common, projectRef: z.string().max(64) }).strict(),
  report_released: z.object({ ...common, deliverableRef: z.string().max(64) }).strict(),
  export_requested: z.object({ ...common, scope: z.enum(['organization', 'project', 'deliverable']) }).strict(),
  support_contacted: z.object({ ...common, channel: z.enum(['phone', 'email', 'relay', 'form']) }).strict(),
} as const;

export type EventName = keyof typeof EVENT_SCHEMAS;
export type EventPayload<N extends EventName> = z.infer<(typeof EVENT_SCHEMAS)[N]>;

export const EVENT_NAMES = Object.keys(EVENT_SCHEMAS) as EventName[];

/**
 * Property names that must never appear in an analytics payload, whatever the
 * event (ANL-002, ENG-003). Checked in addition to the per-event schema so that
 * a new event cannot introduce one by declaring it.
 */
export const FORBIDDEN_PROPERTY_PATTERNS: readonly RegExp[] = [
  /email/i,
  /^name$/i,
  /displayname/i,
  /phone/i,
  /address/i,
  /storage_?key/i,
  /signed_?url/i,
  /file_?name/i,
  /filename/i,
  /content/i,
  /body/i,
  /notes?$/i,
  /margin/i,
  /wholesale/i,
  /cost/i,
  /rate/i,
  /organization_?id/i,
  /tenant_?id/i,
  /user_?id/i,
  /password/i,
  /token/i,
  /secret/i,
];

export class EventContractError extends Error {}

/**
 * Validates an event before it can be dispatched. Throws rather than dropping:
 * a payload violation is a bug to fix in development, not a silent data-quality
 * problem to discover during the Gate 0 analysis.
 */
export function validateEvent<N extends EventName>(name: N, payload: unknown): EventPayload<N> {
  const schema = EVENT_SCHEMAS[name];
  if (!schema) {
    throw new EventContractError(`Undeclared analytics event: ${String(name)}`);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new EventContractError(
      `Event ${String(name)} failed its contract: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
    );
  }
  for (const key of Object.keys(parsed.data as Record<string, unknown>)) {
    const forbidden = FORBIDDEN_PROPERTY_PATTERNS.find((re) => re.test(key));
    if (forbidden) {
      throw new EventContractError(
        `Event ${String(name)} carries forbidden property "${key}" (matched ${forbidden}). See ANL-002.`,
      );
    }
  }
  return parsed.data as EventPayload<N>;
}
