/**
 * Content source for regulatory claims — ADR-0005, ENG-007.
 *
 * CC-01 reads claims from a local, reviewed file rather than a CMS, because the
 * CMS vendor decision (Q-13) is still open. The shape is the CMS shape, and the
 * access is already behind a function, so CC-02 swaps the source without
 * touching a component.
 */
import { regulatoryClaim, type RegulatoryClaim } from '@northstar/domain';

/**
 * The single claim CC-01 needs, to prove the render-from-content path end to end.
 *
 * Its wording is NOT approved for publication: Q-04 (counsel review of the
 * deadline statement) is still open, so the claim ships as `in_review` and the
 * product therefore renders the hold state. That is the correct behaviour to
 * demonstrate — it shows the safety mechanism working rather than bypassing it.
 */
const CLAIMS: readonly unknown[] = [
  {
    id: '0199a000-0000-7000-8000-0000000a1001',
    claimKey: 'on.reporting.deadline',
    version: 1,
    jurisdiction: 'CA-ON',
    statementEn:
      'Organizations of a certain size in Ontario are required to file an accessibility compliance report. Confirm the current deadline and thresholds with the official source.',
    statementFr: null,
    sourceUrl: 'https://www.ontario.ca/page/completing-your-accessibility-compliance-report',
    sourceTitle: 'Ontario — Completing your accessibility compliance report',
    effectiveDate: '2026-01-01',
    lastVerifiedAt: '2026-08-18',
    nextReviewAt: '2026-11-01',
    reviewerUserId: null,
    secondReviewerUserId: null,
    status: 'in_review',
  },
];

export function getClaim(claimKey: string): RegulatoryClaim | undefined {
  const raw = CLAIMS.find((c) => (c as { claimKey: string }).claimKey === claimKey);
  return raw ? regulatoryClaim.parse(raw) : undefined;
}
