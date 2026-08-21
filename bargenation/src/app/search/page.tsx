import type { Metadata } from 'next';
import { searchDeals } from '@/data/repository';
import { DealCard } from '@/components/deal/DealCard';
import { SearchField } from '@/components/ui/SearchField';

export const metadata: Metadata = { title: 'Search' };

export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const query = q.trim();
  const results = query ? await searchDeals(query) : [];

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-12 sm:px-8">
      <h1 className="display display-xl max-w-[14ch]">What are you shopping for?</h1>
      <div className="mt-10 max-w-[46rem]">
        <SearchField autoFocus />
      </div>

      {query && (
        <section aria-live="polite" className="mt-16">
          <p className="eyebrow text-ink-50">
            {results.length} {results.length === 1 ? 'result' : 'results'} for “{query}”
          </p>

          {results.length > 0 ? (
            <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((d) => <DealCard key={d.offer.id} deal={d} />)}
            </div>
          ) : (
            /* A real empty state, not an apology (§71). */
            <div className="mt-8 max-w-[52ch]">
              <p className="display display-lg">Nothing recorded for that yet.</p>
              <p className="mt-5 leading-relaxed text-ink-70">
                We only show things we have been tracking long enough to judge. If we are not
                watching it, we would rather say so than show you a result we cannot stand behind.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
