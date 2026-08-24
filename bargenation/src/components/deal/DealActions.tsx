'use client';

import { useActionState } from 'react';
import { saveOfferAction, watchProductAction } from '@/data/member-actions';
import { IDLE, type MemberActionState } from '@/data/member-action-state';

/**
 * Save and Watch on a deal page (PRD §25, §27, §31).
 *
 * Two genuinely different intentions, presented as two different controls:
 *   Save  — "I want to remember this"
 *   Watch — "I want Bargenation monitoring this"
 *
 * These render for signed-out visitors too. Pressing one sends them to sign in
 * with this exact deal remembered, and back here afterwards — never to the
 * homepage (§31).
 *
 * EACH CONTROL NOW SAYS WHAT HAPPENED. It used to do the right thing in the
 * database and nothing visible on screen: this page is statically rendered, so
 * it has no session at build time and could not show a "saved" state. A
 * control that works silently is indistinguishable from one that is broken,
 * and the honest fix is not to guess the state on render but to report the
 * outcome after the press.
 *
 * The confirmations are worded for a repeat press, because the actions are
 * idempotent — "it's saved", not "it has been saved" — so pressing twice reads
 * as reassurance rather than as a second save.
 */
export function DealActions({
  offerId,
  productSlug,
  returnTo,
  available,
}: {
  offerId: string;
  productSlug: string;
  returnTo: string;
  /** False when no database is configured; the controls are then left off. */
  available: boolean;
}) {
  const [saveState, save, saving] = useActionState(saveOfferAction, IDLE);
  const [watchState, watch, watching] = useActionState(watchProductAction, IDLE);

  if (!available) {
    return (
      <p className="mt-8 max-w-[42ch] text-[0.75rem] leading-snug text-ink-50">
        Saving and watching need an account, and accounts need a database that isn’t configured
        here. The controls are left off rather than shown doing nothing.
      </p>
    );
  }

  return (
    <div className="mt-8">
      {/*
        Each control reports beside itself.
        A single shared message meant a fixed precedence had to pick a winner,
        and Save's confirmation then hid Watch's — so adding a target price
        looked like it had done nothing. Put the answer next to the button that
        was pressed and the question does not arise.
      */}
      <div className="flex flex-wrap items-start gap-4">
        <form action={save}>
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[44px] items-center border border-ink px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white disabled:opacity-50"
          >
            {saving ? 'Saving' : 'Save'}
          </button>
          <Outcome state={saveState} />
        </form>

        <form action={watch} className="flex flex-wrap items-start gap-3">
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
            disabled={watching}
            className="on-pink inline-flex min-h-[44px] items-center px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white disabled:opacity-50"
          >
            {watching ? 'Adding' : 'Watch'}
          </button>
          <Outcome state={watchState} className="basis-full" />
        </form>
      </div>

    </div>
  );
}

/**
 * What one control has to say for itself.
 *
 * role=status, not alert: a confirmation should be announced politely rather
 * than interrupting whatever a screen reader was part-way through. A refusal
 * uses the same role for the same reason — nothing here is urgent, and both
 * are read the moment the live region updates.
 */
function Outcome({
  state,
  className = '',
}: {
  state: MemberActionState;
  className?: string;
}) {
  const message = state.error ?? state.notice;
  if (!message) return null;

  return (
    <p
      role="status"
      className={[
        'measure mt-3 border-l-2 bg-wash px-4 py-2.5 text-[0.875rem] leading-snug',
        state.error ? 'border-ink' : 'border-pink-ink',
        className,
      ].join(' ')}
    >
      {message}
    </p>
  );
}
