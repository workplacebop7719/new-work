'use client';

import { useActionState, useState } from 'react';
import { resolveMatchAction, type ActionState } from '@/data/admin-actions';
import type { ReviewItem } from '@/data/admin-repository';

/**
 * One ambiguous record, with the candidates the matcher could not choose
 * between and their similarity scores.
 *
 * The scores are shown because they are the actual reason this is here. An
 * operator seeing "0.89 and 0.89" understands instantly why the machine
 * declined, and that they are being asked to supply information the titles do
 * not contain — not to rubber-stamp a guess.
 *
 * Every option requires a written reason, because the answer becomes a
 * standing alias that silently redirects future records.
 *
 * The inputs are CONTROLLED deliberately. React 19 resets uncontrolled fields
 * after a form action runs, so a failed validation was wiping both the radio
 * selection and the reason the operator had just typed — they would lose their
 * work every time they got something slightly wrong. Found by driving the form
 * in a browser; the server action was correct throughout.
 */
export function ReviewCard({ item }: { item: ReviewItem }) {
  const [state, resolve, pending] = useActionState<ActionState, FormData>(
    resolveMatchAction,
    { error: null, done: null },
  );
  // No reset effect: once state.done is set the whole form is unmounted below,
  // so clearing these would be a cascading render for no visible effect.
  const [choice, setChoice] = useState('');
  const [reason, setReason] = useState('');

  const title = typeof item.raw.title === 'string' ? item.raw.title : '(no title)';
  const price = typeof item.raw.price === 'string' ? item.raw.price : null;

  return (
    <li className="border-t border-line py-7">
      <p className="eyebrow text-ink-50">
        {item.sourceName}
        {item.retailerSlug && ` · ${item.retailerSlug}`}
        {' · '}
        {new Date(item.createdAt).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </p>
      <p className="display display-sm mt-1.5">{title}</p>
      {price && <p className="mt-1 text-[0.875rem] text-ink-70">Listed at {price}</p>}
      <p className="mt-2 text-[0.8125rem] text-ink-70">{item.reason}</p>

      {(state.error || state.done) && (
        <p role="status" className="mt-4 border-l-2 border-ink bg-wash px-4 py-2 text-[0.8125rem]">
          {state.error ?? state.done}
        </p>
      )}

      {!state.done && (
        <form action={resolve} className="mt-6 max-w-[46rem]">
          <input type="hidden" name="rejectionId" value={item.id} />

          <fieldset>
            <legend className="eyebrow text-ink-50">Which product is this?</legend>
            <div className="mt-4 space-y-2">
              {item.candidates.map((c) => (
                <label
                  key={c.id}
                  className="flex items-baseline gap-3 border-b border-line pb-2 text-[0.9375rem]"
                >
                  <input
                    type="radio"
                    name="choice"
                    value={`product:${c.id}`}
                    checked={choice === `product:${c.id}`}
                    onChange={(e) => setChoice(e.target.value)}
                    className="mt-1"
                  />
                  <span className="flex-1">{c.title}</span>
                  <span className="numeral shrink-0 text-[0.8125rem] text-ink-50 tabular">
                    {c.confidence.toFixed(2)}
                  </span>
                </label>
              ))}

              <label className="flex items-baseline gap-3 border-b border-line pb-2 text-[0.9375rem]">
                <input
                  type="radio"
                  name="choice"
                  value="NEW_PRODUCT"
                  checked={choice === 'NEW_PRODUCT'}
                  onChange={(e) => setChoice(e.target.value)}
                  className="mt-1"
                />
                <span>None of these — it is a product we do not track yet</span>
              </label>

              <label className="flex items-baseline gap-3 pb-2 text-[0.9375rem] text-ink-70">
                <input
                  type="radio"
                  name="choice"
                  value="DISMISSED"
                  checked={choice === 'DISMISSED'}
                  onChange={(e) => setChoice(e.target.value)}
                  className="mt-1"
                />
                <span>Dismiss without deciding — no alias is recorded, so this may return</span>
              </label>
            </div>
          </fieldset>

          <div className="mt-6">
            <label htmlFor={`reason-${item.id}`} className="eyebrow text-ink-50">
              Why — this becomes a standing rule
            </label>
            <input
              id={`reason-${item.id}`}
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 min-h-[44px] w-full border-b border-ink bg-transparent pb-1 text-[0.9375rem] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-6 inline-flex min-h-[44px] items-center border border-ink px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] disabled:opacity-50"
          >
            {pending ? 'Working' : 'Resolve'}
          </button>
          <p className="mt-2 max-w-[52ch] text-[0.6875rem] leading-snug text-ink-50">
            The held price is not backfilled — it may be days old by now, and a stale price in an
            append-only record cannot be corrected. The next run will pick this up at a current
            price.
          </p>
        </form>
      )}
    </li>
  );
}
