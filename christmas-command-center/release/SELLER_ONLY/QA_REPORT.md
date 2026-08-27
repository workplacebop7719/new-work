# Scenario test results

Run 2026-08-27 · 13 scenarios · 50 checks · 0 failed

Every scenario is built by the same generator that produces the product, then
recalculated by LibreOffice Calc and read back. A check compares a calculated
cell against what PRD §12.2 says it must contain.

## Blank workbook — pass

*§12.2 — dashboard shows zero or Not Started; no errors and no false late warnings.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| countdown is a non-negative number | `true` | `true` | pass |
| budget set | `0` | `0` | pass |
| spent so far | `0` | `0` | pass |
| gifts chosen | `0` | `0` | pass |
| gifts note reads Not started | `Not started.` | `Not started.` | pass |
| wrapping note | `Nothing to wrap yet.` | `Nothing to wrap yet.` | pass |
| orders note | `No orders yet.` | `No orders yet.` | pass |
| no orders reported late | `0` | `0` | pass |
| no missing-date warnings | `0` | `0` | pass |
| no overdue tasks | `0` | `0` | pass |
| quality check is clean | `0` | `0` | pass |
| no formula errors anywhere | `0` | `0` | pass |

## Zero budget, one purchase — pass

*§12.2 — status shows OVER BUDGET; remaining is the negative of actual spend.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| Gifts category status | `OVER BUDGET` | `OVER BUDGET` | pass |
| Gifts remaining | `-120` | `-120` | pass |
| percent used stays 0 rather than dividing by zero | `0` | `0` | pass |
| dashboard remaining | `-120` | `-120` | pass |
| no formula errors | `0` | `0` | pass |

## At and just below the warning threshold — pass

*§12.2 — status changes to NEAR LIMIT at the configured threshold, and not before.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| at the threshold | `NEAR LIMIT` | `NEAR LIMIT` | pass |
| one pound below it | `ON TRACK` | `ON TRACK` | pass |

## Refund expected but not received — pass

*§12.2 — actual spend is unchanged and the refund stays on the attention board.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| actual spend unchanged | `200` | `200` | pass |
| dashboard spend unchanged | `200` | `200` | pass |
| refund still owed | `1` | `1` | pass |

## Refund received — pass

*§12.2 — actual season spend decreases by the confirmed refund.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| actual spend returns to zero | `0` | `0` | pass |
| dashboard spend | `0` | `0` | pass |
| nothing left owed | `0` | `0` | pass |

## Digital gift purchased — pass

*§12.2 — counts as purchased, excluded from the wrapping denominator.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| both count as chosen | `1` | `1` | pass |
| only the physical one needs wrapping | `0 of 1 — digital and experience gifts are not counted` | `0 of 1 — digital and experience gifts are not counted` | pass |
| one gift still to wrap | `1` | `1` | pass |

## Late shipment — pass

*§12.2 — the attention board rises and the order row reads LATE.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| order row | `LATE` | `LATE` | pass |
| attention board | `1` | `1` | pass |
| not reported as a missing date | `0` | `0` | pass |

## Order with no expected date — pass

*§12.2 — a MISSING DATE warning, never LATE.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| order row | `MISSING DATE` | `MISSING DATE` | pass |
| not counted as late | `0` | `0` | pass |
| counted as a missing date | `1` | `1` | pass |

## Duplicate gift ID — pass

*§12.2 — QUALITY CHECK returns an exception.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| both rows reported | `2` | `2` | pass |
| quality check total rises | `≥ 2` | `4` | pass |
| the dashboard shows it | `≥ 2` | `4` | pass |

## A cost with no budget category — pass

*§7.3 — an unmapped cost record appears on QUALITY CHECK, neither silently included nor excluded.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| reported on quality check | `1` | `1` | pass |
| and the reconciliation says so | `UNMAPPED COSTS` | `UNMAPPED COSTS` | pass |
| the money is not in the budget | `0` | `0` | pass |

## Inactive recipient — pass

*§12.2 — excluded from the dashboard and from active recipient counts.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| the active person's gift counts | `Yes` | `Yes` | pass |
| the inactive person's gift does not | `No` | `No` | pass |
| one gift left to buy, not two | `1` | `1` | pass |

## Year change into a leap year — pass

*§12.2 — the countdown and dates calculate correctly across a year boundary.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| the season rolls to the next Christmas | `2028` | `2028` | pass |
| Christmas 2028 falls on a Monday | `Christmas falls on Monday 25 December` | `Christmas falls on Monday 25 December` | pass |
| the countdown counts through the 2028 leap day | `851` | `851` | pass |

## Every tracker at its documented capacity — pass

*§11.3 — the workbook holds its default row capacity without errors or slowdown.*

| Check | Expected | Got | |
| --- | --- | --- | --- |
| no formula errors | `0` | `0` | pass |
| planned reconciles | `RECONCILED` | `RECONCILED` | pass |
| actual reconciles | `RECONCILED` | `RECONCILED` | pass |
| duplicate detection is doing something | `≥ 1` | `200` | pass |

