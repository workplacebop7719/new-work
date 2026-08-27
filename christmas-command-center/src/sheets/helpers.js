/**
 * Column constructors for tracker specifications.
 *
 * A tracker sheet is described, never drawn: the generator reads these column
 * objects and produces headers, widths, formats, validation, notes, formulas,
 * sample rows and protection from them. Adding a field is a one-line change
 * here rather than a formatting edit in eight places (PRD §11.1).
 */

/** A cell the buyer fills in. Blush-pink fill, unlocked. */
export const input = (key, header, opts = {}) => ({ key, header, kind: 'input', type: 'text', width: 16, ...opts });

/**
 * A derived cell. `formula` receives a context with `c` (a cell on this row),
 * `abs` (the same, column-anchored), `r` (an absolute range on any sheet),
 * `cell` (one cell on any sheet) and `row`.
 */
export const formula = (key, header, fn, opts = {}) => ({
  key, header, kind: 'formula', type: 'text', width: 16, formula: fn, ...opts,
});

export const money = (key, header, opts = {}) => input(key, header, { type: 'money', width: 13, ...opts });
export const moneyF = (key, header, fn, opts = {}) => formula(key, header, fn, { type: 'money', width: 13, ...opts });
export const date = (key, header, opts = {}) => input(key, header, { type: 'date', width: 13, ...opts });
export const time = (key, header, opts = {}) => input(key, header, { type: 'time', width: 11, ...opts });
export const int = (key, header, opts = {}) => input(key, header, { type: 'int', width: 10, ...opts });
/** A four-digit year. Never grouped — 2,026 is not a year. */
export const year = (key, header, opts = {}) => input(key, header, { type: 'year', width: 9, ...opts });
export const pct = (key, header, opts = {}) => input(key, header, { type: 'percent', width: 11, ...opts });
export const pctF = (key, header, fn, opts = {}) => formula(key, header, fn, { type: 'percent', width: 11, ...opts });

/** A dropdown sourced from LISTS. `list` names a key in config LISTS. */
export const pick = (key, header, list, opts = {}) => input(key, header, { list, width: 15, ...opts });

/** Yes/No dropdown — used everywhere a boolean would otherwise render FALSE. */
export const yesNo = (key, header, opts = {}) => pick(key, header, 'YesNo', { width: 11, ...opts });

/** A stable record identifier (§9): pre-seeded text, safe to sort. */
export const id = (key, header, opts = {}) => input(key, header, {
  width: 11,
  note: 'A stable identifier. It is safe to sort the table — IDs are text, not row numbers. Keep each one unique; QUALITY CHECK reports duplicates.',
  ...opts,
});

/** A long free-text field. */
export const notes = (key = 'notes', header = 'Notes', opts = {}) => input(key, header, { width: 34, ...opts });

/** A hidden helper column (§4.1). Never a place a buyer needs to look. */
export const helper = (key, header, fn, opts = {}) => formula(key, header, fn, { hidden: true, width: 18, ...opts });

/** Status text that a conditional format colours. Colour is never alone (§6.2). */
export const status = (key, header, fn, opts = {}) => formula(key, header, fn, { width: 15, statusColumn: true, ...opts });

/**
 * A foreign key to another sheet's ID column.
 *
 * Deliberately not a dropdown: a validation list over a 200-row ID column shows
 * two hundred blank entries, and the resolved-name column beside it already
 * tells the buyer whether the reference landed. QUALITY CHECK counts the ones
 * that did not.
 */
export const refId = (key, header, target, opts = {}) => input(key, header, {
  width: 11,
  reference: target,
  note: `Type the ID from ${target.sheet}. The name beside it fills in when the ID matches; leave it blank if the row does not need one.`,
  ...opts,
});
