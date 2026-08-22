import { saveOfferAction, watchProductAction } from '@/data/member-actions';
import { memberFeaturesAvailable } from '@/data/member-repository';

/**
 * Save and Watch on a deal page (PRD §25, §27, §31).
 *
 * Two genuinely different intentions, presented as two different controls:
 *   Save  — "I want to remember this"
 *   Watch — "I want Bargenation monitoring this"
 *
 * These render for signed-out visitors too. Pressing one sends them to sign in
 * with this exact deal remembered, and back here afterwards — never to the
 * homepage (§31). We do not show "already saved" state because this page is
 * statically rendered and has no session at build time; the actions are
 * idempotent so pressing twice is harmless.
 */
export function DealActions({
  offerId,
  productSlug,
  returnTo,
}: {
  offerId: string;
  productSlug: string;
  returnTo: string;
}) {
  if (!memberFeaturesAvailable) {
    return (
      <p className="mt-8 max-w-[42ch] text-[0.75rem] leading-snug text-ink-50">
        Saving and watching need an account, and accounts need a database that isn’t configured
        here. The controls are left off rather than shown doing nothing.
      </p>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap items-start gap-4">
      <form action={saveOfferAction}>
        <input type="hidden" name="offerId" value={offerId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center border border-ink px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white"
        >
          Save
        </button>
      </form>

      <form action={watchProductAction} className="flex flex-wrap items-start gap-3">
        <input type="hidden" name="productSlug" value={productSlug} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <div>
          <label htmlFor="targetPrice" className="sr-only">
            Tell me when it drops below (optional)
          </label>
          <input
            id="targetPrice"
            name="targetPrice"
            type="text"
            inputMode="decimal"
            placeholder="Target price"
            className="min-h-[44px] w-[9rem] border-b border-ink bg-transparent px-1 pb-1 text-[0.9375rem] outline-none placeholder:text-ink-50"
          />
        </div>
        <button
          type="submit"
          className="on-pink inline-flex min-h-[44px] items-center px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white"
        >
          Watch
        </button>
      </form>
    </div>
  );
}
