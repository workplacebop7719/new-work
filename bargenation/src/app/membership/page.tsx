import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MEMBER_BENEFITS,
  MEMBERSHIP_NEVER,
  MEMBERSHIP_PURCHASABLE,
  monthlyPrice,
} from '@/domain/membership';

export const metadata: Metadata = {
  title: 'Membership',
  description:
    'What membership adds, what it can never buy, and why you cannot pay for it yet.',
};

/**
 * The membership page (PRD §52).
 *
 * Every number and every claim on it is read from `@/domain/membership`, so
 * the price cannot drift between this page, the account page and the portal.
 * That was the whole reason the price had been left unquoted: two founding
 * documents disagreed, and a figure repeated in prose in three components is a
 * contradiction waiting to be discovered by a customer.
 *
 * THE HARD PART OF THIS PAGE IS THE HONESTY, NOT THE LAYOUT. It quotes a real
 * price for something nobody can currently buy. The temptation is a
 * "Join" button that collects an address and calls it a waitlist, or a
 * disabled button with no explanation — both of which read as a product that
 * works and is merely busy. Instead the state is stated in the largest type on
 * the page after the price itself, with the reason: no payment provider is
 * configured, so there is nothing here that could take money.
 *
 * The second half is the part §52 exists for. A page selling a subscription is
 * exactly where a ranking boost would get quietly listed as a perk, so the
 * list of things money cannot buy is rendered at the same weight as the list
 * of things it can.
 */
export default function MembershipPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-12 sm:px-8">
      <header className="border-b border-ink pb-10">
        <p className="eyebrow text-ink-50">Membership</p>
        <h1 className="display display-hero mt-4 max-w-[15ch]">
          We watch the things you didn’t get round to watching
        </h1>
      </header>

      <div className="grid gap-16 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <div className="space-y-10">
          <section>
            <p className="eyebrow text-ink-50">The price</p>
            <p className="numeral mt-3 text-[3.5rem] leading-none tabular">{monthlyPrice()}</p>
            <p className="mt-2 text-[0.9375rem] text-ink-70">per month</p>
          </section>

          {!MEMBERSHIP_PURCHASABLE && (
            <section className="border border-ink bg-pink p-6">
              <h2 className="display display-sm">You can’t buy this yet</h2>
              <p className="measure-tight mt-3 text-[0.9375rem] leading-relaxed text-ink">
                No payment provider is connected, so there is nothing on this site that could
                take your money — and we would rather say that than show you a button that does
                nothing. The price above is decided and will not move quietly; this page is where
                it will change if it ever does.
              </p>
              <p className="measure-tight mt-3 text-[0.9375rem] leading-relaxed text-ink">
                Everything described below already works. What is missing is the checkout, the
                receipts and the cancellation route — and taking money before those exist would
                be the wrong order to build them in.
              </p>
            </section>
          )}

          <section>
            <h2 className="display display-sm">What a free account already gets</h2>
            <p className="measure-tight mt-3 leading-relaxed text-ink-70">
              All of it. Every Value Index, every Buy or Hold call, the full Watchlist, price
              history on every deal we score, and alerts that fire at the exact moment a price
              you asked about actually moves. Membership does not hold any of that back.
            </p>
            <p className="mt-4 text-[0.9375rem]">
              <Link href="/signup" className="underline underline-offset-4">
                Create a free account
              </Link>
            </p>
          </section>
        </div>

        <div className="space-y-14">
          <section>
            <h2 className="display display-md">What membership adds</h2>
            <ol className="mt-8 border-t border-ink">
              {MEMBER_BENEFITS.map((benefit) => (
                <li key={benefit.href} className="border-b border-line py-5">
                  <h3 className="text-[1.0625rem] font-semibold">{benefit.title}</h3>
                  <p className="measure-tight mt-2 text-[0.9375rem] leading-relaxed text-ink-70">
                    {benefit.detail}
                  </p>
                  <p className="mt-2 text-[0.875rem]">
                    <Link href={benefit.href} className="underline underline-offset-4">
                      {benefit.href}
                    </Link>
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="display display-md">What it can never buy</h2>
            <p className="measure-tight mt-3 leading-relaxed text-ink-70">
              Not from you, and not from a retailer either. This list is the reason the product
              is worth reading at all, so it is printed at the same size as the list above it.
            </p>
            <ul className="mt-8 border-t border-ink">
              {MEMBERSHIP_NEVER.map((item) => (
                <li key={item} className="border-b border-line py-3.5 text-[0.9375rem]">
                  {item}
                </li>
              ))}
            </ul>
            <p className="measure-tight mt-6 text-[0.9375rem] leading-relaxed text-ink-70">
              The scoring code is not given access to commercial or membership data, so none of
              the above is a policy somebody has to remember — there is no parameter through
              which it could be expressed. See{' '}
              <Link href="/how-it-works" className="underline underline-offset-4">
                how it works
              </Link>{' '}
              and{' '}
              <Link href="/disclosures" className="underline underline-offset-4">
                our disclosures
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
