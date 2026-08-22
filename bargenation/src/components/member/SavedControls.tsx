import { unsaveOfferAction } from '@/data/member-actions';

export function SavedControls({ offerId }: { offerId: string }) {
  return (
    <form action={unsaveOfferAction} className="shrink-0">
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="returnTo" value="/app/saved" />
      <button
        type="submit"
        className="min-h-[44px] text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-70 hover:text-ink"
      >
        Remove
      </button>
    </form>
  );
}
