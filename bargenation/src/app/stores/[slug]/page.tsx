import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRetailers } from '@/data/repository';
import { getRetailerView } from '@/data/retailer-view';
import { MIN_OFFERS_FOR_VERDICT } from '@/domain/retailer-profile';
import { DealCard } from '@/components/deal/DealCard';
import { RetailerVerdictMark } from '@/components/retailer/RetailerVerdictMark';
import { WatchRetailer } from '@/components/retailer/WatchRetailer';

export async function generateStaticParams() {
  return (await getRetailers()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const view = await getRetailerView(slug);
  if (!view) return { title: 'Not found' };
  return { title: view.retailer.name, description: view.profile.summary };
}

/**
 * RETAILER PROFILE (PRD §43, §45, §52).
 *
 * The most consequential page on the site, because it is the only one that
 * publishes a judgement about a named business. Three rules follow from that
 * and shape everything below:
 *
 *   The evidence is not a footnote. Counts and observation totals sit beside
 *   the verdict at the same weight, so nobody reads the verdict without also
 *   reading how much it rests on.
 *
 *   Silence is a legitimate answer, rendered as loudly as any other. Most
 *   retailers here will sit under the evidence threshold for a long time.
 *
 *   The commercial relationship is stated on the page, not buried in
 *   /disclosures — a verdict about a business we might earn money from is
 *   only trustworthy if you can see that from where you are standing.
 */
export default async function RetailerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await getRetailerView(slug);
  if (!view) notFound();

  const { retailer, deals, profile } = view;
  const hasVerdict = profile.verdict !== 'NOT_ENOUGH_EVIDENCE';
  const isFixture = deals.some((d) => d.offer.dataMode === 'FIXTURE');

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-10 sm:px-8">
      <nav aria-label="Breadcrumb" className="eyebrow text-ink-50">
        <Link href="/today" className="link-grow">Today</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href="/stores" className="link-grow">Retailers</Link>
      </nav>

      {/* ── HEADLINE ── */}
      <header className="mt-8 grid gap-12 border-b border-ink pb-12 lg:grid-cols-[1.25fr_0.75fr] lg:gap-20">
        <div>
          <p className="eyebrow text-ink-50">Retailer</p>
          <h1 className="display display-xl mt-3 max-w-[16ch]">{retailer.name}</h1>

          <div className="mt-8">
            <RetailerVerdictMark verdict={profile.verdict} />
          </div>

          <p className="measure mt-6 text-[1.0625rem] leading-relaxed text-ink">
            {profile.summary}
          </p>

          {!hasVerdict && (
            <p className="measure mt-4 text-[0.875rem] leading-relaxed text-ink-70">
              We publish a verdict once we have scored at least {MIN_OFFERS_FOR_VERDICT} offers at
              a retailer. Below that, anything we said about how this business prices would be a
              guess wearing the clothes of a finding.
            </p>
          )}

          <WatchRetailer retailerSlug={retailer.slug} returnTo={`/stores/${retailer.slug}`} />

          {/* Stated here, not only on /disclosures (§52). */}
          <p className="measure mt-10 border-t border-line pt-5 text-[0.8125rem] leading-relaxed text-ink-70">
            {retailer.verifiedPartner
              ? `We have a commercial relationship with ${retailer.name}. It has no input into the figures on this page: commission cannot reach a Value Index, a Buy / Hold call, or this verdict.`
              : `We have no commercial relationship with ${retailer.name}, and no retailer can pay for a verdict, a placement or a score.`}
            {isFixture &&
              ` ${retailer.name} is a fictional retailer used for development — the figures below are computed from synthetic price history and describe nobody real.`}
          </p>
        </div>

        {/* ── THE EVIDENCE ── */}
        <div className="lg:border-l lg:border-line lg:pl-14">
          <h2 className="eyebrow text-ink-50">What this rests on</h2>
          <dl className="mt-6 space-y-4 border-t border-line pt-6 text-[0.8125rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-50">Offers tracked</dt>
              <dd className="text-ink tabular">{profile.offersTracked}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-50">Of those, scored</dt>
              <dd className="text-ink tabular">{profile.offersScored}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-50">At their recorded low</dt>
              <dd className="text-ink tabular">{profile.atRecordedLow}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-50">We’d hold off on</dt>
              <dd className="text-ink tabular">{profile.wouldHold}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-50">Median Value Index</dt>
              <dd className="text-ink tabular">
                {profile.medianIndex === null ? 'not published' : profile.medianIndex.toFixed(1)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-50">Price checks behind it</dt>
              <dd className="text-ink tabular">{profile.observations}</dd>
            </div>
          </dl>
          <p className="mt-5 text-[0.75rem] leading-snug text-ink-50">
            Offers we track but cannot yet score are counted above and excluded from the verdict.
          </p>
        </div>
      </header>

      {/* ── WHAT WE TRACK HERE ── */}
      <section aria-labelledby="tracked" className="py-14">
        <h2 id="tracked" className="display display-md">
          What we’re tracking at {retailer.name}
        </h2>
        {deals.length > 0 ? (
          <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => (
              <DealCard key={d.offer.id} deal={d} showRetailer={false} />
            ))}
          </div>
        ) : (
          <p className="measure mt-6 leading-relaxed text-ink-70">
            We have nothing on record here yet. This retailer exists in our catalogue but no offer
            of theirs has enough price history behind it for us to show you anything honest.
          </p>
        )}
      </section>
    </div>
  );
}
