/**
 * Specification preparation.
 *
 * Three checks are the same on every tracker, so they are generated rather than
 * written out thirty times: a duplicate-ID check (§9, §12.2), a budget-mapping
 * check (§7.3 — an unmapped cost record must appear on QUALITY CHECK rather
 * than vanish), and a foreign-key check for every ID that points at another
 * sheet. They live in hidden helper columns (§4.1) and QUALITY CHECK sums them.
 */
import { SHEETS, LAYOUT, CAPACITY } from '../config.js';
import { helper } from '../sheets/helpers.js';

export function prepare(specs) {
  return specs.map((spec) => {
    if (!spec.columns) return spec;

    const firstDataRow = spec.firstDataRow ?? LAYOUT.FIRST_DATA_ROW;
    const rows = spec.rows ?? CAPACITY[spec.name];
    const qa = [];
    const extra = [];

    if (spec.idColumn) {
      const key = 'qaDuplicateId';
      extra.push(helper(key, 'QA · duplicate ID', (f) =>
        `IF(${f.a(spec.idColumn)}="",0,IF(COUNTIF(${f.r(spec.name, spec.idColumn)},${f.a(spec.idColumn)})>1,1,0))`));
      qa.push({ key, kind: 'duplicate-id', label: `Duplicate IDs on ${spec.name}`,
        detail: 'Two rows share an ID. Lookups will find only the first of them.' });
    }

    if (spec.cost) {
      const key = 'qaBudgetMapping';
      const { category, planned, actual } = spec.cost;
      extra.push(helper(key, 'QA · budget mapping', (f) =>
        `IF(OR(N(${f.a(planned)})>0,N(${f.a(actual)})>0),IF(${f.a(category)}="",1,IF(COUNTIF(${f.r(SHEETS.BUDGET, 'category')},${f.a(category)})=0,1,0)),0)`));
      qa.push({ key, kind: 'budget-mapping', label: `Costs with no budget category on ${spec.name}`,
        detail: 'A row carries a cost but no category the MASTER BUDGET recognises, so the money is reported here rather than counted silently.' });
    }

    for (const column of spec.columns) {
      if (!column.reference) continue;
      const key = `qaRef_${column.key}`;
      const target = column.reference;
      extra.push(helper(key, `QA · ${column.header} exists`, (f) =>
        `IF(${f.a(column.key)}="",0,IF(COUNTIF(${f.r(target.sheet, target.column)},${f.a(column.key)})=0,1,0))`));
      qa.push({ key, kind: 'broken-reference', label: `${column.header} not found, on ${spec.name}`,
        detail: `An ID in this column does not exist on ${target.sheet}.` });
    }

    return { ...spec, firstDataRow, rows, columns: [...spec.columns, ...extra], qaColumns: qa };
  });
}
