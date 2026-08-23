import Link from 'next/link';
import type { Metadata } from 'next';
import { listRetailerViews } from '@/data/retailer-view';
import { RetailerVerdictMark } from '@/components/retailer/RetailerVerdictMark';

export const metadata: Metadata = {
  title: 'Retailers',
  description:
    'How the retailers we track have actually priced, measured against our own record rather than their marketing.',
};

/**
 * RETAILER INDEX (PRD §43, §52).
 *
 * Deliberately alphabetical. Any other order — by verdict, by how well they
 * score, by how much we track — would read as a ranking, and a ranking of
 * retailers on a site that earns commission is exactly the thing §52 forbids
 * anyone from being able to buy. Alphabetical cannot be sold.
 *
 * The counts beside each name are the honest measure of how much we can say,
 * and most of them are small. That is the point: showing "3 offers tracked"
 * next to a store is what stops the verdict beside it from reading as a
 * survey of the whole business.
 */
export default async function RetailersPage() {
  const views = await listRetailerViews();
  const judged = views.filter((v) => v.profile.verdict !== 'NOT_ENOUGH_EVIDENCE').length;

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-12 sm:px-8">
      <header className="border-b border-ink pb-10">
        <p className="eyebrow text-ink-50">Retailers</p>
        <h1 className="display display-xl mt-3">The stores we watch</h1>
        <p className="measure mt-6 text-[1rem] leading-relaxed text-ink-70">
          Every figure here comes from prices we recorded ourselves. We do not read a retailer’s
          own “was” price, and we do not take their word for what a sale is worth. Where we have
          not watched a store long enough to say something defensible, we say that instead.
        </p>

        {/* An earlier draft was headlined "Who actually discounts" over six rows
            all reading NO VERDICT YET. The page cannot promise an answer the
            record does not yet support, so it states where it actually stands. */}
        {judged === 0 && (
          <p className="measure mt-5 text-[0.9375rem] leading-relaxed text-ink">
            Right now that is all of them. We are not yet tracking enough offers at any one store
            to characterise how it prices, so every row below says so.
          </p>
        )}
      </header>

      <ul className="mt-4 border-b border-line">
        {views.map(({ retailer, profile }) => (
          <li key={retailer.slug} className="border-t border-line">
            <Link
              href={`/stores/${retailer.slug}`}
              className="group flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 py-6"
            >
              <span className="min-w-0">
                <span className="display display-md block group-hover:underline group-hover:underline-offset-4">
                  {retailer.name}
                </span>
                <span className="mt-2 block text-[0.8125rem] text-ink-70 tabular">
                  {profile.offersTracked === 0
                    ? 'nothing tracked yet'
                    : `${profile.offersTracked} ${profile.offersTracked === 1 ? 'offer' : 'offers'} tracked · ${profile.observations} price checks`}
                </span>
              </span>
              <RetailerVerdictMark verdict={profile.verdict} className="shrink-0" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="measure mt-10 text-[0.8125rem] leading-relaxed text-ink-50">
        Listed alphabetically. This is not a ranking, and no retailer can pay to appear here, to
        move within this list, or to change a verdict.
      </p>
    </div>
  );
}
