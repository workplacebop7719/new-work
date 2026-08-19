'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Mobile navigation (PRD §33). 44px minimum targets, safe-area aware.
 *
 * This is the LOGGED-OUT set on purpose. §33 lists Watchlist / Saved /
 * Profile for the signed-in bar, and accounts are not built yet — putting
 * those tabs here would be a control that looks live and does nothing (§01).
 * They arrive with the account system, not before.
 */
const TABS = [
  { href: '/today', label: 'Today' },
  { href: '/search', label: 'Search' },
  { href: '/categories', label: 'Browse' },
  { href: '/how-it-works', label: 'Method' },
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
