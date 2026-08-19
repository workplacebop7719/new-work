import type { Metadata } from 'next';
import Link from 'next/link';
import { getStandout, getMadeTheCut, getWeWouldHold, getWithheld, getDeals } from '@/data/repository';
import { DealCard } from '@/components/deal/DealCard';
import { ValueIndexMark } from '@/components/deal/ValueIndexMark';
import { RecommendationMark } from '@/components/deal/RecommendationMark';
import { formatUsd } from '@/domain/types';

export const metadata: Metadata = {
  title: 'Today',
  description: 'Only what cleared the bar today — and what we would hold off buying.',
};

export default function TodayPage() {
  const standout = getStandout();
  const cut = getMadeTheCut();
  const hold = getWeWouldHold();
  const withheld = getWithheld();
  const total = getDeals().length;

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-20 pt-12 sm:px-8">
      <header className="border-b border-ink pb-8">
        <h1 className="display display-xl max-w-[14ch]">Today on Bargenation</h1>
        <p className="measure mt-5 text-[1rem] leading-relaxed text-ink-70">
          We checked {total} offers. {cut.length} cleared the bar, {hold.length} did not, and{' '}
          {withheld.length} we are not scoring yet. There is no target number here — some days
          this page is short.
        </p>
      </header>

      {standout && (
        <section aria-labelledby="standout" className="on-pink mt-12">
          <div className="grid gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[1fr_auto] lg:gap-16">
            <div>
              <p className="eyebrow">Today’s Standout</p>
              <p className="eyebrow mt-6 opacity-70">{standout.offer.retailer.name}</p>
              <h2 className="display display-lg mt-2">{standout.offer.product.name}</h2>
              <p className="numeral mt-6 text-[2.25rem] leading-none">
                {formatUsd(standout.offer.priceCents)}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={`/deals/${standout.offer.product.slug}`}
                  className="inline-flex min-h-[44px] items-center bg-ink px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.04em] text-white hover:opacity-80"
                >
                  See the working
                </Link>
                <RecommendationMark deal={standout} className="border-ink" />
              </div>
            </div>
            <div className="lg:border-l lg:border-ink/25 lg:pl-16">
              <ValueIndexMark deal={standout} size="md" />
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="cut" className="mt-20">
        <h2 id="cut" className="display display-md border-b border-ink pb-4">
          Deals that made the cut
        </h2>
        <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {cut.map((d) => <DealCard key={d.offer.id} deal={d} />)}
        </div>
      </section>

      {hold.length > 0 && (
        <section aria-labelledby="hold" className="mt-24">
          <h2 id="hold" className="display display-md border-b border-ink pb-4">
            What we’d hold off buying
          </h2>
          <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {hold.map((d) => <DealCard key={d.offer.id} deal={d} />)}
          </div>
        </section>
      )}

      {withheld.length > 0 && (
        <section aria-labelledby="withheld" className="mt-24 border-t border-line pt-10">
          <h2 id="withheld" className="eyebrow text-ink-50">Not scored yet</h2>
          <ul className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {withheld.map((d) => (
              <li key={d.offer.id} className="border-t border-ink pt-4">
                <p className="eyebrow text-ink-50">{d.offer.retailer.name}</p>
                <p className="display display-sm mt-1.5">{d.offer.product.name}</p>
                <p className="mt-2 text-[0.8125rem] leading-snug text-ink-70">{d.withheldReason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
