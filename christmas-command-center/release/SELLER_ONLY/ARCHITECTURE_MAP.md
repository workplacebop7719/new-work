# Architecture map

The Christmas Season Master Command Center™, edition 1.0. Generated from the
specifications by `node src/qa/architecture-map.mjs` — if it disagrees with the
workbook, the workbook changed and this file has not been regenerated.

## The shape of it

Five layers, in the order the buyer meets them.

| Layer | Sheets | Rule |
| --- | --- | --- |
| Onboarding | COVER, START HERE, SETTINGS | Explain the product, collect the global inputs, guide the setup. |
| Source inputs | 27 trackers | Cream cells only. Every record has a stable ID. |
| Calculation | Hidden helper columns, LISTS, QUALITY CHECK | No magic numbers. Every rule reads SETTINGS or a visible mapping. |
| Decision outputs | DASHBOARD, MASTER BUDGET | Show change, variance, exception and next action. |
| Archive | MEMORIES, NEXT YEAR NOTES, ANNUAL ARCHIVE | Preserve what matters; make next year easier. |

## Sheet dependencies

What each tracker reads, and who reads it back. A sheet with nothing in the
"reads" column is pure input; one with nothing in "read by" is a leaf, and can
be hidden with no effect on any total.

| Sheet | Rows | Fields | Reads | Read by |
| --- | ---: | ---: | --- | --- |
| SEASON VISION | 24 | 8 | — | DASHBOARD, QUALITY CHECK |
| RECIPIENT PROFILES | 100 | 18 | — | QUALITY CHECK |
| PEOPLE + BUDGETS | 100 | 16 | GIFT PLANNER, SETTINGS, STOCKING STUFFERS | CARDS + MAIL, GIFT PLANNER, HOSTING + GUESTS, ONLINE ORDERS, QUALITY CHECK, STOCKING STUFFERS |
| MASTER BUDGET | 20 | 12 | CARDS + MAIL, CHRISTMAS CALENDAR, DECOR INVENTORY, DECORATING PLAN, DONATIONS + GIVING, EVENTS + WARDROBE, GIFT PLANNER, GROCERY LIST, MEAL + BAKING PLAN, RETURNS + EXCHANGES, SETTINGS, STOCKING STUFFERS, TABLESCAPE + FLORALS, TRADITIONS + BUCKET LIST, TRAVEL PLAN, VENDORS + APPOINTMENTS | CARDS + MAIL, CHRISTMAS CALENDAR, DASHBOARD, DECOR INVENTORY, DECORATING PLAN, DONATIONS + GIVING, EVENTS + WARDROBE, GIFT PLANNER, GROCERY LIST, MEAL + BAKING PLAN, QUALITY CHECK, STOCKING STUFFERS, TABLESCAPE + FLORALS, TRADITIONS + BUCKET LIST, TRAVEL PLAN, VENDORS + APPOINTMENTS |
| GIFT PLANNER | 200 | 35 | MASTER BUDGET, ONLINE ORDERS, PEOPLE + BUDGETS | DASHBOARD, MASTER BUDGET, PEOPLE + BUDGETS, QUALITY CHECK, RETURNS + EXCHANGES |
| STOCKING STUFFERS | 150 | 16 | MASTER BUDGET, PEOPLE + BUDGETS | MASTER BUDGET, PEOPLE + BUDGETS, QUALITY CHECK |
| ONLINE ORDERS | 150 | 21 | PEOPLE + BUDGETS, SETTINGS | DASHBOARD, GIFT PLANNER, QUALITY CHECK, RETURNS + EXCHANGES |
| RETURNS + EXCHANGES | 60 | 22 | GIFT PLANNER, ONLINE ORDERS | DASHBOARD, MASTER BUDGET, QUALITY CHECK |
| CHRISTMAS CALENDAR | 200 | 21 | MASTER BUDGET, SETTINGS | DASHBOARD, EVENTS + WARDROBE, HOSTING + GUESTS, MASTER BUDGET, QUALITY CHECK, TABLESCAPE + FLORALS, VENDORS + APPOINTMENTS |
| VENDORS + APPOINTMENTS | 60 | 25 | CHRISTMAS CALENDAR, MASTER BUDGET | MASTER BUDGET, QUALITY CHECK |
| DECOR INVENTORY | 100 | 21 | MASTER BUDGET, SETTINGS | MASTER BUDGET, QUALITY CHECK |
| DECORATING PLAN | 60 | 17 | MASTER BUDGET | MASTER BUDGET, QUALITY CHECK |
| TABLESCAPE + FLORALS | 60 | 25 | CHRISTMAS CALENDAR, MASTER BUDGET | MASTER BUDGET, QUALITY CHECK |
| MEAL + BAKING PLAN | 150 | 22 | MASTER BUDGET, RECIPE INDEX | MASTER BUDGET, QUALITY CHECK |
| GROCERY LIST | 200 | 19 | MASTER BUDGET, RECIPE INDEX | DASHBOARD, MASTER BUDGET, QUALITY CHECK |
| RECIPE INDEX | 100 | 13 | — | GROCERY LIST, MEAL + BAKING PLAN, QUALITY CHECK |
| HOSTING + GUESTS | 100 | 20 | CHRISTMAS CALENDAR, PEOPLE + BUDGETS | QUALITY CHECK |
| TRADITIONS + BUCKET LIST | 80 | 18 | MASTER BUDGET | DASHBOARD, MASTER BUDGET, QUALITY CHECK |
| MOVIES + MUSIC *(optional)* | 80 | 10 | — | QUALITY CHECK |
| CARDS + MAIL | 150 | 16 | MASTER BUDGET, PEOPLE + BUDGETS | MASTER BUDGET, QUALITY CHECK |
| EVENTS + WARDROBE | 60 | 21 | CHRISTMAS CALENDAR, MASTER BUDGET | MASTER BUDGET, QUALITY CHECK |
| TRAVEL PLAN *(optional)* | 40 | 20 | MASTER BUDGET | MASTER BUDGET, QUALITY CHECK |
| CLEANING + HOME PREP | 100 | 11 | — | QUALITY CHECK |
| DONATIONS + GIVING | 60 | 14 | MASTER BUDGET | MASTER BUDGET, QUALITY CHECK |
| ADVENT + REFLECTION *(optional)* | 31 | 9 | — | QUALITY CHECK |
| MEMORIES | 100 | 11 | — | QUALITY CHECK |
| NEXT YEAR NOTES | 100 | 9 | — | QUALITY CHECK |
| ANNUAL ARCHIVE | 20 | 10 | — | QUALITY CHECK |

