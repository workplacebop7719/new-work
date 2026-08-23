'use client';

import { useRef } from 'react';
import { setWatchForAction } from '@/data/member-actions';
import type { HouseholdMemberRow } from '@/data/member-repository';

/**
 * Who a watch is for (PRD §35).
 *
 * Submits on change rather than behind a Save button. There is one field and
 * changing it is the entire intent — a second click to confirm a choice
 * already made is friction with nothing on the other side of it.
 *
 * Somebody with no household sees nothing here rather than an empty menu,
 * because an empty control invites a click that cannot do anything (§01).
 */
export function WatchFor({
  itemId,
  members,
  selectedId,
}: {
  itemId: string;
  members: HouseholdMemberRow[];
  selectedId: string | null;
}) {
  const form = useRef<HTMLFormElement>(null);
  if (members.length === 0) return null;

  const id = `watch-for-${itemId}`;

  return (
    <form action={setWatchForAction} ref={form} className="mt-3">
      <input type="hidden" name="itemId" value={itemId} />
      <label htmlFor={id} className="sr-only">Who this is for</label>
      <select
        id={id}
        name="memberId"
        defaultValue={selectedId ?? ''}
        onChange={() => form.current?.requestSubmit()}
        className="min-h-[44px] border-b border-line-strong bg-transparent pb-1 text-[0.8125rem] text-ink-70 outline-none focus-visible:border-pink-ink"
      >
        <option value="">For nobody in particular</option>
        {members.map((person) => (
          <option key={person.id} value={person.id}>
            For {person.nickname ?? 'someone in the household'}
            {person.clothingSize ? ` · ${person.clothingSize}` : ''}
          </option>
        ))}
      </select>
      {/* Works without JavaScript too: the change handler is an enhancement. */}
      <noscript>
        <button type="submit" className="ml-3 text-[0.6875rem] uppercase tracking-[0.14em]">
          Save
        </button>
      </noscript>
    </form>
  );
}
