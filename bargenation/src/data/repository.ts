/**
 * THE ONLY MODULE THAT KNOWS WHERE DEALS COME FROM.
 *
 * Picks an adapter from the environment. Both feed the identical scoring
 * pipeline, so no surface above this line can tell them apart — and none can
 * bypass scoring to render a raw price.
 */
import { fixtureRepository } from './fixture-repository';
import { postgresRepository } from './postgres-repository';
import type { DealRepository } from './repository-types';

export const dataMode: 'LIVE' | 'FIXTURE' = process.env.DATABASE_URL ? 'LIVE' : 'FIXTURE';

const repo: DealRepository = dataMode === 'LIVE' ? postgresRepository : fixtureRepository;

export const getDeals = repo.getDeals.bind(repo);
export const getDeal = repo.getDeal.bind(repo);
export const getStandout = repo.getStandout.bind(repo);
export const getMadeTheCut = repo.getMadeTheCut.bind(repo);
export const getWeWouldHold = repo.getWeWouldHold.bind(repo);
export const getWithheld = repo.getWithheld.bind(repo);
export const getRetailers = repo.getRetailers.bind(repo);
export const searchDeals = repo.searchDeals.bind(repo);

/**
 * Whether the dataset currently being served contains sample records.
 *
 * Deliberately asks the DATA, not the environment. An earlier version keyed
 * the disclosure banner off `DATABASE_URL`, which meant seeding the fictional
 * dataset into Postgres silently switched the banner OFF and presented
 * invented prices with no disclosure at all — precisely what §45 forbids.
 */
export async function containsSampleData(): Promise<boolean> {
  const deals = await getDeals();
  return deals.some((d) => d.offer.dataMode === 'FIXTURE');
}
