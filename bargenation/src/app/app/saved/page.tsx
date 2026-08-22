import Link from 'next/link';
import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { listSaved, memberFeaturesAvailable } from '@/data/member-repository';
import { formatUsd } from '@/domain/types';
import { EmptyState } from '@/components/member/EmptyState';
import { SavedControls } from '@/components/member/SavedControls';

export const metadata: Metadata = { title: 'Saved' };

export default async function SavedPage() {
  const session = await readSession();
  const items = session && memberFeaturesAvailable ? await listSaved(session.user.id) : [];

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-4">
        <h2 className="display display-md">Saved</h2>
        <p className="max-w-[42ch] text-[0.8125rem] text-ink-50">
          Things you wanted to remember. We’re not monitoring these — that’s the Watchlist.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="You haven’t saved anything yet."
          body="Saving is just a bookmark. If you want us watching the price instead, add it to your Watchlist."
          action={{ href: '/today', label: 'See today’s deals' }}
        />
      ) : (
        <ul className="mt-8 divide-y divide-line border-t border-line">
          {items.map((item) => (
            <li key={item.offerId} className="flex flex-wrap items-baseline justify-between gap-6 py-6">
              <div className="min-w-0">
                <p className="eyebrow text-ink-50">{item.retailerName}</p>
                <p className="display display-sm mt-1.5">
                  <Link href={`/deals/${item.productSlug}`} className="link-grow">
                    {item.productName}
                  </Link>
                </p>
                <p className="numeral mt-2 text-[1.25rem]">{formatUsd(item.priceCents)}</p>
              </div>
              <SavedControls offerId={item.offerId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
