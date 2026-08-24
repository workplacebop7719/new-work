'use client';

import { useState } from 'react';
import { setQuietHoursAction } from '@/data/member-actions';
import { DEFAULT_QUIET_HOURS, describeQuietHours, type QuietHours } from '@/domain/quiet-hours';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const label = (hour: number) => {
  const suffix = hour < 12 ? 'am' : 'pm';
  return `${hour % 12 === 0 ? 12 : hour % 12}${suffix}`;
};

/**
 * Quiet hours (PRD §36).
 *
 * The zone is read from the browser rather than asked for. Somebody who has
 * just told us "not after ten at night" should not then have to find
 * themselves in a list of four hundred time zones — and a zone typed from
 * memory is likelier to be wrong than one the machine already knows.
 *
 * It is shown, not hidden, because "10pm to 7am" means nothing without it and
 * a laptop that has travelled will report somewhere unexpected.
 */
export function QuietHoursForm({ current }: { current: QuietHours | null }) {
  const [start, setStart] = useState(current?.startHour ?? DEFAULT_QUIET_HOURS.startHour);
  const [end, setEnd] = useState(current?.endHour ?? DEFAULT_QUIET_HOURS.endHour);

  const browserZone =
    typeof Intl === 'undefined' ? '' : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zone = current?.timeZone ?? browserZone ?? DEFAULT_QUIET_HOURS.timeZone;

  const select =
    'min-h-[44px] border-b border-ink bg-transparent pb-1 text-[0.9375rem] text-ink outline-none focus-visible:border-pink-ink';

  return (
    <div>
      {current ? (
        <p className="text-[0.9375rem] text-ink">
          Nothing is sent between{' '}
          <span className="font-medium">{describeQuietHours(current)}</span>, {current.timeZone}.
        </p>
      ) : (
        <p className="text-[0.9375rem] text-ink-70">
          Signals can reach you at any hour.
        </p>
      )}

      <form action={setQuietHoursAction} className="mt-5 flex flex-wrap items-end gap-5">
        <input type="hidden" name="enabled" value="true" />
        <input type="hidden" name="timeZone" value={zone} />

        <div>
          <label htmlFor="quiet-start" className="eyebrow block text-ink-50">From</label>
          <select
            id="quiet-start"
            name="startHour"
            value={start}
            onChange={(event) => setStart(Number(event.target.value))}
            className={select}
          >
            {HOURS.map((hour) => <option key={hour} value={hour}>{label(hour)}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="quiet-end" className="eyebrow block text-ink-50">Until</label>
          <select
            id="quiet-end"
            name="endHour"
            value={end}
            onChange={(event) => setEnd(Number(event.target.value))}
            className={select}
          >
            {HOURS.map((hour) => <option key={hour} value={hour}>{label(hour)}</option>)}
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center border border-ink px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white"
        >
          {current ? 'Update' : 'Set quiet hours'}
        </button>
      </form>

      <p className="measure mt-3 text-[0.75rem] leading-snug text-ink-50">
        Your device says you’re in {zone}. Quiet hours defer delivery — they never hide a signal.
        Everything still appears in Deal Signals the moment it happens, so you can see what you
        slept through.
      </p>

      {current && (
        <form action={setQuietHoursAction} className="mt-4">
          <input type="hidden" name="enabled" value="false" />
          <button
            type="submit"
            className="min-h-[44px] text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-70 hover:text-ink"
          >
            Turn quiet hours off
          </button>
        </form>
      )}
    </div>
  );
}
