import Link from 'next/link';
import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { listWatchlist, memberFeaturesAvailable } from '@/data/member-repository';
import { formatUsd } from '@/domain/types';
import { EmptyState } from '@/components/member/EmptyState';
import { WatchlistControls } from '@/components/member/WatchlistControls';

export const metadata: Metadata = { title: 'Watchlist' };

const STATE_LABEL: Record<string, string> = {
  WATCHING: 'Watching',
  PRICE_DROPPED: 'Price dropped',
  MATCH_FOUND: 'Match found',
  BUY: 'Worth buying',
  HOLD: 'We’d hold',
  BACK_IN_STOCK: 'Back in stock',
  OUT_OF_STOCK: 'Out of stock',
  EXPIRED: 'Expired',
};

export default async function WatchlistPage() {
  const session = await readSession();
  const items = session && memberFeaturesAvailable ? await listWatchlist(session.user.id) : [];

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-4">
        <h2 className="display display-md">Watchlist</h2>
        <p className="text-[0.8125rem] text-ink-50">
          Things we’re keeping an eye on for you.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing on your Watchlist yet."
          body="Add something you’re considering and we’ll keep an eye on the price. We’ll only tell you when something actually changes."
          action={{ href: '/today', label: 'See today’s deals' }}
        />
      ) : (
        <ul className="mt-8 divide-y divide-line border-t border-line">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-6 py-6">
              <div className="min-w-0">
                <p className="eyebrow text-ink-50">
                  {STATE_LABEL[item.state] ?? item.state}
                  {item.paused && ' · paused'}
                </p>
                <p className="display display-sm mt-1.5">
                  {item.productSlug ? (
                    <Link href={`/deals/${item.productSlug}`} className="link-grow">
                      {item.productName}
                    </Link>
                  ) : (
                    item.keyword
                  )}
                </p>
                <p className="mt-2 text-[0.8125rem] text-ink-70">
                  {item.targetPriceCents
                    ? `Tell me under ${formatUsd(item.targetPriceCents)}`
                    : 'No target price set — we’ll flag anything unusually strong.'}
                  {item.size && ` · size ${item.size}`}
                </p>
              </div>
              <WatchlistControls itemId={item.id} paused={item.paused} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
