/**
 * Composing an issue of The Bargenation Edit (PRD §38, §39).
 *
 * Pure: takes scored deals, returns an issue or a refusal. No database, no
 * clock, no provider.
 *
 * The rule that shapes this: "Do not overload issues. Fewer better items." A
 * newsletter that pads itself to a fixed length teaches people to skim, and
 * then the one issue that mattered gets skimmed too. So sections that have
 * nothing are OMITTED rather than filled, and an issue with nothing worth
 * saying is not published at all.
 *
 * That last part matters. A daily newsletter that must go out daily will
 * eventually recommend something it does not believe in.
 */
import type { Deal } from '@/domain/types';
import { formatUsd } from '@/domain/types';

/** Caps, so an issue cannot become a catalogue. */
export const MAX_MADE_THE_CUT = 4;
export const MAX_HOLD = 2;
export const MAX_FINDS = 1;

/** Below this many items across all sections, there is no issue. */
export const MIN_ITEMS_TO_PUBLISH = 2;

export interface IssueItem {
  slug: string;
  product: string;
  retailer: string;
  price: string;
  /** One line of why, from the scoring engine — never written by hand. */
  line: string;
  score: number | null;
}

export interface Issue {
  /** e.g. "2026-08-22" */
  date: string;
  /** The one-line promise at the top. */
  standfirst: string;
  standout: IssueItem | null;
  madeTheCut: IssueItem[];
  find: IssueItem | null;
  wouldHold: IssueItem[];
  /** Total items, so a reader can see the issue is short on purpose. */
  itemCount: number;
}

export type Composition =
  | { publish: true; issue: Issue }
  | { publish: false; reason: string };

/**
 * Picks a line for one item, avoiding lines already used in this issue.
 *
 * The scoring engine ranks reasons by contribution, so the top one is usually
 * the same across a whole day's deals — the first draft of this issue said
 * "Near its recent verified low" on four items out of five. A newsletter where
 * every entry says the same thing has not been edited.
 *
 * `tone` matters too: an item in "what we'd hold off buying" must be given a
 * reason AGAINST it. The first draft fell back to the positive list and
 * printed "Widely available across sizes" under a section about not buying.
 */
function lineFor(deal: Deal, tone: 'for' | 'against', used: Set<string>): string {
  const preferred =
    tone === 'for' ? deal.recommendation.worthIt : deal.recommendation.againstIt;
  const fallback =
    tone === 'for' ? deal.recommendation.againstIt : deal.recommendation.worthIt;

  const fresh = preferred.find((line) => !used.has(line));
  if (fresh) {
    used.add(fresh);
    return fresh;
  }

  // Every reason of the right tone is already spoken for. Concrete recorded
  // evidence differs per item by construction, so it can never repeat.
  if (deal.history) {
    return `We've recorded it as low as ${formatUsd(deal.history.lowCents)}, typically ${formatUsd(deal.history.typicalCents)}.`;
  }

  const anyFresh = fallback.find((line) => !used.has(line));
  if (anyFresh) {
    used.add(anyFresh);
    return anyFresh;
  }
  return deal.recommendation.line;
}

const toItem = (deal: Deal, tone: 'for' | 'against', used: Set<string>): IssueItem => ({
  slug: deal.offer.product.slug,
  product: deal.offer.product.name,
  retailer: deal.offer.retailer.name,
  price: formatUsd(deal.offer.priceCents),
  line: lineFor(deal, tone, used),
  score: deal.publishable && deal.index.scorable ? deal.index.score : null,
});

export function composeIssue(input: {
  date: string;
  standout: Deal | null;
  madeTheCut: readonly Deal[];
  wouldHold: readonly Deal[];
}): Composition {
  const { date, standout, madeTheCut, wouldHold } = input;

  // The Standout, if there is one, is not repeated in the body.
  const standoutSlug = standout?.offer.product.slug;
  const cut = madeTheCut
    .filter((d) => d.offer.product.slug !== standoutSlug)
    .slice(0, MAX_MADE_THE_CUT);

  /**
   * A Find is not simply the next-highest score (§21). It is something
   * interesting that the ranking would otherwise bury — so it is drawn from
   * BELOW the items that made the cut, not from the top.
   */
  const findCandidate = madeTheCut
    .filter((d) => d.offer.product.slug !== standoutSlug)
    .slice(MAX_MADE_THE_CUT)
    .find((d) => d.history?.atRecordedLow) ?? null;

  const hold = wouldHold.slice(0, MAX_HOLD);

  const itemCount =
    (standout ? 1 : 0) + cut.length + (findCandidate ? MAX_FINDS : 0) + hold.length;

  if (itemCount < MIN_ITEMS_TO_PUBLISH) {
    return {
      publish: false,
      reason: 'Nothing cleared the bar today. There is no issue to send.',
    };
  }

  // Shared across the whole issue, so no line is printed twice.
  const used = new Set<string>();

  return {
    publish: true,
    issue: {
      date,
      standfirst: standfirstFor(standout, hold.length),
      standout: standout ? toItem(standout, 'for', used) : null,
      madeTheCut: cut.map((d) => toItem(d, 'for', used)),
      find: findCandidate ? toItem(findCandidate, 'for', used) : null,
      wouldHold: hold.map((d) => toItem(d, 'against', used)),
      itemCount,
    },
  };
}

/**
 * The line at the top, which has to be honest about the issue it introduces.
 * An issue with nothing exceptional in it should not open by implying there is.
 */
function standfirstFor(standout: Deal | null, holdCount: number): string {
  if (standout) return 'What’s worth buying, what’s worth holding, and what changed.';
  if (holdCount > 0) return 'Nothing exceptional today — but two things worth not buying.';
  return 'A quiet day. A short issue.';
}
