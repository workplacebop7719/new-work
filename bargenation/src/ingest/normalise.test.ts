import { describe, it, expect } from 'vitest';
import {
  parsePriceCents, parseCurrency, parseAvailability, parseObservedAt,
  normaliseTitle, MAX_PLAUSIBLE_CENTS,
} from './normalise';

const NOW = new Date('2026-08-22T12:00:00Z');
const value = <T>(r: { ok: true; value: T } | { ok: false; reason: string }): T => {
  if (!r.ok) throw new Error(`expected ok, got: ${r.reason}`);
  return r.value;
};
const reason = (r: { ok: boolean; reason?: string }): string => {
  if (r.ok) throw new Error('expected a refusal');
  return r.reason!;
};

describe('prices we can read', () => {
  it.each([
    ['$34.99', 3499],
    ['34.99', 3499],
    ['£34.99', 3499],
    ['US$34.99', 3499],
    ['  $34.99  ', 3499],
    ['1,234.56', 123456],
    ['1.234,56', 123456],
    ['34,99', 3499],
    ['0.50', 50],
    ['7', 700],
  ])('%s -> %s cents', (input, cents) => {
    expect(value(parsePriceCents(input))).toBe(cents);
  });

  it('accepts an integer already in cents', () => {
    expect(value(parsePriceCents(3499))).toBe(3499);
  });
});

describe('prices we refuse rather than guess at', () => {
  /**
   * The one that matters most. "1,234" is 1234 in the US and 1.234 in much of
   * Europe. Picking the more likely reading would be inventing a price, and
   * price history is append-only — a wrong guess is permanent.
   */
  it('refuses an ambiguous thousands separator instead of picking a locale', () => {
    expect(reason(parsePriceCents('1,234'))).toMatch(/ambiguous/i);
  });

  it.each([
    ['from $20', /range|approx/i],
    ['as low as $9.99', /range|approx/i],
    ['$20 - $40', /range/i],
    ['$20–$40', /range/i],
    ['Call for price', /not numeric/i],
    ['', /empty/i],
    ['-$5.00', /negative/i],
    ['$0.00', /zero/i],
    ['1.2.3', /decimal format/i],
    ['12,34,56', /comma grouping/i],
  ])('refuses %s', (input, pattern) => {
    expect(reason(parsePriceCents(input))).toMatch(pattern);
  });

  it('refuses a missing price rather than defaulting to zero', () => {
    expect(reason(parsePriceCents(null))).toMatch(/missing/i);
    expect(reason(parsePriceCents(undefined))).toMatch(/missing/i);
  });

  it('refuses a float that is not already cents', () => {
    // 34.99 as a number is almost certainly dollars, and silently treating it
    // as 34 cents — or as 3499 — would both be guesses.
    expect(reason(parsePriceCents(34.99))).toMatch(/integer cents/i);
  });

  it('refuses sub-cent precision instead of rounding it away', () => {
    expect(reason(parsePriceCents('34.999'))).toMatch(/sub-cent/i);
  });

  it('refuses an implausibly large amount', () => {
    expect(reason(parsePriceCents(MAX_PLAUSIBLE_CENTS + 1))).toMatch(/implausibly large/i);
  });

  /** Feed placeholders would otherwise enter history as a genuine record low. */
  it.each([0.01, 9999.99, 99999.99])('refuses the placeholder %s', (dollars) => {
    expect(parsePriceCents(String(dollars.toFixed(2))).ok).toBe(false);
  });

  it('refuses NaN and Infinity', () => {
    expect(parsePriceCents(NaN).ok).toBe(false);
    expect(parsePriceCents(Infinity).ok).toBe(false);
  });
});

describe('currency is never converted', () => {
  it('accepts a supported currency', () => {
    expect(value(parseCurrency('usd'))).toBe('USD');
  });

  /**
   * Converting would make a recorded price depend on the exchange rate at the
   * moment we looked, so the same offer would have different history depending
   * on when it was ingested.
   */
  it('refuses other currencies rather than converting them', () => {
    for (const code of ['GBP', 'EUR', 'CAD', 'JPY']) {
      expect(reason(parseCurrency(code))).toMatch(/unsupported/i);
    }
  });

  it('refuses a missing currency', () => {
    expect(parseCurrency(null).ok).toBe(false);
    expect(parseCurrency('').ok).toBe(false);
  });
});

describe('availability', () => {
  it.each(['in stock', 'InStock', 'available', 'yes', 'true'])('%s is available', (v) => {
    expect(value(parseAvailability(v))).toBe(true);
  });
  it.each(['out of stock', 'OutOfStock', 'unavailable', 'no'])('%s is not', (v) => {
    expect(value(parseAvailability(v))).toBe(false);
  });
  it('passes a boolean through', () => {
    expect(value(parseAvailability(false))).toBe(false);
  });
  it('refuses states we have not modelled rather than flattening them', () => {
    expect(reason(parseAvailability('preorder'))).toMatch(/not modelled/i);
    expect(reason(parseAvailability('discontinued'))).toMatch(/not modelled/i);
  });
  it('refuses anything unrecognised', () => {
    expect(parseAvailability('probably?').ok).toBe(false);
  });
});

describe('timestamps', () => {
  it('accepts an ISO instant', () => {
    expect(value(parseObservedAt('2026-08-22T09:00:00Z', NOW))).toBe('2026-08-22T09:00:00.000Z');
  });
  it('tolerates small clock skew', () => {
    const soon = new Date(NOW.getTime() + 60_000).toISOString();
    expect(parseObservedAt(soon, NOW).ok).toBe(true);
  });
  it('refuses a timestamp well in the future', () => {
    const later = new Date(NOW.getTime() + 3 * 3_600_000).toISOString();
    expect(reason(parseObservedAt(later, NOW))).toMatch(/future/i);
  });
  it('refuses an implausibly old timestamp', () => {
    expect(reason(parseObservedAt('1999-01-01T00:00:00Z', NOW))).toMatch(/implausibly old/i);
  });
  it('refuses junk', () => {
    expect(parseObservedAt('last tuesday', NOW).ok).toBe(false);
    expect(parseObservedAt(null, NOW).ok).toBe(false);
  });
});

describe('title normalisation is for matching only', () => {
  it('collapses case, punctuation and whitespace', () => {
    expect(normaliseTitle('  Trail-Runner   KIDS  Sneaker! ')).toBe('trail runner kids sneaker');
  });
  it('folds curly quotes', () => {
    expect(normaliseTitle('Kid’s Coat')).toBe("kid's coat");
  });
});
