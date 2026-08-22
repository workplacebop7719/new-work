/**
 * EXTRACTION / NORMALISATION (PRD §46).
 *
 * Turns whatever a retailer feed hands us into facts we are willing to record.
 *
 * The governing rule is §45: never fabricate. That makes this module mostly a
 * collection of REFUSALS. Where an input is ambiguous — and retail price
 * strings are ambiguous surprisingly often — the answer is to reject the
 * record and say why, not to pick the more likely reading. A rejected record
 * costs us one row of coverage. A wrongly-parsed one enters an append-only
 * history we can never correct.
 */

export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const no = <T>(reason: string): Parsed<T> => ({ ok: false, reason });

/** Nothing we sell intelligence about legitimately costs more than this. */
export const MAX_PLAUSIBLE_CENTS = 100_000_00;

/**
 * Values retailers use to mean "no real price": placeholder rows, unmapped
 * SKUs, feed defaults. Recording one as a genuine low would poison the
 * history permanently.
 */
const PLACEHOLDER_CENTS = new Set([0, 1, 99, 100, 999_99, 9_999_99, 99_999_99]);

/**
 * Parses a price into integer cents.
 *
 * Handles the common shapes, and rejects the ambiguous ones:
 *
 *   "$34.99"      -> 3499
 *   "34,99"       -> 3499   (comma decimal, two trailing digits)
 *   "1,234.56"    -> 123456 (comma thousands, dot decimal)
 *   "1.234,56"    -> 123456 (dot thousands, comma decimal)
 *   "1,234"       -> REJECTED — could be 1234 or 1.234 depending on locale
 *   "from $20"    -> REJECTED — a range is not a price
 *   "Call for price" -> REJECTED
 */
export function parsePriceCents(raw: unknown): Parsed<number> {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return no('price is not a finite number');
    if (!Number.isInteger(raw)) return no('numeric price must already be in integer cents');
    return validateCents(raw);
  }
  if (typeof raw !== 'string') return no('price is missing');

  const text = raw.trim();
  if (text === '') return no('price is empty');

  // A range or an approximation is not a price we can record.
  if (/\b(from|as low as|starting|up to|between|or best)\b/i.test(text)) {
    return no('price is a range or approximation');
  }
  // A currency symbol commonly sits between the dash and the second figure
  // ("$20 - $40"), so allow one before matching the range shape.
  if (/\d\s*[-–—]\s*[$£€¥₹]?\s*\d/.test(text)) return no('price is a range');

  // Strip currency symbols, codes and spaces; keep digits and separators.
  const cleaned = text
    .replace(/[A-Za-z$£€¥₹]/g, '')
    .replace(/\s| /g, '')
    .trim();

  if (!/^-?[\d.,]+$/.test(cleaned) || !/\d/.test(cleaned)) {
    return no(`price is not numeric: ${text.slice(0, 40)}`);
  }
  if (cleaned.startsWith('-')) return no('price is negative');

  const dots = (cleaned.match(/\./g) ?? []).length;
  const commas = (cleaned.match(/,/g) ?? []).length;

  let normalised: string;

  if (dots > 0 && commas > 0) {
    // Whichever separator appears last is the decimal point.
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    normalised =
      lastDot > lastComma
        ? cleaned.replace(/,/g, '')
        : cleaned.replace(/\./g, '').replace(',', '.');
  } else if (commas > 0) {
    const [, tail = ''] = cleaned.split(/,(?=[^,]*$)/);
    if (commas === 1 && tail.length === 2) {
      normalised = cleaned.replace(',', '.');   // comma decimal
    } else if (tail.length === 3) {
      // "1,234" is genuinely ambiguous: 1234 in the US, 1.234 in much of
      // Europe. Guessing here would be inventing a price.
      return no(`ambiguous thousands separator: ${text.slice(0, 40)}`);
    } else {
      return no(`unrecognised comma grouping: ${text.slice(0, 40)}`);
    }
  } else if (dots > 1) {
    return no(`unrecognised decimal format: ${text.slice(0, 40)}`);
  } else {
    normalised = cleaned;
  }

  const amount = Number(normalised);
  if (!Number.isFinite(amount)) return no(`price could not be read: ${text.slice(0, 40)}`);

  // Reject sub-cent precision rather than rounding it away.
  const cents = Math.round(amount * 100);
  if (Math.abs(amount * 100 - cents) > 1e-6) {
    return no(`price has sub-cent precision: ${text.slice(0, 40)}`);
  }

  return validateCents(cents);
}

function validateCents(cents: number): Parsed<number> {
  if (cents < 0) return no('price is negative');
  if (cents === 0) return no('price is zero');
  if (cents > MAX_PLAUSIBLE_CENTS) return no('price is implausibly large');
  if (PLACEHOLDER_CENTS.has(cents)) return no('price looks like a feed placeholder');
  return ok(cents);
}

/** Currencies we can score. Anything else is rejected, never converted. */
const SUPPORTED_CURRENCIES = new Set(['USD']);

export function parseCurrency(raw: unknown): Parsed<'USD'> {
  if (typeof raw !== 'string') return no('currency is missing');
  const code = raw.trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(code)) return no(`unsupported currency: ${code || 'blank'}`);
  // No conversion: an exchange rate applied to a recorded price would make the
  // history depend on when we looked at it.
  return ok('USD');
}

export function parseAvailability(raw: unknown): Parsed<boolean> {
  if (typeof raw === 'boolean') return ok(raw);
  if (typeof raw !== 'string') return no('availability is missing');
  const v = raw.trim().toLowerCase();
  if (['in stock', 'instock', 'available', 'in_stock', 'yes', 'true'].includes(v)) return ok(true);
  if (['out of stock', 'outofstock', 'oos', 'unavailable', 'out_of_stock', 'no', 'false'].includes(v)) {
    return ok(false);
  }
  if (['preorder', 'pre-order', 'backorder', 'discontinued'].includes(v)) {
    // Knowably not purchasable now, but not the same as "out of stock", and we
    // do not have a state for it yet. Better to decline than to flatten it.
    return no(`availability state not modelled: ${v}`);
  }
  return no(`unrecognised availability: ${v.slice(0, 30)}`);
}

/** ISO instant, rejected when absent, unparseable, or in the future. */
export function parseObservedAt(raw: unknown, now: Date): Parsed<string> {
  if (typeof raw !== 'string' && !(raw instanceof Date)) return no('timestamp is missing');
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return no('timestamp could not be read');
  // A few minutes of clock skew is normal; hours of it means something is wrong.
  if (date.getTime() > now.getTime() + 10 * 60_000) return no('timestamp is in the future');
  if (date.getTime() < Date.UTC(2015, 0, 1)) return no('timestamp is implausibly old');
  return ok(date.toISOString());
}

/** Collapses whitespace and casing for matching. Never used for display. */
export function normaliseTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
