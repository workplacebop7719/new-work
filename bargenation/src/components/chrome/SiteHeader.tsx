import Link from 'next/link';
import { AccountLink } from './AccountLink';

/**
 * Site header (PRD §05, §33).
 *
 * Thin, stable, and deliberately quiet: the header's job is to stay visible
 * without competing with the hero. Nav is small uppercase at wide tracking;
 * the wordmark is centred on desktop with navigation to its left, which is
 * the classic luxury-house arrangement.
 *
 * There is no filled pink CTA here any more. A saturated button in the
 * header was the single most "startup" element on the page and it made pink
 * ambient rather than meaningful.
 *
 * Only built routes appear. A nav link to a 404 is a broken product (§01).
 */
const NAV = [
  { href: '/today', label: 'Today' },
  { href: '/search', label: 'Search' },
  { href: '/categories', label: 'Categories' },
  { href: '/how-it-works', label: 'Method' },
  { href: '/about', label: 'About' },
];

const navLink =
  'text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink transition-opacity duration-[--dur-micro] hover:opacity-55';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/94 backdrop-blur-[2px]">
      <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-4 sm:px-8">
        {/* left — navigation */}
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={navLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <span className="lg:hidden" aria-hidden="true" />

        {/* centre — wordmark */}
        <Link
          href="/"
          aria-label="Bargenation home"
          className="justify-self-center px-2 text-center"
        >
          <span className="display text-[1.125rem] font-normal uppercase tracking-[0.28em] sm:text-[1.375rem] sm:tracking-[0.34em]">
            Bargenation
          </span>
        </Link>

        {/* right — reflects the session without making every page dynamic */}
        <div className="flex items-center justify-end">
          <AccountLink className={navLink} />
        </div>
      </div>
    </header>
  );
}
