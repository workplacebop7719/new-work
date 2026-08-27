/**
 * A1 address helpers.
 *
 * Every address in the workbook is derived here from a sheet name, a column key
 * and the row geometry in config.js. Nothing else in the build is allowed to
 * type a cell address (PRD §11.3).
 */
import { LAYOUT, CAPACITY } from '../config.js';

/** 1-based column index to letters: 1 -> A, 27 -> AA. */
export function colLetter(index) {
  let n = index;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Quote a sheet name for use in a formula. §11.3: names with spaces or `+`. */
export function quoteSheet(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
}

/**
 * Builds the reference helper once all sheet specs are known. `specs` is an
 * array of sheet specs; only tracker-style specs contribute column maps.
 */
export function buildRef(specs) {
  const byName = new Map();
  for (const spec of specs) {
    if (!spec.columns) continue;
    const map = new Map();
    spec.columns.forEach((column, i) => map.set(column.key, i + (spec.firstColumn ?? 2)));
    byName.set(spec.name, {
      spec,
      map,
      firstRow: spec.firstDataRow ?? LAYOUT.FIRST_DATA_ROW,
      lastRow: (spec.firstDataRow ?? LAYOUT.FIRST_DATA_ROW) + (spec.rows ?? CAPACITY[spec.name] ?? 0) - 1,
    });
  }

  function sheet(name) {
    const entry = byName.get(name);
    if (!entry) throw new Error(`No column map for sheet "${name}" — is it a tracker spec?`);
    return entry;
  }

  function index(name, key) {
    const entry = sheet(name);
    const i = entry.map.get(key);
    if (i === undefined) {
      throw new Error(`Unknown column "${key}" on "${name}". Known: ${[...entry.map.keys()].join(', ')}`);
    }
    return i;
  }

  return {
    /** Column letter of `key` on `name`. */
    letter: (name, key) => colLetter(index(name, key)),
    /** 1-based column index of `key` on `name`. */
    index: (name, key) => index(name, key),
    firstRow: (name) => sheet(name).firstRow,
    lastRow: (name) => sheet(name).lastRow,
    rowCount: (name) => sheet(name).lastRow - sheet(name).firstRow + 1,
    /** Absolute whole-column data range: 'GIFT PLANNER'!$D$6:$D$205 */
    range(name, key) {
      const entry = sheet(name);
      const L = colLetter(index(name, key));
      return `${quoteSheet(name)}!$${L}$${entry.firstRow}:$${L}$${entry.lastRow}`;
    },
    /** Absolute data range without the sheet prefix: $D$6:$D$205 */
    localRange(name, key) {
      const entry = sheet(name);
      const L = colLetter(index(name, key));
      return `$${L}$${entry.firstRow}:$${L}$${entry.lastRow}`;
    },
    /** One cell on another sheet: 'GIFT PLANNER'!D6 */
    cell: (name, key, row) => `${quoteSheet(name)}!${colLetter(index(name, key))}${row}`,
    /** One cell on the current sheet: D6 */
    local: (name, key, row) => `${colLetter(index(name, key))}${row}`,
    /** Column-locked cell on the current sheet: $D6 */
    localAnchored: (name, key, row) => `$${colLetter(index(name, key))}${row}`,
    quoteSheet,
    has: (name) => byName.has(name),
  };
}
