import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { readAbuseSummary, type AbuseRow } from '@/data/admin-repository';
import { RATE_LIMITS } from '@/security/rate-limit';

export const metadata: Metadata = { title: 'Abuse' };

/** Freshness matters more than caching for a page about what is happening now. */
export const dynamic = 'force-dynamic';

/**
 * WHAT AN ATTACK LOOKS LIKE, WITHOUT LOOKING AT A PERSON (PRD §69).
 *
 * RATE-LIMITING.md carried this as the outstanding gap: the limits worked and
 * nothing showed whether they were being hit, so the first sign of an attack
 * would have been a customer saying they could not sign in.
 *
 * The obvious build is a select on `rate_limit_hits`. It is refused for the
 * same reason `/admin/audience` refuses a users table — an operator reading a
 * per-token activity log is reading a behavioural record, and a token plus a
 * timestamp plus one more surface is how a "not personal" identifier stops
 * being one. Staff have no select on that table at all; migration 0021
 * returns aggregates through a `security definer` function instead.
 *
 * So this page can tell you the SHAPE of what is happening and cannot tell
 * you whose it is. Concentration is the number that matters: a thousand
 * attempts from one caller is an incident, and the same thousand spread
 * across nine hundred callers is a distributed attempt that a per-caller
 * limit will not stop and a password-strength campaign might.
 */
const DIMENSION_NOTE: Record<string, string> = {
  caller: 'Grouped by where the request came from.',
  subject: 'Grouped by the address being acted on.',
};

const BUCKET_LABEL: Record<string, string> = {
  SIGN_IN: 'Sign in',
  SIGN_UP: 'Sign up',
  PASSWORD_RESET: 'Password reset requested',
  PASSWORD_RESET_TOKEN: 'Reset token submitted',
  SUBSCRIBE: 'Newsletter subscribe',
};

/**
 * The reading, in a sentence, from the figures on the row.
 *
 * Derived rather than written, exactly as the retailer verdict is: an
 * operator glancing at this at two in the morning should not have to do the
 * division themselves.
 */
function reading(row: AbuseRow): string {
  if (row.attempts === 0) return 'Nothing.';
  if (row.tokensOverLimit > 0) {
    return `${row.tokensOverLimit} ${row.tokensOverLimit === 1 ? 'source is' : 'sources are'} past the allowance and being refused.`;
  }
  const concentration = row.busiestTokenAttempts / row.attempts;
  if (row.distinctTokens >= 20 && concentration < 0.1) {
    return 'Spread thinly across many sources — the shape a distributed attempt has, and the shape ordinary traffic has too.';
  }
  if (concentration > 0.5 && row.attempts > 10) {
    return 'Concentrated: most of this is one source. Worth a look before it reaches the allowance.';
  }
  return 'Ordinary.';
}

export default async function AbusePage() {
  const session = await readSession();
  if (!session) return null;

  const rows = await readAbuseSummary(session.user.id, 60);
  const busy = rows.filter((r) => r.attempts > 0);

  return (
    <div className="space-y-14">
      <section>
        <h2 className="eyebrow text-ink-50">Last hour</h2>
        <p className="measure mt-4 text-[0.9375rem] leading-relaxed text-ink-70">
          Attempts against the rate-limited routes. Nothing here identifies anybody — what is
          stored is a keyed token, never an address or an IP, and this page reads only totals
          from it. There is no search and no way to ask about one caller, which is the design
          rather than a missing feature.
        </p>

        {busy.length === 0 ? (
          <p className="mt-8 max-w-[46ch] text-[0.9375rem] leading-relaxed text-ink-70">
            No attempts recorded in the last hour. That is the normal state of this page, and an
            empty one is not evidence the counters are broken — the sign-in smoke test will fill
            it in a few seconds if you want to see it work.
          </p>
        ) : (
          <ul className="mt-8 border-t border-ink">
            {busy.map((row) => (
              <li key={`${row.bucket}-${row.dimension}`} className="border-b border-line py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h3 className="text-[1rem] font-semibold">
                    {BUCKET_LABEL[row.bucket] ?? row.bucket}
                  </h3>
                  <p className="numeral text-[1.5rem] tabular">{row.attempts}</p>
                </div>
                <p className="mt-1 text-[0.75rem] text-ink-50">
                  {DIMENSION_NOTE[row.dimension] ?? row.dimension}
                </p>
                <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-2 text-[0.8125rem]">
                  <div>
                    <dt className="inline text-ink-50">Distinct sources </dt>
                    <dd className="numeral inline tabular">{row.distinctTokens}</dd>
                  </div>
                  <div>
                    <dt className="inline text-ink-50">Busiest one </dt>
                    <dd className="numeral inline tabular">{row.busiestTokenAttempts}</dd>
                  </div>
                  <div>
                    <dt className="inline text-ink-50">Past the allowance </dt>
                    <dd className="numeral inline tabular">{row.tokensOverLimit}</dd>
                  </div>
                </dl>
                <p className="measure mt-2.5 text-[0.875rem] leading-relaxed text-ink-70">
                  {reading(row)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="eyebrow text-ink-50">The allowances being applied</h2>
        <dl className="mt-6 border-t border-ink">
          {Object.entries(RATE_LIMITS).map(([bucket, rule]) => (
            <div key={bucket} className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line py-3.5">
              <dt className="text-[0.9375rem]">{BUCKET_LABEL[bucket] ?? bucket}</dt>
              <dd className="text-[0.8125rem] text-ink-70">
                <span className="numeral tabular">{rule.perCaller}</span> per source
                {' · '}
                {rule.perSubject === null ? (
                  <span>not limited by address</span>
                ) : (
                  <>
                    <span className="numeral tabular">{rule.perSubject}</span> per address
                  </>
                )}
                {' · '}
                <span className="numeral tabular">{Math.round(rule.windowMs / 60000)}</span> min
              </dd>
            </div>
          ))}
        </dl>
        <p className="measure mt-5 text-[0.8125rem] leading-relaxed text-ink-50">
          Sign in is limited by source only, on purpose. Counting failures against an address
          would let anybody who knows your email lock you out of your own account, which is a
          denial of service wearing the costume of a protection. The residual risk — a few
          guesses each from a thousand different sources — is what the concentration figures
          above are for.
        </p>
      </section>
    </div>
  );
}
