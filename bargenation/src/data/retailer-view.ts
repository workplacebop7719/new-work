import type { Deal, Retailer } from '@/domain/types';
import { profileRetailer, type RetailerProfile } from '@/domain/retailer-profile';
import { getDeals, getRetailers } from './repository';

/**
 * RETAILER VIEW (PRD §43).
 *
 * Joins a retailer to the offers we track there and to the profile computed
 * from them. It lives here rather than in the pages because both `/stores`
 * and `/stores/[slug]` must agree on what "the offers we track at Harlow &
 * Finch" means — a page that filtered slightly differently would publish two
 * different counts for the same business.
 *
 * The filtering happens above the repository rather than inside it on
 * purpose: `getDeals()` is the single path through the scoring pipeline, so
 * anything reached from here is already scored, already gated by
 * publishability, and cannot be a raw price that slipped past the engine.
 */
export interface RetailerView {
  retailer: Retailer;
  deals: Deal[];
  profile: RetailerProfile;
}

const forRetailer = (deals: readonly Deal[], slug: string): Deal[] =>
  deals.filter((d) => d.offer.retailer.slug === slug);

export async function listRetailerViews(): Promise<RetailerView[]> {
  const [retailers, deals] = await Promise.all([getRetailers(), getDeals()]);
  return retailers.map((retailer) => {
    const mine = forRetailer(deals, retailer.slug);
    return { retailer, deals: mine, profile: profileRetailer(mine) };
  });
}

export async function getRetailerView(slug: string): Promise<RetailerView | null> {
  const retailer = (await getRetailers()).find((r) => r.slug === slug);
  if (!retailer) return null;
  const mine = forRetailer(await getDeals(), slug);
  return { retailer, deals: mine, profile: profileRetailer(mine) };
}
