import Link from 'next/link';
import type { Metadata } from 'next';
import { CATEGORIES } from '@/domain/types';
import { getDeals } from '@/data/repository';

export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const counts = new Map(
    await Promise.all(
      CATEGORIES.map(async (c) => [c.slug, (await getDeals(c.slug)).length] as const),
    ),
  );
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-12 sm:px-8">
      <h1 className="display display-xl">Browse</h1>
      <ul className="mt-12 border-t border-ink">
        {CATEGORIES.map((c) => {
          const count = counts.get(c.slug) ?? 0;
          return (
            <li key={c.slug} className="border-b border-line">
              <Link
                href={`/categories/${c.slug}`}
                className="group flex min-h-[72px] items-baseline justify-between gap-6 py-5"
              >
                <span className="display display-md group-hover:underline group-hover:underline-offset-4">
                  {c.name}
                </span>
                <span className="text-[0.8125rem] text-ink-50 tabular">
                  {count === 0 ? 'nothing tracked yet' : `${count} tracked`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
