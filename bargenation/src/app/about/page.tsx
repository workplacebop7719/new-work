import type { Metadata } from 'next';
import Link from 'next/link';
import { WEIGHTS } from '@/domain/value-index';
import { MIN_OBSERVATIONS } from '@/domain/price-history';

export const metadata: Metadata = {
  title: 'About',
  description: 'Why Bargenation exists, and what it refuses to do.',
};

const FURTHER_READING = [
  { href: '/disclosures', label: 'How we intend to make money' },
  { href: '/privacy', label: 'What we collect' },
  { href: '/contact', label: 'Contact' },
] as const;

/**
 * PRD §73: no fabricated social proof. There are no testimonials here, no
 * press logos, no customer counts and no founder photograph, because none of
 * those exist. What there is instead is an argument, which is the only thing
 * we actually have at this stage.
 */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-28 sm:px-8">
      <section className="border-b border-line py-20 sm:py-28">
        <span aria-hidden="true" className="block h-[3px] w-12 bg-pink" />
        <h1 className="display display-hero mt-8 max-w-[15ch]">
          Most of what a sale tells you is about the sale.
        </h1>
        <p className="measure mt-10 text-[1.125rem] leading-[1.7] text-ink-70">
          Forty percent off means nothing without knowing forty percent off what. Retailers set
          the reference price, run the promotion, and describe the result. Every part of that
          sentence belongs to the seller.
        </p>
      </section>

      <section className="grid gap-14 border-b border-line py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <div>
          <h2 className="eyebrow text-ink-50">What we do instead</h2>
          <p className="display display-md mt-4 max-w-[16ch]">We keep our own record.</p>
        </div>
        <div>
          <p className="measure text-[1.0625rem] leading-relaxed text-ink-70">
            We check prices repeatedly over months and keep every observation. Then we score
            today’s price against that record — not against a claim about it. Below{' '}
            {MIN_OBSERVATIONS} observations we decline to describe a price history at all, because
            we would be guessing.
          </p>
          <p className="measure mt-5 text-[1.0625rem] leading-relaxed text-ink-70">
            The score is arithmetic. {Object.keys(WEIGHTS).length} components, fixed weights, one
            decimal, and the whole calculation is published on every deal page — including the
            components we could not measure.
          </p>
          <Link href="/how-it-works" className="link-grow mt-8 inline-block text-pink-ink">
            The method in full
          </Link>
        </div>
      </section>

      <section className="on-pink my-20">
        <div className="px-6 py-16 sm:px-14 sm:py-20">
          <h2 className="display display-lg max-w-[20ch]">
            A shopping site that only ever says buy is an advertisement.
          </h2>
          <p className="mt-8 max-w-[52ch] text-[1.0625rem] leading-relaxed">
            So we say Hold. We say Skip. Some days nothing earns Today’s Standout and the space
            sits empty rather than being filled with the least bad option.
          </p>
          <Link
            href="/today"
            className="mt-10 inline-flex min-h-[44px] items-center bg-ink px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-white hover:opacity-80"
          >
            See what we would hold today
          </Link>
        </div>
      </section>

      <section className="border-b border-line pb-20">
        <h2 className="eyebrow text-ink-50">Things we will not do</h2>
        <ol className="mt-10 border-t border-ink">
          {[
            ['Invent a number', 'No price, discount, deadline or stock level we have not observed. Unknown stays unknown, and the page says so.'],
            ['Let money move a score', 'The scoring code has no parameter through which commission could arrive, and no permission to read one.'],
            ['Manufacture urgency', 'If we do not know when an offer ends, we do not imply it is ending.'],
            ['Show proof we do not have', 'No testimonials, no press logos, no customer counts. When those are real they will appear.'],
            ['Collect what we do not need', 'There is nowhere in our database for a child’s legal name, date of birth, school or address.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-6 border-b border-line py-6 sm:gap-10">
              <span className="numeral shrink-0 text-[1.25rem] text-ink-50 tabular">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="display display-sm">{title}</h3>
                <p className="mt-2 max-w-[56ch] text-[0.9375rem] leading-relaxed text-ink-70">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-20">
        <h2 className="eyebrow text-ink-50">Where this is up to</h2>
        <p className="measure mt-6 text-[1.0625rem] leading-relaxed text-ink-70">
          Bargenation is being built and is not trading. Every retailer and price you can see is
          fictional development data, labelled at the top of every page. There is no company
          behind it yet, which is why the legal pages have gaps where a company’s details belong.
        </p>
        <p className="measure mt-5 text-[1.0625rem] leading-relaxed text-ink-70">
          We would rather show that plainly than dress an unfinished product as a finished one.
        </p>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
          {FURTHER_READING.map(({ href, label }) => (
            <Link key={href} href={href} className="link-grow text-[0.9375rem] text-pink-ink">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
