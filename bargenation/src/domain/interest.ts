/**
 * INTEREST — what we noticed, and when it is worth saying (PRD §26, §37, §52).
 *
 * A customer who came back to the same pushchair four times in a fortnight and
 * never added it to a Watchlist has told us something. This decides whether
 * that is worth an interruption.
 *
 * THE RULE THAT SHAPES ALL OF IT. Membership adds INFERENCE. It never
 * subtracts SERVICE.
 *
 * A free customer's explicit watch fires identically — same moment, same
 * wording, same threshold — whether or not anybody is paying. What a member
 * buys is that we ALSO look at the things they never got round to adding.
 * Nobody is made to wait so that a paying customer arrives first, and there is
 * no parameter in `evaluateSignals` through which that could be expressed.
 *
 * That is the difference between a tier that adds work and a tier that
 * withholds it, and it is the only version §52 permits: money cannot buy a
 * score, a Buy call, a ranking or a place in a queue. It can buy us paying
 * attention to more of your behaviour on your behalf.
 *
 * WHAT THIS DELIBERATELY CANNOT DO. It reads scored deals and interest counts.
 * It has no access to commission, no membership input beyond the caller's
 * decision to call it at all, and it cannot change an Index or a
 * recommendation — it only decides whether to mention one that already exists.
 */
import { CATEGORIES, type Deal } from './types';
import { UNUSUALLY_STRONG_INDEX } from './deal-signal';

/** Views of one product before repetition means anything. */
export const REPEAT_VIEWS_FOR_INTEREST = 3;

/** How far back a view still counts. Matches the retention window. */
export const INTEREST_WINDOW_DAYS = 90;

/**
 * An interest alert needs a genuinely good price, not merely a cheaper one.
 *
 * Set at the same bar as a Buy call rather than a lower one. The temptation
 * with an inferred alert is to fire it more readily, because the customer
 * never asked and we want the feature to look alive — which is precisely how
 * it would become the thing people mute.
 */
export const MIN_INDEX_TO_MENTION = 7.5;

/**
 * Visits to one CATEGORY before repetition means anything.
 *
 * Higher than the product threshold, because it is a weaker signal about a
 * wider thing. Coming back to the same pushchair three times is somebody
 * deciding. Opening Shoes five times is somebody browsing, and the most it
 * licenses us to say is "the best thing in there right now is unusually good".
 *
 * WHY CATEGORY INTEREST IS COARSE ON PURPOSE. The obvious version of this
 * feature records what people SEARCHED — the raw terms. Free text is where
 * the sensitive things are: a medical condition, a pregnancy nobody has
 * announced, a child's name. There is no way to hold that safely, so the
 * column for it does not exist.
 *
 * What is recorded instead is one of the eight fixed slugs in `CATEGORIES`.
 * It is enough to say "you have been in Shoes a lot"; it cannot say anything
 * a customer would be alarmed to read back on /app/noticed, which is the test
 * this whole subsystem is written to pass.
 */
export const REPEAT_VIEWS_FOR_CATEGORY_INTEREST = 5;

export interface InterestRecord {
  /** Product slug, or null when the interest is a whole category. */
  productSlug: string | null;
  categorySlug: string | null;
  kind: 'VIEWED' | 'SEARCHED' | 'CONSIDERED';
  /** Total across the window, already summed by the caller. */
  occurrences: number;
  /** ISO date of the most recent day this was seen. */
  lastSeenOn: string;
}

export interface NoticedSignal {
  productSlug: string;
  offerId: string;
  message: string;
  /** Why we are mentioning it, in the customer's words. Shown, not logged. */
  because: string;
  /**
   * Which inference produced this.
   *
   * `PRODUCT` — you kept coming back to this exact thing.
   * `CATEGORY` — you have been browsing this category and the best thing in
   *   it right now is unusually good.
   *
   * The two already read differently to a customer — the wording and the
   * `because` differ — and this is what lets a caller, and the tests, tell
   * them apart without parsing prose.
   */
  from: 'PRODUCT' | 'CATEGORY';
}

