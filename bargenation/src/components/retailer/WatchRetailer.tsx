'use client';

import { useActionState } from 'react';
import { watchRetailerAction } from '@/data/member-actions';
import { IDLE } from '@/data/member-action-state';

/**
 * Watch a whole retailer (PRD §25, §31, §43).
 *
 * Different intention from watching a product: "tell me when anything at this
 * store is worth buying", not "tell me when this item drops". There is
 * deliberately no target price field — a target price across an entire
 * catalogue would mean nothing.
 *
 * Renders for signed-out visitors and sends them to sign in with this page
 * remembered (§31). Gated off entirely when no database is configured rather
 * than shown doing nothing (§01), and it reports the outcome after the press
 * rather than changing nothing on screen.
 */
export function WatchRetailer({
  retailerSlug,
  returnTo,
  available,
}: {
  retailerSlug: string;
  returnTo: string;
  available: boolean;
}) {
  const [state, watch, pending] = useActionState(watchRetailerAction, IDLE);

  if (!available) {
    return (
      <p className="mt-8 max-w-[42ch] text-[0.75rem] leading-snug text-ink-50">
        Watching a retailer needs an account, and accounts need a database that isn’t configured
        here. The control is left off rather than shown doing nothing.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <form action={watch}>
        <input type="hidden" name="retailerSlug" value={retailerSlug} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          disabled={pending}
          className="on-pink inline-flex min-h-[44px] items-center px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white disabled:opacity-50"
        >
          {pending ? 'Adding' : 'Watch this retailer'}
        </button>
      </form>

      {state.notice ? (
        <p
          role="status"
          className="measure mt-3 border-l-2 border-pink-ink bg-wash px-4 py-2.5 text-[0.875rem] leading-snug"
        >
          {state.notice}
        </p>
      ) : (
        <p className="mt-2.5 max-w-[42ch] text-[0.75rem] leading-snug text-ink-50">
          We’ll tell you when something here is genuinely worth buying — not when they run a sale.
        </p>
      )}
    </div>
  );
}
