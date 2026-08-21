import Link from 'next/link';
import { getStandout, getMadeTheCut, getWeWouldHold, getWithheld } from '@/data/repository';
import { DealCard } from '@/components/deal/DealCard';
import { ValueIndexMark } from '@/components/deal/ValueIndexMark';
import { RecommendationMark } from '@/components/deal/RecommendationMark';
import { NotBuiltYet } from '@/components/ui/NotBuiltYet';
import { Hero } from '@/components/chrome/Hero';
import { formatUsd, CATEGORIES } from '@/domain/types';
import { WEIGHTS } from '@/domain/value-index';

export default async function HomePage() {
  const [standout, allCut, allHold, withheld] = await Promise.all([
    getStandout(),
    getMadeTheCut(),
    getWeWouldHold(),
    getWithheld(),
  ]);
  const cut = allCut.slice(0, 6);
  const hold = allHold.slice(0, 3);

  return (
    <>
      <Hero />

      {/* ── TODAY'S STANDOUT ─────────────────────────────────── */}
      {standout ? (
        <section aria-labelledby="standout" className="on-pink">
          <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 sm:py-24">
            <div className="flex items-baseline justify-between gap-6 border-b border-ink/25 pb-5">
              <h2 id="standout" className="eyebrow">Today’s Standout</h2>
              <p className="eyebrow opacity-60">One a day, at most</p>
            </div>

            <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_auto] lg:gap-20">
              <div className="max-w-[36rem]">
                <p className="eyebrow opacity-70">{standout.offer.retailer.name}</p>
                <h3 className="display display-xl mt-3">{standout.offer.product.name}</h3>

                <p className="numeral mt-8 text-[2.75rem] leading-none">
                  {formatUsd(standout.offer.priceCents)}
                </p>

                <ul className="mt-8 space-y-2.5">
                  {standout.recommendation.worthIt.map((reason) => (
                    <li key={reason} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                      <span aria-hidden="true" className="mt-[0.6em] block h-px w-4 shrink-0 bg-ink" />
                      {reason}
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    href={`/deals/${standout.offer.product.slug}`}
                    className="inline-flex min-h-[44px] items-center bg-ink px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.04em] text-white transition-opacity duration-[--dur-micro] hover:opacity-80"
                  >
                    See the working
                  </Link>
                  <RecommendationMark deal={standout} className="border-ink" />
                </div>
              </div>

              <div className="lg:border-l lg:border-ink/25 lg:pl-20">
                <ValueIndexMark deal={standout} size="lg" />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section aria-labelledby="standout" className="border-y border-ink">
          <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8">
            <h2 id="standout" className="eyebrow text-ink-50">Today’s Standout</h2>
            <p className="display display-lg mt-4 max-w-[20ch]">
              Nothing earned Standout status today.
            </p>
            <p className="measure mt-5 text-ink-70">
              We would rather leave this empty than promote something that hasn’t earned it.
            </p>
          </div>
        </section>
      )}

      {/* ── DEALS THAT MADE THE CUT ──────────────────────────── */}
      <section aria-labelledby="cut" className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-5">
          <h2 id="cut" className="display display-md">Deals that made the cut</h2>
          <Link href="/today" className="link-grow text-[0.875rem] text-pink-ink">
            All of today’s
          </Link>
        </div>

        <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {cut.map((deal) => (
            <DealCard key={deal.offer.id} deal={deal} />
          ))}
        </div>
      </section>

      {/* ── WHAT WE'D HOLD ───────────────────────────────────── */}
      {hold.length > 0 && (
        <section aria-labelledby="hold" className="border-y border-line bg-wash">
          <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <h2 id="hold" className="display display-md max-w-[14ch]">What we’d hold off buying</h2>
                <p className="measure-tight mt-5 text-[0.9375rem] leading-relaxed text-ink-70">
                  A shopping site that only ever says buy is an advertisement. These are on
                  promotion right now and we still wouldn’t.
                </p>
              </div>

              <ul className="divide-y divide-line border-t border-line">
                {hold.map((deal) => (
                  <li key={deal.offer.id}>
                    <Link
                      href={`/deals/${deal.offer.product.slug}`}
                      className="group flex items-baseline justify-between gap-6 py-5"
                    >
                      <div className="min-w-0">
                        <p className="eyebrow text-ink-50">{deal.offer.retailer.name}</p>
                        <p className="display display-sm mt-1.5 group-hover:underline group-hover:underline-offset-4">
                          {deal.offer.product.name}
                        </p>
                        <p className="mt-2 max-w-[46ch] text-[0.8125rem] leading-snug text-ink-70">
                          {deal.recommendation.againstIt[0] ?? deal.recommendation.line}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="numeral text-[1.25rem] leading-none">
                          {deal.index.scorable ? deal.index.score.toFixed(1) : '—'}
                        </p>
                        <p className="eyebrow mt-2 text-ink-50">{deal.recommendation.label}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ── THE ARITHMETIC ───────────────────────────────────── */}
      <section aria-labelledby="method" className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 id="method" className="display display-md max-w-[16ch]">
              The number is arithmetic, and we publish it
            </h2>
            <p className="measure-tight mt-6 text-[0.9375rem] leading-relaxed text-ink-70">
              Eight components, fixed weights, one decimal. A component we can’t measure is
              dropped and the rest are reweighted — missing evidence lowers our stated confidence,
              it never quietly improves a score.
            </p>
            <p className="measure-tight mt-4 text-[0.9375rem] leading-relaxed text-ink-70">
              Commission is not one of the eight. It cannot be, because the scoring code is not
              given access to it.
            </p>
            <Link href="/how-it-works" className="link-grow mt-7 inline-block text-[0.875rem] text-pink-ink">
              How the Value Index is calculated
            </Link>
          </div>

          <ol className="border-t border-ink">
            {(Object.entries(WEIGHTS) as [string, number][]).map(([key, weight]) => (
              <li
                key={key}
                className="flex items-baseline justify-between gap-6 border-b border-line py-3.5"
              >
                <span className="text-[0.9375rem] text-ink">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                </span>
                <span className="numeral shrink-0 text-[1.125rem] text-ink tabular">
                  {Math.round(weight * 100)}%
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── WITHHELD ─────────────────────────────────────────── */}
      {withheld.length > 0 && (
        <section aria-labelledby="withheld" className="border-t border-line">
          <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8">
            <h2 id="withheld" className="eyebrow text-ink-50">Not scored yet</h2>
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {withheld.map((deal) => (
                <div key={deal.offer.id} className="border-t border-ink pt-4">
                  <p className="eyebrow text-ink-50">{deal.offer.retailer.name}</p>
                  <p className="display display-sm mt-1.5">{deal.offer.product.name}</p>
                  <p className="mt-2 max-w-[40ch] text-[0.8125rem] leading-snug text-ink-70">
                    {deal.withheldReason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CATEGORIES ───────────────────────────────────────── */}
      <section aria-labelledby="cats" className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8">
        <h2 id="cats" className="eyebrow text-ink-50">Browse</h2>
        <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link href={`/categories/${c.slug}`} className="display display-sm link-grow text-ink">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── THE EDIT ─────────────────────────────────────────── */}
      <section aria-labelledby="edit" className="border-t border-ink bg-pink-wash">
        <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h2 id="edit" className="eyebrow text-ink-50">The Bargenation Edit</h2>
              <p className="display display-lg mt-4 max-w-[18ch]">
                What’s worth buying. What’s worth holding. What changed.
              </p>
            </div>
            <div>
              <p className="measure-tight text-[0.9375rem] leading-relaxed text-ink-70">
                A short edition of only what cleared the bar. No account needed, and it still
                earns its place in your inbox on the days you buy nothing.
              </p>
              <NotBuiltYet
                label="Get the Edit"
                reason="Not built yet — sending email needs a provider credential we don't have."
                className="mt-7"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
