/**
 * Central configuration for The Christmas Season Master Command Center.
 *
 * PRD §11.3: no hard-coded cell addresses scattered through the code. Sheet
 * names, row geometry, capacities, palette tokens and dropdown sources all
 * live here, and every other module derives its addresses from these values.
 */

/* ------------------------------------------------------------------ *
 * §6.2 Visual tokens
 * ------------------------------------------------------------------ */

export const TOKENS = {
  /* Deep plum anchors every page: headers, titles, the type on the cover. */
  PLUM: 'FF4E2B38',
  PLUM_2: 'FF74505F',
  /* Dusty rose carries the alerts and the figures that matter. */
  ROSE: 'FF91455A',
  /* The field the whole product sits on. */
  BLUSH: 'FFFEF6F7',
  BAND: 'FFFBEFF2',
  /* Gold is the through-line: a rule under every heading, the numerals, the
     nav strip, the chart's budget bars, the hairlines on the cover. */
  GOLD: 'FFB08D57',
  GOLD_LIGHT: 'FFE0C48C',
  GOLD_PALE: 'FFF7EEDD',
  INK: 'FF3B3034',
  /* Calculated cells: mauve-grey, cool against the warm pink of an input. */
  MIST: 'FFECE6EA',
  SOFT_AMBER: 'FFF7E7C9',
  SOFT_ROSE: 'FFF7DEE3',
  PAPER: 'FFFFFFFF',
  RULE: 'FFE6D6CE',
  MUTED: 'FF746066',
};

export const FONTS = {
  /**
   * §6.2 names "Cormorant Garamond or Georgia fallback" for the display face.
   * A spreadsheet cannot express a fallback the way CSS can — it writes one
   * name, and a machine without that font substitutes whatever it likes. Almost
   * no buyer has Cormorant Garamond installed, and the substitution Excel picks
   * is usually a sans, which loses the whole editorial character. So the
   * workbook ships set in Georgia, which is present on every Windows and macOS
   * machine, and the documentation tells anyone who owns Cormorant Garamond how
   * to swap it in.
   */
  display: 'Georgia',
  displayUpgrade: 'Cormorant Garamond',
  /** UI sans. Aptos is the current Office default; Arial substitutes cleanly. */
  ui: 'Aptos',
  uiFallback: 'Arial',
};

export const DISPLAY_FONT = FONTS.display;
export const UI_FONT = FONTS.ui;

/* ------------------------------------------------------------------ *
 * Sheet geometry — every sheet in the workbook shares one skeleton.
 * ------------------------------------------------------------------ */

export const LAYOUT = {
  NAV_ROW: 1,
  TITLE_ROW: 2,
  INTRO_ROW: 3,
  LEGEND_ROW: 4,
  HEADER_ROW: 5,
  FIRST_DATA_ROW: 6,
  /** Columns reserved on the left of page-style sheets for margin. */
  NAV_TARGETS: ['DASHBOARD', 'START HERE', 'CHRISTMAS CALENDAR', 'MASTER BUDGET', 'SHEET INDEX'],
};

/* ------------------------------------------------------------------ *
 * §5 Required sheet inventory. Order is the tab order.
 * ------------------------------------------------------------------ */

