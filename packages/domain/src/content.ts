/**
 * Regulatory content model — ADR-0005, CNT-001/002/005, ENG-007.
 *
 * The rule that makes this a safety system rather than a CMS schema:
 *
 *   ENG-007 — "Never hard-code regulatory claims in components. Render them from
 *   versioned content objects with sources and review dates."
 *   CNT-005 — "Expired or disputed regulatory content automatically displays an
 *   internal hold and cannot be republished without review."
 *
 * So a claim past its review date is not merely flagged: `resolveClaim` refuses
 * to return its statement at all. A stale regulatory statement degrades to a
 * visible "under review" state pointing at the official source, which is the
 * behaviour §25 "Regulatory misstatement" demands.
 */
import { z } from 'zod';

export const CLAIM_STATUSES = ['draft', 'in_review', 'published', 'hold', 'retired'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export type Locale = 'en' | 'fr';

export const regulatoryClaim = z.object({
  id: z.string(),
  /** Stable key across versions, e.g. "on.reporting.deadline". */
  claimKey: z.string().min(1).max(120),
  version: z.number().int().positive(),
  jurisdiction: z.string().regex(/^[A-Z]{2}-[A-Z]{2,3}$/),
  statementEn: z.string().min(1),
  /** Null means "not translated yet" — an explicit state, never a silent fallback. */
  statementFr: z.string().min(1).nullable(),
  sourceUrl: z.string().url(),
  sourceTitle: z.string().min(1),
  effectiveDate: z.coerce.date(),
  lastVerifiedAt: z.coerce.date(),
  nextReviewAt: z.coerce.date(),
  reviewerUserId: z.string().nullable(),
  /** Two-person review (PRD §20). A published claim needs both. */
  secondReviewerUserId: z.string().nullable(),
  status: z.enum(CLAIM_STATUSES),
});

export type RegulatoryClaim = z.infer<typeof regulatoryClaim>;

/**
 * The effective status at a point in time. A published claim whose review date
 * has passed is on hold — computed, not stored, so a scheduled job that fails to
 * run cannot leave stale guidance on the site.
 */
export function effectiveStatus(claim: RegulatoryClaim, now: Date): ClaimStatus {
  if (claim.status === 'published' && claim.nextReviewAt.getTime() <= now.getTime()) {
    return 'hold';
  }
  return claim.status;
}

export type ResolvedClaim =
  | {
      readonly kind: 'statement';
      readonly text: string;
      readonly locale: Locale;
      /** True when the requested locale was unavailable and English is shown. */
      readonly translationMissing: boolean;
      readonly sourceUrl: string;
      readonly sourceTitle: string;
      readonly lastVerifiedAt: Date;
      readonly jurisdiction: string;
      readonly version: number;
    }
  | {
      readonly kind: 'hold';
      readonly reason: 'awaiting_review' | 'not_published';
      readonly sourceUrl: string;
      readonly sourceTitle: string;
    };

export class ClaimNotPublishableError extends Error {}

/**
 * Resolves a claim for rendering.
 *
 * Returns a discriminated union rather than a string, so a caller cannot
 * accidentally render a held claim: there is no `.text` on the hold branch.
 */
export function resolveClaim(claim: RegulatoryClaim, locale: Locale, now: Date): ResolvedClaim {
  const status = effectiveStatus(claim, now);

  if (status !== 'published') {
    return {
      kind: 'hold',
      reason: status === 'hold' ? 'awaiting_review' : 'not_published',
      sourceUrl: claim.sourceUrl,
      sourceTitle: claim.sourceTitle,
    };
  }

  // A published claim must carry both reviewers (PRD §20 two-person review).
  if (!claim.reviewerUserId || !claim.secondReviewerUserId) {
    return {
      kind: 'hold',
      reason: 'not_published',
      sourceUrl: claim.sourceUrl,
      sourceTitle: claim.sourceTitle,
    };
  }

  const french = locale === 'fr' ? claim.statementFr : null;
  // Regulatory statements are never machine-translated (ADR-0005): where French
  // is missing the English text is shown and the gap is declared to the caller,
  // which renders it as an explicit notice rather than hiding it.
  const translationMissing = locale === 'fr' && french === null;

  return {
    kind: 'statement',
    text: french ?? claim.statementEn,
    locale: french ? 'fr' : 'en',
    translationMissing,
    sourceUrl: claim.sourceUrl,
    sourceTitle: claim.sourceTitle,
    lastVerifiedAt: claim.lastVerifiedAt,
    jurisdiction: claim.jurisdiction,
    version: claim.version,
  };
}

/**
 * Guard for the publish path (CNT-005: cannot be republished without review).
 * Throws rather than returning false: publishing an unreviewed regulatory claim
 * should be impossible to do by ignoring a return value.
 */
export function assertPublishable(claim: RegulatoryClaim, now: Date): void {
  if (!claim.reviewerUserId || !claim.secondReviewerUserId) {
    throw new ClaimNotPublishableError('A regulatory claim requires two named reviewers (PRD §20).');
  }
  if (claim.nextReviewAt.getTime() <= now.getTime()) {
    throw new ClaimNotPublishableError(
      'The review date has passed. Re-verify the source and set a new review date before publishing.',
    );
  }
  if (claim.lastVerifiedAt.getTime() > now.getTime()) {
    throw new ClaimNotPublishableError('last verified date is in the future.');
  }
}
