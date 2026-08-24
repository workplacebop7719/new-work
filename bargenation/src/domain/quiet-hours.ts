/**
 * QUIET HOURS (PRD §36).
 *
 * When a customer does not want to be interrupted.
 *
 * THE RULE THAT SHAPES THIS: quiet hours DEFER DELIVERY. They never suppress
 * a signal. What happened to a price is a fact about the world, and the record
 * of it must not depend on when somebody sleeps — a price that crossed a
 * target at three in the morning crossed it at three in the morning, and the
 * portal should say so.
 *
 * So the sweep still evaluates, still records, and still shows the signal.
 * What quiet hours change is the moment it is allowed to leave the building.
 *
 * WHY A WINDOW THAT WRAPS IS THE NORMAL CASE. Nobody sets quiet hours from
 * nine to five. The usual answer is "from ten at night until seven in the
 * morning", which crosses midnight — so the wrapping case is the one the code
 * is written around rather than the exception bolted on afterwards.
 *
 * This module is pure. It takes an instant and a preference and returns
 * another instant.
 */

export interface QuietHours {
  /** Local hour the quiet period starts, 0–23. */
  startHour: number;
  /** Local hour it ends, 0–23. Equal to startHour means the whole day. */
  endHour: number;
  /** IANA zone. Without one, "ten at night" means nothing. */
  timeZone: string;
}

export const DEFAULT_QUIET_HOURS: QuietHours = {
  startHour: 22,
  endHour: 7,
  timeZone: 'America/Toronto',
};

/** A zone we can actually resolve. An unknown one must not throw at 3am. */
export function isUsableTimeZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || zone.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function isValidQuietHours(value: unknown): value is QuietHours {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<QuietHours>;
  return Number.isInteger(candidate.startHour)
    && Number.isInteger(candidate.endHour)
    && (candidate.startHour as number) >= 0 && (candidate.startHour as number) <= 23
    && (candidate.endHour as number) >= 0 && (candidate.endHour as number) <= 23
    && isUsableTimeZone(candidate.timeZone);
}

/**
 * The wall-clock hour and minute at an instant, in a given zone.
 *
 * Uses Intl rather than an offset calculation, so daylight saving is handled
 * by the platform's own tz database instead of arithmetic that is wrong twice
 * a year.
 */
function localParts(at: Date, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(at);

  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  // Intl renders midnight as 24 in some locales; normalise it.
  return { hour: value('hour') % 24, minute: value('minute') };
}

/** Whether an instant falls inside the quiet window. */
export function isQuiet(at: Date, quiet: QuietHours): boolean {
  const { hour } = localParts(at, quiet.timeZone);
  const { startHour, endHour } = quiet;

  // Start equal to end is the whole day: somebody who wants no interruptions
  // at all should be able to say so without a separate switch.
  if (startHour === endHour) return true;

  return startHour < endHour
    ? hour >= startHour && hour < endHour
    // The wrapping case — 22 to 7 — which is what people actually set.
    : hour >= startHour || hour < endHour;
}

/**
 * When a signal recorded at `at` may be delivered.
 *
 * Returns `at` itself outside quiet hours, so the ordinary path costs nothing.
 * Inside them it returns the next moment the window ends, to the minute.
 *
 * Never returns a time in the past, and never loops: the search is bounded to
 * the number of hours in a day plus one, because a window that never ends
 * would otherwise spin here forever rather than failing visibly.
 */
export function deliverableAt(at: Date, quiet: QuietHours | null): Date {
  if (!quiet || !isValidQuietHours(quiet)) return at;
  if (quiet.startHour === quiet.endHour) {
    // The whole day is quiet. There is no "later" that is not also quiet, so
    // this defers nothing rather than deferring forever — a customer who
    // silences everything still has a portal to read.
    return at;
  }
  if (!isQuiet(at, quiet)) return at;

  const { minute } = localParts(at, quiet.timeZone);
  // Step to the top of the next hour, then hour by hour until the window ends.
  let cursor = new Date(at.getTime() + (60 - minute) * 60_000);
  cursor.setSeconds(0, 0);

  for (let step = 0; step <= 24; step++) {
    if (!isQuiet(cursor, quiet)) return cursor;
    cursor = new Date(cursor.getTime() + 60 * 60_000);
  }

  // Unreachable while start !== end. Returning `at` is the safe failure: a
  // signal delivered too early is a nuisance, one deferred forever is a bug
  // nobody would ever see.
  return at;
}

/** Human phrasing for the portal, e.g. "10pm to 7am". */
export function describeQuietHours(quiet: QuietHours): string {
  const clock = (hour: number) => {
    const suffix = hour < 12 ? 'am' : 'pm';
    const twelve = hour % 12 === 0 ? 12 : hour % 12;
    return `${twelve}${suffix}`;
  };
  if (quiet.startHour === quiet.endHour) return 'all day';
  return `${clock(quiet.startHour)} to ${clock(quiet.endHour)}`;
}
