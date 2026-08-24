'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Mobile navigation (PRD §33). 44px minimum targets, safe-area aware.
 *
 * The last tab reflects the session. It used to read "Sign in" permanently,
 * with a note saying the portal tabs would arrive when the portal did — the
 * portal has been there for several sprints, so a signed-in member on a phone
 * was being offered a sign-in link and no route to their own Watchlist.
 *
 * The session is probed after hydration, exactly as the header does it, rather
 * than read in the layout: reading a cookie there would make every page
 * dynamic and give up static rendering of the deal pages (§67) for the sake of
 * one word. Both states link somewhere correct, so the worst case is a
 * momentarily stale label, never a broken destination.
 */
const BASE_TABS = [
  { href: '/today', label: 'Today' },
  { href: '/search', label: 'Search' },
  { href: '/categories', label: 'Browse' },
] as const;

/**
 * Whether a tab owns the current page.
 *
 * Prefix matching, not equality. `pathname === href` meant Browse never lit up
 * on `/categories/shoes` and the account tab never lit up anywhere inside
 * `/app` — so the bar showed nothing selected on most of the pages somebody
 * actually reaches through it.
 */
const owns = (href: string, pathname: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

export function MobileNav() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { signedIn?: boolean } | null) => {
        if (!cancelled) setSignedIn(Boolean(data?.signedIn));
      })
      // A failed probe leaves the signed-out tab in place, which still works.
      .catch(() => { if (!cancelled) setSignedIn(false); });
    return () => { cancelled = true; };
  }, []);

  const tabs = [
    ...BASE_TABS,
    signedIn
      ? { href: '/app/watchlist', label: 'Yours' }
      : { href: '/login', label: 'Sign in' },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-white lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-[640px]">
        {tabs.map((tab) => {
          // The portal tab owns every page inside /app, not just the one it
          // links to, so it stays lit while somebody moves around in there.
          const active = tab.href.startsWith('/app')
            ? pathname.startsWith('/app')
            : owns(tab.href, pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[52px] items-center justify-center px-1 text-center text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
                  active ? 'bg-pink text-ink' : 'text-ink-70'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
