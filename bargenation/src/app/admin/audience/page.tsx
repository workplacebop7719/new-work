import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { readAudienceSummary } from '@/data/admin-repository';

export const metadata: Metadata = { title: 'Audience' };

/**
 * THE AUDIENCE, AS NUMBERS ONLY (PRD §49, §37).
 *
 * §49 asks for admin views of users and of the newsletter. The obvious build
 * grants staff read access to profiles, watchlists, deal signals and
 * subscribers — and migration 0010 revokes all four in writing, while 0012
 * withholds read-by-email specifically so the newsletter cannot become an
 * address-enumeration oracle.
 *
 * Handing all of that back to draw a dashboard would undo five migrations of
 * work for a number on a screen. So this asks a question instead (migration
 * 0020) and gets counts.
 *
 * There is deliberately NO search, no list, and no way to ask about one
 * person. That is not a missing feature — it is the feature.
 */
const GROUPS: Array<{
  title: string;
  note: string;
  rows: Array<{ key: string; label: string; hint?: string }>;
}> = [
  {
    title: 'People',
    note: 'How many accounts exist. Not who they are.',
    rows: [
      { key: 'customers', label: 'Accounts' },
      { key: 'members', label: 'Members', hint: 'Set by hand — nothing can be bought yet' },
      { key: 'households', label: 'Households described' },
    ],
  },
  {
    title: 'What they are watching',
    note: 'The health of the thing the product is for.',
    rows: [
      { key: 'watchlist_items', label: 'Watchlist items' },
      { key: 'watchlist_items_paused', label: 'Of those, paused' },
      { key: 'saved_items', label: 'Saved items' },
    ],
  },
  {
    title: 'Deal Signals',
    note: 'Undelivered is expected: no email provider is configured.',
    rows: [
      { key: 'signals_last_7d', label: 'Sent in the last 7 days' },
      { key: 'signals_all_time', label: 'All time' },
      { key: 'signals_undelivered', label: 'Recorded but not delivered' },
      { key: 'signals_deferred', label: 'Held by quiet hours', hint: 'Deferred, never suppressed' },
    ],
  },
  {
    title: 'The Edit',
    note: 'Double opt-in, so pending means the confirmation was never followed.',
    rows: [
      { key: 'subscribers_confirmed', label: 'Confirmed' },
      { key: 'subscribers_pending', label: 'Pending confirmation' },
      { key: 'subscribers_unsubscribed', label: 'Unsubscribed' },
    ],
  },
  {
    title: 'Choices people made',
    note: 'Both are off by default, so these count deliberate decisions.',
    rows: [
      { key: 'behaviour_alerts_on', label: 'Behaviour alerts on' },
      { key: 'quiet_hours_set', label: 'Quiet hours set' },
    ],
  },
];

export default async function AudiencePage() {
  const session = await readSession();
  if (!session) return null;

  const summary = await readAudienceSummary(session.user.id);

  return (
    <div className="max-w-[52rem]">
      <h2 className="display display-md border-b border-ink pb-3">Audience</h2>

      <p className="measure mt-6 border-l-2 border-ink bg-wash px-4 py-3 text-[0.875rem] leading-relaxed text-ink-70">
        <span className="text-ink">Counts only, and that is deliberate.</span> This role cannot
        read profiles, watchlists, Deal Signals or subscribers — the grants were revoked on
        purpose, and the newsletter deliberately cannot be searched by address. There is no way to
        look one person up from here, and adding one would mean giving that access back.
      </p>

      <div className="mt-12 space-y-12">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="eyebrow text-ink-50">{group.title}</h3>
            <p className="mt-2 text-[0.8125rem] text-ink-50">{group.note}</p>
            <dl className="mt-5 divide-y divide-line border-t border-line">
              {group.rows.map((row) => (
                <div key={row.key} className="flex items-baseline justify-between gap-6 py-3">
                  <dt className="text-[0.9375rem]">
                    {row.label}
                    {row.hint && (
                      <span className="ml-3 text-[0.75rem] text-ink-50">{row.hint}</span>
                    )}
                  </dt>
                  <dd className="numeral text-[1.25rem] tabular">{summary[row.key] ?? 0}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
