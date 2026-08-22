'use client';

import { useActionState, useState } from 'react';
import { unsubscribeAction, setCadenceAction, type ManageState } from '@/newsletter/actions';

/**
 * Unsubscribing is one click and takes effect immediately (§40).
 *
 * No "are you sure", no survey, no offer to reduce frequency instead. Making
 * somebody argue their way out of a mailing list is how a newsletter earns a
 * spam complaint rather than a clean unsubscribe.
 */
export function UnsubscribeControls({ token, cadence }: { token: string; cadence: string }) {
  const initial: ManageState = { error: null, done: null };
  const [unsubState, unsub, unsubbing] = useActionState(unsubscribeAction, initial);
  const [cadenceState, changeCadence, changing] = useActionState(setCadenceAction, initial);
  const [choice, setChoice] = useState(cadence);

  const state = unsubState.done || unsubState.error ? unsubState : cadenceState;

  return (
    <div className="grid gap-10 sm:grid-cols-2">
      {(state.error || state.done) && (
        <p role="status" className="sm:col-span-2 border-l-2 border-ink bg-wash px-4 py-2 text-[0.875rem]">
          {state.error ?? state.done}
        </p>
      )}

      <form action={changeCadence}>
        <input type="hidden" name="token" value={token} />
        <label htmlFor="cadence" className="eyebrow block text-ink-50">How often</label>
        <select
          id="cadence"
          name="cadence"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className="mt-3 min-h-[44px] w-full border-b border-ink bg-transparent pb-1 text-[0.9375rem] outline-none"
        >
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="ALERTS_ONLY">Only when something changes</option>
        </select>
        <button
          type="submit"
          disabled={changing}
          className="mt-5 inline-flex min-h-[44px] items-center border border-ink px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] disabled:opacity-50"
        >
          {changing ? 'Saving' : 'Save'}
        </button>
      </form>

      <form action={unsub}>
        <input type="hidden" name="token" value={token} />
        <p className="eyebrow text-ink-50">Leave the list</p>
        <p className="mt-3 max-w-[34ch] text-[0.8125rem] leading-relaxed text-ink-70">
          One click, effective immediately. We will not ask you to reconsider.
        </p>
        <button
          type="submit"
          disabled={unsubbing}
          className="mt-5 inline-flex min-h-[44px] items-center border border-ink px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] disabled:opacity-50"
        >
          {unsubbing ? 'Working' : 'Unsubscribe'}
        </button>
      </form>
    </div>
  );
}