export const SHEETS = {
  COVER: 'COVER',
  START: 'START HERE',
  SETTINGS: 'SETTINGS',
  DASHBOARD: 'DASHBOARD',
  VISION: 'SEASON VISION',
  PROFILES: 'RECIPIENT PROFILES',
  PEOPLE: 'PEOPLE + BUDGETS',
  BUDGET: 'MASTER BUDGET',
  GIFTS: 'GIFT PLANNER',
  STOCKINGS: 'STOCKING STUFFERS',
  ORDERS: 'ONLINE ORDERS',
  RETURNS: 'RETURNS + EXCHANGES',
  CALENDAR: 'CHRISTMAS CALENDAR',
  VENDORS: 'VENDORS + APPOINTMENTS',
  DECOR: 'DECOR INVENTORY',
  DECOR_PLAN: 'DECORATING PLAN',
  TABLESCAPE: 'TABLESCAPE + FLORALS',
  MEALS: 'MEAL + BAKING PLAN',
  GROCERIES: 'GROCERY LIST',
  RECIPES: 'RECIPE INDEX',
  HOSTING: 'HOSTING + GUESTS',
  TRADITIONS: 'TRADITIONS + BUCKET LIST',
  MEDIA: 'MOVIES + MUSIC',
  CARDS: 'CARDS + MAIL',
  WARDROBE: 'EVENTS + WARDROBE',
  TRAVEL: 'TRAVEL PLAN',
  CLEANING: 'CLEANING + HOME PREP',
  DONATIONS: 'DONATIONS + GIVING',
  ADVENT: 'ADVENT + REFLECTION',
  MEMORIES: 'MEMORIES',
  NEXT_YEAR: 'NEXT YEAR NOTES',
  ARCHIVE: 'ANNUAL ARCHIVE',
  INDEX: 'SHEET INDEX',
  LISTS: 'LISTS',
  QA: 'QUALITY CHECK',
};

/** Tab order, matching §5's numbering with the index placed before support sheets. */
export const SHEET_ORDER = [
  SHEETS.COVER, SHEETS.START, SHEETS.SETTINGS, SHEETS.DASHBOARD, SHEETS.VISION,
  SHEETS.PROFILES, SHEETS.PEOPLE, SHEETS.BUDGET, SHEETS.GIFTS, SHEETS.STOCKINGS,
  SHEETS.ORDERS, SHEETS.RETURNS, SHEETS.CALENDAR, SHEETS.VENDORS, SHEETS.DECOR,
  SHEETS.DECOR_PLAN, SHEETS.TABLESCAPE, SHEETS.MEALS, SHEETS.GROCERIES, SHEETS.RECIPES,
  SHEETS.HOSTING, SHEETS.TRADITIONS, SHEETS.MEDIA, SHEETS.CARDS, SHEETS.WARDROBE,
  SHEETS.TRAVEL, SHEETS.CLEANING, SHEETS.DONATIONS, SHEETS.ADVENT, SHEETS.MEMORIES,
  SHEETS.NEXT_YEAR, SHEETS.ARCHIVE, SHEETS.INDEX, SHEETS.LISTS, SHEETS.QA,
];

/** §5 "Optional visible" sheets — documented as safe to hide. */
export const OPTIONAL_SHEETS = [SHEETS.TRAVEL, SHEETS.ADVENT, SHEETS.MEDIA];

/* ------------------------------------------------------------------ *
 * §11.3 Default row capacities. Extending them is documented in START HERE.
 * ------------------------------------------------------------------ */

export const CAPACITY = {
  [SHEETS.PROFILES]: 100,
  [SHEETS.PEOPLE]: 100,
  [SHEETS.BUDGET]: 20,
  [SHEETS.GIFTS]: 200,
  [SHEETS.STOCKINGS]: 150,
  [SHEETS.ORDERS]: 150,
  [SHEETS.RETURNS]: 60,
  [SHEETS.CALENDAR]: 200,
  [SHEETS.VENDORS]: 60,
  [SHEETS.DECOR]: 100,
  [SHEETS.DECOR_PLAN]: 60,
  [SHEETS.TABLESCAPE]: 60,
  [SHEETS.MEALS]: 150,
  [SHEETS.GROCERIES]: 200,
  [SHEETS.RECIPES]: 100,
  [SHEETS.HOSTING]: 100,
  [SHEETS.TRADITIONS]: 80,
  [SHEETS.MEDIA]: 80,
  [SHEETS.CARDS]: 150,
  [SHEETS.WARDROBE]: 60,
  [SHEETS.TRAVEL]: 40,
  [SHEETS.CLEANING]: 100,
  [SHEETS.DONATIONS]: 60,
  [SHEETS.ADVENT]: 31,
  [SHEETS.MEMORIES]: 100,
  [SHEETS.NEXT_YEAR]: 100,
  [SHEETS.ARCHIVE]: 20,
  [SHEETS.VISION]: 24,
};

/* ------------------------------------------------------------------ *
 * §6.1 Settings fields. Row numbers are derived, never typed twice.
 * ------------------------------------------------------------------ */

