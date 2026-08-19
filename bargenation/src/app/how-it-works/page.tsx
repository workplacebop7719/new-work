import type { Metadata } from 'next';
import { WEIGHTS, BANDS, BAND_LABEL } from '@/domain/value-index';
import { MIN_OBSERVATIONS, FULL_DISCOUNT_AT } from '@/domain/price-history';
import { MIN_COVERAGE_TO_PUBLISH } from '@/domain/confidence';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'The Value Index is arithmetic. Here is the arithmetic.',
};

/**
 * This page reads its numbers from the engine rather than restating them in
 * prose, so the documentation cannot drift away from the implementation.
 */
export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-12 sm:px-8">
      <header className="border-b border-ink pb-10">
        <h1 className="display display-hero max-w-[13ch]">How we decide what’s worth it</h1>
      </header>

      <div className="grid gap-16 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <div className="space-y-10">
          <section>
            <h2 className="eyebrow text-ink-50">01 — We record</h2>
            <p className="measure-tight mt-4 leading-relaxed text-ink-70">
              We check prices repeatedly over months and keep every observation. A retailer’s
              “was” price is a claim, not evidence, so we never score against it. Below{' '}
              {MIN_OBSERVATIONS} observations we decline to describe a price history at all.
            </p>
          </section>
          <section>
            <h2 className="eyebrow text-ink-50">02 — We score</h2>
            <p className="measure-tight mt-4 leading-relaxed text-ink-70">
              Eight components, fixed weights, one decimal. A discount reaching{' '}
              {Math.round(FULL_DISCOUNT_AT * 100)}% below the price we typically record counts as
              full Discount Strength.
            </p>
          </section>
          <section>
            <h2 className="eyebrow text-ink-50">03 — We say when we can’t</h2>
            <p className="measure-tight mt-4 leading-relaxed text-ink-70">
              A component we cannot measure is dropped and the rest reweighted. If that leaves us
              under {Math.round(MIN_COVERAGE_TO_PUBLISH * 100)}% of the model — or with no price
              history at all — we publish no Index and say so. An empty space is more useful than
              a confident guess.
            </p>
          </section>
          <section>
            <h2 className="eyebrow text-ink-50">04 — Money stays out</h2>
            <p className="measure-tight mt-4 leading-relaxed text-ink-70">
              Commission is not one of the eight components, and the scoring code is not given
              access to commercial data. A retailer that pays us nothing is scored identically to
              one that pays us well.
            </p>
          </section>
        </div>

        <div className="space-y-14">
          <section>
            <h2 className="display display-md">The eight components</h2>
            <ol className="mt-8 border-t border-ink">
              {(Object.entries(WEIGHTS) as [string, number][]).map(([key, weight]) => (
                <li key={key} className="flex items-baseline justify-between gap-6 border-b border-line py-3.5">
                  <span className="text-[0.9375rem]">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                  </span>
                  <span className="numeral text-[1.125rem] tabular">{Math.round(weight * 100)}%</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="display display-md">What the number means</h2>
            <ol className="mt-8 border-t border-ink">
              {BANDS.map((b, i) => {
                const upper = i === 0 ? 10 : (BANDS[i - 1]?.min ?? 10) - 0.1;
                return (
                  <li key={b.band} className="flex items-baseline justify-between gap-6 border-b border-line py-3.5">
                    <span className="eyebrow">{BAND_LABEL[b.band]}</span>
                    <span className="numeral text-[1.125rem] tabular">
                      {b.min.toFixed(1)}–{upper.toFixed(1)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
