import { unwatchAction, toggleWatchPausedAction } from '@/data/member-actions';

export function WatchlistControls({ itemId, paused }: { itemId: string; paused: boolean }) {
  return (
    <div className="flex shrink-0 gap-5">
      <form action={toggleWatchPausedAction}>
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="paused" value={String(paused)} />
        <button
          type="submit"
          className="min-h-[44px] text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-70 hover:text-ink"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </form>
      <form action={unwatchAction}>
        <input type="hidden" name="itemId" value={itemId} />
        <button
          type="submit"
          className="min-h-[44px] text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-70 hover:text-ink"
        >
          Remove
        </button>
      </form>
    </div>
  );
}
