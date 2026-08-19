/** BARGENATION domain model. Framework-free on purpose. */
import type { PriceObservation } from './price-history';
import type { ValueIndexResult } from './value-index';
import type { ConfidenceResult } from './confidence';
import type { UrgencyResult } from './urgency';
import type { RecommendationResult } from './buy-hold';
import type { SourceTier } from './confidence';

export const CATEGORIES = [
  { slug: 'kids', name: 'Kids' },
  { slug: 'baby', name: 'Baby' },
  { slug: 'school', name: 'School' },
  { slug: 'shoes', name: 'Shoes' },
  { slug: 'home', name: 'Home' },
  { slug: 'groceries', name: 'Groceries' },
  { slug: 'toys', name: 'Toys' },
  { slug: 'seasonal', name: 'Seasonal' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

/**
 * Provenance of every record the UI renders.
 * FIXTURE data is developer data. The UI is required to disclose it (§45).
 */
export type DataMode = 'FIXTURE' | 'LIVE';

export interface Retailer {
  slug: string;
  name: string;
  /** true only for a retailer we have an actual agreement with */
  verifiedPartner: boolean;
}

export interface Product {
  slug: string;
  name: string;
  brand: string;
  category: CategorySlug;
}

export interface Offer {
  id: string;
  product: Product;
  retailer: Retailer;
  priceCents: number;
  currency: 'USD';
  /** ISO instant of our most recent verification */
  lastVerifiedAt: string;
  sourceTier: SourceTier;
  observations: PriceObservation[];
  /** current prices at comparable retailers, in cents */
  competitorPriceCents: number[];
  daysUntilOfferEnds: number | null;
  limitedStock: boolean | null;
  inStock: boolean;
  dataMode: DataMode;
}

/** An offer after scoring — the shape every surface renders. */
export interface Deal {
  offer: Offer;
  index: ValueIndexResult;
  publishable: boolean;
  /** why we are withholding a headline Index, when we are */
  withheldReason: string | null;
  confidence: ConfidenceResult;
  urgency: UrgencyResult;
  recommendation: RecommendationResult;
  history: {
    lowCents: number;
    highCents: number;
    typicalCents: number;
    atRecordedLow: boolean;
    observationCount: number;
  } | null;
}

export const formatUsd = (cents: number): string =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