export interface InterestContext {
  interests: readonly InterestRecord[];
  /** Everything currently scored, from the ordinary pipeline. */
  deals: readonly Deal[];
  /** Product slugs already on a Watchlist — never worth telling twice. */
  watchedSlugs: readonly string[];
  /** Products this customer has already been told about. */
  alreadyMentionedSlugs: readonly string[];
}

/**
 * Which products this customer has shown real interest in.
 *
 * Repetition, not a single visit. One view is a click; four views over a
 * fortnight is a decision somebody is putting off.
 */
export function repeatedInterest(
  interests: readonly InterestRecord[],
): readonly InterestRecord[] {
  const byProduct = new Map<string, InterestRecord>();

  for (const record of interests) {
    if (!record.productSlug) continue;
    const existing = byProduct.get(record.productSlug);
    if (!existing) {
      byProduct.set(record.productSlug, { ...record });
      continue;
    }
    byProduct.set(record.productSlug, {
      ...existing,
      occurrences: existing.occurrences + record.occurrences,
      lastSeenOn: existing.lastSeenOn > record.lastSeenOn ? existing.lastSeenOn : record.lastSeenOn,
    });
  }

  return [...byProduct.values()]
    .filter((record) => record.occurrences >= REPEAT_VIEWS_FOR_INTEREST)
    // Deterministic: strongest interest first, then by slug so two runs of the
    // same sweep never disagree about which one to send.
    .sort((a, b) =>
      b.occurrences - a.occurrences || (a.productSlug ?? '').localeCompare(b.productSlug ?? ''),
    );
}

/**
 * The same folding for categories, against its own higher threshold.
 *
 * Kept as a separate function rather than a parameter on `repeatedInterest`,
 * because the two are not the same measurement wearing different clothes: they
 * have different thresholds, they license different claims, and a shared
 * implementation would make it easy to accidentally give a category the
 * product bar.
 */
export function repeatedCategoryInterest(
  interests: readonly InterestRecord[],
): readonly InterestRecord[] {
  const byCategory = new Map<string, InterestRecord>();

  for (const record of interests) {
    if (!record.categorySlug) continue;
    const existing = byCategory.get(record.categorySlug);
    if (!existing) {
      byCategory.set(record.categorySlug, { ...record });
      continue;
    }
    byCategory.set(record.categorySlug, {
      ...existing,
      occurrences: existing.occurrences + record.occurrences,
      lastSeenOn: existing.lastSeenOn > record.lastSeenOn ? existing.lastSeenOn : record.lastSeenOn,
    });
  }

  return [...byCategory.values()]
    .filter((record) => record.occurrences >= REPEAT_VIEWS_FOR_CATEGORY_INTEREST)
    .sort((a, b) =>
      b.occurrences - a.occurrences || (a.categorySlug ?? '').localeCompare(b.categorySlug ?? ''),
    );
}

/**
 * A category's display name, from the fixed list. Falls back to the slug so a
 * category that outlives this constant degrades to something readable rather
 * than to "undefined" in front of a customer.
 */
const categoryName = (slug: string): string =>
  CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

/**
 * At most ONE noticed-signal, for the same reason selectSignal exists: a
 * customer with six interesting products is still one interruption.
 *
 * Returns null far more often than not, which is the intended behaviour.
 */