export const SETTINGS_FIELDS = [
  { key: 'YEAR', label: 'Christmas year', type: 'year', name: 'Set_Year',
    help: 'The season this copy of the workbook plans. Change it once, at the start of the season.' },
  { key: 'CHRISTMAS_DATE', label: 'Christmas date', type: 'date', name: 'Set_ChristmasDate',
    help: 'Defaults to 25 December of the year above. Edit only if you keep Christmas on another day.' },
  { key: 'SEASON_START', label: 'Season start', type: 'date', name: 'Set_SeasonStart',
    help: 'The date your planning calendar opens. 1 September by default.' },
  { key: 'CURRENCY', label: 'Currency symbol', type: 'list', list: 'Currency', name: 'Set_Currency',
    help: 'Sets the symbol shown beside every amount.' },
  { key: 'HOUSEHOLD', label: 'Household / planner name', type: 'text', name: 'Set_Household',
    help: 'Used in the welcome line on the cover and dashboard. Leave blank if you prefer.' },
  { key: 'WARN_THRESHOLD', label: 'Budget warning threshold', type: 'percent', name: 'Set_WarnThreshold',
    help: 'The share of a budget that turns a category amber. 90% by default.' },
  { key: 'SHIP_WINDOW', label: 'Shipping risk window (days)', type: 'integer', name: 'Set_ShipWindow',
    help: 'How many days before an expected delivery an order without tracking starts asking for attention.' },
  { key: 'LOW_STOCK', label: 'Low-stock threshold', type: 'integer', name: 'Set_LowStock',
    help: 'Décor quantity at or below this prompts a replacement note.' },
  { key: 'WEEK_START', label: 'Week starts', type: 'list', list: 'WeekStart', name: 'Set_WeekStart',
    help: 'Sunday or Monday, for calendar week numbers.' },
  { key: 'EDITION', label: 'Edition', type: 'text', name: 'Set_Edition', locked: true,
    help: 'The version of this workbook. Quote it if you contact support.' },
];

export const SETTINGS_LAYOUT = {
  FIRST_ROW: 7,
  LABEL_COL: 2,   // B
  VALUE_COL: 3,   // C
  HELP_COL: 4,    // D
};

export const SETTINGS_DEFAULTS = {
  YEAR: null,             // resolved at build time to the upcoming Christmas
  SEASON_START_MONTH: 9,
  SEASON_START_DAY: 1,
  CURRENCY: 'CAD',
  HOUSEHOLD: '',
  WARN_THRESHOLD: 0.9,
  SHIP_WINDOW: 7,
  LOW_STOCK: 1,
  WEEK_START: 'Sunday',
  EDITION: '1.0',
};

/* ------------------------------------------------------------------ *
 * §9 Dropdown sources. Every categorical input reads from LISTS, and a
 * buyer may edit the values without touching a formula.
 * ------------------------------------------------------------------ */

