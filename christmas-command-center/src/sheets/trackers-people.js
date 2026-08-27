/**
 * People, money and gifting trackers — PRD §7.2, §7.3, §7.4, §7.4A, §7.5.
 */
import { SHEETS, CAPACITY, LISTS } from '../config.js';
import {
  input, formula, money, moneyF, date, int, pctF, pick, yesNo, id, notes, helper, status, refId,
} from './helpers.js';
import {
  whenRowUsed, plannedGiftCost, budgetStatus, percentUsed, duplicateKey, duplicateWarning,
  orderAttention, netRefund, lookupBlank,
} from '../formulas.js';

const S = SHEETS;

/** §10.2 — example starting figures, marked amber in the workbook. */
const EXAMPLE_BUDGETS = {
  Gifts: 2400, Stockings: 300, Decorations: 600, 'Food & Baking': 900,
  'Cards & Postage': 150, Events: 700, Outfits: 400, Travel: 1200,
  Donations: 500, Hosting: 1600, Photography: 850, Other: 200,
};

/* ------------------------------------------------------------------ *
 * §7.4A RECIPIENT PROFILES — a discreet gifting dossier.
 * ------------------------------------------------------------------ */
export const profiles = {
  name: S.PROFILES,
  intro: 'What you know about the people you are giving to, so a gift never has to be guessed at twice.',
  privacyNote: 'Keep only what helps you give well. Do not store payment card numbers, government ID numbers, passwords, or anything you would not want in a spreadsheet.',
  rows: CAPACITY[S.PROFILES],
  idColumn: 'personId',
  freezeColumns: 2,
  columns: [
    id('personId', 'Person ID', { width: 11 }),
    input('name', 'Name', { width: 20 }),
    pick('relationship', 'Relationship', 'Relationship', { width: 18 }),
    date('birthday', 'Birthday', { note: 'Optional. Useful when a Christmas gift and a birthday gift should not be the same thing.' }),
    input('sizes', 'Sizes', { width: 22, note: 'Clothing, shoe, ring, glove — whatever you actually need to remember.' }),
    input('colours', 'Preferred colours', { width: 18 }),
    input('interests', 'Interests', { width: 28 }),
    input('dislikes', 'Dislikes', { width: 24 }),
    input('sensitivities', 'Sensitivities / allergies', { width: 24, note: 'Scent, food, fabric, metal. Optional — leave blank if it does not apply.' }),
    input('brands', 'Favourite makers', { width: 22 }),
    input('monogram', 'Monogram / engraving', { width: 20, note: 'Exact letters and order, as you want them engraved.' }),
    input('charities', 'Preferred charities', { width: 22 }),
    pick('addressStatus', 'Address status', 'AddressStatus', { width: 16 }),
    input('history', 'Given before', { width: 30, note: 'What you have given in past years, so you do not repeat yourself.' }),
    input('doNotRepeat', 'Do not repeat', { width: 24 }),
    input('storage', 'Where it is hidden', { width: 22, note: 'A private reminder. Nothing here is encrypted — keep it discreet rather than secret.' }),
    notes(),
  ],
  samples: [
    { personId: 'P-001', name: 'Eleanor Whitmore', relationship: 'Parent', sizes: 'Cashmere M · glove 7', colours: 'Camel, ivory, deep green', interests: 'Gardening, Elgar, letter writing', dislikes: 'Anything battery powered', sensitivities: 'Wool next to skin', brands: 'Smythson, Crabtree', monogram: 'E.M.W.', addressStatus: 'Confirmed', history: '2024 silk scarf · 2023 secateurs', doNotRepeat: 'Scented candles', storage: 'Cedar chest, guest room', notes: 'EXAMPLE — DELETE ME' },
    { personId: 'P-002', name: 'James Whitmore', relationship: 'Spouse or partner', sizes: 'Shirt 16 · shoe 10', colours: 'Navy, oxblood', interests: 'Sailing, single malt, Ordnance Survey maps', dislikes: 'Novelty anything', sensitivities: '', brands: 'Barbour, Dents', monogram: 'J.A.W.', addressStatus: 'Confirmed', history: '2024 chart of the Solent', doNotRepeat: 'Ties', storage: 'Top of the linen cupboard', notes: 'EXAMPLE — DELETE ME' },
    { personId: 'P-003', name: 'Sofia Lindqvist', relationship: 'Friend', sizes: '', colours: 'Ink blue', interests: 'Ceramics, cold-water swimming', dislikes: '', sensitivities: 'Nut allergy — serious', brands: '', charities: 'Local river trust', addressStatus: 'Needs checking', history: '', doNotRepeat: '', storage: '', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.2 PEOPLE + BUDGETS
 * ------------------------------------------------------------------ */
export const people = {
  name: S.PEOPLE,
  intro: 'Who you are giving to this year, and what you intend to spend on each of them.',
  rows: CAPACITY[S.PEOPLE],
  idColumn: 'personId',
  freezeColumns: 2,
  columns: [
    id('personId', 'Person ID'),
    input('name', 'Name', { width: 20, note: 'Required once the row is active. Matches the name on RECIPIENT PROFILES.' }),
    pick('group', 'Group', 'Group', { width: 18 }),
    money('giftBudget', 'Gift budget', { note: 'What you intend to spend on gifts for this person. Non-negative.' }),
    money('stockingBudget', 'Stocking budget'),
    moneyF('totalBudget', 'Total budget', (f) => whenRowUsed(f.a('personId'), `${f.a('giftBudget')}+${f.a('stockingBudget')}`)),
    moneyF('giftPlanned', 'Gifts planned', (f) => whenRowUsed(f.a('personId'),
      `SUMIFS(${f.r(S.GIFTS, 'plannedCost')},${f.r(S.GIFTS, 'personId')},${f.a('personId')},${f.r(S.GIFTS, 'active')},"Yes")`)),
    moneyF('giftActual', 'Gifts actual', (f) => whenRowUsed(f.a('personId'),
      `SUMIFS(${f.r(S.GIFTS, 'actualCost')},${f.r(S.GIFTS, 'personId')},${f.a('personId')},${f.r(S.GIFTS, 'active')},"Yes")`)),
    moneyF('stockingPlanned', 'Stockings planned', (f) => whenRowUsed(f.a('personId'),
      `SUMIFS(${f.r(S.STOCKINGS, 'plannedCost')},${f.r(S.STOCKINGS, 'personId')},${f.a('personId')})`)),
    moneyF('stockingActual', 'Stockings actual', (f) => whenRowUsed(f.a('personId'),
      `SUMIFS(${f.r(S.STOCKINGS, 'actualCost')},${f.r(S.STOCKINGS, 'personId')},${f.a('personId')})`)),
    moneyF('combinedActual', 'Spent so far', (f) => whenRowUsed(f.a('personId'), `${f.a('giftActual')}+${f.a('stockingActual')}`)),
    moneyF('remaining', 'Remaining', (f) => whenRowUsed(f.a('personId'), `${f.a('totalBudget')}-${f.a('combinedActual')}`)),
    status('status', 'Status', (f) => whenRowUsed(f.a('personId'),
      budgetStatus(f.a('totalBudget'), f.a('combinedActual'), 'Set_WarnThreshold'))),
    yesNo('active', 'Active?', { note: 'Set to No to keep the record without counting the person in this season\'s totals.' }),
    notes('interests', 'Notes', { width: 30 }),
  ],
  samples: [
    { personId: 'P-001', name: 'Eleanor Whitmore', group: 'Immediate family', giftBudget: 400, stockingBudget: 60, active: 'Yes', interests: 'EXAMPLE — DELETE ME' },
    { personId: 'P-002', name: 'James Whitmore', group: 'Immediate family', giftBudget: 500, stockingBudget: 60, active: 'Yes', interests: 'EXAMPLE — DELETE ME' },
    { personId: 'P-003', name: 'Sofia Lindqvist', group: 'Friends', giftBudget: 120, stockingBudget: 0, active: 'Yes', interests: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.3 MASTER BUDGET — every category reconciles to its source modules.
 * ------------------------------------------------------------------ */
export const budget = {
  name: S.BUDGET,
  intro: 'What you set aside, what is planned against it, and what has actually left your account.',
  rows: CAPACITY[S.BUDGET],
  idColumn: 'categoryId',
  freezeColumns: 3,
  columns: [
    id('categoryId', 'Category ID'),
    pick('active', 'In use?', 'YesNo', { width: 10, note: 'Set to No to retire a category you are not using. Nothing is deleted.' }),
    input('category', 'Category', { width: 20, note: 'Rename freely. Source modules match on this text, so rename here and re-pick on the module.' }),
    money('budgetAmount', 'Budget', { exampleValue: true,
      note: 'The workbook ships with example figures, shown in amber. Type your own over them.' }),
    moneyF('planned', 'Planned', (f) => whenRowUsed(f.a('category'), f.plannedRollup(f.a('category'))),
      { note: 'The sum of every planned cost across the workbook that is tagged with this category. See the mapping table on LISTS.' }),
    moneyF('actual', 'Actual', (f) => whenRowUsed(f.a('category'), f.actualRollup(f.a('category'))),
      { note: 'Money actually spent, less refunds you have confirmed as received.' }),
    moneyF('remaining', 'Remaining', (f) => whenRowUsed(f.a('category'), `${f.a('budgetAmount')}-${f.a('actual')}`)),
    pctF('percentUsed', 'Used', (f) => whenRowUsed(f.a('category'), percentUsed(f.a('budgetAmount'), f.a('actual')))),
    status('status', 'Status', (f) => whenRowUsed(f.a('category'),
      budgetStatus(f.a('budgetAmount'), f.a('actual'), 'Set_WarnThreshold'))),
    notes(),
    // The budget chart shows the ten largest categories in use. Ranking here
    // rather than in the chart keeps the chart's range fixed, which is what
    // survives a Google Sheets import (§8).
    helper('chartKey', 'Chart rank key', (f) =>
      `IF(AND(${f.a('active')}="Yes",${f.a('category')}<>"",OR(N(${f.a('budgetAmount')})>0,N(${f.a('actual')})>0)),${f.a('budgetAmount')}+(100-ROW())/10000,"")`),
  ],
  /**
   * Pre-seeded from LISTS so the mapping has something to match on day one.
   * The amounts are example figures — amber, and called out in the Notes
   * column — so a first-time buyer sees a dashboard that behaves rather than
   * one reporting twelve categories over a budget of nothing.
   */
  seed: LISTS.BudgetCategory.map((category, i) => ({
    categoryId: `B-${String(i + 1).padStart(3, '0')}`,
    active: 'Yes',
    category,
    budgetAmount: EXAMPLE_BUDGETS[category],
    notes: 'EXAMPLE FIGURE — type your own over it',
  })),
};

/* ------------------------------------------------------------------ *
 * §7.4 GIFT PLANNER
 * ------------------------------------------------------------------ */
export const gifts = {
  name: S.GIFTS,
  intro: 'Every gift from first idea to wrapped and under the tree.',
  rows: CAPACITY[S.GIFTS],
  idColumn: 'giftId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('giftId', 'Gift ID'),
    refId('personId', 'Person ID', { sheet: S.PEOPLE, column: 'personId' }),
    formula('recipient', 'Recipient', (f) => whenRowUsed(f.a('giftId'),
      lookupBlank(f.r(S.PEOPLE, 'name'), f.r(S.PEOPLE, 'personId'), f.a('personId'))), { width: 20 }),
    formula('active', 'Active?', (f) => whenRowUsed(f.a('giftId'),
      `IF(OR(${f.a('lifecycle')}="Cancelled",${f.a('lifecycle')}="Returned"),"No",IFERROR(INDEX(${f.r(S.PEOPLE, 'active')},MATCH(${f.a('personId')},${f.r(S.PEOPLE, 'personId')},0)),"Yes"))`),
      { width: 10, note: 'A gift is inactive if it was cancelled or returned, or if the recipient is marked inactive. Inactive gifts stay out of every dashboard count.' }),
    input('item', 'Gift / item', { width: 30 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    pick('priority', 'Priority', 'Priority', { width: 11 }),
    input('ideaSource', 'Idea from', { width: 18 }),
    input('link', 'Link or SKU', { width: 26 }),
    input('store', 'Store', { width: 18 }),
    int('qty', 'Qty'),
    money('unitPrice', 'Unit price'),
    money('discount', 'Discount'),
    money('planShipping', 'Ship (planned)'),
    money('planTax', 'Tax (planned)'),
    moneyF('plannedCost', 'Planned cost', (f) => whenRowUsed(f.a('giftId'),
      plannedGiftCost(f.a('qty'), f.a('unitPrice'), f.a('discount'), f.a('planShipping'), f.a('planTax'))),
      { note: 'Quantity × unit price, less discount, plus planned shipping and tax.' }),
    money('actualCost', 'Actual cost', { note: 'Type what the receipt says. This is what drives the budget, not the estimate.' }),
    pick('lifecycle', 'Status', 'GiftStatus', { width: 14 }),
    formula('purchased', 'Purchased?', (f) => whenRowUsed(f.a('giftId'), `IF(${f.a('lifecycle')}="Purchased","Yes","No")`), { width: 12 }),
    refId('orderId', 'Order ID', { sheet: S.ORDERS, column: 'orderId' }),
    pick('deliveryType', 'Delivery', 'DeliveryType', { width: 17 }),
    formula('arrived', 'Arrived?', (f) => whenRowUsed(f.a('giftId'),
      `IF(${f.a('orderId')}="","—",${lookupBlank(f.r(S.ORDERS, 'arrived'), f.r(S.ORDERS, 'orderId'), f.a('orderId'))})`), { width: 11 }),
    input('hidden', 'Hidden where', { width: 20 }),
    pick('giftType', 'Gift type', 'GiftType', { width: 13, note: 'Digital and experience gifts are left out of the wrapping count.' }),
    yesNo('wrapped', 'Wrapped?'),
    yesNo('tag', 'Tag / card?'),
    date('purchaseDate', 'Bought on'),
    date('returnDeadline', 'Return by'),
    helper('dupKey', 'Duplicate key', (f) => duplicateKey(f.a('personId'), f.a('item'))),
    status('dupWarning', 'Duplicate?', (f) => duplicateWarning(f.r(S.GIFTS, 'dupKey'), f.a('dupKey')),
      { width: 15, note: 'The same item for the same person appears more than once. Sometimes that is deliberate — this is a nudge, not an error.' }),
    notes(),
  ],
  samples: [
    { giftId: 'G-001', personId: 'P-001', item: 'Hand-thrown stoneware jug', budgetCategory: 'Gifts', priority: 'Must', ideaSource: 'Her own wish list', store: 'Levens Pottery', qty: 1, unitPrice: 145, discount: 0, planShipping: 12, planTax: 18.85, actualCost: 175.85, lifecycle: 'Purchased', orderId: 'O-001', deliveryType: 'Ship to home', hidden: 'Cedar chest, guest room', giftType: 'Physical', wrapped: 'No', tag: 'No', purchaseDate: '2026-11-14', returnDeadline: '2027-01-14', notes: 'EXAMPLE — DELETE ME' },
    { giftId: 'G-002', personId: 'P-002', item: 'Chart of the Western Isles, framed', budgetCategory: 'Gifts', priority: 'Should', ideaSource: 'Overheard in October', store: 'Marine Charts Co.', qty: 1, unitPrice: 220, discount: 20, planShipping: 0, planTax: 26, lifecycle: 'In Cart', deliveryType: 'Store pickup', giftType: 'Physical', wrapped: 'No', tag: 'No', notes: 'EXAMPLE — DELETE ME' },
    { giftId: 'G-003', personId: 'P-003', item: 'Winter swimming membership', budgetCategory: 'Gifts', priority: 'Could', ideaSource: 'Her cold-water habit', store: 'Lido Society', qty: 1, unitPrice: 96, discount: 0, planShipping: 0, planTax: 0, actualCost: 96, lifecycle: 'Purchased', deliveryType: 'Digital delivery', giftType: 'Experience', wrapped: 'No', tag: 'Yes', purchaseDate: '2026-11-20', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §5 STOCKING STUFFERS
 * ------------------------------------------------------------------ */
export const stockings = {
  name: S.STOCKINGS,
  intro: 'The small things, kept to a number you decided in advance.',
  rows: CAPACITY[S.STOCKINGS],
  idColumn: 'stockingId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('stockingId', 'Item ID'),
    refId('personId', 'Person ID', { sheet: S.PEOPLE, column: 'personId' }),
    formula('recipient', 'Recipient', (f) => whenRowUsed(f.a('stockingId'),
      lookupBlank(f.r(S.PEOPLE, 'name'), f.r(S.PEOPLE, 'personId'), f.a('personId'))), { width: 20 }),
    input('item', 'Item', { width: 30 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    input('store', 'Store', { width: 18 }),
    int('qty', 'Qty'),
    money('unitPrice', 'Unit price'),
    moneyF('plannedCost', 'Planned cost', (f) => whenRowUsed(f.a('stockingId'), `ROUND(${f.a('qty')}*${f.a('unitPrice')},2)`)),
    money('actualCost', 'Actual cost'),
    pick('lifecycle', 'Status', 'GiftStatus', { width: 14 }),
    yesNo('packed', 'In the stocking?'),
    notes(),
  ],
  samples: [
    { stockingId: 'S-001', personId: 'P-001', item: 'Seville marmalade, small jar', budgetCategory: 'Stockings', store: 'The Deli', qty: 1, unitPrice: 9.5, actualCost: 9.5, lifecycle: 'Purchased', packed: 'Yes', notes: 'EXAMPLE — DELETE ME' },
    { stockingId: 'S-002', personId: 'P-002', item: 'Pocket notebook, oxblood', budgetCategory: 'Stockings', store: 'Papeterie', qty: 2, unitPrice: 14, lifecycle: 'Idea', packed: 'No', notes: 'EXAMPLE — DELETE ME' },
    { stockingId: 'S-003', personId: 'P-003', item: 'Beeswax hand balm', budgetCategory: 'Stockings', store: 'Apothecary Row', qty: 1, unitPrice: 18, lifecycle: 'In Cart', packed: 'No', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.5 ONLINE ORDERS
 * ------------------------------------------------------------------ */
export const orders = {
  name: S.ORDERS,
  intro: 'What is on its way, when it should arrive, and what still needs chasing.',
  footnote: 'Orders do not add to the budget. A gift\'s actual cost is the single record of what you spent, so counting the order as well would double it.',
  rows: CAPACITY[S.ORDERS],
  idColumn: 'orderId',
  freezeColumns: 2,
  columns: [
    id('orderId', 'Order ID'),
    input('store', 'Store', { width: 20 }),
    date('orderDate', 'Ordered'),
    date('expectedDate', 'Expected', { note: 'Leave blank and the row reports MISSING DATE rather than pretending to be on time.' }),
    refId('personId', 'Person ID', { sheet: S.PEOPLE, column: 'personId' }),
    formula('recipient', 'Recipient', (f) => whenRowUsed(f.a('orderId'),
      lookupBlank(f.r(S.PEOPLE, 'name'), f.r(S.PEOPLE, 'personId'), f.a('personId'))), { width: 20 }),
    input('itemSummary', 'Items', { width: 32 }),
    money('orderTotal', 'Order total', { note: 'For chasing the parcel and the refund. Budget figures come from the gift rows.' }),
    input('tracking', 'Tracking number or link', { width: 28 }),
    pick('orderStatus', 'Status', 'OrderStatus', { width: 14 }),
    date('arrivedDate', 'Arrived on'),
    formula('arrived', 'Arrived?', (f) => whenRowUsed(f.a('orderId'),
      `IF(OR(${f.a('orderStatus')}="Arrived",${f.a('arrivedDate')}<>""),"Yes","No")`), { width: 11 }),
    pick('issueType', 'Issue', 'IssueType', { width: 15 }),
    date('returnDeadline', 'Return by'),
    money('refundExpected', 'Refund expected'),
    yesNo('refundReceived', 'Refund received?'),
    status('attention', 'Attention', (f) => whenRowUsed(f.a('orderId'),
      orderAttention(f.a('arrived'), f.a('expectedDate'), f.a('orderStatus'), f.a('tracking'), 'Set_ShipWindow')), { width: 15 }),
    status('returnFlag', 'Return window', (f) => whenRowUsed(f.a('orderId'),
      `IF(${f.a('returnDeadline')}="","—",IF(${f.a('returnDeadline')}<TODAY(),"CLOSED",IF(${f.a('returnDeadline')}-TODAY()<=7,"CLOSING SOON","OPEN")))`), { width: 15 }),
    notes(),
  ],
  samples: [
    { orderId: 'O-001', store: 'Levens Pottery', orderDate: '2026-11-14', expectedDate: '2026-11-28', personId: 'P-001', itemSummary: 'Stoneware jug', orderTotal: 175.85, tracking: 'RM-4471-2290-GB', orderStatus: 'Arrived', arrivedDate: '2026-11-26', issueType: 'None', returnDeadline: '2027-01-14', refundReceived: 'No', notes: 'EXAMPLE — DELETE ME' },
    { orderId: 'O-002', store: 'Marine Charts Co.', orderDate: '2026-11-30', expectedDate: '2026-12-08', personId: 'P-002', itemSummary: 'Framed chart', orderTotal: 226, tracking: '', orderStatus: 'Ordered', issueType: 'None', refundReceived: 'No', notes: 'EXAMPLE — DELETE ME' },
    { orderId: 'O-003', store: 'Linen House', orderDate: '2026-11-18', expectedDate: '2026-11-30', itemSummary: 'Damask tablecloth, 3m', orderTotal: 240, tracking: 'DPD-88120344', orderStatus: 'Delayed', issueType: 'Late', returnDeadline: '2026-12-30', refundExpected: 240, refundReceived: 'No', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.5 RETURNS + EXCHANGES — the only place a refund reduces spend.
 * ------------------------------------------------------------------ */
export const returns = {
  name: S.RETURNS,
  intro: 'What went back, what you are owed, and what has actually landed.',
  rows: CAPACITY[S.RETURNS],
  idColumn: 'returnId',
  freezeColumns: 2,
  refund: { category: 'budgetCategory', amount: 'refundCounted' },
  columns: [
    id('returnId', 'Return ID'),
    refId('orderId', 'Order ID', { sheet: S.ORDERS, column: 'orderId' }),
    refId('giftId', 'Gift ID', { sheet: S.GIFTS, column: 'giftId' }),
    input('storeOverride', 'Store (if bought in a shop)', { width: 22 }),
    formula('store', 'Store', (f) => whenRowUsed(f.a('returnId'),
      `IF(${f.a('orderId')}="",${f.a('storeOverride')},${lookupBlank(f.r(S.ORDERS, 'store'), f.r(S.ORDERS, 'orderId'), f.a('orderId'))})`), { width: 20 }),
    formula('recipient', 'Recipient', (f) => whenRowUsed(f.a('returnId'),
      lookupBlank(f.r(S.ORDERS, 'recipient'), f.r(S.ORDERS, 'orderId'), f.a('orderId'))), { width: 20 }),
    input('itemOverride', 'Item (if bought in a shop)', { width: 26 }),
    formula('item', 'Item', (f) => whenRowUsed(f.a('returnId'),
      `IF(${f.a('orderId')}="",${f.a('itemOverride')},${lookupBlank(f.r(S.ORDERS, 'itemSummary'), f.r(S.ORDERS, 'orderId'), f.a('orderId'))})`), { width: 30 }),
    pick('reason', 'Reason', 'IssueType', { width: 16 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17, note: 'The category the refund should come back to. Usually the same one the purchase went out of.' }),
    date('sentDate', 'Sent back'),
    formula('deadline', 'Return by', (f) => whenRowUsed(f.a('returnId'),
      lookupBlank(f.r(S.ORDERS, 'returnDeadline'), f.r(S.ORDERS, 'orderId'), f.a('orderId'))), { type: 'date', width: 13 }),
    pick('returnStatus', 'Status', 'ReturnStatus', { width: 17 }),
    money('refundExpected', 'Refund expected'),
    yesNo('refundReceivedFlag', 'Refund received?', { note: 'Until this says Yes, the refund does not change what you have spent.' }),
    money('refundAmount', 'Amount received', { note: 'Leave blank if it matched the expected amount exactly.' }),
    moneyF('refundCounted', 'Counted refund', (f) => whenRowUsed(f.a('returnId'),
      netRefund(f.a('refundExpected'), f.a('refundReceivedFlag'), f.a('refundAmount'))),
      { note: 'The figure subtracted from your actual spend. Zero until the refund arrives.' }),
    status('attention', 'Attention', (f) => whenRowUsed(f.a('returnId'),
      `IF(${f.a('refundReceivedFlag')}="Yes","SETTLED",IF(${f.a('deadline')}<>"",IF(${f.a('deadline')}<TODAY(),"WINDOW CLOSED",IF(${f.a('deadline')}-TODAY()<=7,"RETURN THIS WEEK","AWAITING REFUND")),"AWAITING REFUND"))`),
      { width: 17 }),
    notes(),
  ],
  samples: [
    { returnId: 'R-001', orderId: 'O-003', reason: 'Damaged', budgetCategory: 'Hosting', sentDate: '2026-12-02', returnStatus: 'In transit', refundExpected: 240, refundReceivedFlag: 'No', notes: 'EXAMPLE — DELETE ME · a refund you are still owed does not change what you have spent' },
    { returnId: 'R-002', storeOverride: 'Apothecary Row', itemOverride: 'Brass candlesticks, pair', reason: 'Wrong item', budgetCategory: 'Decorations',  sentDate: '2026-11-29', returnStatus: 'Refunded', refundExpected: 120, refundReceivedFlag: 'Yes', refundAmount: 120, notes: 'EXAMPLE — DELETE ME · bought in a shop, so there is no order to look up' },
    { returnId: 'R-003', orderId: 'O-003', reason: 'Wrong item', budgetCategory: 'Hosting', returnStatus: 'To return', refundExpected: 60, refundReceivedFlag: 'No', notes: 'EXAMPLE — DELETE ME · the napkins from the same order' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.9 CARDS + MAIL
 * ------------------------------------------------------------------ */
export const cards = {
  name: S.CARDS,
  intro: 'Who is on the list, whether the address is right, and what has gone in the post.',
  rows: CAPACITY[S.CARDS],
  idColumn: 'cardId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('cardId', 'Card ID'),
    refId('personId', 'Person ID', { sheet: S.PEOPLE, column: 'personId' }),
    formula('recipient', 'Recipient', (f) => whenRowUsed(f.a('cardId'),
      `IF(${f.a('personId')}="",${f.a('nameOverride')},${lookupBlank(f.r(S.PEOPLE, 'name'), f.r(S.PEOPLE, 'personId'), f.a('personId'))})`), { width: 22 }),
    input('nameOverride', 'Name (if not on the list)', { width: 22 }),
    pick('addressStatus', 'Address status', 'AddressStatus', { width: 16 }),
    input('stationery', 'Stationery', { width: 20 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('plannedCost', 'Planned cost'),
    money('actualCost', 'Actual cost'),
    pick('cardStatus', 'Status', 'CardStatus', { width: 14 }),
    date('postedDate', 'Posted'),
    yesNo('received', 'Card received?'),
    notes(),
  ],
  samples: [
    { cardId: 'C-001', personId: 'P-001', addressStatus: 'Confirmed', stationery: 'Letterpress, ivory', budgetCategory: 'Cards & Postage', plannedCost: 6.4, actualCost: 6.4, cardStatus: 'Posted', postedDate: '2026-12-05', received: 'No', notes: 'EXAMPLE — DELETE ME' },
    { cardId: 'C-002', personId: 'P-003', addressStatus: 'Needs checking', stationery: 'Letterpress, ivory', budgetCategory: 'Cards & Postage', plannedCost: 6.4, cardStatus: 'To write', received: 'No', notes: 'EXAMPLE — DELETE ME' },
    { cardId: 'C-003', nameOverride: 'The Ashworths, next door', addressStatus: 'Confirmed', stationery: 'Hand-marbled', budgetCategory: 'Cards & Postage', plannedCost: 4, cardStatus: 'Written', received: 'No', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.9 DONATIONS + GIVING
 * ------------------------------------------------------------------ */
export const donations = {
  name: S.DONATIONS,
  intro: 'The giving you intend to do, kept in the same view as everything else you are spending.',
  rows: CAPACITY[S.DONATIONS],
  idColumn: 'givingId',
  freezeColumns: 2,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('givingId', 'Giving ID'),
    input('organisation', 'Organisation or person', { width: 28 }),
    pick('givingType', 'Type', 'GivingType', { width: 15 }),
    input('detail', 'What you are giving', { width: 30 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('plannedCost', 'Planned'),
    money('actualCost', 'Actual'),
    date('deadline', 'By when'),
    yesNo('delivered', 'Delivered?'),
    yesNo('receipt', 'Receipt kept?'),
    status('attention', 'Status', (f) => whenRowUsed(f.a('givingId'),
      `IF(${f.a('delivered')}="Yes","COMPLETE",IF(${f.a('deadline')}="","NO DATE",IF(${f.a('deadline')}<TODAY(),"OVERDUE",IF(${f.a('deadline')}-TODAY()<=7,"THIS WEEK","SCHEDULED"))))`), { width: 14 }),
    notes(),
  ],
  samples: [
    { givingId: 'D-001', organisation: 'River trust winter appeal', givingType: 'Money', detail: 'Annual gift in Sofia\'s name', budgetCategory: 'Donations', plannedCost: 250, actualCost: 250, deadline: '2026-12-15', delivered: 'Yes', receipt: 'Yes', notes: 'EXAMPLE — DELETE ME' },
    { givingId: 'D-002', organisation: 'Parish toy collection', givingType: 'Goods', detail: 'Six wrapped toys, ages 4–8', budgetCategory: 'Donations', plannedCost: 180, deadline: '2026-12-10', delivered: 'No', receipt: 'No', notes: 'EXAMPLE — DELETE ME' },
    { givingId: 'D-003', organisation: 'Neighbourhood kitchen', givingType: 'Time', detail: 'Two mornings, week of the 20th', budgetCategory: 'Donations', deadline: '2026-12-20', delivered: 'No', receipt: 'No', notes: 'EXAMPLE — DELETE ME' },
  ],
};
