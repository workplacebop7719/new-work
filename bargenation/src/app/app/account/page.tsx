import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { memberFeaturesAvailable, readMembership, readQuietHours } from '@/data/member-repository';
import { monthlyPrice } from '@/domain/membership';
import { QuietHoursForm } from '@/components/member/QuietHoursForm';
import { auth } from '@/auth';
import Link from 'next/link';

/** Shared look for the links that now do something. */
const action =
  'inline-flex min-h-[44px] items-center border border-ink px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white';

export const metadata: Metadata = { title: 'Account' };

/**
 * PRD §37. Everything listed there that is not built is stated as such rather
 * than rendered as a control that does nothing (§01).
 */
export default async function AccountPage() {
  const session = await readSession();
  if (!session) return null; // the layout has already redirected

  const { user } = session;
  const provider = auth().name;
  const [membership, quietHours] = memberFeaturesAvailable
    ? await Promise.all([readMembership(user.id), readQuietHours(user.id)])
    : (['FREE', null] as const);

  return (
    <div className="max-w-[46rem] space-y-14">
      <section>
        <h2 className="display display-md border-b border-line pb-4">Profile</h2>
        <dl className="mt-6 space-y-4 text-[0.9375rem]">
          <div className="flex justify-between gap-6 border-b border-line pb-4">
            <dt className="text-ink-50">Name</dt>
            <dd>{user.displayName ?? 'Not set'}</dd>
          </div>
          <div className="flex justify-between gap-6 border-b border-line pb-4">
            <dt className="text-ink-50">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-ink-50">Email confirmed</dt>
            <dd>{user.emailVerified ? 'Yes' : 'Not yet'}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="display display-md border-b border-line pb-4">Security</h2>
        <div className="mt-6 flex flex-wrap items-start gap-6">
          <Link href="/app/account/password" className={action}>
            Change password
          </Link>
          <Link href="/app/account/sessions" className={action}>
            Sign out everywhere
          </Link>
        </div>
      </section>

      <section>
        <h2 className="display display-md border-b border-line pb-4">Privacy</h2>
        <p className="measure mt-5 text-[0.9375rem] leading-relaxed text-ink-70">
          We hold your email, an optional display name, and whatever you choose to add about your
          household — a nickname, a birth year, sizes. We never asked for a child’s legal name,
          date of birth, school or address, and there is nowhere in the database to put them.
        </p>
        <div className="mt-6 flex flex-wrap items-start gap-6">
          {/* A plain link, not fetch-and-save: the response carries
              Content-Disposition, so the browser writes the file itself. */}
          <a href="/app/account/export" className={action} download>
            Export my data
          </a>
          <Link
            href="/app/account/delete"
            className="inline-flex min-h-[44px] items-center border border-line-strong px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-ink-70 transition-colors duration-[--dur-micro] hover:border-ink hover:text-ink"
          >
            Delete account
          </Link>
        </div>
        <p className="mt-4 max-w-[52ch] text-[0.75rem] leading-snug text-ink-50">
          The export is a JSON file of everything your account holds — profile, household,
          Watchlist, Saved items and every Deal Signal we have sent you.
        </p>
      </section>

      <section>
        <h2 className="display display-md border-b border-line pb-4">When we can reach you</h2>
        <div className="mt-6">
          <QuietHoursForm current={quietHours} />
        </div>
      </section>

      <section>
        <h2 className="display display-md border-b border-line pb-4">Membership</h2>
        <p className="measure mt-5 text-[0.9375rem] leading-relaxed text-ink-70">
          {membership === 'MEMBER'
            ? 'Your account is marked as a member, which adds alerts about things you keep coming back to.'
            : `You’re on the free tier. Membership is ${monthlyPrice()} a month, and you cannot buy it yet — no payment provider is configured, so there is no upgrade button here rather than one that goes nowhere.`}
        </p>
        <p className="measure mt-3 text-[0.875rem] leading-relaxed text-ink-70">
          <Link href="/membership" className="link-grow text-pink-ink">
            What membership adds, and what it can never buy
          </Link>
        </p>
        <p className="measure mt-4 text-[0.8125rem] leading-relaxed text-ink-50">
          Whatever changes, membership will never buy a better Value Index, a different Buy or
          Hold call, or a Watchlist alert that arrives sooner. A free customer’s Watchlist fires
          at exactly the same moment as a member’s. What membership adds is us looking at the
          things you never got round to adding —{' '}
          <Link href="/app/noticed" className="link-grow text-pink-ink">what we noticed</Link>.
        </p>
      </section>

      <p className="border-t border-line pt-6 text-[0.75rem] text-ink-50">
        Auth provider in this environment: {provider}.
      </p>
    </div>
  );
}
