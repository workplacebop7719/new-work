/**
 * Opaque, non-sequential identifiers.
 *
 * ENG-003 (PRD §27): "Never expose storage keys, sequential tenant identifiers,
 * internal contractor margins or private audit notes to client URLs or analytics."
 *
 * UUIDv7 is used because it is non-guessable across tenants while remaining
 * time-ordered for index locality. The time component is deliberately accepted:
 * it leaks approximate creation time, which is not sensitive here, and it is
 * not a tenant-correlatable sequence.
 */
import { randomUUID, randomBytes } from 'node:crypto';

/** Branded id types so a ProjectId can never be passed where an OrganizationId is required. */
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type OrganizationId = Brand<string, 'OrganizationId'>;
export type UserId = Brand<string, 'UserId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type RequirementId = Brand<string, 'RequirementId'>;
export type EvidenceId = Brand<string, 'EvidenceId'>;
export type FindingId = Brand<string, 'FindingId'>;
export type AssignmentId = Brand<string, 'AssignmentId'>;
export type DeliverableId = Brand<string, 'DeliverableId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;

const UUID_V7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generates a UUIDv7. Node's randomUUID emits v4, so v7 is assembled here to
 * keep primary keys time-ordered without giving up randomness in the low bits.
 */
export function newId<T extends string>(): Brand<string, T> {
  const bytes = randomBytes(16);
  const ms = Date.now();

  // 48-bit big-endian timestamp.
  bytes[0] = (ms / 2 ** 40) & 0xff;
  bytes[1] = (ms / 2 ** 32) & 0xff;
  bytes[2] = (ms / 2 ** 24) & 0xff;
  bytes[3] = (ms / 2 ** 16) & 0xff;
  bytes[4] = (ms / 2 ** 8) & 0xff;
  bytes[5] = ms & 0xff;

  // Version 7 and RFC 4122 variant.
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}` as Brand<string, T>;
}

export function isOpaqueId(value: string): boolean {
  return UUID_V7_RE.test(value);
}

/**
 * Correlation id for support (ARC-009: "correlation IDs visible to support").
 * Deliberately not an entity id — it must never be mistaken for one.
 */
export function newCorrelationId(): string {
  return `cor_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}
