/**
 * Meals, groceries, recipes and guests — PRD §7.7 and §7.9.
 *
 * §7.7 is explicit that version 1 does not attempt automated ingredient
 * consolidation. Recipe IDs and event filters give the structure; the
 * quantities stay in the buyer's hands, where they are correct.
 */
import { SHEETS, CAPACITY } from '../config.js';
import {
  input, formula, money, moneyF, date, time, int, pick, yesNo, id, notes, status, refId,
} from './helpers.js';
import { whenRowUsed, lookupBlank } from '../formulas.js';

const S = SHEETS;

export const meals = {
  name: S.MEALS,
  intro: 'Every dish, who is making it, and when it can be made ahead.',
  rows: CAPACITY[S.MEALS],
  idColumn: 'mealId',
  freezeColumns: 4,
  cost: { category: 'budgetCategory', planned: 'plannedCost', actual: 'actualCost' },
  columns: [
    id('mealId', 'Dish ID'),
    date('serviceDate', 'Date'),
    input('meal', 'Meal', { width: 20, note: 'Christmas Eve supper, Christmas lunch, Boxing Day breakfast — whatever you call it.' }),
    input('dish', 'Dish', { width: 30 }),
    pick('course', 'Course', 'Course', { width: 13 }),
    int('servings', 'Serves'),
    input('owner', 'Cook', { width: 16 }),
    refId('recipeRef', 'Recipe ID', { sheet: S.RECIPES, column: 'recipeId' }),
    formula('recipeName', 'Recipe', (f) => whenRowUsed(f.a('mealId'),
      lookupBlank(f.r(S.RECIPES, 'name'), f.r(S.RECIPES, 'recipeId'), f.a('recipeRef'))), { width: 26 }),
    yesNo('makeAhead', 'Make ahead?'),
    date('prepDate', 'Prep on'),
    input('cookTime', 'Oven / time', { width: 18, note: 'Plain text on purpose — "40 min at 190°C" is more useful than a number.' }),
    pick('dietary', 'Dietary', 'DietaryTag', { width: 15 }),
    pick('mealStatus', 'Status', 'MealStatus', { width: 13 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('plannedCost', 'Planned cost'),
    money('actualCost', 'Actual cost'),
    status('due', 'When', (f) => whenRowUsed(f.a('mealId'),
      `IF(OR(${f.a('mealStatus')}="Served",${f.a('mealStatus')}="Dropped"),"DONE",IF(${f.a('prepDate')}="",IF(${f.a('serviceDate')}="","NO DATE",IF(${f.a('serviceDate')}<TODAY(),"OVERDUE","SCHEDULED")),IF(${f.a('prepDate')}<TODAY(),"PREP OVERDUE",IF(${f.a('prepDate')}-TODAY()<=7,"PREP THIS WEEK","SCHEDULED"))))`), { width: 16 }),
    notes(),
  ],
  samples: [
    { mealId: 'M-001', serviceDate: '2026-12-25', meal: 'Christmas lunch', dish: 'Goose with quince', course: 'Main', servings: 12, owner: 'Me', recipeRef: 'RC-001', makeAhead: 'No', prepDate: '2026-12-25', cookTime: '3 hr at 180°C, rest 30 min', dietary: 'None', mealStatus: 'Planned', budgetCategory: 'Food & Baking', plannedCost: 145, notes: 'EXAMPLE — DELETE ME' },
    { mealId: 'M-002', serviceDate: '2026-12-25', meal: 'Christmas lunch', dish: 'Bread sauce', course: 'Sauce', servings: 12, owner: 'James', recipeRef: 'RC-002', makeAhead: 'Yes', prepDate: '2026-12-23', cookTime: '20 min, gentle', dietary: 'Vegetarian', mealStatus: 'Planned', budgetCategory: 'Food & Baking', plannedCost: 8, notes: 'EXAMPLE — DELETE ME' },
    { mealId: 'M-003', serviceDate: '2026-12-24', meal: 'Christmas Eve supper', dish: 'Grandmother\'s saffron buns', course: 'Baking', servings: 24, owner: 'Me', recipeRef: 'RC-003', makeAhead: 'Yes', prepDate: '2026-12-22', cookTime: '12 min at 220°C', dietary: 'Nut free', mealStatus: 'Prepped', budgetCategory: 'Food & Baking', plannedCost: 22, actualCost: 24.6, notes: 'EXAMPLE — DELETE ME' },
  ],
};

export const groceries = {
  name: S.GROCERIES,
  intro: 'One shopping list, gathered from the meals you have planned.',
  footnote: 'Quantities stay yours to set. Automatic ingredient adding is the fastest way to arrive home with three kilos of butter.',
  rows: CAPACITY[S.GROCERIES],
  idColumn: 'groceryId',
  freezeColumns: 3,
  cost: { category: 'budgetCategory', planned: 'estimatedPrice', actual: 'actualPrice' },
  columns: [
    id('groceryId', 'Item ID'),
    input('item', 'Item', { width: 28 }),
    pick('category', 'Aisle', 'GroceryCategory', { width: 15 }),
    input('qty', 'Quantity', { width: 12 }),
    input('unit', 'Unit', { width: 10 }),
    date('forDate', 'For'),
    refId('recipeRef', 'Recipe ID', { sheet: S.RECIPES, column: 'recipeId' }),
    input('store', 'Store', { width: 18 }),
    input('coupon', 'Offer', { width: 16 }),
    pick('budgetCategory', 'Budget category', 'BudgetCategory', { width: 17 }),
    money('estimatedPrice', 'Estimate'),
    money('actualPrice', 'Actual'),
    yesNo('purchased', 'Bought?'),
    yesNo('pantryCheck', 'Already have?'),
    status('shopping', 'On the list', (f) => whenRowUsed(f.a('groceryId'),
      `IF(${f.a('purchased')}="Yes","BOUGHT",IF(${f.a('pantryCheck')}="Yes","IN THE PANTRY","TO BUY"))`), { width: 16 }),
    notes(),
  ],
  samples: [
    { groceryId: 'GR-001', item: 'Goose, free range', category: 'Meat & fish', qty: '5.5', unit: 'kg', forDate: '2026-12-23', recipeRef: 'RC-001', store: 'The butcher', budgetCategory: 'Food & Baking', estimatedPrice: 110, purchased: 'No', pantryCheck: 'No', notes: 'EXAMPLE — DELETE ME' },
    { groceryId: 'GR-002', item: 'Saffron', category: 'Baking', qty: '2', unit: 'g', forDate: '2026-12-21', recipeRef: 'RC-003', store: 'The deli', budgetCategory: 'Food & Baking', estimatedPrice: 14, actualPrice: 13.2, purchased: 'Yes', pantryCheck: 'No', notes: 'EXAMPLE — DELETE ME' },
    { groceryId: 'GR-003', item: 'Bay leaves', category: 'Produce', qty: '1', unit: 'bunch', recipeRef: 'RC-002', budgetCategory: 'Food & Baking', estimatedPrice: 2.5, purchased: 'No', pantryCheck: 'Yes', notes: 'EXAMPLE — DELETE ME' },
  ],
};

export const recipes = {
  name: S.RECIPES,
  intro: 'Where each recipe lives, how long it really takes, and whose it was.',
  rows: CAPACITY[S.RECIPES],
  idColumn: 'recipeId',
  freezeColumns: 2,
  columns: [
    id('recipeId', 'Recipe ID'),
    input('name', 'Recipe', { width: 30 }),
    input('source', 'Source or link', { width: 32, note: 'A link, a book and page, or a person. Do not paste in a recipe you do not have the right to copy.' }),
    input('provenance', 'Whose it is', { width: 22 }),
    pick('category', 'Course', 'RecipeCategory', { width: 13 }),
    input('yield', 'Makes', { width: 14 }),
    input('activeTime', 'Hands-on', { width: 13 }),
    input('totalTime', 'Total time', { width: 13 }),
    pick('dietary', 'Dietary', 'DietaryTag', { width: 15 }),
    yesNo('freezer', 'Freezes?'),
    pick('rating', 'Family rating', 'Rating', { width: 13 }),
    notes(),
  ],
  samples: [
    { recipeId: 'RC-001', name: 'Goose with quince', source: 'Blue notebook, p.40', provenance: 'Worked out over four years', category: 'Main', yield: 'Serves 12', activeTime: '45 min', totalTime: '4 hr', dietary: 'None', freezer: 'No', rating: '5', notes: 'EXAMPLE — DELETE ME' },
    { recipeId: 'RC-002', name: 'Bread sauce', source: 'Constance Spry', provenance: 'James\'s mother', category: 'Side', yield: 'Serves 12', activeTime: '15 min', totalTime: '40 min', dietary: 'Vegetarian', freezer: 'Yes', rating: '4', notes: 'EXAMPLE — DELETE ME' },
    { recipeId: 'RC-003', name: 'Saffron buns', source: 'Handwritten card, tin', provenance: 'Grandmother Lindqvist', category: 'Baking', yield: '24 buns', activeTime: '40 min', totalTime: '3 hr with proving', dietary: 'Nut free', freezer: 'Yes', rating: '5', notes: 'EXAMPLE — DELETE ME' },
  ],
};

export const hosting = {
  name: S.HOSTING,
  intro: 'Who is coming, what they need, and where everyone sleeps.',
  rows: CAPACITY[S.HOSTING],
  idColumn: 'guestId',
  freezeColumns: 4,
  columns: [
    id('guestId', 'Guest ID'),
    refId('personId', 'Person ID', { sheet: S.PEOPLE, column: 'personId' }),
    formula('name', 'Name', (f) => whenRowUsed(f.a('guestId'),
      `IF(${f.a('personId')}="",${f.a('nameOverride')},${lookupBlank(f.r(S.PEOPLE, 'name'), f.r(S.PEOPLE, 'personId'), f.a('personId'))})`), { width: 22 }),
    input('nameOverride', 'Name (if not on the list)', { width: 22 }),
    refId('eventRef', 'Event ID', { sheet: S.CALENDAR, column: 'calId' }),
    pick('guestStatus', 'Status', 'GuestStatus', { width: 13 }),
    pick('dietary', 'Dietary', 'DietaryTag', { width: 15 }),
    input('allergies', 'Allergies and care', { width: 26, note: 'Serious allergies belong here and on the meal plan. Say it twice rather than once.' }),
    input('preferences', 'What makes them comfortable', { width: 30 }),
    pick('sleeping', 'Sleeping', 'Sleeping', { width: 15 }),
    date('arrivalDate', 'Arrives'),
    time('arrivalTime', 'At'),
    date('departureDate', 'Leaves'),
    input('transport', 'Getting here', { width: 22 }),
    input('assignment', 'Bringing or helping with', { width: 28 }),
    yesNo('thankYou', 'Thank you sent?'),
    notes(),
  ],
  samples: [
    { guestId: 'GU-001', personId: 'P-001', eventRef: 'K-002', guestStatus: 'Confirmed', dietary: 'None', allergies: 'Wool next to skin — no blankets on the guest bed', preferences: 'Reading lamp, kettle in the room', sleeping: 'Guest room', arrivalDate: '2026-12-23', arrivalTime: '16:00', departureDate: '2026-12-27', transport: 'Driving', assignment: 'Bringing the pudding', thankYou: 'No', notes: 'EXAMPLE — DELETE ME' },
    { guestId: 'GU-002', personId: 'P-003', eventRef: 'K-002', guestStatus: 'Confirmed', dietary: 'None', allergies: 'Nut allergy — serious. No nuts in the baking.', preferences: 'Early riser, likes the cold', sleeping: 'Hotel', arrivalDate: '2026-12-22', arrivalTime: '18:40', departureDate: '2026-12-26', transport: 'Flight, then car', assignment: '', thankYou: 'No', notes: 'EXAMPLE — DELETE ME' },
    { guestId: 'GU-003', nameOverride: 'The Ashworths', guestStatus: 'Invited', dietary: 'Vegetarian', preferences: 'Coming for drinks only', sleeping: 'Not staying', arrivalDate: '2026-12-12', arrivalTime: '19:00', transport: 'Walking', thankYou: 'No', notes: 'EXAMPLE — DELETE ME' },
  ],
};
