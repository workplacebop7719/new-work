/**
 * The §12.2 scenario matrix, as data.
 *
 * Each scenario replaces the sample rows of one or two trackers and states what
 * the recalculated workbook must then say. The scenarios go through the real
 * generator, so what is tested is the product, not a model of it.
 */
import { SHEETS, LISTS } from '../config.js';

const S = SHEETS;

/** A date `days` from `from`, as the YYYY-MM-DD the specs use. */
export function iso(from, days = 0) {
  const d = new Date(from.getTime() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

const NO_BUDGETS = LISTS.BudgetCategory.map((category, i) => ({
  categoryId: `B-${String(i + 1).padStart(3, '0')}`, active: 'Yes', category,
}));

const budgets = (amounts) => LISTS.BudgetCategory.map((category, i) => ({
  categoryId: `B-${String(i + 1).padStart(3, '0')}`, active: 'Yes', category,
  budgetAmount: amounts[category] ?? 0,
}));

/** Every tracker emptied — the state a buyer sees after clearing the examples. */
export function emptyAll(specNames) {
  return Object.fromEntries(specNames.map((name) => [name, { samples: [] }]));
}

export function scenarios(specNames, today = new Date()) {
  const empty = emptyAll(specNames);
  const blankExcept = (extra) => ({ ...empty, [S.BUDGET]: { seed: NO_BUDGETS, samples: [] }, ...extra });

  return [
    {
      key: 'blank',
      title: 'Blank workbook',
      requirement: '§12.2 — dashboard shows zero or Not Started; no errors and no false late warnings.',
      build: { overrides: blankExcept({}) },
      checks: (r) => [
        r.equal('countdown is a non-negative number', r.dash('countdown') >= 0, true),
        r.equal('budget set', r.dash('budgetSet'), 0),
        r.equal('spent so far', r.dash('spent'), 0),
        r.equal('gifts chosen', r.dash('giftsChosen'), 0),
        r.equal('gifts note reads Not started', r.dashNote('giftsChosen'), 'Not started.'),
        r.equal('wrapping note', r.dashNote('wrapped'), 'Nothing to wrap yet.'),
        r.equal('orders note', r.dashNote('delivered'), 'No orders yet.'),
        r.equal('no orders reported late', r.attention('orders running late'), 0),
        r.equal('no missing-date warnings', r.attention('orders with no expected date'), 0),
        r.equal('no overdue tasks', r.attention('tasks and events overdue'), 0),
        r.equal('quality check is clean', r.qaTotal(), 0),
        r.equal('no formula errors anywhere', r.errorCount(), 0),
      ],
    },
    {
      key: 'zero-budget-purchase',
      title: 'Zero budget, one purchase',
      requirement: '§12.2 — status shows OVER BUDGET; remaining is the negative of actual spend.',
      build: {
        overrides: blankExcept({
          [S.GIFTS]: { samples: [{ giftId: 'G-001', personId: 'P-001', item: 'A purchase against no budget', budgetCategory: 'Gifts', qty: 1, unitPrice: 120, actualCost: 120, lifecycle: 'Purchased', giftType: 'Physical', wrapped: 'No' }] },
          [S.PEOPLE]: { samples: [{ personId: 'P-001', name: 'Test recipient', group: 'Friends', giftBudget: 0, stockingBudget: 0, active: 'Yes' }] },
        }),
      },
      checks: (r) => [
        r.equal('Gifts category status', r.budget('Gifts', 'status'), 'OVER BUDGET'),
        r.equal('Gifts remaining', r.budget('Gifts', 'remaining'), -120),
        r.equal('percent used stays 0 rather than dividing by zero', r.budget('Gifts', 'percentUsed'), 0),
        r.equal('dashboard remaining', r.dash('remaining'), -120),
        r.equal('no formula errors', r.errorCount(), 0),
      ],
    },
    {
      key: 'near-limit',
      title: 'At and just below the warning threshold',
      requirement: '§12.2 — status changes to NEAR LIMIT at the configured threshold, and not before.',
      build: {
        settings: { WARN_THRESHOLD: 0.9 },
        overrides: blankExcept({
          [S.BUDGET]: { seed: budgets({ Gifts: 100, Stockings: 100 }), samples: [] },
          [S.GIFTS]: { samples: [{ giftId: 'G-001', item: 'Ninety per cent of the gift budget', budgetCategory: 'Gifts', qty: 1, unitPrice: 90, actualCost: 90, lifecycle: 'Purchased', giftType: 'Physical' }] },
          [S.STOCKINGS]: { samples: [{ stockingId: 'S-001', item: 'Eighty-nine per cent of the stocking budget', budgetCategory: 'Stockings', qty: 1, unitPrice: 89, actualCost: 89, lifecycle: 'Purchased' }] },
        }),
      },
      checks: (r) => [
        r.equal('at the threshold', r.budget('Gifts', 'status'), 'NEAR LIMIT'),
        r.equal('one pound below it', r.budget('Stockings', 'status'), 'ON TRACK'),
      ],
    },
    {
      key: 'refund-expected',
      title: 'Refund expected but not received',
      requirement: '§12.2 — actual spend is unchanged and the refund stays on the attention board.',
      build: {
        overrides: blankExcept({
          [S.BUDGET]: { seed: budgets({ Gifts: 1000 }), samples: [] },
          [S.GIFTS]: { samples: [{ giftId: 'G-001', item: 'Bought and being returned', budgetCategory: 'Gifts', qty: 1, unitPrice: 200, actualCost: 200, lifecycle: 'Purchased', giftType: 'Physical' }] },
          [S.RETURNS]: { samples: [{ returnId: 'R-001', storeOverride: 'A shop', itemOverride: 'Bought and being returned', reason: 'Wrong item', budgetCategory: 'Gifts', returnStatus: 'In transit', refundExpected: 200, refundReceivedFlag: 'No' }] },
        }),
      },
      checks: (r) => [
        r.equal('actual spend unchanged', r.budget('Gifts', 'actual'), 200),
        r.equal('dashboard spend unchanged', r.dash('spent'), 200),
        r.equal('refund still owed', r.attention('refunds owed to you'), 1),
      ],
    },
    {
      key: 'refund-received',
      title: 'Refund received',
      requirement: '§12.2 — actual season spend decreases by the confirmed refund.',
      build: {
        overrides: blankExcept({
          [S.BUDGET]: { seed: budgets({ Gifts: 1000 }), samples: [] },
          [S.GIFTS]: { samples: [{ giftId: 'G-001', item: 'Bought and refunded', budgetCategory: 'Gifts', qty: 1, unitPrice: 200, actualCost: 200, lifecycle: 'Returned', giftType: 'Physical' }] },
          [S.RETURNS]: { samples: [{ returnId: 'R-001', storeOverride: 'A shop', itemOverride: 'Bought and refunded', reason: 'Wrong item', budgetCategory: 'Gifts', returnStatus: 'Refunded', refundExpected: 200, refundReceivedFlag: 'Yes', refundAmount: 200 }] },
        }),
      },
      checks: (r) => [
        r.equal('actual spend returns to zero', r.budget('Gifts', 'actual'), 0),
        r.equal('dashboard spend', r.dash('spent'), 0),
        r.equal('nothing left owed', r.attention('refunds owed to you'), 0),
      ],
    },
    {
      key: 'digital-gift',
      title: 'Digital gift purchased',
      requirement: '§12.2 — counts as purchased, excluded from the wrapping denominator.',
      build: {
        overrides: blankExcept({
          [S.BUDGET]: { seed: budgets({ Gifts: 1000 }), samples: [] },
          [S.GIFTS]: { samples: [
            { giftId: 'G-001', item: 'A subscription', budgetCategory: 'Gifts', qty: 1, unitPrice: 50, actualCost: 50, lifecycle: 'Purchased', giftType: 'Digital', wrapped: 'No' },
            { giftId: 'G-002', item: 'Something in a box', budgetCategory: 'Gifts', qty: 1, unitPrice: 60, actualCost: 60, lifecycle: 'Purchased', giftType: 'Physical', wrapped: 'No' },
          ] },
        }),
      },
      checks: (r) => [
        r.equal('both count as chosen', r.dash('giftsChosen'), 1),
        r.equal('only the physical one needs wrapping', r.dashNote('wrapped'), '0 of 1 — digital and experience gifts are not counted'),
        r.equal('one gift still to wrap', r.attention('bought gifts not yet wrapped'), 1),
      ],
    },
    {
      key: 'late-shipment',
      title: 'Late shipment',
      requirement: '§12.2 — the attention board rises and the order row reads LATE.',
      build: {
        overrides: blankExcept({
          [S.ORDERS]: { samples: [{ orderId: 'O-001', store: 'A shop', orderDate: iso(today, -20), expectedDate: iso(today, -5), itemSummary: 'Still not here', orderTotal: 80, tracking: 'TRACK-1', orderStatus: 'Ordered', issueType: 'None', refundReceived: 'No' }] },
        }),
      },
      checks: (r) => [
        r.equal('order row', r.order(1, 'attention'), 'LATE'),
        r.equal('attention board', r.attention('orders running late'), 1),
        r.equal('not reported as a missing date', r.attention('orders with no expected date'), 0),
      ],
    },
    {
      key: 'blank-expected-date',
      title: 'Order with no expected date',
      requirement: '§12.2 — a MISSING DATE warning, never LATE.',
      build: {
        overrides: blankExcept({
          [S.ORDERS]: { samples: [{ orderId: 'O-001', store: 'A shop', orderDate: iso(today, -20), itemSummary: 'No date given', orderTotal: 80, orderStatus: 'Ordered', issueType: 'None', refundReceived: 'No' }] },
        }),
      },
      checks: (r) => [
        r.equal('order row', r.order(1, 'attention'), 'MISSING DATE'),
        r.equal('not counted as late', r.attention('orders running late'), 0),
        r.equal('counted as a missing date', r.attention('orders with no expected date'), 1),
      ],
    },
    {
      key: 'duplicate-gift-id',
      title: 'Duplicate gift ID',
      requirement: '§12.2 — QUALITY CHECK returns an exception.',
      build: {
        overrides: blankExcept({
          [S.BUDGET]: { seed: budgets({ Gifts: 1000 }), samples: [] },
          [S.GIFTS]: { samples: [
            { giftId: 'G-001', item: 'First', budgetCategory: 'Gifts', qty: 1, unitPrice: 10, lifecycle: 'Idea', giftType: 'Physical' },
            { giftId: 'G-001', item: 'Second, same ID', budgetCategory: 'Gifts', qty: 1, unitPrice: 10, lifecycle: 'Idea', giftType: 'Physical' },
          ] },
        }),
      },
      checks: (r) => [
        r.equal('both rows reported', r.qa('Duplicate IDs on GIFT PLANNER'), 2),
        r.atLeast('quality check total rises', r.qaTotal(), 2),
        r.atLeast('the dashboard shows it', r.attention('items on QUALITY CHECK'), 2),
      ],
    },
    {
      key: 'unmapped-cost',
      title: 'A cost with no budget category',
      requirement: '§7.3 — an unmapped cost record appears on QUALITY CHECK, neither silently included nor excluded.',
      build: {
        overrides: blankExcept({
          [S.BUDGET]: { seed: budgets({ Gifts: 1000 }), samples: [] },
          [S.GIFTS]: { samples: [{ giftId: 'G-001', item: 'Tagged to nothing', qty: 1, unitPrice: 75, actualCost: 75, lifecycle: 'Purchased', giftType: 'Physical' }] },
        }),
      },
      checks: (r) => [
        r.equal('reported on quality check', r.qa('Costs with no budget category on GIFT PLANNER'), 1),
        r.equal('and the reconciliation says so', r.reconciliation('actual'), 'UNMAPPED COSTS'),
        r.equal('the money is not in the budget', r.budget('Gifts', 'actual'), 0),
      ],
    },
    {
      key: 'inactive-recipient',
      title: 'Inactive recipient',
      requirement: '§12.2 — excluded from the dashboard and from active recipient counts.',
      build: {
        overrides: blankExcept({
          [S.BUDGET]: { seed: budgets({ Gifts: 1000 }), samples: [] },
          [S.PEOPLE]: { samples: [
            { personId: 'P-001', name: 'Counted', group: 'Friends', giftBudget: 100, stockingBudget: 0, active: 'Yes' },
            { personId: 'P-002', name: 'Not counted this year', group: 'Friends', giftBudget: 100, stockingBudget: 0, active: 'No' },
          ] },
          [S.GIFTS]: { samples: [
            { giftId: 'G-001', personId: 'P-001', item: 'For the active person', budgetCategory: 'Gifts', qty: 1, unitPrice: 40, lifecycle: 'Idea', giftType: 'Physical' },
            { giftId: 'G-002', personId: 'P-002', item: 'For the inactive person', budgetCategory: 'Gifts', qty: 1, unitPrice: 40, lifecycle: 'Idea', giftType: 'Physical' },
          ] },
        }),
      },
      checks: (r) => [
        r.equal('the active person\'s gift counts', r.gift(1, 'active'), 'Yes'),
        r.equal('the inactive person\'s gift does not', r.gift(2, 'active'), 'No'),
        r.equal('one gift left to buy, not two', r.attention('gifts still to choose or buy'), 1),
      ],
    },
    {
      key: 'year-change',
      title: 'Year change into a leap year',
      requirement: '§12.2 — the countdown and dates calculate correctly across a year boundary.',
      build: {
        today: new Date(Date.UTC(2027, 11, 26)),
        overrides: blankExcept({}),
      },
      checks: (r) => [
        r.equal('the season rolls to the next Christmas', r.settings('YEAR'), 2028),
        r.equal('Christmas 2028 falls on a Monday', r.text(SHEETS.DASHBOARD, r.dashNoteAddress('countdown')), 'Christmas falls on Monday 25 December'),
        r.equal('the countdown counts through the 2028 leap day', r.dash('countdown'), r.daysUntil(Date.UTC(2028, 11, 25))),
      ],
    },
    {
      key: 'max-rows',
      title: 'Every tracker at its documented capacity',
      requirement: '§11.3 — the workbook holds its default row capacity without errors or slowdown.',
      build: { overrides: Object.fromEntries(specNames.map((name) => [name, { fill: 'capacity' }])) },
      checks: (r) => [
        r.equal('no formula errors', r.errorCount(), 0),
        r.equal('planned reconciles', r.reconciliation('planned'), 'RECONCILED'),
        r.equal('actual reconciles', r.reconciliation('actual'), 'RECONCILED'),
        r.atLeast('duplicate detection is doing something', r.qa('Gift rows flagged as possible duplicates'), 1),
      ],
    },
  ];
}
