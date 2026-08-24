import Link from 'next/link';
import type { Metadata } from 'next';
import { searchDeals } from '@/data/repository';
import { sortDeals, toSortKey } from '@/data/repository-types';
import { CATEGORIES } from '@/domain/types';
import { DealCard } from '@/components/deal/DealCard';
import { SortControl } from '@/components/deal/SortControl';
import { SearchField } from '@/components/ui/SearchField';

export const metadata: Metadata = { title: 'Search' };

export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const { q = '', sort } = await searchParams;
  const query = q.trim();
  const order = toSortKey(sort);
  const results = query ? sortDeals(await searchDeals(query), order) : [];

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-12 sm:px-8">
      <h1 className="display display-xl max-w-[14ch]">What are you shopping for?</h1>
      <div className="mt-10 max-w-[46rem]">
        <SearchField autoFocus />
      </div>

      {query && (
        <section aria-live="polite" className="mt-16">
          <p className="eyebrow text-ink-50">
            Results for “{query}”
          </p>

          {results.length > 0 ? (
            <>
              <div className="mt-4 border-b border-line pb-4">
                <SortControl current={order} count={results.length} />
              </div>
              <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((d) => <DealCard key={d.offer.id} deal={d} />)}
              </div>
            </>
          ) : (
            /*
             * A real empty state, not an apology (§71) — and not a dead end.
             * This used to explain why there was nothing and stop there, which
             * left somebody staring at a page with nowhere to go but Back.
             */
            <div className="mt-8">
              <p className="display display-lg max-w-[20ch]">Nothing recorded for that yet.</p>
              <p className="measure mt-5 leading-relaxed text-ink-70">
                We only show things we have been tracking long enough to judge. If we are not
                watching it, we would rather say so than show you a result we cannot stand behind.
              </p>

              <p className="eyebrow mt-12 text-ink-50">What we are tracking</p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                {CATEGORIES.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/categories/${category.slug}`}
                      className="link-grow text-[0.9375rem] text-ink"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-[0.875rem] text-ink-70">
                Or see{' '}
                <Link href="/today" className="link-grow text-pink-ink">what made the cut today</Link>.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
