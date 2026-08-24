/**
 * The valuable tests here are about the wrapping window and about daylight
 * saving, because those are the two ways "do not disturb me at night" quietly
 * stops working.
 */
import { describe, it, expect } from 'vitest';
import {
  isQuiet, deliverableAt, describeQuietHours, isValidQuietHours, isUsableTimeZone,
  DEFAULT_QUIET_HOURS, type QuietHours,
} from './quiet-hours';

const TORONTO: QuietHours = { startHour: 22, endHour: 7, timeZone: 'America/Toronto' };
/** Toronto is UTC-4 in summer, so 02:00Z is 22:00 the previous evening. */
const at = (iso: string) => new Date(iso);

describe('a window that crosses midnight', () => {
  it.each([
    ['just after it starts', '2026-07-15T02:30:00Z', true],
    ['the middle of the night', '2026-07-15T05:00:00Z', true],
    ['just before it ends', '2026-07-15T10:59:00Z', true],
    ['the moment it ends', '2026-07-15T11:00:00Z', false],
    ['the middle of the day', '2026-07-15T16:00:00Z', false],
    ['just before it starts', '2026-07-15T01:59:00Z', false],
  ])('%s', (_label, iso, quiet) => {
    expect(isQuiet(at(iso), TORONTO)).toBe(quiet);
  });
});

describe('a window that does not cross midnight', () => {
  const daytime: QuietHours = { startHour: 9, endHour: 17, timeZone: 'America/Toronto' };

  it('is quiet inside it and loud outside', () => {
    expect(isQuiet(at('2026-07-15T14:00:00Z'), daytime)).toBe(true);  // 10am
    expect(isQuiet(at('2026-07-15T02:00:00Z'), daytime)).toBe(false); // 10pm
  });
});

describe('deferring delivery', () => {
  it('does not defer at all outside quiet hours', () => {
    const noon = at('2026-07-15T16:00:00Z');
    expect(deliverableAt(noon, TORONTO)).toEqual(noon);
  });

  it('defers to the end of the window', () => {
    // 02:30Z is 10:30pm Toronto. The window ends at 7am, which is 11:00Z.
    const deferred = deliverableAt(at('2026-07-15T02:30:00Z'), TORONTO);
    expect(deferred.toISOString()).toBe('2026-07-15T11:00:00.000Z');
  });

  it('never defers into the past', () => {
    const moment = at('2026-07-15T05:00:00Z');
    expect(deliverableAt(moment, TORONTO).getTime()).toBeGreaterThan(moment.getTime());
  });

  it('lands on a moment that is genuinely no longer quiet', () => {
    for (const iso of [
      '2026-07-15T02:05:00Z', '2026-07-15T04:00:00Z', '2026-07-15T10:59:00Z',
    ]) {
      expect(isQuiet(deliverableAt(at(iso), TORONTO), TORONTO)).toBe(false);
    }
  });

  it('does nothing when there are no quiet hours set', () => {
    const moment = at('2026-07-15T05:00:00Z');
    expect(deliverableAt(moment, null)).toEqual(moment);
  });

  /**
   * A whole-day window has no "later" that is not also quiet. Deferring
   * forever would be a bug nobody could see; the signal is recorded and the
   * portal still shows it.
   */
  it('does not defer forever when every hour is quiet', () => {
    const always: QuietHours = { startHour: 0, endHour: 0, timeZone: 'America/Toronto' };
    const moment = at('2026-07-15T05:00:00Z');
    expect(isQuiet(moment, always)).toBe(true);
    expect(deliverableAt(moment, always)).toEqual(moment);
  });

  /**
   * DAYLIGHT SAVING. The clocks go forward in Toronto on 8 March 2026 at 2am
   * local, so 2am–3am does not exist that night. Arithmetic on a fixed offset
   * gets this wrong twice a year; Intl does not.
   */
  it('survives the night the clocks go forward', () => {
    const duringSpringForward = at('2026-03-08T06:30:00Z'); // 1:30am EST
    expect(isQuiet(duringSpringForward, TORONTO)).toBe(true);

    const deferred = deliverableAt(duringSpringForward, TORONTO);
    expect(isQuiet(deferred, TORONTO)).toBe(false);
    // 7am EDT is 11:00Z — the missing hour has not pushed it to 12:00Z.
    expect(deferred.toISOString()).toBe('2026-03-08T11:00:00.000Z');
  });

  it('survives the night the clocks go back', () => {
    const duringFallBack = at('2026-11-01T05:30:00Z'); // 1:30am, the repeated hour
    expect(isQuiet(duringFallBack, TORONTO)).toBe(true);
    expect(isQuiet(deliverableAt(duringFallBack, TORONTO), TORONTO)).toBe(false);
  });

  it('respects a zone on the other side of the world', () => {
    const tokyo: QuietHours = { startHour: 22, endHour: 7, timeZone: 'Asia/Tokyo' };
    // 15:00Z is midnight in Tokyo — quiet there, mid-morning in Toronto.
    const moment = at('2026-07-15T15:00:00Z');
    expect(isQuiet(moment, tokyo)).toBe(true);
    expect(isQuiet(moment, TORONTO)).toBe(false);
  });
});

describe('refusing a preference we cannot honour', () => {
  it('accepts the default', () => {
    expect(isValidQuietHours(DEFAULT_QUIET_HOURS)).toBe(true);
  });

  it.each([
    ['nothing', null],
    ['an empty object', {}],
    ['an hour out of range', { startHour: 24, endHour: 7, timeZone: 'America/Toronto' }],
    ['a negative hour', { startHour: -1, endHour: 7, timeZone: 'America/Toronto' }],
    ['a fractional hour', { startHour: 22.5, endHour: 7, timeZone: 'America/Toronto' }],
    ['a made-up zone', { startHour: 22, endHour: 7, timeZone: 'Middle/Earth' }],
    ['no zone at all', { startHour: 22, endHour: 7 }],
  ])('refuses %s', (_label, value) => {
    expect(isValidQuietHours(value)).toBe(false);
  });

  /** An unknown zone must not throw in a batch job at three in the morning. */
  it('treats an unusable preference as none rather than raising', () => {
    const moment = at('2026-07-15T05:00:00Z');
    const broken = { startHour: 22, endHour: 7, timeZone: 'Middle/Earth' } as QuietHours;
    expect(() => deliverableAt(moment, broken)).not.toThrow();
    expect(deliverableAt(moment, broken)).toEqual(moment);
  });

  it('knows a real zone from a plausible-looking one', () => {
    expect(isUsableTimeZone('Europe/Paris')).toBe(true);
    expect(isUsableTimeZone('America/Nowhere')).toBe(false);
    expect(isUsableTimeZone(42)).toBe(false);
  });
});

describe('saying it back to the customer', () => {
  it('reads like a person wrote it', () => {
    expect(describeQuietHours(TORONTO)).toBe('10pm to 7am');
    expect(describeQuietHours({ ...TORONTO, startHour: 0, endHour: 12 })).toBe('12am to 12pm');
  });

  it('says so when the whole day is quiet', () => {
    expect(describeQuietHours({ ...TORONTO, startHour: 9, endHour: 9 })).toBe('all day');
  });
});
