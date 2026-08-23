import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { readSession } from '@/auth/session';
import { loginHref } from '@/auth/return-url';
import { ensureProfile, memberFeaturesAvailable } from '@/data/member-repository';
import { signOutAction } from '@/auth/actions';

const MEMBER_NAV = [
  { href: '/app/watchlist', label: 'Watchlist' },
  { href: '/app/saved', label: 'Saved' },
  { href: '/app/deal-signals', label: 'Deal Signals' },
  { href: '/app/household', label: 'Household' },
  { href: '/app/noticed', label: 'What we noticed' },
  { href: '/app/account', label: 'Account' },
] as const;

/**
 * The member portal boundary (PRD §32).
 *
 * THIS is the authorisation check, not `middleware.ts`. Middleware only saw a
 * cookie; here the cookie is resolved to an actual session, so a forged or
 * expired one is stopped. Below this, row level security decides what the
 * customer can actually touch.
 *
 * Rendered as a private space rather than a dashboard: no sidebar of KPI
 * tiles, no grey chrome. It is the same editorial system as the public site.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();

  if (!session) {
    const path = (await headers()).get('x-pathname');
    redirect(loginHref(path));
  }

  // A customer who authenticated but has no profile row would hit a foreign
  // key error on their first save, so provision on entry.
  if (memberFeaturesAvailable) {
    await ensureProfile(session.user);
  }

  const name = session.user.displayName ?? session.user.email;

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-10 sm:px-8">
      <header className="border-b border-ink pb-6">
        <p className="eyebrow text-ink-50">Your Bargenation</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="display display-lg">{name}</h1>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-70 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>

        <nav aria-label="Account" className="mt-8">
          <ul className="flex flex-wrap gap-x-7 gap-y-3">
            {MEMBER_NAV.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink hover:opacity-55"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {!memberFeaturesAvailable && (
        <p className="mt-8 border-l-2 border-ink bg-wash px-4 py-3 text-[0.875rem] leading-snug">
          No database is configured, so nothing you do here can be stored. Set <code>DATABASE_URL</code>{' '}
          and run the migrations to switch these on.
        </p>
      )}

      <div className="mt-12">{children}</div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
