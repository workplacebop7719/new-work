import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { listSources, listRecentRuns, listRejectionReasons } from '@/data/admin-repository';

export const metadata: Metadata = { title: 'Sources' };

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : '—';

/**
 * SOURCES AND JOB HEALTH (PRD §49, §44).
 *
 * The column that actually matters here is REJECTIONS, which is why it is not
 * buried at the end. A feed that suddenly rejects everything has changed its
 * format; a feed that suddenly accepts everything has probably stopped
 * validating. Both look perfectly healthy on a page that shows only "last run:
 * succeeded", and that is the page most operations screens turn into.
 *
 * Rejection reasons are grouped rather than listed. One broken feed produces a
 * thousand identical rows, and a thousand rows is a page nobody reads.
 */
export default async function SourcesPage() {
  const session = await readSession();
  if (!session) return null;

  const [sources, runs, rejections] = await Promise.all([
    listSources(session.user.id),
    listRecentRuns(session.user.id),
    listRejectionReasons(session.user.id),
  ]);

  return (
    <div className="space-y-16">
      <section>
        <h2 className="display display-md border-b border-ink pb-3">Sources</h2>
        <p className="measure mt-4 text-[0.875rem] leading-relaxed text-ink-70">
          Tier 1 is a retailer’s own API; tier 5 is monitoring a public page. A lower tier is
          better evidence, and confidence in a Value Index reflects it.
        </p>

        {sources.length === 0 ? (
          <p className="mt-8 text-ink-70">No sources configured.</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="eyebrow py-3 text-ink-50">Source</th>
                  <th scope="col" className="eyebrow py-3 text-ink-50">Tier</th>
                  <th scope="col" className="eyebrow py-3 text-ink-50">Last run</th>
                  <th scope="col" className="eyebrow py-3 text-right text-ink-50">Runs 7d</th>
                  <th scope="col" className="eyebrow py-3 text-right text-ink-50">Accepted 7d</th>
                  <th scope="col" className="eyebrow py-3 text-right text-ink-50">Rejected 7d</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const total = source.acceptedLast7d + source.rejectedLast7d;
                  // Everything rejected, or nothing rejected at all across a
                  // real volume, are both worth a second look.
                  const suspicious =
                    total > 20 && (source.rejectedLast7d === 0 || source.acceptedLast7d === 0);
                  return (
                    <tr key={source.id} className="border-b border-line">
                      <td className="py-3 text-[0.9375rem]">{source.name}</td>
                      <td className="py-3 tabular text-[0.9375rem]">{source.tier}</td>
                      <td className="py-3 text-[0.875rem] text-ink-70">
                        {when(source.lastRunAt)}
                        {source.lastStatus && source.lastStatus !== 'COMPLETED' && (
                          <span className="ml-2 border border-ink px-1.5 py-0.5 text-[0.6875rem] uppercase">
                            {source.lastStatus.toLowerCase()}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right tabular text-[0.9375rem]">{source.runsLast7d}</td>
                      <td className="py-3 text-right tabular text-[0.9375rem]">{source.acceptedLast7d}</td>
                      <td className="py-3 text-right tabular text-[0.9375rem]">
                        {source.rejectedLast7d}
                        {suspicious && (
                          <span className="ml-2 text-[0.6875rem] uppercase tracking-[0.08em] text-pink-ink">
                            look
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="display display-md border-b border-ink pb-3">Recent runs</h2>
        {runs.length === 0 ? (
          <p className="mt-6 text-ink-70">Nothing has run yet.</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="eyebrow py-3 text-ink-50">Started</th>
                  <th scope="col" className="eyebrow py-3 text-ink-50">Source</th>
                  <th scope="col" className="eyebrow py-3 text-ink-50">Status</th>
                  <th scope="col" className="eyebrow py-3 text-right text-ink-50">Seen</th>
                  <th scope="col" className="eyebrow py-3 text-right text-ink-50">Accepted</th>
                  <th scope="col" className="eyebrow py-3 text-right text-ink-50">Rejected</th>
                  <th scope="col" className="eyebrow py-3 text-right text-ink-50">Held</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={`${run.sourceName}-${run.startedAt}`} className="border-b border-line">
                    <td className="py-3 text-[0.875rem] text-ink-70">{when(run.startedAt)}</td>
                    <td className="py-3 text-[0.9375rem]">{run.sourceName}</td>
                    <td className="py-3 text-[0.875rem]">
                      {run.status === 'COMPLETED' ? (
                        <span className="text-ink-70">completed</span>
                      ) : (
                        <span className="border border-ink px-1.5 py-0.5 text-[0.6875rem] uppercase">
                          {run.status.toLowerCase()}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right tabular text-[0.9375rem]">{run.recordsSeen}</td>
                    <td className="py-3 text-right tabular text-[0.9375rem]">{run.accepted}</td>
                    <td className="py-3 text-right tabular text-[0.9375rem]">{run.rejected}</td>
                    <td className="py-3 text-right tabular text-[0.9375rem]">{run.quarantined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="display display-md border-b border-ink pb-3">Why records were rejected</h2>
        <p className="measure mt-4 text-[0.875rem] leading-relaxed text-ink-70">
          Grouped by reason over thirty days. A reason climbing sharply usually means a feed
          changed shape rather than that its prices changed.
        </p>
        {rejections.length === 0 ? (
          <p className="mt-6 text-ink-70">Nothing has been rejected in the last thirty days.</p>
        ) : (
          <ul className="mt-8 divide-y divide-line border-t border-line">
            {rejections.map((row) => (
              <li
                key={`${row.sourceName}-${row.reason}`}
                className="flex flex-wrap items-baseline justify-between gap-4 py-3"
              >
                <span className="min-w-0">
                  <span className="text-[0.9375rem]">{row.reason}</span>
                  <span className="ml-3 text-[0.75rem] text-ink-50">{row.sourceName}</span>
                </span>
                <span className="tabular text-[0.9375rem]">{row.occurrences}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export const dynamic = 'force-dynamic';