## How costs reach the budget

The §7.3 contract. Every sheet below carries a **Budget category** column; the
MASTER BUDGET adds up everything tagged with each category. A cost whose
category the budget does not recognise is counted on QUALITY CHECK — it is
never silently included and never silently dropped.

| Source sheet | Planned column | Actual column | Suggested category |
| --- | --- | --- | --- |
| CARDS + MAIL | `plannedCost` | `actualCost` | Cards & Postage |
| DONATIONS + GIVING | `plannedCost` | `actualCost` | Donations |
| GIFT PLANNER | `plannedCost` | `actualCost` | Gifts |
| STOCKING STUFFERS | `plannedCost` | `actualCost` | Stockings |
| CHRISTMAS CALENDAR | `budgetCap` | `actualCost` | Events |
| DECOR INVENTORY | `plannedCost` | `actualCost` | Decorations |
| DECORATING PLAN | `plannedCost` | `actualCost` | Decorations |
| TABLESCAPE + FLORALS | `plannedCost` | `actualCost` | Hosting |
| TRAVEL PLAN | `plannedCost` | `actualCost` | Travel |
| VENDORS + APPOINTMENTS | `quote` | `paidToDate` | Hosting |
| EVENTS + WARDROBE | `plannedCost` | `actualCost` | Outfits |
| GROCERY LIST | `estimatedPrice` | `actualPrice` | Food & Baking |
| MEAL + BAKING PLAN | `plannedCost` | `actualCost` | Food & Baking |
| TRADITIONS + BUCKET LIST | `plannedCost` | `actualCost` | Events |

Refunds come from **RETURNS + EXCHANGES** (`refundCounted`) and are subtracted
from the actual figure for their category — but only once the refund is marked
received.

**ONLINE ORDERS is deliberately absent.** An order records the parcel; the gift
row records the money. Counting both would double the season's spending.

## Named ranges

