/**
 * Vision, traditions, entertainment, reflection and the archive —
 * PRD §7.9 and the §4.1 archive layer.
 */
import { SHEETS, CAPACITY } from '../config.js';
import {
  input, formula, money, date, int, year, pick, yesNo, id, notes, status, helper,
} from './helpers.js';
import { whenRowUsed, dueStatus } from '../formulas.js';

const S = SHEETS;

/* ------------------------------------------------------------------ *
 * §5 SEASON VISION — the sheet the dashboard's joy strip reads from.
 * ------------------------------------------------------------------ */
export const vision = {
  name: S.VISION,
  intro: 'What you want this Christmas to feel like, written down before the list-making starts.',
  rows: CAPACITY[S.VISION],
  headerRow: 14,
  firstDataRow: 15,
  fieldsFirstRow: 7,
  idColumn: 'priorityId',
  freezeColumns: 2,
  /** Labelled inputs above the table, each given a defined name. */
  fields: [
    { key: 'THEME', label: 'This year\'s theme', name: 'Vision_Theme',
      sample: 'Quieter, warmer, fewer things' },
    { key: 'FEELINGS', label: 'Three words for how it should feel', name: 'Vision_Feelings',
      sample: 'Unhurried · candlelit · generous' },
    { key: 'COLOURS', label: 'Colour story', name: 'Vision_Colours',
      sample: 'Evergreen, ivory, one note of oxblood' },
    { key: 'SCENT', label: 'Scent and sound', name: 'Vision_Scent',
      sample: 'Bitter orange, woodsmoke, the old carols' },
    { key: 'PROTECT', label: 'What you are protecting this year', name: 'Vision_Protect',
      sample: 'The mornings. Nothing booked before eleven.' },
  ],
  columns: [
    id('priorityId', 'Priority ID'),
    input('priority', 'Priority', { width: 34, note: 'The dashboard shows the first priority you write here.' }),
    input('why', 'Why it matters', { width: 36 }),
    input('owner', 'Owner', { width: 16 }),
    yesNo('nonNegotiable', 'Non-negotiable?'),
    input('inspiration', 'Inspiration link', { width: 30 }),
    notes(),
  ],
  samples: [
    { priorityId: 'VN-001', priority: 'Christmas Eve supper with only the six of us', why: 'It is the part everyone remembers', owner: 'Me', nonNegotiable: 'Yes', notes: 'EXAMPLE — DELETE ME' },
    { priorityId: 'VN-002', priority: 'Every gift chosen by the end of November', why: 'December should be for people, not parcels', owner: 'Me', nonNegotiable: 'Yes', notes: 'EXAMPLE — DELETE ME' },
    { priorityId: 'VN-003', priority: 'One afternoon with nothing in it at all', why: 'Last year there was not one', owner: 'Both', nonNegotiable: 'No', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.9 TRADITIONS + BUCKET LIST
 * ------------------------------------------------------------------ */
export const traditions = {
  name: S.TRADITIONS,
  intro: 'The things that make it Christmas rather than merely December.',
  rows: CAPACITY[S.TRADITIONS],
  idColumn: 'traditionId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('traditionId', 'Tradition ID'),
    input('activity', 'Tradition or outing', { width: 34 }),
    pick('category', 'Kind', 'TraditionCategory', { width: 13 }),
    date('desiredDate', 'Hoped for'),
    date('bookedDate', 'Booked'),
    input('people', 'Who', { width: 22 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('plannedCost', 'Planned cost'),
    money('actualCost', 'Actual cost'),
    yesNo('completed', 'Done?'),
    pick('annualPriority', 'Priority', 'Priority', { width: 11 }),
    pick('joyRating', 'Worth it?', 'Rating', { width: 11, note: 'Filled in afterwards. Next year this is the column you will read first.' }),
    notes('nextYearNote', 'Note for next year', { width: 34 }),
    helper('eventDate', 'Date in play', (f) =>
      `IF(${f.a('bookedDate')}<>"",${f.a('bookedDate')},IF(${f.a('desiredDate')}="","",${f.a('desiredDate')}))`,
      { type: 'date' }),
    helper('upcoming', 'Next-up key', (f) =>
      `IF(OR(${f.a('completed')}="Yes",${f.a('eventDate')}="",N(${f.a('eventDate')})<TODAY()),"",${f.a('eventDate')})`,
      { type: 'date' }),
    status('due', 'When', (f) => whenRowUsed(f.a('traditionId'),
      `IF(${f.a('completed')}="Yes","DONE",${dueStatus(`IF(${f.a('bookedDate')}<>"",${f.a('bookedDate')},${f.a('desiredDate')})`, 'FALSE')})`), { width: 14 }),
  ],
  samples: [
    { traditionId: 'TD-001', activity: 'Carols at the old church', category: 'Faith', desiredDate: '2026-12-24', bookedDate: '2026-12-24', people: 'Everyone', budgetCategory: 'Events', plannedCost: 0, completed: 'No', annualPriority: 'Must', nextYearNote: 'EXAMPLE — DELETE ME' },
    { traditionId: 'TD-002', activity: 'Cutting greenery from the hedge', category: 'Making', desiredDate: '2026-12-06', people: 'Me and the children', budgetCategory: 'Decorations', plannedCost: 0, completed: 'Yes', annualPriority: 'Should', joyRating: '5', nextYearNote: 'EXAMPLE — DELETE ME' },
    { traditionId: 'TD-003', activity: 'The pantomime', category: 'Outing', desiredDate: '2026-12-19', people: 'All eight', budgetCategory: 'Events', plannedCost: 320, completed: 'No', annualPriority: 'Could', nextYearNote: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.9 MOVIES + MUSIC — user-entered titles only.
 * ------------------------------------------------------------------ */
export const media = {
  name: S.MEDIA,
  intro: 'What you want to watch and listen to, in the order you actually will.',
  footnote: 'This sheet ships empty of titles on purpose. Films, songs and artwork belong to the people who made them — add your own.',
  optional: true,
  rows: CAPACITY[S.MEDIA],
  idColumn: 'mediaId',
  freezeColumns: 2,
  columns: [
    id('mediaId', 'Entry ID'),
    input('title', 'Title', { width: 32 }),
    pick('mediaType', 'Type', 'MediaType', { width: 12 }),
    input('platform', 'Where', { width: 20 }),
    pick('audience', 'For', 'Audience', { width: 13 }),
    date('plannedDate', 'When'),
    yesNo('done', 'Watched or heard?'),
    pick('rating', 'Rating', 'Rating', { width: 11 }),
    notes(),
  ],
  samples: [
    { mediaId: 'MU-001', mediaType: 'Film', platform: 'The old DVD shelf', audience: 'Everyone', plannedDate: '2026-12-23', done: 'No', notes: 'EXAMPLE — DELETE ME · add your own title' },
    { mediaId: 'MU-002', mediaType: 'Album', platform: 'Record player', audience: 'Adults', done: 'No', notes: 'EXAMPLE — DELETE ME · add your own title' },
    { mediaId: 'MU-003', mediaType: 'Concert', platform: 'The parish hall', audience: 'Everyone', plannedDate: '2026-12-14', done: 'No', notes: 'EXAMPLE — DELETE ME · add your own title' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.9 ADVENT + REFLECTION — optional, and entirely user-written.
 * ------------------------------------------------------------------ */
export const advent = {
  name: S.ADVENT,
  intro: 'A quiet page for the days of December, if you keep one.',
  footnote: 'Nothing is prefilled. The themes, readings and reflections are yours to write.',
  optional: true,
  rows: CAPACITY[S.ADVENT],
  idColumn: 'dayId',
  freezeColumns: 2,
  columns: [
    id('dayId', 'Day ID'),
    date('when', 'Date'),
    input('theme', 'Theme', { width: 22 }),
    input('reference', 'Reading or reference', { width: 26 }),
    input('reflection', 'Reflection', { width: 44 }),
    input('activity', 'Family activity', { width: 30 }),
    yesNo('completed', 'Kept?'),
    notes(),
  ],
  samples: [
    { dayId: 'AD-001', completed: 'No', notes: 'EXAMPLE — DELETE ME · this sheet is deliberately blank' },
    { dayId: 'AD-002', completed: 'No', notes: 'EXAMPLE — DELETE ME' },
    { dayId: 'AD-003', completed: 'No', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §7.9 MEMORIES
 * ------------------------------------------------------------------ */
export const memories = {
  name: S.MEMORIES,
  intro: 'The part of the season worth keeping. Fill this in as you go — you will not remember in January.',
  rows: CAPACITY[S.MEMORIES],
  idColumn: 'memoryId',
  freezeColumns: 3,
  columns: [
    id('memoryId', 'Memory ID'),
    date('when', 'Date'),
    input('event', 'Occasion', { width: 24 }),
    input('highlight', 'What happened', { width: 44 }),
    input('quote', 'Something someone said', { width: 34 }),
    input('photoLink', 'Photo album link', { width: 28 }),
    input('keepsake', 'Keepsake kept where', { width: 24 }),
    pick('rating', 'Rating', 'Rating', { width: 11 }),
    yesNo('repeat', 'Do it again?'),
    notes(),
  ],
  samples: [
    { memoryId: 'ME-001', when: '2026-12-24', event: 'Christmas Eve supper', highlight: 'The saffron buns came out right for the first time', quote: '"These are grandmother\'s, aren\'t they."', keepsake: 'The recipe card, back in the tin', rating: '5', repeat: 'Yes', notes: 'EXAMPLE — DELETE ME' },
    { memoryId: 'ME-002', when: '2026-12-06', event: 'Cutting greenery', highlight: 'Rain the whole time and nobody minded', rating: '5', repeat: 'Yes', notes: 'EXAMPLE — DELETE ME' },
    { memoryId: 'ME-003', when: '2026-12-25', event: 'Christmas Day', highlight: 'Sat down at two, got up at six', rating: '4', repeat: 'Yes', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §5 NEXT YEAR NOTES
 * ------------------------------------------------------------------ */
export const nextYear = {
  name: S.NEXT_YEAR,
  intro: 'Written now, read next September. This is the most valuable sheet in the workbook and the easiest to skip.',
  rows: CAPACITY[S.NEXT_YEAR],
  idColumn: 'noteId',
  freezeColumns: 3,
  columns: [
    id('noteId', 'Note ID'),
    pick('theme', 'Kind', 'NextYearTheme', { width: 16 }),
    input('note', 'Note', { width: 50 }),
    input('module', 'About', { width: 20 }),
    input('action', 'What to do about it', { width: 34 }),
    date('actBy', 'Act by'),
    yesNo('carried', 'Carried forward?'),
    notes(),
  ],
  samples: [
    { noteId: 'NY-001', theme: 'Worked well', note: 'Buying every gift before December', module: 'Gift Planner', action: 'Same again — set the deadline at 25 November', carried: 'No', notes: 'EXAMPLE — DELETE ME' },
    { noteId: 'NY-002', theme: 'Buy early', note: 'The good tapers sell out by the first week', module: 'Décor', action: 'Order twelve in October', actBy: '2027-10-15', carried: 'No', notes: 'EXAMPLE — DELETE ME' },
    { noteId: 'NY-003', theme: 'Avoid', note: 'Two events on the same evening', module: 'Calendar', action: 'One thing a day in the last week', carried: 'No', notes: 'EXAMPLE — DELETE ME' },
  ],
};

/* ------------------------------------------------------------------ *
 * §5 ANNUAL ARCHIVE — filled during the annual reset, by hand and on purpose.
 * ------------------------------------------------------------------ */
export const archive = {
  name: S.ARCHIVE,
  intro: 'One line a year. Copy this season\'s figures in before you clear the workbook for the next one.',
  footnote: 'These are typed values, not formulas, so they survive the annual reset. START HERE shows exactly which figures to copy.',
  rows: CAPACITY[S.ARCHIVE],
  idColumn: 'year',
  freezeColumns: 2,
  columns: [
    year('year', 'Year'),
    money('totalBudget', 'Budget'),
    money('totalActual', 'Actual'),
    int('giftsGiven', 'Gifts given'),
    int('guestsHosted', 'Guests hosted'),
    input('favouriteTradition', 'Best thing you did', { width: 32 }),
    input('heirloomNote', 'Heirlooms and décor', { width: 30 }),
    input('vendorNote', 'People worth booking again', { width: 30 }),
    notes(),
  ],
  samples: [
    { year: 2025, totalBudget: 4200, totalActual: 4460, giftsGiven: 38, guestsHosted: 14, favouriteTradition: 'Carols at the old church', heirloomNote: 'Retired the outdoor lights', vendorNote: 'Hedgerow & Bough — book by October', notes: 'EXAMPLE — DELETE ME' },
    { year: 2024, totalBudget: 3800, totalActual: 3740, giftsGiven: 35, guestsHosted: 9, favouriteTradition: 'The pantomime', heirloomNote: 'Repaired two glass baubles', vendorNote: '', notes: 'EXAMPLE — DELETE ME' },
    { year: 2023, totalBudget: 3500, totalActual: 3910, giftsGiven: 41, guestsHosted: 16, favouriteTradition: 'Boxing Day walk', heirloomNote: '', vendorNote: '', notes: 'EXAMPLE — DELETE ME' },
  ],
};
