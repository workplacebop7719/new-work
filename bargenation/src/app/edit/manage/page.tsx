import Link from 'next/link';
import type { Metadata } from 'next';
import { readSubscriber } from '@/newsletter/subscribe';
import { memberFeaturesAvailable } from '@/data/member-repository';
import { UnsubscribeControls } from '@/components/newsletter/UnsubscribeControls';

export const metadata: Metadata = { title: 'Your subscription', robots: { index: false } };

/**
 * What a subscriber can see and change, reached by their manage token.
 *
 * Shows the full dated consent record. That is the answer to "when did I agree
 * to this?", and showing it to the person it describes — rather than only
 * being able to produce it for a regulator — is the point of keeping it.
 */
export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const subscriber = token && memberFeaturesAvailable ? await readSubscriber(token) : null;

  if (!subscriber) {
    return (
      <div className="mx-auto max-w-[40rem] px-5 py-28 sm:px-8">
        <h1 className="display display-xl max-w-[16ch]">That link is not valid.</h1>
        <p className="mt-8 leading-relaxed text-ink-70">
          Manage links are specific to one subscription. If yours has stopped working, you can{' '}
          <Link href="/edit" className="link-grow text-pink-ink">sign up again</Link>.
        </p>
      </div>
    );
  }

  const label: Record<string, string> = {
    REQUESTED: 'You asked to subscribe',
    CONFIRMED: 'You confirmed your address',
    UNSUBSCRIBED: 'You unsubscribed',
    BOUNCED: 'A message bounced',
    COMPLAINED: 'A message was reported as spam',
  };

  return (
    <div className="mx-auto max-w-[44rem] px-5 pb-28 pt-16 sm:px-8">
      <p className="eyebrow text-ink-50">Your subscription</p>
      <h1 className="display display-xl mt-4">{subscriber.email}</h1>

      <dl className="mt-12 border-t border-ink">
        <div className="flex justify-between gap-6 border-b border-line py-4">
          <dt className="text-ink-50">Status</dt>
          <dd>{subscriber.status.toLowerCase()}</dd>
        </div>
        <div className="flex justify-between gap-6 border-b border-line py-4">
          <dt className="text-ink-50">Frequency</dt>
          <dd>{subscriber.cadence.toLowerCase().replace('_', ' ')}</dd>
        </div>
      </dl>

      <section className="mt-14">
        <h2 className="eyebrow text-ink-50">Your consent record</h2>
        <p className="mt-3 max-w-[52ch] text-[0.875rem] leading-relaxed text-ink-70">
          Kept so that if you ever ask when you agreed to this, we can answer precisely rather than
          plausibly. It cannot be edited or deleted, including by us.
        </p>
        <ol className="mt-6 border-t border-line">
          {subscriber.history.map((entry, i) => (
            <li key={`${entry.occurredAt}-${i}`} className="flex flex-wrap justify-between gap-4 border-b border-line py-3.5">
              <span className="text-[0.9375rem]">{label[entry.event] ?? entry.event}</span>
              <span className="text-[0.8125rem] text-ink-50">
                {new Date(entry.occurredAt).toLocaleString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {subscriber.status !== 'UNSUBSCRIBED' && (
        <section className="mt-14 border-t border-line pt-8">
          <UnsubscribeControls token={token!} cadence={subscriber.cadence} />
        </section>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
