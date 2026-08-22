/**
 * Core entities — PRD §18.
 *
 * These are the framework-independent shapes the rest of the platform agrees on.
 * They deliberately contain no persistence, no HTTP and no vendor types
 * (ARC-002): /packages/domain must compile with every adapter replaced by a fake.
 *
 * CC-01 defines the skeleton only. Slices CC-03 through CC-06 add the fields
 * their requirements need; each addition is a reviewed migration (ENG-006).
 */
import { z } from 'zod';
import { ROLES } from './roles';

/** Employee bands are an enum, not a raw count (assumption A-03: minimum necessary data). */
export const EMPLOYEE_BANDS = ['under_20', '20_to_49', '50_to_199', '200_plus'] as const;
export type EmployeeBand = (typeof EMPLOYEE_BANDS)[number];

export const ORGANIZATION_TYPES = [
  'private_school',
  'childcare',
  'care_provider',
  'nonprofit',
  'association',
  'professional_services',
  'other',
] as const;

export const organization = z.object({
  id: z.string(),
  legalName: z.string().min(1).max(300),
  organizationType: z.enum(ORGANIZATION_TYPES),
  employeeBand: z.enum(EMPLOYEE_BANDS),
  /** ISO 3166-2 subdivision. Jurisdiction is first-class from CC-01 (assumption A-01). */
  jurisdiction: z.string().regex(/^[A-Z]{2}-[A-Z]{2,3}$/),
  preferredLanguage: z.enum(['en', 'fr']),
  createdAt: z.date(),
});
export type Organization = z.infer<typeof organization>;

export const user = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().min(1).max(200),
  preferredLanguage: z.enum(['en', 'fr']),
  createdAt: z.date(),
});
export type User = z.infer<typeof user>;

/**
 * Membership binds a user to a tenant with a role. Authorization reads
 * memberships from the database, never from a token claim (ADR-0002), so that
 * revocation is immediate rather than bounded by token lifetime.
 */
export const membership = z.object({
  organizationId: z.string(),
  userId: z.string(),
  role: z.enum(ROLES),
  createdAt: z.date(),
});
export type Membership = z.infer<typeof membership>;

export const PROJECT_STATES = ['draft', 'active', 'on_hold', 'closed'] as const;

export const project = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().min(1).max(300),
  state: z.enum(PROJECT_STATES),
  /** The client-side person permitted to bind the organization (PRD glossary). */
  authorizedSignerUserId: z.string().nullable(),
  targetDate: z.date().nullable(),
  createdAt: z.date(),
});
export type Project = z.infer<typeof project>;

/**
 * Requirement — a versioned, source-backed statement (PRD §18).
 * Applicability is deliberately tri-state: the product must never collapse
 * uncertainty into a pass/fail (PRD §6 service promise, CLP-017).
 */
export const APPLICABILITY = ['likely_applies', 'likely_does_not_apply', 'needs_review'] as const;

export const requirement = z.object({
  id: z.string(),
  organizationId: z.string(),
  /** Points at the versioned regulatory claim this requirement is derived from. */
  claimId: z.string(),
  claimVersion: z.number().int().positive(),
  applicability: z.enum(APPLICABILITY),
  rationale: z.string().max(4000),
  ownerUserId: z.string().nullable(),
  reviewerUserId: z.string().nullable(),
  reviewedAt: z.date().nullable(),
  nextReviewAt: z.date().nullable(),
});
export type Requirement = z.infer<typeof requirement>;

export const EVIDENCE_SCAN_STATES = ['quarantined', 'clean', 'infected', 'scan_failed'] as const;
export const EVIDENCE_CLASSIFICATIONS = ['policy', 'training_record', 'report', 'contract', 'other'] as const;

export const evidence = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  version: z.number().int().positive(),
  classification: z.enum(EVIDENCE_CLASSIFICATIONS),
  scanState: z.enum(EVIDENCE_SCAN_STATES),
  /**
   * Storage key is intentionally NOT part of any client-facing view model.
   * ENG-003 forbids exposing it; access is only ever a short-lived signed URL
   * issued after a policy check (ADR-0004).
   */
  storageKey: z.string(),
  retentionUntil: z.date().nullable(),
  legalHold: z.boolean(),
  createdAt: z.date(),
});
export type Evidence = z.infer<typeof evidence>;

export const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'] as const;
export const FINDING_STATES = ['open', 'in_remediation', 'awaiting_retest', 'closed', 'accepted_risk'] as const;

export const finding = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  severity: z.enum(SEVERITIES),
  state: z.enum(FINDING_STATES),
  summary: z.string().min(1).max(500),
  /** Every finding traces to a requirement version and evidence (CLP-014). */
  requirementId: z.string().nullable(),
  evidenceIds: z.array(z.string()),
  reviewerUserId: z.string().nullable(),
  createdAt: z.date(),
});
export type Finding = z.infer<typeof finding>;

export const ASSIGNMENT_STATES = ['drafted', 'offered', 'accepted', 'submitted', 'in_qa', 'accepted_final', 'closed'] as const;

export const assignment = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  contractorUserId: z.string(),
  state: z.enum(ASSIGNMENT_STATES),
  /** Contractor access expires automatically at closure (CTR-004). */
  accessExpiresAt: z.date().nullable(),
  createdAt: z.date(),
});
export type Assignment = z.infer<typeof assignment>;

export const DELIVERABLE_STATES = ['draft', 'in_review', 'approved', 'released'] as const;

export const deliverable = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  version: z.number().int().positive(),
  state: z.enum(DELIVERABLE_STATES),
  /** A release requires a named reviewer (§10 quality rule, OPS-011). */
  approvedByUserId: z.string().nullable(),
  releasedAt: z.date().nullable(),
});
export type Deliverable = z.infer<typeof deliverable>;
