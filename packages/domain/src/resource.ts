/**
 * Editorial resources — PRD §7 "Editorial resources", §13 content model,
 * CNT-003, CNT-004.
 *
 * Kept separate from `RegulatoryClaim` on purpose. A resource is *our* method,
 * process and opinion: we can write it, revise it and stand behind it. A
 * regulatory claim is a statement about the law, and it carries two reviewers,
 * an effective date and an automatic hold.
 *
 * The rule that connects them: a resource may **reference** a claim by key, but
 * it may never restate one in its own prose. That is what stops an article
 * quietly becoming an unreviewed legal statement six months after its source
 * changed — the referenced claim goes on hold, and the article shows that.
 */
import { z } from 'zod';

export const RESOURCE_KINDS = ['guide', 'checklist', 'explainer'] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/** A block of article body. Deliberately a small closed set, not free HTML. */
export const resourceBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: z.string().min(1) }),
  z.object({ type: z.literal('heading'), text: z.string().min(1) }),
  z.object({ type: z.literal('list'), items: z.array(z.string().min(1)).min(1) }),
  /**
   * Renders a versioned regulatory claim in place. The article supplies only the
   * key; the claim supplies the words, the source and the review state. If the
   * claim is on hold, this block renders the hold notice instead — which is why
   * an article can never outlive the accuracy of the law it cites.
   */
  z.object({ type: z.literal('claim'), claimKey: z.string().min(1) }),
]);

export type ResourceBlock = z.infer<typeof resourceBlock>;

export const resource = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.enum(RESOURCE_KINDS),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(400),
  body: z.array(resourceBlock).min(1),
  /** Reading time in minutes, so a reader can judge before committing. */
  minutes: z.number().int().min(1).max(60),
  updatedAt: z.coerce.date(),
  /**
   * CNT-004: "Every downloadable resource has HTML equivalent where practical
   * and an accessibility QA record."
   *
   * Every resource here is HTML — there are no PDFs — which satisfies the first
   * half by construction. The second half is a real reviewer's name, so it is
   * nullable and the UI states plainly when it is missing rather than implying
   * a check that has not happened.
   */
  accessibilityReviewedBy: z.string().nullable(),
  accessibilityReviewedAt: z.coerce.date().nullable(),
});

export type Resource = z.infer<typeof resource>;

/**
 * The pre-parse shape, exported so content sources can be authored with ISO
 * date strings without taking a direct dependency on the schema library. It is
 * also the shape a CMS payload arrives in, which is the point.
 */
export type ResourceInput = z.input<typeof resource>;

/** A resource is publishable when its own accessibility QA record exists. */
export function hasAccessibilityRecord(item: Resource): boolean {
  return item.accessibilityReviewedBy !== null && item.accessibilityReviewedAt !== null;
}
