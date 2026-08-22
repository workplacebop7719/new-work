import Link from 'next/link';

/**
 * Empty states are product experiences, not apologies (PRD §71).
 *
 * Each one says what this space is for and offers the single next step, in the
 * same editorial voice as everything else.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mt-12 max-w-[46ch]">
      <p className="display display-lg">{title}</p>
      <p className="mt-5 text-[1rem] leading-relaxed text-ink-70">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="on-pink mt-8 inline-flex min-h-[44px] items-center px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
