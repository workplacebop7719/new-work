/**
 * In-memory adapter. Serves the fictional development dataset.
 *
 * Scored at a fixed anchor instant so output is reproducible across builds.
 */
import type { Deal, CategorySlug, Retailer } from '@/domain/types';
import { scoreOffer } from '@/domain/score-offer';
import { FIXTURE_OFFERS, FIXTURE_NOW, FIXTURE_RETAILERS } from './fixtures';
import { selectors, type DealRepository } from './repository-types';

const all = (): Deal[] =>
  FIXTURE_OFFERS.map((o) => scoreOffer(o, FIXTURE_NOW)).sort(selectors.byScoreDesc);

export const fixtureRepository: DealRepository = {
  async getDeals(category) {
    const deals = all();
    return category ? deals.filter((d) => d.offer.product.category === category) : deals;
  },
  async getDeal(slug) {
    return all().find((d) => d.offer.product.slug === slug) ?? null;
  },
  async getStandout() {
    return all().find(selectors.isStandout) ?? null;
  },
  async getMadeTheCut() {
    return all().filter(selectors.madeTheCut);
  },
  async getWeWouldHold() {
    return all().filter(selectors.weWouldHold);
  },
  async getWithheld() {
    return all().filter(selectors.withheld);
  },
  async getRetailers(): Promise<Retailer[]> {
    return FIXTURE_RETAILERS;
  },
  async searchDeals(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all().filter((d) => selectors.matchesQuery(d, q));
  },
};

export type { CategorySlug };
