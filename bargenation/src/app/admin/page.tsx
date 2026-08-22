import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { readSummary, listRecentAudit } from '@/data/admin-repository';

export const metadata: Metadata = { title: 'Operations' };

/** Counts that mean something operationally, not a wall of KPI tiles (§49). */
export default async function AdminOverviewPage() {
  const session = await readSession();
  if (!session) return null;

  const [summary, audit] = await Promise.all([
    readSummary(session.user.id),
    listRecentAudit(session.user.id, 10),
  ]);

  const rows: Array<[string, number, string]> = [
    ['Awaiting review', summary.openReviews, 'Records the matcher would not decide.'],
    ['Held in quarantine', summary.heldObservations, 'Prices too extraordinary to trust once.'],
    ['Runs, last 24h', summary.runsLast24h, ''],
    ['Failed runs, last 24h', summary.failedRunsLast24h, 'Anything above zero needs a look.'],
    ['Records refused, last 24h', summary.rejectionsLast24h, 'Normal. A feed always has some.'],
    ['Offers unverified over a week', summary.staleOffers, 'These lower published Confidence.'],
  ];

  return (
    <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <h2 className="eyebrow text-ink-50">State of the queue</h2>
        <dl className="mt-6 border-t border-ink">
          {rows.map(([label, count, note]) => (
            <div key={label} className="flex items-baseline justify-between gap-6 border-b border-line py-4">
              <div>
                <dt className="text-[0.9375rem] text-ink">{label}</dt>
                {note && <p className="mt-1 max-w-[44ch] text-[0.75rem] text-ink-50">{note}</p>}
              </div>
              <dd className="numeral shrink-0 text-[1.5rem] tabular">{count}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="eyebrow text-ink-50">Recent decisions</h2>
        {audit.length === 0 ? (
          <p className="mt-6 max-w-[40ch] text-[0.9375rem] leading-relaxed text-ink-70">
            Nothing yet. Every release and discard is recorded here permanently, with who did it
            and why.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {audit.map((entry, i) => (
              <li key={`${entry.createdAt}-${i}`} className="py-4">
                <p className="eyebrow text-ink-50">
                  {new Date(entry.createdAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                  {' · '}{entry.action.replace(/_/g, ' ').toLowerCase()}
                </p>
                <p className="mt-1.5 text-[0.9375rem]">{entry.reason}</p>
                <p className="mt-1 text-[0.75rem] text-ink-50">{entry.target}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
