/**
 * The offer ladder — PRD §5.
 *
 * Prices are **launch hypotheses** in the PRD's own words ("must be tested
 * against contractor wholesale rates and buyer willingness to pay"), and whether
 * they are fixed or variable is still open (question Q-06). They therefore live
 * in configuration and render with an explicit "indicative" qualifier — never as
 * a bare number a buyer could read as a quote.
 *
 * Every offer states its exclusions. PRD §7 requires "outcome, inclusions,
 * indicative price, timing, required client inputs and exclusions", and the
 * exclusions are the part that reduces mismatched leads, so they are not
 * optional here.
 */
export type OfferKey =
  | 'readiness_assessment'
  | 'core_readiness'
  | 'digital_readiness'
  | 'remediation_management'
  | 'care_plan';

export interface Offer {
  readonly key: OfferKey;
  /** Rendered through the price formatter below, never printed raw. */
  readonly priceCadFrom?: number;
  readonly priceCadTo?: number;
  readonly custom?: boolean;
  readonly recurring?: boolean;
}

export const OFFERS: readonly Offer[] = [
  { key: 'readiness_assessment', priceCadFrom: 495 },
  { key: 'core_readiness', priceCadFrom: 2000, priceCadTo: 3000 },
  { key: 'digital_readiness', priceCadFrom: 4500, priceCadTo: 7500 },
  { key: 'remediation_management', custom: true },
  { key: 'care_plan', priceCadFrom: 399, priceCadTo: 799, recurring: true },
];

const formatter = new Map<string, Intl.NumberFormat>();

function money(amount: number, locale: 'en' | 'fr'): string {
  const tag = locale === 'fr' ? 'fr-CA' : 'en-CA';
  let f = formatter.get(tag);
  if (!f) {
    f = new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    });
    formatter.set(tag, f);
  }
  return f.format(amount);
}

/** Returns the price phrase, or undefined for a custom-scoped offer. */
export function priceLabel(offer: Offer, locale: 'en' | 'fr'): string | undefined {
  if (offer.custom || offer.priceCadFrom === undefined) return undefined;
  const from = money(offer.priceCadFrom, locale);
  const range = offer.priceCadTo === undefined ? from : `${from}–${money(offer.priceCadTo, locale)}`;
  return offer.recurring ? `${range}/${locale === 'fr' ? 'mois' : 'mo'}` : range;
}
