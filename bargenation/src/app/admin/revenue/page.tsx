import Link from 'next/link';
import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { commerceReachable } from '@/data/admin-repository';

export const metadata: Metadata = { title: 'Revenue' };

/**
 * REVENUE (PRD §49, §52).
 *
 * This page reports that it cannot show you revenue, and why — which is the
 * only honest thing it can do (§01).
 *
 * There are two independent reasons, and both are deliberate:
 *
 *   There is no revenue. No affiliate account exists, so no commission has
 *   ever been earned and there is nothing to total.
 *
 *   This role could not read it if there were. Migration 0005 puts affiliate
 *   economics in a separate schema and revokes it from everything that
 *   computes or serves a score. That firewall is what makes "money cannot
 *   change a Value Index" a fact about the database rather than a promise in
 *   a policy — and the operations surface sits on the scoring side of it.
 *
 * So a revenue dashboard here is not a missing page. It is a page that would
 * have to breach the firewall to exist, and it will belong to whatever
 * reporting surface sits on the commerce side when there is money to report.
 */
export default async function RevenuePage() {
  const session = await readSession();
  if (!session) return null;

  // Asked rather than assumed: if the firewall is ever weakened, this page
  // should stop claiming it holds.
  const reachable = await commerceReachable(session.user.id);

  return (
    <div className="max-w-[46rem]">
      <h2 className="display display-md border-b border-ink pb-3">Revenue</h2>

      <p className="display display-sm mt-8 max-w-[22ch]">
        There is nothing here, for two separate reasons.
      </p>

      <div className="mt-10 space-y-8">
        <div className="border-t border-line pt-6">
          <h3 className="eyebrow text-ink-50">One — there is no revenue</h3>
          <p className="measure mt-3 text-[0.9375rem] leading-relaxed text-ink-70">
            No affiliate account exists, outbound links are switched off across the product, and
            no commission has ever been earned. A page showing a total of zero would be true, and
            would still imply the plumbing behind it works. It does not exist yet.
          </p>
        </div>

        <div className="border-t border-line pt-6">
          <h3 className="eyebrow text-ink-50">Two — this surface could not read it anyway</h3>
          <p className="measure mt-3 text-[0.9375rem] leading-relaxed text-ink-70">
            Affiliate economics live in a separate database schema, and every role that computes
            or serves a Value Index is denied access to it. That firewall is what makes “money
            cannot change a score” a fact about the database rather than a promise in a policy.
            Operations sits on the scoring side of it.
          </p>
          <p className="mt-4 text-[0.8125rem] text-ink-50">
            Checked just now:{' '}
            <span className="text-ink">
              {reachable
                ? 'commission data IS reachable from this role — the firewall is not holding, and that is a defect.'
                : 'commission data is not reachable from this role, as intended.'}
            </span>
          </p>
        </div>
      </div>

      <p className="measure mt-12 border-t border-line pt-6 text-[0.8125rem] leading-relaxed text-ink-50">
        When there is money to report, it belongs to a reporting surface on the commerce side of
        that boundary — not to this one. What this surface can show is{' '}
        <Link href="/admin/audience" className="link-grow text-pink-ink">how the product is being used</Link>.
      </p>
    </div>
  );
}

export const dynamic = 'force-dynamic';
