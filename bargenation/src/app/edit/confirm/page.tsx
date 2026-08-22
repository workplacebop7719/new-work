import Link from 'next/link';
import type { Metadata } from 'next';
import { confirmSubscription } from '@/newsletter/subscribe';
import { memberFeaturesAvailable } from '@/data/member-repository';

export const metadata: Metadata = { title: 'Confirm your subscription', robots: { index: false } };

/**
 * Completes double opt-in.
 *
 * Confirming is a state change, and doing it on a GET is normally wrong.
 * It is accepted here because the token IS the proof of intent — the person
 * followed a link only they could have received — and because requiring a
 * second click after clicking a confirmation link is how confirmation rates
 * die. The token is single-purpose and cannot be used to read or change
 * anything afterwards (migration 0012).
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token || !memberFeaturesAvailable) {
    return (
      <Shell title="That link is not valid.">
        <p>
          It may have been mistyped, or already used. You can{' '}
          <Link href="/edit" className="link-grow text-pink-ink">start again</Link>.
        </p>
      </Shell>
    );
  }

  const result = await confirmSubscription(token);

  if (!result.ok) {
    return (
      <Shell title="We couldn’t confirm that.">
        <p>{result.reason}</p>
        <p className="mt-4">
          <Link href="/edit" className="link-grow text-pink-ink">Back to The Edit</Link>
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="You’re on the list.">
      <p>
        Your consent is recorded with the date and where it came from, and you can see that record
        any time.
      </p>
      <p className="mt-4">
        Nothing will actually arrive yet — no email provider is configured — and we would rather
        say so than let you wonder where the first issue went.
      </p>
      <p className="mt-8">
        <Link href={`/edit/manage?token=${result.manageToken}`} className="link-grow text-pink-ink">
          Manage your subscription
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[40rem] px-5 py-28 sm:px-8">
      <h1 className="display display-xl max-w-[16ch]">{title}</h1>
      <div className="mt-8 text-[1rem] leading-relaxed text-ink-70">{children}</div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
