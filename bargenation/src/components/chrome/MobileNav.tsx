'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Mobile navigation (PRD §33). 44px minimum targets, safe-area aware.
 *
 * This is the LOGGED-OUT set on purpose. §33 lists Watchlist / Saved /
 * Profile for the signed-in bar; those tabs arrive when the member portal
 * does. Until then they would be controls that look live and do nothing (§01).
 */
const TABS = [
  { href: '/today', label: 'Today' },
  { href: '/search', label: 'Search' },
  { href: '/categories', label: 'Browse' },
  { href: '/login', label: 'Sign in' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-white lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-[640px]">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
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
