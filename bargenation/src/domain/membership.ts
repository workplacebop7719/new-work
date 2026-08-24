/**
 * MEMBERSHIP — the one place the price lives (PRD §52, §01, §45).
 *
 * WHY THIS FILE EXISTS AT ALL.
 *
 * Two founding documents named two different prices. The PRD said $9.99 a
 * month; the capital plan modelled $5.99–8.99. Nothing shipped while that was
 * unresolved, because a price quoted in one place and contradicted in another
 * is worse than no price: whichever a customer reads first becomes the one
 * they believe they were promised.
 *
 * The founder resolved it by delegating the decision, with the instruction to
 * overrule the PRD where the two conflict. So:
 *
 *   MONTHLY_PRICE_CENTS = 799 — seven dollars ninety-nine, US dollars.
 *
 * It sits at the top of the band the capital plan actually modelled, which
 * means the revenue assumptions behind the plan still hold, and it resolves
 * against the document that carries the financial model rather than the one
 * that carries the product description. The gap to the PRD's $9.99 is two
 * dollars a month; the gap to an unmodelled price is a plan nobody can trust.
 *
 * WHAT THIS FILE IS NOT. It is not a payments integration, and it does not
 * pretend to be one. No provider is configured, nothing here can take money,
 * and `MEMBERSHIP_PURCHASABLE` is false — every surface that quotes the price
 * must read that flag and say plainly that it cannot be bought yet, rather
 * than rendering a button that goes nowhere (§01: no fake functionality).
 *
 * When a provider is configured the flag flips and the pages already read it.
 * Until then a member is set by an operator, which is a flag on a profile and
 * is described honestly as such.
 *
 * WHAT MONEY CANNOT BUY, RESTATED HERE BECAUSE THIS IS WHERE THE TEMPTATION
 * LIVES (§52). Not a Value Index. Not a Buy call. Not a rank, a placement, a
 * Standout, or a place in any queue. A free customer's Watchlist alert fires
 * at exactly the same instant as a member's — there is no parameter in the
 * signal engine through which that could be expressed, and `MEMBER_BENEFITS`
 * below is the complete list, kept here so it cannot quietly grow in a
 * marketing component.
 */

/** The decided price, in minor units. Money is never a float. */
export const MONTHLY_PRICE_CENTS = 799;

export const CURRENCY = 'USD';

/**
 * Whether membership can actually be bought right now.
 *
 * Hard-coded false rather than read from an environment variable, because a
 * variable implies somebody could turn this on without also building the
 * checkout, the receipts, the tax handling and the cancellation route that
 * have to exist before taking money is legal or decent.
 */
export const MEMBERSHIP_PURCHASABLE = false;

/** Formatted for display, from the single source above. */
export function monthlyPrice(): string {
  return (MONTHLY_PRICE_CENTS / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: CURRENCY,
  });
}

export interface MemberBenefit {
  title: string;
  /** What it does. Plain, checkable, and already built. */
  detail: string;
  /** Where in the product it lives, so the claim can be verified. */
  href: string;
}

/**
 * EVERY benefit, and nothing that is not built.
 *
 * Each entry names a page that exists. Adding an aspirational one here would
 * be exactly the fabrication §45 forbids, and it would be visible: the link
 * would 404.
 */
export const MEMBER_BENEFITS: readonly MemberBenefit[] = [
  {
    title: 'We watch what you never got round to adding',
    detail:
      'Come back to the same product three times without adding it to a Watchlist and we '
      + 'treat that as a decision you are putting off. If its price then reaches a genuinely '
      + 'good level, we say so. Free accounts see the same list; membership is what lets us act on it.',
    href: '/app/noticed',
  },
  {
    title: 'Interest alerts held to the same bar as a Buy call',
    detail:
      'An inferred alert has to clear the same Value Index threshold as anything we would tell '
      + 'you to buy outright. It is not a lower bar because you did not ask for it.',
    href: '/app/deal-signals',
  },
] as const;

/**
 * What membership explicitly does NOT change. Rendered on the page, not just
 * asserted in a comment, because the promise is only worth anything in front
 * of the customer.
 */
export const MEMBERSHIP_NEVER: readonly string[] = [
  'A Value Index. The number is computed from recorded prices and nothing else.',
  'A Buy, Hold or Skip call.',
  'Where anything ranks, or whether it is featured.',
  'When a Watchlist alert reaches you. A free account is alerted at the same instant.',
  'What we collect about you, or how long we keep it.',
] as const;
