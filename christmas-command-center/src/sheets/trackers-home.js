/**
 * Calendar, vendors, décor, table, wardrobe, travel and home preparation —
 * PRD §7.6, §7.6A, §7.8.
 */
import { SHEETS, CAPACITY } from '../config.js';
import {
  input, formula, money, moneyF, date, time, int, year, pick, yesNo, id, notes, status, refId, helper,
} from './helpers.js';
import { whenRowUsed, dueStatus, lookupBlank } from '../formulas.js';

const S = SHEETS;

/* ------------------------------------------------------------------ *
 * §7.8 CHRISTMAS CALENDAR — one dated table, not a drawn month grid.
 * ------------------------------------------------------------------ */
export const calendar = {
  name: S.CALENDAR,
  intro: 'Every dated thing in one table: tasks, events, deadlines and the sales worth waiting for.',
  footnote: 'The dashboard reads the next seven days from this sheet. Sort by date whenever you like — the IDs are stable.',
  rows: CAPACITY[S.CALENDAR],
  idColumn: 'calId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'budgetCap', actual: 'actualCost' },
  columns: [
    id('calId', 'Calendar ID'),
    date('when', 'Date'),
    time('startTime', 'Start'),
    pick('entryType', 'Type', 'CalendarType', { width: 14 }),
    input('title', 'Event or task', { width: 34 }),
    input('module', 'Belongs to', { width: 18, note: 'Which part of the season this belongs to — gifts, hosting, décor. Free text on purpose.' }),
    input('owner', 'Owner', { width: 16 }),
    input('location', 'Where', { width: 20 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('budgetCap', 'Budget cap'),
    money('actualCost', 'Actual cost'),
    pick('entryStatus', 'Status', 'CalendarStatus', { width: 14 }),
    pick('priority', 'Priority', 'Priority', { width: 11 }),
    date('reminder', 'Remind me'),
    formula('weekNumber', 'Week', (f) => whenRowUsed(f.a('when'),
      `WEEKNUM(${f.a('when')},IF(Set_WeekStart="Monday",2,1))`), { type: 'int', width: 8 }),
    formula('open', 'Open?', (f) => whenRowUsed(f.a('calId'),
      `IF(OR(${f.a('entryStatus')}="Complete",${f.a('entryStatus')}="Attended",${f.a('entryStatus')}="Skipped",${f.a('entryStatus')}="Cancelled"),"No","Yes")`),
      { width: 9, note: 'An event that was attended or deliberately skipped is finished, the same as a completed task.' }),
    status('due', 'When', (f) => whenRowUsed(f.a('calId'), dueStatus(f.a('when'), `${f.a('open')}="No"`)), { width: 14 }),
    notes(),
    // The dashboard reads the next seven days from this key. The row fraction
    // keeps two things on the same day distinguishable, so SMALL() can rank
    // them without an array formula (§8 compatibility).
    helper('soonKey', 'Next-seven-days key', (f) =>
      `IF(AND(${f.a('open')}="Yes",${f.a('when')}<>"",${f.a('when')}>=TODAY(),${f.a('when')}<=TODAY()+7),${f.a('when')}+ROW()/100000,"")`),
  ],
  samples: [
    { calId: 'K-001', when: '2026-11-27', startTime: '08:00', entryType: 'Sale', title: 'Linen sale — tablecloth and napkins', module: 'Hosting', owner: 'Me', budgetCategory: 'Hosting', budgetCap: 300, entryStatus: 'Complete', priority: 'Should', notes: 'EXAMPLE — DELETE ME' },
    { calId: 'K-002', when: '2026-12-12', startTime: '19:00', entryType: 'Event', title: 'Neighbours\' drinks', module: 'Hosting', owner: 'Me', location: 'Number 14', budgetCategory: 'Events', budgetCap: 80, entryStatus: 'Not started', priority: 'Could', notes: 'EXAMPLE — DELETE ME' },
    { calId: 'K-003', when: '2026-12-18', entryType: 'Deadline', title: 'Last posting date for overseas cards', module: 'Cards', owner: 'Me', entryStatus: 'Not started', priority: 'Must', reminder: '2026-12-15', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.6A VENDORS + APPOINTMENTS
 * ------------------------------------------------------------------ */
export const vendors = {
  name: S.VENDORS,
  intro: 'The people you are booking, what they quoted, and what is still owed.',
  rows: CAPACITY[S.VENDORS],
  idColumn: 'vendorId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'quote', actual: 'paidToDate' },
  columns: [
    id('vendorId', 'Vendor ID'),
    pick('category', 'Category', 'VendorCategory', { width: 15 }),
    input('business', 'Business', { width: 24 }),
    input('contact', 'Contact', { width: 20 }),
    input('phone', 'Phone', { width: 16 }),
    input('email', 'Email', { width: 26 }),
    input('service', 'Service', { width: 30 }),
    refId('eventRef', 'Event ID', { sheet: S.CALENDAR, column: 'calId' }),
    date('apptDate', 'Appointment'),
    time('apptTime', 'Time'),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('quote', 'Quote'),
    money('deposit', 'Deposit paid'),
    moneyF('balance', 'Balance', (f) => whenRowUsed(f.a('vendorId'), `MAX(0,${f.a('quote')}-${f.a('deposit')})`)),
    date('balanceDue', 'Balance due'),
    moneyF('paidToDate', 'Paid to date', (f) => whenRowUsed(f.a('vendorId'),
      `IF(${f.a('vendorStatus')}="Paid in full",${f.a('quote')},IF(${f.a('vendorStatus')}="Complete",${f.a('quote')},${f.a('deposit')}))`),
      { note: 'A deposit until the booking is settled, then the full quote. This is the figure the budget uses.' }),
    input('contract', 'Contract or link', { width: 26 }),
    input('owner', 'Owner', { width: 16 }),
    pick('vendorStatus', 'Status', 'VendorStatus', { width: 16 }),
    yesNo('thankYou', 'Thank you sent?'),
    status('attention', 'Attention', (f) => whenRowUsed(f.a('vendorId'),
      `IF(${f.a('vendorStatus')}="Declined","CLOSED",IF(${f.a('balance')}=0,"SETTLED",IF(${f.a('balanceDue')}="","BALANCE OPEN",IF(${f.a('balanceDue')}<TODAY(),"BALANCE OVERDUE",IF(${f.a('balanceDue')}-TODAY()<=7,"BALANCE DUE SOON","BALANCE OPEN")))))`), { width: 18 }),
    notes(),
  ],
  samples: [
    { vendorId: 'V-001', category: 'Florist', business: 'Hedgerow & Bough', contact: 'Marta', phone: '020 7946 0102', email: 'studio@hedgerowbough.example', service: 'Mantel garland and two table arrangements', eventRef: 'K-002', apptDate: '2026-12-22', apptTime: '10:00', budgetCategory: 'Hosting', quote: 640, deposit: 200, balanceDue: '2026-12-20', vendorStatus: 'Booked', thankYou: 'No', notes: 'EXAMPLE — DELETE ME' },
    { vendorId: 'V-002', category: 'Cleaner', business: 'Fen & Field', contact: 'Ana', phone: '020 7946 0155', service: 'Deep clean before guests arrive', apptDate: '2026-12-19', apptTime: '09:00', budgetCategory: 'Hosting', quote: 320, deposit: 0, balanceDue: '2026-12-19', vendorStatus: 'Quoted', thankYou: 'No', notes: 'EXAMPLE — DELETE ME' },
    { vendorId: 'V-003', category: 'Photographer', business: 'Rowan Frost', contact: 'Rowan', email: 'hello@rowanfrost.example', service: 'Family portraits, Boxing Day morning', budgetCategory: 'Photography', quote: 850, deposit: 850, vendorStatus: 'Paid in full', thankYou: 'No', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.6 DECOR INVENTORY
 * ------------------------------------------------------------------ */
export const decor = {
  name: S.DECOR,
  intro: 'What you already own, where it lives, and what genuinely needs replacing.',
  footnote: 'Only replacements marked Approved reach the budget. A wish list should not look like a commitment.',
  rows: CAPACITY[S.DECOR],
  idColumn: 'decorId',
  freezeColumns: 2,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('decorId', 'Décor ID'),
    input('item', 'Item', { width: 30 }),
    pick('category', 'Category', 'DecorCategory', { width: 18 }),
    input('style', 'Style / colour', { width: 22 }),
    int('qty', 'Qty'),
    pick('condition', 'Condition', 'Condition', { width: 13 }),
    pick('room', 'Room', 'Room', { width: 16 }),
    input('storage', 'Storage bin', { width: 20 }),
    year('purchaseYear', 'Bought'),
    yesNo('heirloom', 'Heirloom?'),
    yesNo('replacementNeeded', 'Replace?'),
    pick('approval', 'Replacement status', 'ApprovalStatus', { width: 18, note: 'Approved is the only setting that lets a replacement cost reach the budget.' }),
    money('replacementCost', 'Replacement cost'),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    moneyF('plannedCost', 'Counted planned', (f) => whenRowUsed(f.a('decorId'),
      `IF(${f.a('approval')}="Approved",${f.a('replacementCost')},0)`)),
    money('actualCost', 'Actual cost'),
    status('stock', 'Stock', (f) => whenRowUsed(f.a('decorId'),
      `IF(${f.a('qty')}="","NO COUNT",IF(${f.a('qty')}<=Set_LowStock,"LOW","IN STOCK"))`), { width: 12 }),
    input('photo', 'Photo or link', { width: 24 }),
    notes(),
  ],
  samples: [
    { decorId: 'X-001', item: 'Mercury glass candlesticks, pair', category: 'Candles', style: 'Antiqued silver', qty: 2, condition: 'Good', room: 'Dining room', storage: 'Bin 3, attic', purchaseYear: 2019, heirloom: 'No', replacementNeeded: 'No', approval: 'Not needed', budgetCategory: 'Decorations', notes: 'EXAMPLE — DELETE ME' },
    { decorId: 'X-002', item: 'Grandmother\'s glass baubles', category: 'Ornaments', style: 'Hand-painted, faded gilt', qty: 14, condition: 'Worn', room: 'Living room', storage: 'Padded case, cellar', purchaseYear: 1962, heirloom: 'Yes', replacementNeeded: 'No', approval: 'Not needed', budgetCategory: 'Decorations', notes: 'EXAMPLE — DELETE ME' },
    { decorId: 'X-003', item: 'Outdoor door garland', category: 'Wreaths & garland', style: 'Noble fir, dried orange', qty: 1, condition: 'Retire', room: 'Entry', storage: 'Composted each year', purchaseYear: 2025, heirloom: 'No', replacementNeeded: 'Yes', approval: 'Approved', replacementCost: 180, budgetCategory: 'Decorations', actualCost: 180, notes: 'EXAMPLE — DELETE ME · bought, and the cost lands once' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.6 DECORATING PLAN
 * ------------------------------------------------------------------ */
export const decorPlan = {
  name: S.DECOR_PLAN,
  intro: 'Room by room: what it should feel like, what you have, and what is still missing.',
  rows: CAPACITY[S.DECOR_PLAN],
  idColumn: 'planId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('planId', 'Plan ID'),
    pick('area', 'Area', 'Room', { width: 16 }),
    input('intention', 'Design intention', { width: 36 }),
    input('inventoryItems', 'Using from store', { width: 30, note: 'Décor IDs or plain descriptions — whichever you will actually keep up to date.' }),
    input('missingItems', 'Still needed', { width: 28 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('plannedCost', 'Planned cost'),
    money('actualCost', 'Actual cost'),
    date('installDate', 'Install'),
    input('owner', 'Owner', { width: 16 }),
    yesNo('completed', 'Done?'),
    date('takedownDate', 'Takedown'),
    input('storageDestination', 'Back into', { width: 20 }),
    status('due', 'When', (f) => whenRowUsed(f.a('planId'), dueStatus(f.a('installDate'), `${f.a('completed')}="Yes"`)), { width: 14 }),
    notes(),
  ],
  samples: [
    { planId: 'DP-001', area: 'Entry', intention: 'One tall garland, candlelight, nothing else', inventoryItems: 'X-003', missingItems: 'New garland', budgetCategory: 'Decorations', plannedCost: 0, installDate: '2026-12-01', owner: 'Me', completed: 'No', takedownDate: '2027-01-06', storageDestination: 'Composted', notes: 'EXAMPLE — DELETE ME · the garland is costed on DÉCOR INVENTORY, so it is not costed again here' },
    { planId: 'DP-002', area: 'Dining room', intention: 'Evergreen and glass, low enough to talk across', inventoryItems: 'X-001', budgetCategory: 'Decorations', plannedCost: 90, installDate: '2026-12-20', owner: 'Me', completed: 'No', takedownDate: '2027-01-06', storageDestination: 'Bin 3, attic', notes: 'EXAMPLE — DELETE ME' },
    { planId: 'DP-003', area: 'Living room', intention: 'The old baubles, and only the old baubles', inventoryItems: 'X-002', budgetCategory: 'Decorations', plannedCost: 0, installDate: '2026-12-06', owner: 'James', completed: 'No', takedownDate: '2027-01-06', storageDestination: 'Padded case, cellar', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.6A TABLESCAPE + FLORALS
 * ------------------------------------------------------------------ */
export const tablescape = {
  name: S.TABLESCAPE,
  intro: 'The table, laid out on paper first: linen, glass, flowers, candles and who sets it.',
  rows: CAPACITY[S.TABLESCAPE],
  idColumn: 'tableId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('tableId', 'Table ID'),
    refId('eventRef', 'Event ID', { sheet: S.CALENDAR, column: 'calId' }),
    input('tableRoom', 'Table or room', { width: 20 }),
    int('guestCount', 'Guests'),
    input('aesthetic', 'Direction', { width: 32 }),
    input('linen', 'Linen', { width: 20 }),
    input('china', 'China', { width: 20 }),
    input('flatware', 'Flatware', { width: 18 }),
    input('glassware', 'Glassware', { width: 20 }),
    input('placeCards', 'Place cards', { width: 18 }),
    input('centrepiece', 'Centrepiece / floral recipe', { width: 34 }),
    input('candles', 'Candles', { width: 20 }),
    input('rentalSource', 'Rental source', { width: 20 }),
    pick('ownership', 'Owned or hired', 'Ownership', { width: 15 }),
    int('qty', 'Qty'),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('plannedCost', 'Planned cost'),
    money('actualCost', 'Actual cost'),
    input('installOwner', 'Set by', { width: 16 }),
    time('setupTime', 'Set at'),
    yesNo('completed', 'Ready?'),
    notes(),
  ],
  samples: [
    { tableId: 'T-001', eventRef: 'K-002', tableRoom: 'Dining room, long table', guestCount: 12, aesthetic: 'Evergreen, ivory, one note of oxblood', linen: 'Damask, ivory', china: 'The Wedgwood', flatware: 'Grandmother\'s silver', glassware: 'Cut crystal, six each', placeCards: 'Hand-written, ivory card', centrepiece: 'Low bowls: noble fir, hellebore, dried orange', candles: 'Ivory tapers, twelve', ownership: 'Owned', qty: 1, budgetCategory: 'Hosting', plannedCost: 240, installOwner: 'Me', setupTime: '16:00', completed: 'No', notes: 'EXAMPLE — DELETE ME' },
    { tableId: 'T-002', tableRoom: 'Kitchen, Christmas Eve supper', guestCount: 6, aesthetic: 'Quieter — linen, pewter, one candle', linen: 'Washed linen, flax', china: 'Everyday creamware', ownership: 'Owned', qty: 1, budgetCategory: 'Hosting', plannedCost: 0, installOwner: 'Me', completed: 'No', notes: 'EXAMPLE — DELETE ME' },
    { tableId: 'T-003', tableRoom: 'Drinks, drawing room', guestCount: 20, aesthetic: 'Standing, so nothing that needs a fork', glassware: 'Coupes, hired', rentalSource: 'Fen & Field hire', ownership: 'Rented', qty: 24, budgetCategory: 'Events', plannedCost: 96, installOwner: 'James', setupTime: '17:30', completed: 'No', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.6A EVENTS + WARDROBE
 * ------------------------------------------------------------------ */
export const wardrobe = {
  name: S.WARDROBE,
  intro: 'What is being worn where, and what still needs collecting, altering or pressing.',
  rows: CAPACITY[S.WARDROBE],
  idColumn: 'lookId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('lookId', 'Look ID'),
    refId('eventRef', 'Event ID', { sheet: S.CALENDAR, column: 'calId' }),
    formula('eventName', 'Event', (f) => whenRowUsed(f.a('lookId'),
      lookupBlank(f.r(S.CALENDAR, 'title'), f.r(S.CALENDAR, 'calId'), f.a('eventRef'))), { width: 28 }),
    formula('eventDate', 'Date', (f) => whenRowUsed(f.a('lookId'),
      lookupBlank(f.r(S.CALENDAR, 'when'), f.r(S.CALENDAR, 'calId'), f.a('eventRef'))), { type: 'date', width: 13 }),
    input('wearer', 'Who', { width: 18 }),
    input('look', 'The look', { width: 32 }),
    input('sourcedFrom', 'From', { width: 20 }),
    input('tailoring', 'Alterations', { width: 24 }),
    input('accessories', 'Shoes and accessories', { width: 28 }),
    input('beauty', 'Hair or beauty appointment', { width: 26 }),
    date('pickupDate', 'Collect by'),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('plannedCost', 'Planned cost'),
    money('actualCost', 'Actual cost'),
    pick('readyStatus', 'Status', 'WardrobeStatus', { width: 15 }),
    input('storage', 'Hanging where', { width: 20 }),
    status('due', 'When', (f) => whenRowUsed(f.a('lookId'),
      dueStatus(f.a('pickupDate'), `OR(${f.a('readyStatus')}="Ready",${f.a('readyStatus')}="Worn")`)), { width: 14 }),
    notes(),
  ],
  samples: [
    { lookId: 'W-001', eventRef: 'K-002', wearer: 'Me', look: 'Bottle-green velvet, long', sourcedFrom: 'The green dress, altered', tailoring: 'Hem taken up 4cm', accessories: 'Grandmother\'s pearls, black satin flats', beauty: 'Cut and colour, 10 Dec', pickupDate: '2026-12-08', budgetCategory: 'Outfits', plannedCost: 180, readyStatus: 'In tailoring', storage: 'Guest room wardrobe', notes: 'EXAMPLE — DELETE ME' },
    { lookId: 'W-002', eventRef: 'K-002', wearer: 'James', look: 'Navy dinner jacket', sourcedFrom: 'Own', tailoring: 'None', accessories: 'Black tie, patent shoes', pickupDate: '2026-12-10', budgetCategory: 'Outfits', plannedCost: 45, readyStatus: 'To source', storage: 'Dressing room', notes: 'EXAMPLE — DELETE ME' },
    { lookId: 'W-003', wearer: 'Me', look: 'Christmas Day — grey flannel, cashmere', sourcedFrom: 'Own', tailoring: 'None', accessories: 'Signet ring only', budgetCategory: 'Outfits', plannedCost: 0, readyStatus: 'Ready', storage: 'Own wardrobe', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §5 TRAVEL PLAN (optional module)
 * ------------------------------------------------------------------ */
export const travel = {
  name: S.TRAVEL,
  intro: 'Journeys, bookings, transfers and the documents you will want to hand.',
  optional: true,
  rows: CAPACITY[S.TRAVEL],
  idColumn: 'travelId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('travelId', 'Travel ID'),
    input('trip', 'Trip', { width: 24 }),
    pick('travelType', 'Type', 'TravelType', { width: 13 }),
    input('provider', 'Provider', { width: 20 }),
    input('confirmation', 'Confirmation', { width: 18 }),
    date('departDate', 'Out'),
    time('departTime', 'Depart'),
    date('returnDate', 'Back'),
    input('route', 'From → to', { width: 24 }),
    input('travellers', 'Travelling', { width: 24 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('plannedCost', 'Planned cost'),
    money('actualCost', 'Actual cost'),
    pick('bookingStatus', 'Status', 'BookingStatus', { width: 13 }),
    input('packing', 'Packing notes', { width: 30 }),
    input('documents', 'Documents needed', { width: 26, note: 'What to bring, not the document itself. Never keep passport or card numbers in a spreadsheet.' }),
    notes('conciergeNotes', 'Notes', { width: 32 }),
    status('due', 'When', (f) => whenRowUsed(f.a('travelId'),
      dueStatus(f.a('departDate'), `OR(${f.a('bookingStatus')}="Cancelled",${f.a('departDate')}<TODAY()-1)`)), { width: 14 }),
  ],
  samples: [
    { travelId: 'TR-001', trip: 'Grandparents, Boxing Day', travelType: 'Train', provider: 'LNER', confirmation: 'XQ44TL', departDate: '2026-12-26', departTime: '09:12', returnDate: '2026-12-28', route: 'King\'s Cross → York', travellers: 'Four of us', budgetCategory: 'Travel', plannedCost: 288, actualCost: 288, bookingStatus: 'Paid', packing: 'Gifts go ahead by courier', documents: 'Railcards', conciergeNotes: 'EXAMPLE — DELETE ME' },
    { travelId: 'TR-002', trip: 'Sofia\'s arrival', travelType: 'Transfer', provider: 'Local car', departDate: '2026-12-22', departTime: '18:40', route: 'Airport → house', travellers: 'Sofia', budgetCategory: 'Travel', plannedCost: 85, bookingStatus: 'To book', conciergeNotes: 'EXAMPLE — DELETE ME' },
    { travelId: 'TR-003', trip: 'New Year, the coast', travelType: 'Hotel', provider: 'The Harbour Inn', confirmation: '', departDate: '2026-12-30', returnDate: '2027-01-02', route: 'Home → Aldeburgh', travellers: 'Two of us', budgetCategory: 'Travel', plannedCost: 620, bookingStatus: 'Held', packing: 'Boots, the good coat', conciergeNotes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.8 CLEANING + HOME PREP
 * ------------------------------------------------------------------ */
export const cleaning = {
  name: S.CLEANING,
  intro: 'The house, zone by zone, so nothing is left to the last free afternoon.',
  rows: CAPACITY[S.CLEANING],
  idColumn: 'taskId',
  freezeColumns: 3,
  columns: [
    id('taskId', 'Task ID'),
    pick('zone', 'Zone', 'Room', { width: 16 }),
    input('task', 'Task', { width: 34 }),
    input('owner', 'Owner', { width: 16 }),
    date('dueDate', 'Due'),
    pick('recurrence', 'Repeats', 'Recurrence', { width: 15 }),
    pick('taskStatus', 'Status', 'TaskStatus', { width: 14 }),
    input('supplies', 'Supplies needed', { width: 26 }),
    status('due', 'When', (f) => whenRowUsed(f.a('taskId'),
      dueStatus(f.a('dueDate'), `OR(${f.a('taskStatus')}="Complete",${f.a('taskStatus')}="Dropped")`)), { width: 14 }),
    notes(),
  ],
  samples: [
    { taskId: 'H-001', zone: 'Guest room', task: 'Air the room, launder the bedding, check the lamp', owner: 'Me', dueDate: '2026-12-19', recurrence: 'Before guests', taskStatus: 'Not started', supplies: 'Spare pillowcases', notes: 'EXAMPLE — DELETE ME' },
    { taskId: 'H-002', zone: 'Dining room', task: 'Polish the silver', owner: 'James', dueDate: '2026-12-21', recurrence: 'Once', taskStatus: 'Not started', supplies: 'Silver cloth, gloves', notes: 'EXAMPLE — DELETE ME' },
    { taskId: 'H-003', zone: 'Entry', task: 'Sweep the step, replace the door mat', owner: 'Me', dueDate: '2026-12-01', recurrence: 'Weekly', taskStatus: 'In progress', notes: 'EXAMPLE — DELETE ME' },
  ],
};
