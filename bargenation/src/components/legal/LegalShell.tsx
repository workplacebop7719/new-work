import Link from 'next/link';
import { LAWYER_REVIEWED, missingDetails, type LegalDocument } from '@/content/legal';

const LEGAL_NAV = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/disclosures', label: 'Disclosures' },
  { href: '/contact', label: 'Contact' },
] as const;

/**
 * Shared frame for the legal documents (PRD §70).
 *
 * Carries two statements every one of them needs, and states both plainly
 * rather than burying them: that these drafts have not been through legal
 * review, and which facts about the operating company are still missing.
 *
 * Neither is styled as a warning. They are simply true, and a product that
 * shows its unfinished state calmly reads more trustworthy than one that
 * hides it behind an amber banner.
 */
export function LegalShell({
  document,
  children,
}: {
  document: LegalDocument;
  children: React.ReactNode;
}) {
  const missing = missingDetails();

  return (
    <article className="mx-auto max-w-[52rem] px-5 pb-28 pt-12 sm:px-8">
      <nav aria-label="Breadcrumb" className="eyebrow text-ink-50">
        <Link href="/" className="link-grow">Bargenation</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>Legal</span>
      </nav>

      <header className="mt-8 border-b border-ink pb-8">
        <h1 className="display display-hero">{document.title}</h1>
        <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-70">{document.summary}</p>
        <p className="mt-6 text-[0.8125rem] text-ink-50">
          Drafted{' '}
          {new Date(document.drafted).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
          {' · '}
          {LAWYER_REVIEWED ? 'Reviewed by counsel' : 'Not yet reviewed by a lawyer'}
        </p>
      </header>

      {!LAWYER_REVIEWED && (
        <section
          aria-labelledby="draft-status"
          className="mt-10 border-l-2 border-ink pl-5"
        >
          <h2 id="draft-status" className="eyebrow text-ink-50">Status of this document</h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-70">
            This is a plain-language draft written to describe what the software actually does. It
            has not been reviewed by a lawyer, so treat it as a statement of intent rather than as
            advice or as a claim that any particular law is satisfied.
          </p>
        </section>
      )}

      {missing.length > 0 && (
        <section
          aria-labelledby="pending-details"
          className="mt-8 border border-line bg-wash px-6 py-6"
        >
          <h2 id="pending-details" className="eyebrow text-ink-50">
            Details still to be confirmed
          </h2>
          <p className="mt-3 max-w-[52ch] text-[0.875rem] leading-relaxed text-ink-70">
            Bargenation is not yet trading, and the facts below belong to a company rather than to
            a piece of copy. Rather than fill them with something plausible, they are listed here
            until they are real.
          </p>
          <dl className="mt-6 space-y-4">
            {missing.map((d) => (
              <div key={d.key} className="border-t border-line pt-3">
                <dt className="text-[0.9375rem] text-ink">{d.label}</dt>
                <dd className="mt-1 text-[0.8125rem] leading-snug text-ink-50">{d.purpose}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="legal-body mt-14">{children}</div>

      <footer className="mt-16 border-t border-line pt-8">
        <p className="text-[0.8125rem] leading-relaxed text-ink-50">
          Questions about this document are best sent to our privacy or support contact — see
          &ldquo;Details still to be confirmed&rdquo; above if you are reading this before those
          exist.
        </p>
        <ul className="mt-5 flex flex-wrap gap-x-7 gap-y-2">
          {LEGAL_NAV.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className="link-grow text-[0.8125rem] text-pink-ink">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}

/**
 * Renders a legal detail, or says plainly that it is not settled.
 *
 * Used only where a sentence genuinely cannot be written without the fact.
 * Most prose avoids needing one at all by saying "Bargenation", which is true
 * regardless of what the operating entity turns out to be called.
 */
export function Detail({ value, describes }: { value: string | null; describes: string }) {
  if (value) return <>{value}</>;
  return (
    <span className="whitespace-nowrap border-b border-line-strong text-ink-50">
      [{describes} — not yet settled]
    </span>
  );
}
