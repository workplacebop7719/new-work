import Link from 'next/link';

/** `built: false` renders as plain muted text — never a link to a 404. */
const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'Today', href: '/today', built: true },
      { label: 'Search', href: '/search', built: true },
      { label: 'Categories', href: '/categories', built: true },
      { label: 'Retailers', href: '/stores', built: true },
    ],
  },
  {
    title: 'Bargenation',
    links: [
      { label: 'How it works', href: '/how-it-works', built: true },
      { label: 'Sign in', href: '/login', built: true },
      { label: 'About', href: '/about', built: true },
      { label: 'The Edit', href: '/edit', built: true },
      { label: 'Contact', href: '/contact', built: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy', built: true },
      { label: 'Terms', href: '/terms', built: true },
      { label: 'Disclosures', href: '/disclosures', built: true },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink bg-white">
      <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <p className="display display-sm max-w-[16ch]">Before you buy it, check Bargenation.</p>
            <p className="mt-4 max-w-[38ch] text-[0.8125rem] leading-relaxed text-ink-70">
              We record what things actually cost, then tell you whether today’s price is worth it.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="eyebrow text-ink-50">{col.title}</h2>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    {link.built ? (
                      <Link href={link.href} className="link-grow text-[0.875rem] text-ink">
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-[0.875rem] text-ink-50">
                        {link.label}
                        <span className="ml-2 text-[0.6875rem] uppercase tracking-[0.08em]">
                          not built
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 text-[0.75rem] text-ink-50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Bargenation.</p>
          <p className="max-w-[60ch]">
            Some links may earn us a commission. Commission never affects a Value Index or a
            Buy / Hold call. Legal pages are drafted and not yet lawyer-reviewed.
          </p>
        </div>
      </div>
    </footer>
  );
}
