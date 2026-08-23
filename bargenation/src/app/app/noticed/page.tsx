import Link from 'next/link';
import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import {
  behaviourAlertsEnabled, listInterests, memberFeaturesAvailable, readMembership,
} from '@/data/member-repository';
import { setBehaviourAlertsAction, clearInterestsAction } from '@/data/member-actions';
import { REPEAT_VIEWS_FOR_INTEREST, MIN_INDEX_TO_MENTION } from '@/domain/interest';
import { EmptyState } from '@/components/member/EmptyState';

export const metadata: Metadata = { title: 'What we noticed' };

/**
 * WHAT WE NOTICED (PRD §26, §37, §52).
 *
 * The page exists because the feature would be indefensible without it. If we
 * are going to say "you keep coming back to this", the customer has to be able
 * to see exactly what we hold, understand why we hold it, and delete it in one
 * press. A behaviour feature you cannot inspect is surveillance with a
 * friendly name.
 *
 * Off by default, and off means erased — turning it off deletes what was
 * collected rather than merely stopping collection. Anything less makes the
 * switch a setting rather than a decision.
 */
export default async function NoticedPage() {
  const session = await readSession();
  if (!session || !memberFeaturesAvailable) return null;

  const profileId = session.user.id;
  const [enabled, interests, membership] = await Promise.all([
    behaviourAlertsEnabled(profileId),
    listInterests(profileId),
    readMembership(profileId),
  ]);

  return (
    <section className="max-w-[46rem]">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-4">
        <h2 className="display display-md">What we noticed</h2>
        <p className="text-[0.8125rem] text-ink-50">
          {enabled ? 'On' : 'Off'}
        </p>
      </div>

      <p className="measure mt-6 text-[0.9375rem] leading-relaxed text-ink-70">
        If you keep coming back to something without adding it to your Watchlist, we can tell you
        when its price is genuinely worth it. That means counting which products you open — so it
        is off unless you switch it on.
      </p>

      <div className="mt-8 border-t border-line pt-6">
        <h3 className="eyebrow text-ink-50">What we would keep</h3>
        <ul className="mt-4 space-y-2 text-[0.875rem] leading-relaxed text-ink-70">
          <li><span className="text-ink">Which products you opened, counted by day.</span> Not the
            time, not the order, not how long you stayed.</li>
          <li><span className="text-ink">Nothing else.</span> No IP address, no device, no
            referrer, no session identifier. There is nowhere in the database to put them.</li>
          <li><span className="text-ink">For ninety days.</span> Older counts are deleted, because
            what you looked at last spring tells us nothing useful and is only a liability.</li>
        </ul>
      </div>

      <form action={setBehaviourAlertsAction} className="mt-8">
        <input type="hidden" name="enabled" value={String(!enabled)} />
        <button
          type="submit"
          className={
            enabled
              ? 'inline-flex min-h-[44px] items-center border border-line-strong px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-ink-70 transition-colors duration-[--dur-micro] hover:border-ink hover:text-ink'
              : 'on-pink inline-flex min-h-[44px] items-center px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white'
          }
        >
          {enabled ? 'Turn this off and delete it' : 'Turn this on'}
        </button>
        {enabled && (
          <p className="mt-2.5 max-w-[42ch] text-[0.75rem] leading-snug text-ink-50">
            Turning it off erases everything below. We do not keep a copy.
          </p>
        )}
      </form>

      {/* Membership is the gate on ACTING, never on the price we quote. */}
      <div className="mt-10 border-t border-line pt-6">
        <h3 className="eyebrow text-ink-50">Who gets told</h3>
        <p className="measure mt-4 text-[0.875rem] leading-relaxed text-ink-70">
          {membership === 'MEMBER'
            ? 'Your membership includes these alerts, so we will tell you when something here is worth buying.'
            : 'Acting on this is part of membership, which does not exist yet — no price is set and no payments are configured. Until then the list below is yours to look at, and nothing is sent.'}
        </p>
        <p className="measure mt-4 text-[0.8125rem] leading-relaxed text-ink-50">
          Membership never changes a Value Index, a Buy or Hold call, or when a Watchlist alert
          reaches you. A free customer’s Watchlist fires at exactly the same moment as a member’s.
          What membership adds is us looking at the things you never got round to adding.
        </p>
      </div>

      {enabled ? (
        interests.length > 0 ? (
          <>
            <div className="mt-12 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-3">
              <h3 className="display display-sm">Everything we hold</h3>
              <form action={clearInterestsAction}>
                <button
                  type="submit"
                  className="min-h-[44px] text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-70 hover:text-ink"
                >
                  Delete all of it
                </button>
              </form>
            </div>
            <ul className="divide-y divide-line border-b border-line">
              {interests.map((row) => (
                <li
                  key={`${row.productSlug}-${row.kind}`}
                  className="flex flex-wrap items-baseline justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-[0.9375rem]">
                      {row.productSlug ? (
                        <Link href={`/deals/${row.productSlug}`} className="link-grow">
                          {row.productName}
                        </Link>
                      ) : (
                        'Something no longer in our catalogue'
                      )}
                    </p>
                    <p className="mt-1 text-[0.75rem] text-ink-50">
                      Last seen {row.lastSeenOn}
                      {row.occurrences < REPEAT_VIEWS_FOR_INTEREST &&
                        ' · not enough to count as interest yet'}
                    </p>
                  </div>
                  <p className="tabular text-[0.9375rem] text-ink">
                    {row.occurrences} {row.occurrences === 1 ? 'view' : 'views'}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-[52ch] text-[0.75rem] leading-snug text-ink-50">
              We would mention something once you had opened it {REPEAT_VIEWS_FOR_INTEREST} times
              and its Value Index reached {MIN_INDEX_TO_MENTION.toFixed(1)} — the same bar as a Buy
              call, not a lower one.
            </p>
          </>
        ) : (
          <EmptyState
            title="Nothing noticed yet."
            body="Open a few deals and come back. We count which ones, by day, and nothing else."
            action={{ href: '/today', label: 'See today’s deals' }}
          />
        )
      ) : (
        <p className="mt-12 border-t border-line pt-6 text-[0.875rem] leading-relaxed text-ink-50">
          Nothing is being recorded, and there is nothing here to show.
        </p>
      )}
    </section>
  );
}
