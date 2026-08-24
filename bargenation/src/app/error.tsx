'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * When something breaks (PRD §01, §29).
 *
 * Without this file, a thrown error in production shows Next's bare
 * "Application error: a client-side exception has occurred" — no explanation,
 * no way back, and no sense that anybody expected it. That is a dead end on a
 * site whose whole argument is that it tells you the truth about what it
 * knows.
 *
 * What this deliberately does NOT show is the error itself. A stack trace or a
 * provider message on a customer's screen is the same mistake as letting a raw
 * Supabase string reach the sign-in form: the wording is not ours, and it can
 * leak the shape of the system. `digest` is included because it is the one
 * thing that helps somebody report it usefully — it names the error in the
 * server log without describing it.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server log is where an error belongs. This is a client boundary, so
    // the console is the only place it can go from here.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[38rem] px-5 pb-28 pt-16 sm:px-8">
      <p className="eyebrow text-ink-50">Something went wrong</p>
      <h1 className="display display-xl mt-4 max-w-[16ch]">
        That didn’t work, and it’s our fault.
      </h1>
      <p className="measure mt-6 text-[0.9375rem] leading-relaxed text-ink-70">
        Nothing you did caused this. Whatever you were part-way through has not been lost — we
        do not delete or change anything on a page that failed to load.
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-[44px] items-center border border-ink px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white"
        >
          Try again
        </button>
        <Link
          href="/today"
          className="inline-flex min-h-[44px] items-center border border-line-strong px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-ink-70 transition-colors duration-[--dur-micro] hover:border-ink hover:text-ink"
        >
          Back to today’s deals
        </Link>
      </div>

      {error.digest && (
        <p className="mt-10 border-t border-line pt-5 text-[0.75rem] leading-snug text-ink-50">
          If you tell us about this, quoting <code className="text-ink">{error.digest}</code> will
          let us find it in our logs. It identifies the error without describing it.
        </p>
      )}
    </div>
  );
}
