import Link from 'next/link';
import type { Metadata } from 'next';
import { getStandout, getMadeTheCut, getWeWouldHold } from '@/data/repository';
import { composeIssue } from '@/newsletter/compose';
import { emailConfigured } from '@/email/port';
import { SubscribeForm } from '@/components/newsletter/SubscribeForm';
import { issueChallenge } from '@/security/challenge';

export const metadata: Metadata = {
  title: 'The Bargenation Edit',
  description: 'What’s worth buying. What’s worth holding. What changed.',
};

/**
 * PRD §38: "The page should feel like an editorial publication, not a
 * newsletter signup form."
 *
 * So the sample issue is not a mock-up. It is composed from today's real
 * scored deals by the same function that will compose the sent issue — which
 * means what a reader sees here is exactly what they would have received.
 */
export default async function EditPage() {
  const [standout, madeTheCut, wouldHold] = await Promise.all([
    getStandout(), getMadeTheCut(), getWeWouldHold(),
  ]);

  const composition = composeIssue({
    date: new Date().toISOString().slice(0, 10),
    standout,
    madeTheCut,
    wouldHold,
  });

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-28 sm:px-8">
      <section className="border-b border-line py-20 sm:py-24">
        <span aria-hidden="true" className="block h-[3px] w-12 bg-pink" />
        <p className="eyebrow mt-8 text-ink-50">The Bargenation Edit</p>
        <h1 className="display display-hero mt-4 max-w-[16ch]">
          What’s worth buying. What’s worth holding. What changed.
        </h1>
        <p className="measure mt-10 text-[1.0625rem] leading-relaxed text-ink-70">
          A short edition of only what cleared the bar. No account needed. It should still earn its
          place in your inbox on the days you buy nothing.
        </p>
      </section>

      <div className="grid gap-16 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-24">
        {/* ── the actual issue ── */}
        <section aria-labelledby="sample">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-4">
            <h2 id="sample" className="display display-md">Today’s issue</h2>
            <p className="eyebrow text-ink-50">
              {composition.publish ? `${composition.issue.itemCount} items` : 'Not sent'}
            </p>
          </div>

          {!composition.publish ? (
            <div className="mt-10 max-w-[46ch]">
              <p className="display display-lg">No issue today.</p>
              <p className="mt-5 leading-relaxed text-ink-70">{composition.reason}</p>
              <p className="mt-4 leading-relaxed text-ink-70">
                A daily newsletter that must go out daily will eventually recommend something it
                does not believe in. On a quiet day, nothing arrives.
              </p>
            </div>
          ) : (
            <article className="mt-10">
              <p className="text-[1.0625rem] leading-relaxed text-ink">
                {composition.issue.standfirst}
              </p>

              {composition.issue.standout && (
                <section className="on-pink mt-12 px-6 py-10 sm:px-10">
                  <p className="eyebrow">Today’s Standout</p>
                  <h3 className="display display-md mt-3">
                    {composition.issue.standout.product}
                  </h3>
                  <p className="numeral mt-4 text-[1.75rem]">{composition.issue.standout.price}</p>
                  <p className="mt-4 max-w-[46ch] leading-relaxed">
                    {composition.issue.standout.line}
                  </p>
                </section>
              )}

              {composition.issue.madeTheCut.length > 0 && (
                <section className="mt-14">
                  <h3 className="eyebrow text-ink-50">Deals that made the cut</h3>
                  <ul className="mt-6 divide-y divide-line border-t border-line">
                    {composition.issue.madeTheCut.map((item) => (
                      <li key={item.slug} className="flex flex-wrap items-baseline justify-between gap-4 py-5">
                        <div className="min-w-0">
                          <p className="eyebrow text-ink-50">{item.retailer}</p>
                          <p className="display display-sm mt-1.5">
                            <Link href={`/deals/${item.slug}`} className="link-grow">
                              {item.product}
                            </Link>
                          </p>
                          <p className="mt-1.5 max-w-[52ch] text-[0.875rem] leading-snug text-ink-70">
                            {item.line}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="numeral text-[1.25rem]">{item.price}</p>
                          {item.score !== null && (
                            <p className="eyebrow mt-1 text-ink-50">{item.score.toFixed(1)} index</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {composition.issue.find && (
                <section className="mt-14 border-t border-ink pt-6">
                  <h3 className="eyebrow text-ink-50">A Bargenation Find</h3>
                  <p className="display display-sm mt-2">{composition.issue.find.product}</p>
                  <p className="mt-1.5 max-w-[52ch] text-[0.875rem] leading-snug text-ink-70">
                    {composition.issue.find.line}
                  </p>
                </section>
              )}

              {composition.issue.wouldHold.length > 0 && (
                <section className="mt-14">
                  <h3 className="eyebrow text-ink-50">What we’d hold off buying</h3>
                  <ul className="mt-6 divide-y divide-line border-t border-line">
                    {composition.issue.wouldHold.map((item) => (
                      <li key={item.slug} className="py-4">
                        <p className="display display-sm">{item.product}</p>
                        <p className="mt-1.5 max-w-[52ch] text-[0.875rem] leading-snug text-ink-70">
                          {item.line}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
          )}
        </section>

        {/* ── subscribing ── */}
        <aside className="lg:border-l lg:border-line lg:pl-16">
          <h2 className="display display-md">Get the Edit</h2>
          <div className="mt-8">
            <SubscribeForm challenge={issueChallenge('SUBSCRIBE')} source="/edit" />
          </div>

          {!emailConfigured() && (
            <p className="mt-8 max-w-[36ch] border-l-2 border-ink pl-4 text-[0.8125rem] leading-relaxed text-ink-70">
              No email provider is configured, so nothing can actually be delivered yet. The
              signup below records your request and says so rather than implying a message is on
              its way.
            </p>
          )}

          <section className="mt-14">
            <h3 className="eyebrow text-ink-50">How things get in</h3>
            <ol className="mt-5 space-y-4 text-[0.875rem] leading-relaxed text-ink-70">
              <li>
                <strong className="text-ink">It has to clear the bar.</strong> Only deals we would
                publish a score for, from prices we recorded ourselves.
              </li>
              <li>
                <strong className="text-ink">It has to be short.</strong> A handful of items at
                most. Sections with nothing in them are left out, not padded.
              </li>
              <li>
                <strong className="text-ink">Some days there is no issue.</strong> If nothing
                cleared the bar, nothing arrives.
              </li>
              <li>
                <strong className="text-ink">Nobody can buy their way in.</strong> Commission
                cannot reach a score, so it cannot reach this either.
              </li>
            </ol>
            <Link href="/disclosures" className="link-grow mt-6 inline-block text-[0.875rem] text-pink-ink">
              How we intend to make money
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
