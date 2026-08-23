import { watchRetailerAction } from '@/data/member-actions';
import { memberFeaturesAvailable } from '@/data/member-repository';

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
 * than shown doing nothing (§01).
 */
export function WatchRetailer({ retailerSlug, returnTo }: { retailerSlug: string; returnTo: string }) {
  if (!memberFeaturesAvailable) {
    return (
      <p className="mt-8 max-w-[42ch] text-[0.75rem] leading-snug text-ink-50">
        Watching a retailer needs an account, and accounts need a database that isn’t configured
        here. The control is left off rather than shown doing nothing.
      </p>
    );
  }

  return (
    <form action={watchRetailerAction} className="mt-8">
      <input type="hidden" name="retailerSlug" value={retailerSlug} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className="on-pink inline-flex min-h-[44px] items-center px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white"
      >
        Watch this retailer
      </button>
      <p className="mt-2.5 max-w-[42ch] text-[0.75rem] leading-snug text-ink-50">
        We’ll tell you when something here is genuinely worth buying — not when they run a sale.
      </p>
    </form>
  );
}