| Name | Points at | Used by |
| --- | --- | --- |
| `Set_Year` | SETTINGS, Christmas year | formulas across the workbook |
| `Set_ChristmasDate` | SETTINGS, Christmas date | formulas across the workbook |
| `Set_SeasonStart` | SETTINGS, Season start | formulas across the workbook |
| `Set_Currency` | SETTINGS, Currency symbol | formulas across the workbook |
| `Set_Household` | SETTINGS, Household / planner name | formulas across the workbook |
| `Set_WarnThreshold` | SETTINGS, Budget warning threshold | formulas across the workbook |
| `Set_ShipWindow` | SETTINGS, Shipping risk window (days) | formulas across the workbook |
| `Set_LowStock` | SETTINGS, Low-stock threshold | formulas across the workbook |
| `Set_WeekStart` | SETTINGS, Week starts | formulas across the workbook |
| `Set_Edition` | SETTINGS, Edition | the cover |
| `Vision_Theme` | SEASON VISION | the dashboard's season strip |
| `Vision_Feelings` | SEASON VISION | the dashboard's season strip |
| `Vision_Colours` | SEASON VISION | the dashboard's season strip |
| `Vision_Scent` | SEASON VISION | the dashboard's season strip |
| `Vision_Protect` | SEASON VISION | the dashboard's season strip |
| `QA_Exceptions` | QUALITY CHECK, the total | the dashboard's attention board |
| `List_*` (42) | LISTS, one column each | every dropdown in the workbook |

## The dashboard's sources

Every figure on the dashboard, and where it comes from.

| Attention row | Counts |
| --- | --- |
| categories over budget | MASTER BUDGET |
| categories near their limit | MASTER BUDGET |
| gifts still to choose or buy | GIFT PLANNER |
| bought gifts not yet wrapped | GIFT PLANNER |
| orders running late | ONLINE ORDERS |
| orders with no tracking yet | ONLINE ORDERS |
| orders with no expected date | ONLINE ORDERS |
| return windows closing this week | ONLINE ORDERS |
| refunds owed to you | RETURNS + EXCHANGES |
| tasks and events overdue | CHRISTMAS CALENDAR |
| things still to buy for the table | GROCERY LIST |
| items on QUALITY CHECK | QUALITY CHECK |

## Row capacity

The documented default. START HERE explains how to extend a table.

| Sheet | Rows |
| --- | ---: |
| RECIPIENT PROFILES | 100 |
| PEOPLE + BUDGETS | 100 |
| MASTER BUDGET | 20 |
| GIFT PLANNER | 200 |
| STOCKING STUFFERS | 150 |
| ONLINE ORDERS | 150 |
| RETURNS + EXCHANGES | 60 |
| CHRISTMAS CALENDAR | 200 |
| VENDORS + APPOINTMENTS | 60 |
| DECOR INVENTORY | 100 |
| DECORATING PLAN | 60 |
| TABLESCAPE + FLORALS | 60 |
| MEAL + BAKING PLAN | 150 |
| GROCERY LIST | 200 |
| RECIPE INDEX | 100 |
| HOSTING + GUESTS | 100 |
| TRADITIONS + BUCKET LIST | 80 |
| MOVIES + MUSIC | 80 |
| CARDS + MAIL | 150 |
| EVENTS + WARDROBE | 60 |
| TRAVEL PLAN | 40 |
| CLEANING + HOME PREP | 100 |
| DONATIONS + GIVING | 60 |
| ADVENT + REFLECTION | 31 |
| MEMORIES | 100 |
| NEXT YEAR NOTES | 100 |
| ANNUAL ARCHIVE | 20 |
| SEASON VISION | 24 |

## Compatibility risks, and what was done about each

| Risk | Decision |
| --- | --- |
| `XLOOKUP` does not import reliably into Google Sheets | Every lookup is `INDEX`/`MATCH`. A test fails the build if `XLOOKUP` appears. |
| `INDIRECT` and `OFFSET` are volatile and slow a large workbook | Neither is used anywhere. Enforced by the same test. |
| Dynamic-array functions (`FILTER`, `SORTBY`, `UNIQUE`) do not exist in older Excel | Not used. Ranking is done with `SMALL`/`LARGE` over a helper column, which is ordinary and portable. |
| Whole-column ranges (`A:A`) recalculate the entire sheet | Every range is bounded to its documented capacity. Enforced by test. |
| Excel tables and structured references convert unpredictably on import | Not used. Bounded named ranges instead. |
| Google Sheets does not import Excel sheet protection | The Sheets edition ships unprotected on purpose, and says so. The colour key does the work. |
| A chart tied to a moving range breaks when rows are added | Both charts read a fixed block on the dashboard that a formula fills. |
| Cormorant Garamond is not installed on most machines | The workbook ships set in Georgia, which is. The documentation explains how to swap. |
| An empty cell read through `INDEX` returns 0, which a date format renders as January 1900 | Every lookup guards for it. A test asserts every derived cell is blank-guarded. |

## Navigation

Every visible sheet opens with the same strip: Dashboard, Start here, Calendar, Budget, All sheets.
SHEET INDEX lists all 35 sheets with a purpose and a link.
Dashboard attention rows link to the sheet that resolves them.

