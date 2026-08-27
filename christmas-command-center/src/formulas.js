/**
 * Auditable formula builders — the §8 metric contract in one place.
 *
 * Rules that hold for every builder here:
 *  - no leading `=` (ExcelJS adds it);
 *  - no INDIRECT, OFFSET, external links, or whole-column arrays (§8
 *    FORMULA COMPATIBILITY);
 *  - every cross-sheet reference is built from `ref`, so a column can move
 *    without a formula being retyped;
 *  - a derived cell whose row has no primary input returns "" (§9), except on
 *    QUALITY CHECK where an empty row is itself a thing to report.
 */

/** §9 — a row with no primary input stays visually quiet. */
export function whenRowUsed(primary, expression) {
  return `IF(${primary}="","",${expression})`;
}

/** Divide safely and honestly: an empty denominator is "not started", not 0/0. */
export function safeRatio(numerator, denominator) {
  return `IF(${denominator}=0,0,${numerator}/${denominator})`;
}

export function sumIfs(sumRange, pairs) {
  const criteria = pairs.map(([range, test]) => `${range},${test}`).join(',');
  return `SUMIFS(${sumRange},${criteria})`;
}

export function countIfs(pairs) {
  return `COUNTIFS(${pairs.map(([range, test]) => `${range},${test}`).join(',')})`;
}

/** SUMIFS over one range with no criteria is just SUM — keep it readable. */
export function sum(range) {
  return `SUM(${range})`;
}

/**
 * INDEX/MATCH lookup. Chosen over XLOOKUP because XLOOKUP does not survive a
 * Google Sheets import on every account tier (§8 compatibility note).
 */
export function lookup(resultRange, keyRange, keyCell, fallback = '""') {
  return `IFERROR(INDEX(${resultRange},MATCH(${keyCell},${keyRange},0)),${fallback})`;
}

/**
 * A lookup that stays blank in every failing case: no key, no match, or a match
 * on an empty source cell. The last one matters — INDEX into an empty cell
 * returns 0, which a date format renders as January 1900 (§12.3).
 */
export function lookupBlank(resultRange, keyRange, keyCell) {
  const hit = `INDEX(${resultRange},MATCH(${keyCell},${keyRange},0))`;
  return `IF(${keyCell}="","",IFERROR(IF(${hit}="","",${hit}),""))`;
}

/* ------------------------------------------------------------------ *
 * §8 metric contract
 * ------------------------------------------------------------------ */

/** Countdown: MAX(0, ChristmasDate − TODAY()). Never negative, never #VALUE!. */
export function countdown(christmasDate) {
  return `MAX(0,${christmasDate}-TODAY())`;
}

/**
 * §8 "Near budget": actual ÷ budget ≥ threshold.
 * A zero budget with spend against it is OVER BUDGET, not a division error.
 */
export function budgetStatus(budgetCell, actualCell, thresholdCell) {
  return [
    `IF(AND(${budgetCell}=0,${actualCell}=0),"NOT SET",`,
    `IF(${actualCell}>${budgetCell},"OVER BUDGET",`,
    `IF(${actualCell}=${budgetCell},"AT BUDGET",`,
    `IF(AND(${budgetCell}>0,${actualCell}/${budgetCell}>=${thresholdCell}),"NEAR LIMIT",`,
    `"ON TRACK"))))`,
  ].join('');
}

/** Percent used, guarded so an unset budget reads 0% rather than #DIV/0!. */
export function percentUsed(budgetCell, actualCell) {
  return `IF(${budgetCell}=0,0,${actualCell}/${budgetCell})`;
}

/**
 * §8 "Late order": not arrived and the expected date is in the past.
 * A blank expected date is a separate MISSING DATE warning, never LATE.
 */
export function orderAttention(arrivedCell, expectedCell, statusCell, trackingCell, shipWindow) {
  return [
    `IF(OR(${statusCell}="Cancelled",${statusCell}="Returned"),"CLOSED",`,
    `IF(${arrivedCell}="Yes","ARRIVED",`,
    `IF(${expectedCell}="","MISSING DATE",`,
    `IF(${expectedCell}<TODAY(),"LATE",`,
    `IF(AND(${trackingCell}="",${expectedCell}-TODAY()<=${shipWindow}),"NO TRACKING",`,
    `"ON TRACK")))))`,
  ].join('');
}

/** §12.2 — a refund that is expected but not received must not move actual spend. */
export function netRefund(expectedCell, receivedFlagCell, receivedAmountCell) {
  return `IF(${receivedFlagCell}="Yes",IF(${receivedAmountCell}="",${expectedCell},${receivedAmountCell}),0)`;
}

/** §7.4 — planned cost = qty × unit − discount + planned shipping + planned tax. */
export function plannedGiftCost(qty, unit, discount, shipping, tax) {
  return `ROUND(MAX(0,${qty}*${unit}-${discount})+${shipping}+${tax},2)`;
}

/**
 * §7.4 duplicate warning: same recipient plus the same normalised item text.
 * It stays a warning — an intentional pair of identical gifts is legitimate.
 */
export function duplicateKey(personCell, itemCell) {
  return whenRowUsed(itemCell, `LOWER(TRIM(${personCell}&"|"&TRIM(${itemCell})))`);
}

export function duplicateWarning(keyRange, keyCell) {
  return `IF(${keyCell}="","",IF(COUNTIF(${keyRange},${keyCell})>1,"CHECK DUPLICATE",""))`;
}

/** §9 — status text always accompanies the colour. Dates read plainly. */
export function dueStatus(dateCell, doneTest) {
  return [
    `IF(${doneTest},"COMPLETE",`,
    `IF(${dateCell}="","NO DATE",`,
    `IF(${dateCell}<TODAY(),"OVERDUE",`,
    `IF(${dateCell}-TODAY()<=7,"THIS WEEK","SCHEDULED"))))`,
  ].join('');
}

/** Concatenate a currency-aware label for dashboard cards. */
export function labelled(prefix, expression) {
  return `${JSON.stringify(prefix)}&${expression}`;
}
