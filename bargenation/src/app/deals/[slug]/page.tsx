import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDeal, getDeals } from '@/data/repository';
import { formatUsd } from '@/domain/types';
import { ValueIndexMark } from '@/components/deal/ValueIndexMark';
import { RecommendationMark, RecommendationLine } from '@/components/deal/RecommendationMark';
import { PriceHistoryChart } from '@/components/deal/PriceHistoryChart';
import { DealCard } from '@/components/deal/DealCard';
import { DealActions } from '@/components/deal/DealActions';
import { NoteInterest } from '@/components/member/NoteInterest';

export async function generateStaticParams() {
  return (await getDeals()).map((d) => ({ slug: d.offer.product.slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const deal = await getDeal(slug);
  if (!deal) return { title: 'Not found' };
  return {
    title: `${deal.offer.product.name} — ${deal.offer.retailer.name}`,
    description: deal.recommendation.line,
  };
}

export default async function DealPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deal = await getDeal(slug);
  if (!deal) notFound();

  const { offer } = deal;
  const index = deal.publishable && deal.index.scorable ? deal.index : null;
  const similar = (await getDeals())
    .filter((d) => d.offer.product.category === offer.product.category && d.offer.id !== offer.id)
    .slice(0, 3);

  return (
    <article className="mx-auto max-w-[1600px] px-5 pb-24 pt-10 sm:px-8">
      {/* Records nothing unless the customer is signed in AND has asked us to. */}
      <NoteInterest productSlug={offer.product.slug} />
      <nav aria-label="Breadcrumb" className="eyebrow text-ink-50">
        <Link href="/today" className="link-grow">Today</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href={`/categories/${offer.product.category}`} className="link-grow">
          {offer.product.category}
        </Link>
      </nav>

      {/* ── HEADLINE ── */}
      <header className="mt-8 grid gap-12 border-b border-ink pb-12 lg:grid-cols-[1.25fr_0.75fr] lg:gap-20">
        <div>
          <p className="eyebrow text-ink-50">{offer.retailer.name}</p>
          <h1 className="display display-xl mt-3 max-w-[18ch]">{offer.product.name}</h1>

          <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <p className="numeral text-[2.75rem] leading-none">{formatUsd(offer.priceCents)}</p>
            {deal.history && (
              <p className="text-[0.875rem] text-ink-70 tabular">
                Recorded low {formatUsd(deal.history.lowCents)} · typically{' '}
                {formatUsd(deal.history.typicalCents)}
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <RecommendationMark deal={deal} />
            {deal.urgency.note && (
              <span className="text-[0.8125rem] text-ink-70">{deal.urgency.note}</span>
            )}
          </div>

          <div className="mt-6 max-w-[46ch]">
            <RecommendationLine deal={deal} />
          </div>

          <DealActions
            offerId={offer.id}
            productSlug={offer.product.slug}
            returnTo={`/deals/${offer.product.slug}`}
          />

          {/* Outbound commerce is not built: no affiliate account, no /go route.
              A live-looking button that did nothing would breach §01. */}
          <div className="mt-10">
            <button
              type="button"
              disabled
              className="inline-flex min-h-[44px] cursor-not-allowed items-center border border-line-strong px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.04em] text-ink-50"
            >
              Go to retailer
            </button>
            <p className="mt-2.5 max-w-[42ch] text-[0.75rem] leading-snug text-ink-50">
              Outbound links are switched off. {offer.retailer.name} is a fictional retailer used
              for development, and we have no affiliate relationship to route you through.
            </p>
          </div>
        </div>

        <div className="lg:border-l lg:border-line lg:pl-14">
          <ValueIndexMark deal={deal} size="lg" />

          <dl className="mt-10 space-y-4 border-t border-line pt-6 text-[0.8125rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-50">Confidence</dt>
              <dd className="text-ink">{deal.confidence.level.toLowerCase()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-50">Observations</dt>
              <dd className="text-ink tabular">{offer.observations.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-50">Last verified</dt>
              <dd className="text-ink">
                {new Date(offer.lastVerifiedAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </dd>
            </div>
          </dl>

          {deal.confidence.reasons.length > 0 && (
            <ul className="mt-5 space-y-1.5 text-[0.75rem] leading-snug text-ink-50">
              {deal.confidence.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
        </div>
      </header>

      {/* ── WHY IT'S WORTH IT ── */}
      {(deal.recommendation.worthIt.length > 0 || deal.recommendation.againstIt.length > 0) && (
        <section aria-labelledby="why" className="grid gap-12 border-b border-line py-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 id="why" className="eyebrow text-ink-50">Why it’s worth it</h2>
            {deal.recommendation.worthIt.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {deal.recommendation.worthIt.map((r) => (
                  <li key={r} className="flex gap-3 text-[1rem] leading-relaxed">
                    <span aria-hidden="true" className="mt-[0.62em] block h-px w-4 shrink-0 bg-ink" />
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-ink-70">Nothing here argues strongly for buying today.</p>
            )}
          </div>

          {deal.recommendation.againstIt.length > 0 && (
            <div>
              <h2 className="eyebrow text-ink-50">What argues against it</h2>
              <ul className="mt-6 space-y-3">
                {deal.recommendation.againstIt.map((r) => (
                  <li key={r} className="flex gap-3 text-[1rem] leading-relaxed text-ink-70">
                    <span aria-hidden="true" className="mt-[0.62em] block h-px w-4 shrink-0 bg-line-strong" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── PRICE HISTORY ── */}
      {deal.history && (
        <section aria-labelledby="history" className="border-b border-line py-14">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="history" className="display display-md">What we’ve recorded</h2>
            <p className="text-[0.8125rem] text-ink-50 tabular">
              {deal.history.observationCount} observations
            </p>
          </div>
          <PriceHistoryChart
            observations={offer.observations}
            currentCents={offer.priceCents}
            lowCents={deal.history.lowCents}
            typicalCents={deal.history.typicalCents}
          />
        </section>
      )}

      {/* ── THE WORKING ── */}
      {index && (
        <section aria-labelledby="working" className="border-b border-line py-14">
          <h2 id="working" className="display display-md">The working</h2>
          <p className="measure mt-4 text-[0.9375rem] leading-relaxed text-ink-70">
            Each component below is measured from our own record, weighted, and added. Components
            we could not measure are excluded and the rest reweighted — which is why the weights
            here may not match the published table.
          </p>

          <table className="mt-8 w-full border-collapse text-left">
            <caption className="sr-only">Value Index components for this offer</caption>
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="eyebrow py-3 text-ink-50">Component</th>
                <th scope="col" className="eyebrow py-3 text-right text-ink-50">Measured</th>
                <th scope="col" className="eyebrow py-3 text-right text-ink-50">Weight</th>
                <th scope="col" className="eyebrow py-3 text-right text-ink-50">Points</th>
              </tr>
            </thead>
            <tbody>
              {index.contributions.map((c) => (
                <tr key={c.key} className="border-b border-line">
                  <td className="py-3 text-[0.9375rem]">
                    {c.key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  </td>
                  <td className="py-3 text-right tabular text-[0.9375rem]">{(c.value * 100).toFixed(0)}%</td>
                  <td className="py-3 text-right tabular text-[0.9375rem]">{(c.effectiveWeight * 100).toFixed(0)}%</td>
                  <td className="py-3 text-right tabular text-[0.9375rem]">{c.points.toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-4 eyebrow" colSpan={3}>Value Index</td>
                <td className="numeral py-4 text-right text-[1.5rem]">{index.score.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>

          {index.excluded.length > 0 && (
            <p className="mt-5 max-w-[60ch] text-[0.8125rem] leading-snug text-ink-50">
              Excluded because we could not measure them:{' '}
              {index.excluded
                .map((k) => k.replace(/([A-Z])/g, ' $1').toLowerCase().trim())
                .join(', ')}
              .
            </p>
          )}
        </section>
      )}

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="py-14">
          <h2 id="similar" className="display display-md">Also in {offer.product.category}</h2>
          <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((d) => <DealCard key={d.offer.id} deal={d} />)}
          </div>
        </section>
      )}
    </article>
  );
}
