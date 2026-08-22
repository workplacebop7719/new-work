import Link from 'next/link';
import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { listDealSignals, memberFeaturesAvailable } from '@/data/member-repository';
import { EmptyState } from '@/components/member/EmptyState';

export const metadata: Metadata = { title: 'Deal Signals' };

export default async function DealSignalsPage() {
  const session = await readSession();
  const signals = session && memberFeaturesAvailable ? await listDealSignals(session.user.id) : [];

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-4">
        <h2 className="display display-md">Deal Signals</h2>
        <p className="max-w-[44ch] text-[0.8125rem] text-ink-50">
          Only when something meaningful changes. We would rather send nothing than send noise.
        </p>
      </div>

      {signals.length === 0 ? (
        <EmptyState
          title="No signals right now."
          body="We’ll surface something when it’s actually worth your attention — a target price hit, a real drop, or a better price somewhere else."
          action={{ href: '/app/watchlist', label: 'Your Watchlist' }}
        />
      ) : (
        <ul className="mt-8 divide-y divide-line border-t border-line">
          {signals.map((signal) => (
            <li key={signal.id} className="py-5">
              <p className="eyebrow text-ink-50">
                {new Date(signal.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                })}
                {!signal.readAt && ' · new'}
              </p>
              <p className="mt-2 text-[1rem] leading-relaxed">
                {signal.productSlug ? (
                  <Link href={`/deals/${signal.productSlug}`} className="link-grow">
                    {signal.message}
                  </Link>
                ) : (
                  signal.message
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