export function noticeSomething(ctx: InterestContext): NoticedSignal | null {
  const { interests, deals, watchedSlugs, alreadyMentionedSlugs } = ctx;

  const watched = new Set(watchedSlugs);
  const mentioned = new Set(alreadyMentionedSlugs);
  const bySlug = new Map(deals.map((deal) => [deal.offer.product.slug, deal]));

  const candidates: Array<{ record: InterestRecord; deal: Deal; score: number }> = [];

  for (const record of repeatedInterest(interests)) {
    const slug = record.productSlug;
    if (!slug) continue;

    // Something they already asked us to watch is the Watchlist's job. Telling
    // them twice, once because they asked and once because we noticed, is the
    // duplicate-notification failure in a new costume.
    if (watched.has(slug) || mentioned.has(slug)) continue;

    const deal = bySlug.get(slug);
    if (!deal) continue;

    // Only ever mentions a score we would publish anyway. An inferred alert
    // must not be the one place a withheld or low-confidence Index leaks out.
    if (!deal.publishable || !deal.index.scorable) continue;
    if (deal.confidence.level === 'LOW') continue;
    if (deal.index.score < MIN_INDEX_TO_MENTION) continue;

    candidates.push({ record, deal, score: deal.index.score });
  }

  // Nothing specific to say. Fall back to the weaker inference — but only
  // here, so a category hunch can never displace something we actually
  // watched somebody return to.
  if (candidates.length === 0) return noticeInCategory(ctx, categoryName);

  const best = candidates.sort((a, b) =>
    b.score - a.score || a.deal.offer.product.slug.localeCompare(b.deal.offer.product.slug),
  )[0] as { record: InterestRecord; deal: Deal };

  const { deal, record } = best;
  const name = deal.offer.product.name;
  const score = deal.index.scorable ? deal.index.score : 0;

  return {
    from: 'PRODUCT',
    productSlug: deal.offer.product.slug,
    offerId: deal.offer.id,
    // Says what we noticed, in plain terms, because a customer who cannot tell
    // why they were messaged has been surveilled rather than served.
    because:
      `You looked at this ${record.occurrences} times and never added it to your Watchlist.`,
    message:
      score >= UNUSUALLY_STRONG_INDEX
        ? `${name} — the one you keep coming back to — is scoring ${score.toFixed(1)}, stronger than we usually see.`
        : `${name} — the one you keep coming back to — is scoring ${score.toFixed(1)} today.`,
  };
}

/**
 * The category fallback: nothing specific to say, but you have been in here a
 * lot and the best thing currently in it is exceptional.
 *
 * THREE THINGS MAKE THIS SAFE TO SEND AT ALL, and all three are stricter than
 * the product path:
 *
 *   The interest bar is higher — five visits, not three.
 *
 *   The DEAL bar is higher: `UNUSUALLY_STRONG_INDEX`, not
 *   `MIN_INDEX_TO_MENTION`. A merely good deal in a category somebody browsed
 *   is not worth an interruption; if it were, this would fire constantly and
 *   become the thing people mute.
 *
 *   It only runs when the product path found nothing. A weaker inference must
 *   never displace a stronger one, and there is only ever one interruption.
 *
 * It is also careful about what it claims to know. The wording says you have
 * been looking in this category — which is exactly and only what was recorded
 * — rather than implying we know why.
 */
function noticeInCategory(
  ctx: InterestContext, name: (slug: string) => string,
): NoticedSignal | null {
  const watched = new Set(ctx.watchedSlugs);
  const mentioned = new Set(ctx.alreadyMentionedSlugs);

  for (const record of repeatedCategoryInterest(ctx.interests)) {
    const slug = record.categorySlug;
    if (!slug) continue;

    const inCategory = ctx.deals
      .filter((deal) => deal.offer.product.category === slug)
      .filter((deal) => !watched.has(deal.offer.product.slug))
      .filter((deal) => !mentioned.has(deal.offer.product.slug))
      .filter((deal) => deal.publishable && deal.index.scorable)
      .filter((deal) => deal.confidence.level !== 'LOW')
      .filter((deal) => (deal.index.scorable ? deal.index.score : 0) >= UNUSUALLY_STRONG_INDEX)
      .sort((a, b) => {
        const scoreA = a.index.scorable ? a.index.score : 0;
        const scoreB = b.index.scorable ? b.index.score : 0;
        return scoreB - scoreA
          || a.offer.product.slug.localeCompare(b.offer.product.slug);
      });

    const deal = inCategory[0];
    if (!deal || !deal.index.scorable) continue;

    return {
      from: 'CATEGORY',
      productSlug: deal.offer.product.slug,
      offerId: deal.offer.id,
      because:
        `You have been looking in ${name(slug)} — ${record.occurrences} visits — `
        + 'and had not put anything there on your Watchlist.',
      message:
        `${deal.offer.product.name} is scoring ${deal.index.score.toFixed(1)}, `
        + `the strongest thing in ${name(slug)} right now.`,
    };
  }

  return null;
}