export const LISTS = {
  Currency: ['CAD', 'USD', 'GBP', 'EUR', 'AUD'],
  WeekStart: ['Sunday', 'Monday'],
  YesNo: ['Yes', 'No'],
  Group: ['Immediate family', 'Extended family', 'Friends', 'Teachers', 'Coworkers',
    'Neighbours', 'Host', 'Charity', 'Other'],
  BudgetCategory: ['Gifts', 'Stockings', 'Decorations', 'Food & Baking', 'Cards & Postage',
    'Events', 'Outfits', 'Travel', 'Donations', 'Hosting', 'Photography', 'Other'],
  GiftStatus: ['Idea', 'Researching', 'In Cart', 'Purchased', 'Cancelled', 'Returned'],
  GiftType: ['Physical', 'Digital', 'Experience'],
  DeliveryType: ['Ship to home', 'Ship to recipient', 'Store pickup', 'In store', 'Digital delivery'],
  Priority: ['Must', 'Should', 'Could'],
  OrderStatus: ['Ordered', 'Shipped', 'Arrived', 'Delayed', 'Cancelled', 'Returned'],
  IssueType: ['None', 'Damaged', 'Wrong item', 'Missing', 'Late', 'Not as described'],
  ReturnStatus: ['To return', 'In transit', 'Received by store', 'Refunded', 'Exchanged', 'Denied'],
  CalendarType: ['Task', 'Event', 'Deadline', 'Sale', 'Appointment', 'Tradition'],
  CalendarStatus: ['Not started', 'In progress', 'Complete', 'Attended', 'Skipped', 'Cancelled'],
  VendorCategory: ['Florist', 'Caterer', 'Baker', 'Stylist', 'Photographer', 'Cleaner',
    'Installer', 'Tailor', 'Musician', 'Other'],
  VendorStatus: ['Enquiry', 'Quoted', 'Booked', 'Deposit paid', 'Paid in full', 'Complete', 'Declined'],
  DecorCategory: ['Tree', 'Wreaths & garland', 'Lighting', 'Ornaments', 'Table', 'Mantel',
    'Outdoor', 'Stockings', 'Candles', 'Linens', 'Storage', 'Other'],
  Condition: ['Excellent', 'Good', 'Worn', 'Damaged', 'Retire'],
  Room: ['Entry', 'Living room', 'Dining room', 'Kitchen', 'Hall & stairs', 'Guest room',
    'Primary bedroom', 'Study', 'Porch', 'Garden', 'Other'],
  ApprovalStatus: ['Not needed', 'Wish list', 'Approved', 'Purchased'],
  Course: ['Canapé', 'Starter', 'Main', 'Side', 'Sauce', 'Dessert', 'Baking', 'Drink', 'Breakfast'],
  MealStatus: ['Planned', 'Shopped', 'Prepped', 'Cooked', 'Served', 'Dropped'],
  DietaryTag: ['None', 'Vegetarian', 'Vegan', 'Gluten free', 'Dairy free', 'Nut free',
    'Shellfish free', 'Halal', 'Kosher', 'Low sugar'],
  GroceryCategory: ['Produce', 'Meat & fish', 'Dairy', 'Bakery', 'Pantry', 'Baking',
    'Frozen', 'Drinks', 'Household', 'Flowers', 'Other'],
  RecipeCategory: ['Canapé', 'Starter', 'Main', 'Side', 'Dessert', 'Baking', 'Preserve', 'Drink'],
  GuestStatus: ['Invited', 'Confirmed', 'Declined', 'Tentative', 'Arrived', 'Departed'],
  Sleeping: ['Not staying', 'Guest room', 'Sofa bed', 'Hotel', 'Nearby family', 'Other'],
  TraditionCategory: ['Ritual', 'Outing', 'Making', 'Giving', 'Faith', 'Rest', 'Food', 'Other'],
  MediaType: ['Film', 'Series', 'Album', 'Playlist', 'Concert', 'Radio', 'Other'],
  Audience: ['Everyone', 'Adults', 'Children', 'Just me', 'Guests'],
  CardStatus: ['To write', 'Written', 'Addressed', 'Posted', 'Delivered', 'Received'],
  AddressStatus: ['Confirmed', 'Needs checking', 'Missing', 'Do not send'],
  WardrobeStatus: ['To source', 'Ordered', 'In tailoring', 'Ready', 'Worn'],
  TravelType: ['Flight', 'Train', 'Car', 'Ferry', 'Hotel', 'Rental', 'Transfer', 'Other'],
  BookingStatus: ['To book', 'Held', 'Booked', 'Paid', 'Changed', 'Cancelled'],
  Recurrence: ['Once', 'Weekly', 'Fortnightly', 'Monthly', 'Before guests', 'After guests'],
  TaskStatus: ['Not started', 'In progress', 'Complete', 'Delegated', 'Dropped'],
  GivingType: ['Money', 'Goods', 'Time', 'Gift in kind', 'Sponsorship'],
  Ownership: ['Owned', 'Borrowed', 'Rented', 'To buy'],
  Rating: ['1', '2', '3', '4', '5'],
  NextYearTheme: ['Worked well', 'Buy early', 'Replace', 'Avoid', 'Idea', 'Delegate', 'Book sooner'],
  Relationship: ['Spouse or partner', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Grandchild',
    'Extended family', 'Friend', 'Colleague', 'Neighbour', 'Teacher', 'Service', 'Other'],
};

