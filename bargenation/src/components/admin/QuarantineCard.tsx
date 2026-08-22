'use client';

import { useActionState } from 'react';
import { releaseQuarantineAction, discardQuarantineAction, type ActionState } from '@/data/admin-actions';
import type { HeldObservation } from '@/data/admin-repository';

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

/**
 * One held observation, with the evidence needed to judge it.
 *
 * Both controls demand a written reason. These decisions are recorded
 * permanently and "why" is the only part that cannot be reconstructed
 * afterwards from the data itself.
 *
 * Release is NOT styled as the primary action, deliberately. It writes into an
 * append-only record and cannot be undone by anyone, and making the
 * irreversible choice the most inviting button on the screen is how people end
 * up clicking it. Both controls are outlined; the difference is carried by the
 * warning beneath, not by colour weight.
 */
export function QuarantineCard({ held, canRelease }: { held: HeldObservation; canRelease: boolean }) {
  const initial: ActionState = { error: null, done: null };
  const [releaseState, release, releasing] = useActionState(releaseQuarantineAction, initial);
  const [discardState, discard, discarding] = useActionState(discardQuarantineAction, initial);

  const state = releaseState.error || releaseState.done ? releaseState : discardState;
  const drop =
    held.lastRecordedCents && held.lastRecordedCents > 0
      ? Math.round((1 - held.priceCents / held.lastRecordedCents) * 100)
      : null;

  return (
    <li className="border-t border-line py-7">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow text-ink-50">{held.retailerName} · {held.sourceName}</p>
          <p className="display display-sm mt-1.5">{held.productName}</p>
        </div>
        <p className="numeral text-[1.5rem]">{usd(held.priceCents)}</p>
      </div>

      <p className="mt-3 max-w-[60ch] text-[0.875rem] leading-snug text-ink-70">
        {held.reason}.{' '}
        {held.lastRecordedCents !== null && (
          <>
            Last recorded {usd(held.lastRecordedCents)}
            {drop !== null && drop > 0 && ` — a ${drop}% fall`}.
          </>
        )}
      </p>

      {/*
        The stored reason describes why this was held AT THE TIME. If the
        recorded price has since moved below it, the original concern no longer
        describes the situation, and an operator reading a stale explanation
        next to contradictory numbers would reasonably be confused.
      */}
      {held.lastRecordedCents !== null && held.lastRecordedCents < held.priceCents && (
        <p className="mt-2 max-w-[60ch] text-[0.8125rem] leading-snug text-ink">
          Since this was held, a lower price has been recorded, so the reason above no longer
          describes the current situation. Judge it against {usd(held.lastRecordedCents)}.
        </p>
      )}

      {(state.error || state.done) && (
        <p
          role="status"
          className="mt-4 border-l-2 border-ink bg-wash px-4 py-2 text-[0.8125rem]"
        >
          {state.error ?? state.done}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <form action={discard} className="flex flex-col gap-2">
          <input type="hidden" name="heldId" value={held.id} />
          <label htmlFor={`discard-${held.id}`} className="eyebrow text-ink-50">
            Discard — why?
          </label>
          <input
            id={`discard-${held.id}`}
            name="reason"
            className="min-h-[44px] border-b border-ink bg-transparent pb-1 text-[0.9375rem] outline-none"
          />
          <button
            type="submit"
            disabled={discarding}
            className="mt-2 inline-flex min-h-[44px] items-center justify-center border border-ink px-4 text-[0.75rem] font-semibold uppercase tracking-[0.08em] disabled:opacity-50"
          >
            {discarding ? 'Working' : 'Discard'}
          </button>
        </form>

        <form action={release} className="flex flex-col gap-2">
          <input type="hidden" name="heldId" value={held.id} />
          <label htmlFor={`release-${held.id}`} className="eyebrow text-ink-50">
            Release — why?
          </label>
          <input
            id={`release-${held.id}`}
            name="reason"
            disabled={!canRelease}
            className="min-h-[44px] border-b border-ink bg-transparent pb-1 text-[0.9375rem] outline-none disabled:border-line-strong"
          />
          <button
            type="submit"
            disabled={releasing || !canRelease}
            className="mt-2 inline-flex min-h-[44px] items-center justify-center border border-ink px-4 text-[0.75rem] font-semibold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:border-line-strong disabled:text-ink-50"
          >
            {releasing ? 'Working' : 'Release'}
          </button>
          <p className="text-[0.6875rem] leading-snug text-ink-50">
            {canRelease
              ? 'Writes to the permanent record. Cannot be undone.'
              : 'Releasing needs an admin account.'}
          </p>
        </form>
      </div>
    </li>
  );
}
