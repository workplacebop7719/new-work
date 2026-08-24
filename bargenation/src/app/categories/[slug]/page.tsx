import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CATEGORIES, type CategorySlug } from '@/domain/types';
import { getDeals } from '@/data/repository';
import { sortDeals, toSortKey } from '@/data/repository-types';
import { DealCard } from '@/components/deal/DealCard';
import { SortControl } from '@/components/deal/SortControl';

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  return { title: cat?.name ?? 'Category' };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const [{ slug }, { sort }] = await Promise.all([params, searchParams]);
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) notFound();

  const order = toSortKey(sort);
  const deals = sortDeals(await getDeals(cat.slug as CategorySlug), order);

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-12 sm:px-8">
      <header className="border-b border-ink pb-8">
        <p className="eyebrow text-ink-50">Category</p>
        <h1 className="display display-hero mt-3">{cat.name}</h1>
      </header>

      {deals.length > 0 ? (
        <>
          <div className="mt-6 border-b border-line pb-4">
            <SortControl current={order} count={deals.length} />
          </div>
          <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => <DealCard key={d.offer.id} deal={d} />)}
          </div>
        </>
      ) : (
        <div className="mt-14 max-w-[52ch]">
          <p className="display display-lg">We’re not tracking anything here yet.</p>
          <p className="mt-5 leading-relaxed text-ink-70">
            This category is live in the product but has no recorded price history behind it, so
            there is nothing we can honestly score.
          </p>
        </div>
      )}
    </div>
  );
}