/**
 * §7.3 Cost mapping. The explicit contract between a source module and the
 * MASTER BUDGET. `planned` and `actual` name the column keys on the source
 * sheet; `category` names the column carrying the budget category. A cost
 * record whose category is blank or unknown is a QUALITY CHECK exception, not
 * a silent omission.
 */
export const COST_MAPPING = [
  { sheet: SHEETS.GIFTS, label: 'Gift Planner', defaultCategory: 'Gifts' },
  { sheet: SHEETS.STOCKINGS, label: 'Stocking Stuffers', defaultCategory: 'Stockings' },
  { sheet: SHEETS.DECOR_PLAN, label: 'Decorating Plan', defaultCategory: 'Decorations' },
  { sheet: SHEETS.DECOR, label: 'Décor Inventory (approved replacements)', defaultCategory: 'Decorations' },
  { sheet: SHEETS.TABLESCAPE, label: 'Tablescape + Florals', defaultCategory: 'Hosting' },
  { sheet: SHEETS.MEALS, label: 'Meal + Baking Plan', defaultCategory: 'Food & Baking' },
  { sheet: SHEETS.GROCERIES, label: 'Grocery List', defaultCategory: 'Food & Baking' },
  { sheet: SHEETS.VENDORS, label: 'Vendors + Appointments', defaultCategory: 'Hosting' },
  { sheet: SHEETS.CARDS, label: 'Cards + Mail', defaultCategory: 'Cards & Postage' },
  { sheet: SHEETS.WARDROBE, label: 'Events + Wardrobe', defaultCategory: 'Outfits' },
  { sheet: SHEETS.TRAVEL, label: 'Travel Plan', defaultCategory: 'Travel' },
  { sheet: SHEETS.DONATIONS, label: 'Donations + Giving', defaultCategory: 'Donations' },
  { sheet: SHEETS.TRADITIONS, label: 'Traditions + Bucket List', defaultCategory: 'Events' },
  { sheet: SHEETS.CALENDAR, label: 'Christmas Calendar', defaultCategory: 'Events' },
];

/* ------------------------------------------------------------------ *
 * Number formats. Currency formats are rebuilt at build time around the
 * chosen symbol; the workbook ships with the SETTINGS default.
 * ------------------------------------------------------------------ */

export const CURRENCY_SYMBOL = { CAD: '$', USD: '$', GBP: '£', EUR: '€', AUD: '$' };

export function moneyFormat(symbol) {
  return `"${symbol}"#,##0.00;[Red]-"${symbol}"#,##0.00;"${symbol}"—`;
}

export const FORMATS = {
  date: 'd mmm yyyy',
  year: '0',
  time: 'h:mm AM/PM',
  integer: '#,##0;-#,##0;—',
  percent: '0%',
  percent1: '0.0%',
  text: '@',
};

export const EDITIONS = {
  excel: {
    key: 'excel',
    file: 'Christmas_Master_Command_Center_Excel.xlsx',
    label: 'Excel edition',
    charts: true,
    protect: true,
  },
  sheets: {
    key: 'sheets',
    file: 'Christmas_Master_Command_Center_Google_Sheets.xlsx',
    label: 'Google Sheets edition',
    // §12.2: sheet protection and conditional-formatting icon sets do not
    // survive a Sheets import intact, so the Sheets edition ships unprotected
    // with the colour key doing the work protection would have done.
    charts: true,
    protect: false,
  },
};

export const PRODUCT = {
  name: 'The Christmas Season Master Command Center',
  trademarkName: 'The Christmas Season Master Command Center™',
  promise: 'Curate every exquisite detail in one private Christmas atelier.',
  edition: SETTINGS_DEFAULTS.EDITION,
  seller: 'Mlissia',
  keywords: 'Christmas planner, gift tracker, holiday budget, hosting planner, Excel, Google Sheets',
};

/** Marker text for the three demonstration records on every tracker (§10.2). */
export const SAMPLE_MARKER = 'EXAMPLE — DELETE ME';
