// Datenbankzugriffe für Ernährung und Getränke. Grundsätze aus dem Plan:
// - Jede Buchung speichert Name und Nährwerte als Schnappschuss (FOOD-012).
// - Essen und Getränke sind dieselbe Tabelle: ein Ereignis, beide Ansichten (TIME-005/006).
// - Tagebuchdatum, Verzehrzeit, Erfassungszeit und Zeitzone getrennt (TIME-001/003).

import { ALLERGENS, DEFAULT_MEAL_TIMES, type Allergen, type Diet, type FoodDiet, type FoodFacts, type MealTimes } from '@/domain/diet';
import {
  fractionOf,
  nutrientsForAmount,
  per100FromTotal,
  totalOf,
  type DrinkType,
  type FoodDraft,
  type Meal,
  type NutrientBasis,
  type Nutrients,
  type Prep,
} from '@/domain/nutrition';

import { readState, writeState } from './app-state';
import { newId, nowUtc, type Db } from './db';

// -------------------------------------------------------------------------------- Lebensmittel

export type Food = {
  id: string;
  source: 'eigen' | 'off';
  barcode: string | null;
  name: string;
  brand: string | null;
  basis: NutrientBasis;
  prep: Prep | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  servingAmount: number | null;
  favorite: number;
  /** JSON-Listen bzw. Angabe laut Produkt (COACH-009); null = unbekannt. Lesen mit `foodFacts`. */
  allergensJson: string | null;
  tracesJson: string | null;
  diet: FoodDiet | null;
};

const FOOD_COLUMNS = `id, source, barcode, name, brand, basis, prep, kcal, protein, carbs, fat,
  serving_amount AS servingAmount, favorite, allergens AS allergensJson, traces AS tracesJson, diet`;

function parseList(value: string | null): Allergen[] | null {
  if (value === null) return null;
  try {
    const list = JSON.parse(value);
    return Array.isArray(list) ? (list.filter((a) => (ALLERGENS as readonly string[]).includes(a)) as Allergen[]) : null;
  } catch {
    return null;
  }
}

/** Allergene, Spuren und Ernährungsweise eines gespeicherten Lebensmittels. */
export function foodFacts(food: Pick<Food, 'allergensJson' | 'tracesJson' | 'diet'>): FoodFacts {
  return { allergens: parseList(food.allergensJson), traces: parseList(food.tracesJson), diet: food.diet };
}

const listText = (list: Allergen[] | null | undefined) => (list == null ? null : JSON.stringify(list));

export function per100(food: Pick<Food, 'kcal' | 'protein' | 'carbs' | 'fat'>): Nutrients {
  return { kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat };
}

/** Lokale Suche über Name und Marke; Favoriten zuerst. Gleichnamige Produkte bleiben getrennt (FOOD-018). */
export function searchFoods(db: Db, query: string, limit = 50) {
  const like = `%${query.trim()}%`;
  return db.getAllAsync<Food>(
    `SELECT ${FOOD_COLUMNS} FROM food WHERE archived = 0 AND (name LIKE ? OR brand LIKE ? OR barcode = ?)
     ORDER BY favorite DESC, name COLLATE NOCASE LIMIT ?`,
    like,
    like,
    query.trim(),
    limit
  );
}

export function listFavoriteFoods(db: Db) {
  return db.getAllAsync<Food>(`SELECT ${FOOD_COLUMNS} FROM food WHERE favorite = 1 AND archived = 0 ORDER BY name COLLATE NOCASE`);
}

/** Zuletzt gebuchte Lebensmittel, jedes nur einmal (TRACK-005). */
export function recentFoods(db: Db, limit = 15) {
  return db.getAllAsync<Food>(
    `SELECT ${FOOD_COLUMNS} FROM food f JOIN (
       SELECT food_id, MAX(recorded_at_utc) AS last FROM consumption_event WHERE food_id IS NOT NULL GROUP BY food_id
     ) e ON e.food_id = f.id WHERE f.archived = 0 ORDER BY e.last DESC LIMIT ?`,
    limit
  );
}

export function getFood(db: Db, id: string) {
  return db.getFirstAsync<Food>(`SELECT ${FOOD_COLUMNS} FROM food WHERE id = ?`, id);
}

export function findFoodByBarcode(db: Db, barcode: string) {
  return db.getFirstAsync<Food>(`SELECT ${FOOD_COLUMNS} FROM food WHERE barcode = ? AND archived = 0 ORDER BY updated_at_utc DESC`, barcode);
}

/**
 * Speichert ein Lebensmittel. Änderungen bleiben privat auf dem Gerät und werden nicht an
 * Open Food Facts gesendet (FOOD-010). Alte Tagebucheinträge ändern sich nicht (Schnappschuss).
 */
export async function saveFood(db: Db, id: string | null, draft: FoodDraft, source: Food['source'] = 'eigen') {
  const now = nowUtc();
  const foodId = id ?? newId();
  const { kcal, protein, carbs, fat } = draft.per100;
  if (id) {
    // Allergene nur ändern, wenn der Entwurf sie mitbringt (z. B. aus dem Formular); sonst bleiben sie.
    if (draft.allergens !== undefined) await db.runAsync('UPDATE food SET allergens = ? WHERE id = ?', listText(draft.allergens), id);
    if (draft.traces !== undefined) await db.runAsync('UPDATE food SET traces = ? WHERE id = ?', listText(draft.traces), id);
    if (draft.diet !== undefined) await db.runAsync('UPDATE food SET diet = ? WHERE id = ?', draft.diet, id);
    await db.runAsync(
      `UPDATE food SET name = ?, brand = ?, barcode = ?, basis = ?, prep = ?, kcal = ?, protein = ?, carbs = ?, fat = ?,
       serving_amount = ?, updated_at_utc = ? WHERE id = ?`,
      draft.name.trim(),
      draft.brand?.trim() || null,
      draft.barcode,
      draft.basis,
      draft.prep ?? null,
      kcal,
      protein,
      carbs,
      fat,
      draft.servingAmount,
      now,
      id
    );
  } else {
    await db.runAsync(
      `INSERT INTO food (id, source, barcode, name, brand, basis, prep, kcal, protein, carbs, fat, serving_amount,
       favorite, fetched_at_utc, created_at_utc, updated_at_utc, allergens, traces, diet)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      foodId,
      source,
      draft.barcode,
      draft.name.trim(),
      draft.brand?.trim() || null,
      draft.basis,
      draft.prep ?? null,
      kcal,
      protein,
      carbs,
      fat,
      draft.servingAmount,
      source === 'off' ? now : null,
      now,
      now,
      listText(draft.allergens),
      listText(draft.traces),
      draft.diet ?? null
    );
  }
  return foodId;
}

/** Entfernt ein Lebensmittel aus Suche und Listen; alte Einträge, Vorlagen und Rezepte bleiben. */
export async function archiveFood(db: Db, foodId: string) {
  await db.runAsync('UPDATE food SET archived = 1, favorite = 0 WHERE id = ?', foodId);
}

export async function setFavorite(db: Db, foodId: string, favorite: boolean) {
  await db.runAsync('UPDATE food SET favorite = ? WHERE id = ?', favorite ? 1 : 0, foodId);
}

// ------------------------------------------------------------------------------ Tagebuch

export type EventKind = 'essen' | 'getraenk';
/** g/ml oder Portionen (nur bei Rezepten ohne Endgewicht). */
export type EventUnit = NutrientBasis | 'portion';

export type ConsumptionEvent = {
  id: string;
  kind: EventKind;
  meal: Meal | null;
  drinkType: DrinkType | null;
  foodId: string | null;
  recipeVersionId: string | null;
  name: string;
  brand: string | null;
  amount: number;
  unit: EventUnit;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  diaryDate: string;
  occurredAt: string;
  prep: Prep | null;
};

// Die Zubereitung (roh/gekocht) kommt nur zur Anzeige vom Lebensmittel; Nährwerte bleiben Schnappschuss.
const EVENT_COLUMNS = `id, kind, meal, drink_type AS drinkType, food_id AS foodId, recipe_version_id AS recipeVersionId,
  name, brand, amount, unit, kcal, protein, carbs, fat, diary_date AS diaryDate, occurred_at_utc AS occurredAt,
  (SELECT prep FROM food WHERE food.id = consumption_event.food_id) AS prep`;

/** Wann und wo: Tagebuchdatum ist frei wählbar (Nachtrag für gestern), Zeitzone wird mitgespeichert. */
export type When = { diaryDate: string; at: Date; timeZone: string };

export type Target = { kind: 'essen'; meal: Meal } | { kind: 'getraenk'; drinkType: DrinkType };

async function insertEvent(
  db: Db,
  target: Target,
  when: When,
  data: { foodId: string | null; recipeVersionId: string | null; name: string; brand: string | null; amount: number; unit: EventUnit; nutrients: Nutrients }
) {
  const id = newId();
  await db.runAsync(
    `INSERT INTO consumption_event (id, kind, meal, drink_type, food_id, recipe_version_id, name, brand, amount, unit,
     kcal, protein, carbs, fat, occurred_at_utc, recorded_at_utc, time_zone, utc_offset_min, diary_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    target.kind,
    target.kind === 'essen' ? target.meal : null,
    target.kind === 'getraenk' ? target.drinkType : null,
    data.foodId,
    data.recipeVersionId,
    data.name,
    data.brand,
    data.amount,
    data.unit,
    data.nutrients.kcal,
    data.nutrients.protein,
    data.nutrients.carbs,
    data.nutrients.fat,
    when.at.toISOString(),
    nowUtc(),
    when.timeZone,
    -when.at.getTimezoneOffset(),
    when.diaryDate
  );
  return id;
}

/** Bucht eine Menge eines Lebensmittels mit Schnappschuss der aktuellen Nährwerte. */
export async function logFood(db: Db, foodId: string, amount: number, target: Target, when: When) {
  const food = await getFood(db, foodId);
  if (!food) throw new Error('food not found');
  const nutrients = nutrientsForAmount(per100(food), amount, food.basis, food.basis);
  return insertEvent(db, target, when, {
    foodId,
    recipeVersionId: null,
    name: food.name,
    brand: food.brand,
    amount,
    unit: food.basis,
    nutrients,
  });
}

/** Reines Wasser oder Getränk ohne Produkt (0 kcal, sonst unbekannt ist nicht nötig). */
export async function logWater(db: Db, amountMl: number, when: When, name: string) {
  return insertEvent(db, { kind: 'getraenk', drinkType: 'wasser' }, when, {
    foodId: null,
    recipeVersionId: null,
    name,
    brand: null,
    amount: amountMl,
    unit: 'ml',
    nutrients: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  });
}

export function listDay(db: Db, diaryDate: string) {
  return db.getAllAsync<ConsumptionEvent>(
    `SELECT ${EVENT_COLUMNS} FROM consumption_event WHERE diary_date = ? ORDER BY occurred_at_utc`,
    diaryDate
  );
}

export function getEvent(db: Db, id: string) {
  return db.getFirstAsync<ConsumptionEvent>(`SELECT ${EVENT_COLUMNS} FROM consumption_event WHERE id = ?`, id);
}

/**
 * Ändert Menge, Mahlzeit oder Tag eines Eintrags in einer Anweisung (TIME-006).
 * Nährwerte werden aus dem eigenen Schnappschuss hochgerechnet, nicht neu aus dem Katalog.
 */
export async function updateEvent(db: Db, id: string, change: { amount: number; meal: Meal | null; diaryDate: string }) {
  const event = await getEvent(db, id);
  if (!event) throw new Error('event not found');
  const factor = change.amount / event.amount;
  const scale = (v: number | null) => (v === null ? null : v * factor);
  await db.runAsync(
    `UPDATE consumption_event SET amount = ?, meal = ?, diary_date = ?, kcal = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?`,
    change.amount,
    event.kind === 'essen' ? change.meal : null,
    change.diaryDate,
    scale(event.kcal),
    scale(event.protein),
    scale(event.carbs),
    scale(event.fat),
    id
  );
}

export async function deleteEvent(db: Db, id: string) {
  await db.runAsync('DELETE FROM consumption_event WHERE id = ?', id);
}

/** „Wie gestern“: kopiert die Einträge einer Mahlzeit auf einen anderen Tag (TRACK-005). */
export async function copyMeal(db: Db, fromDate: string, meal: Meal, when: When, toMeal: Meal = meal) {
  const source = await db.getAllAsync<ConsumptionEvent>(
    `SELECT ${EVENT_COLUMNS} FROM consumption_event WHERE diary_date = ? AND kind = 'essen' AND meal = ? ORDER BY occurred_at_utc`,
    fromDate,
    meal
  );
  await db.withTransactionAsync(async () => {
    for (const e of source) {
      await insertEvent(db, { kind: 'essen', meal: toMeal }, when, {
        foodId: e.foodId,
        recipeVersionId: e.recipeVersionId,
        name: e.name,
        brand: e.brand,
        amount: e.amount,
        unit: e.unit,
        nutrients: { kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat },
      });
    }
  });
  return source.length;
}

/** Summen pro Tag für die Wochenansicht. */
export function daySums(db: Db, fromDate: string, toDate: string) {
  return db.getAllAsync<{ day: string; kcal: number | null; entries: number; unknownKcal: number }>(
    `SELECT diary_date AS day, SUM(kcal) AS kcal, COUNT(*) AS entries,
       SUM(CASE WHEN kcal IS NULL THEN 1 ELSE 0 END) AS unknownKcal
     FROM consumption_event WHERE diary_date BETWEEN ? AND ? GROUP BY diary_date`,
    fromDate,
    toDate
  );
}

// ------------------------------------------------------------------------------ Vorlagen

/** Speichert die Lebensmittel einer Mahlzeit als Vorlage, z. B. „Nutella-Brot“ (FOOD-013, FOOD-016). */
export async function saveTemplateFromMeal(db: Db, name: string, diaryDate: string, meal: Meal) {
  const items = await db.getAllAsync<{ foodId: string; amount: number; unit: NutrientBasis }>(
    `SELECT food_id AS foodId, amount, unit FROM consumption_event
     WHERE diary_date = ? AND kind = 'essen' AND meal = ? AND food_id IS NOT NULL ORDER BY occurred_at_utc`,
    diaryDate,
    meal
  );
  if (items.length === 0) throw new Error('meal has no foods');
  const id = newId();
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO meal_template (id, name, created_at_utc) VALUES (?, ?, ?)', id, name.trim(), nowUtc());
    for (const [position, item] of items.entries()) {
      await db.runAsync(
        'INSERT INTO meal_template_item (id, template_id, position, food_id, amount, unit) VALUES (?, ?, ?, ?, ?, ?)',
        newId(),
        id,
        position,
        item.foodId,
        item.amount,
        item.unit
      );
    }
  });
  return id;
}

export type MealTemplate = {
  id: string;
  name: string;
  items: { foodId: string; name: string; amount: number; unit: NutrientBasis; kcal: number | null }[];
};

export async function listTemplates(db: Db): Promise<MealTemplate[]> {
  const templates = await db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM meal_template ORDER BY name COLLATE NOCASE'
  );
  const result: MealTemplate[] = [];
  for (const tpl of templates) {
    const items = await db.getAllAsync<{ foodId: string; name: string; amount: number; unit: NutrientBasis; kcal: number | null }>(
      `SELECT i.food_id AS foodId, f.name, i.amount, i.unit, f.kcal * i.amount / 100 AS kcal
       FROM meal_template_item i JOIN food f ON f.id = i.food_id
       WHERE i.template_id = ? ORDER BY i.position`,
      tpl.id
    );
    result.push({ ...tpl, items });
  }
  return result;
}

/** Bucht eine Vorlage: jede Zutat als eigener Eintrag mit aktuellem Schnappschuss. */
export async function logTemplate(db: Db, templateId: string, meal: Meal, when: When) {
  const items = await db.getAllAsync<{ foodId: string; amount: number }>(
    'SELECT food_id AS foodId, amount FROM meal_template_item WHERE template_id = ? ORDER BY position',
    templateId
  );
  await db.withTransactionAsync(async () => {
    for (const item of items) await logFood(db, item.foodId, item.amount, { kind: 'essen', meal }, when);
  });
}

export async function deleteTemplate(db: Db, templateId: string) {
  await db.runAsync('DELETE FROM meal_template_item WHERE template_id = ?', templateId);
  await db.runAsync('DELETE FROM meal_template WHERE id = ?', templateId);
}

// ------------------------------------------------------------------------------- Rezepte

export type RecipeDraft = {
  name: string;
  endWeightG: number | null;
  portions: number | null;
  ingredients: { foodId: string; amount: number }[];
};

export type RecipeSummary = {
  recipeId: string;
  versionId: string;
  name: string;
  endWeightG: number | null;
  portions: number | null;
  total: Nutrients;
};

/** Speichert ein Rezept als neue Version mit Schnappschuss der Zutaten (FOOD-017). */
export async function saveRecipe(db: Db, recipeId: string | null, draft: RecipeDraft) {
  if (!draft.name.trim()) throw new Error('name required');
  if (draft.ingredients.length === 0) throw new Error('ingredients required');
  const id = recipeId ?? newId();
  await db.withTransactionAsync(async () => {
    const now = nowUtc();
    if (!recipeId) await db.runAsync('INSERT INTO recipe (id, created_at_utc) VALUES (?, ?)', id, now);
    const last = await db.getFirstAsync<{ version: number | null }>(
      'SELECT MAX(version) AS version FROM recipe_version WHERE recipe_id = ?',
      id
    );
    await db.runAsync('UPDATE recipe_version SET active = 0 WHERE recipe_id = ?', id);
    const versionId = newId();
    await db.runAsync(
      `INSERT INTO recipe_version (id, recipe_id, version, name, end_weight_g, portions, active, created_at_utc)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      versionId,
      id,
      (last?.version ?? 0) + 1,
      draft.name.trim(),
      draft.endWeightG,
      draft.portions,
      now
    );
    for (const [position, ing] of draft.ingredients.entries()) {
      const food = await getFood(db, ing.foodId);
      if (!food) throw new Error('food not found');
      const n = nutrientsForAmount(per100(food), ing.amount, food.basis, food.basis);
      await db.runAsync(
        `INSERT INTO recipe_ingredient (id, recipe_version_id, position, food_id, name, amount, unit, kcal, protein, carbs, fat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        versionId,
        position,
        food.id,
        food.name,
        ing.amount,
        food.basis,
        n.kcal,
        n.protein,
        n.carbs,
        n.fat
      );
    }
  });
  return id;
}

async function versionTotal(db: Db, versionId: string): Promise<Nutrients> {
  const rows = await db.getAllAsync<Nutrients>(
    'SELECT kcal, protein, carbs, fat FROM recipe_ingredient WHERE recipe_version_id = ?',
    versionId
  );
  return totalOf(rows);
}

export async function listRecipes(db: Db): Promise<RecipeSummary[]> {
  const versions = await db.getAllAsync<{ recipeId: string; versionId: string; name: string; endWeightG: number | null; portions: number | null }>(
    `SELECT recipe_id AS recipeId, id AS versionId, name, end_weight_g AS endWeightG, portions
     FROM recipe_version WHERE active = 1 ORDER BY name COLLATE NOCASE`
  );
  const result: RecipeSummary[] = [];
  for (const v of versions) result.push({ ...v, total: await versionTotal(db, v.versionId) });
  return result;
}

export async function getRecipeVersion(db: Db, versionId: string): Promise<RecipeSummary | null> {
  const v = await db.getFirstAsync<Omit<RecipeSummary, 'total'>>(
    `SELECT recipe_id AS recipeId, id AS versionId, name, end_weight_g AS endWeightG, portions
     FROM recipe_version WHERE id = ?`,
    versionId
  );
  return v ? { ...v, total: await versionTotal(db, versionId) } : null;
}

export async function loadRecipeDraft(db: Db, recipeId: string): Promise<RecipeDraft | null> {
  const v = await db.getFirstAsync<{ id: string; name: string; endWeightG: number | null; portions: number | null }>(
    'SELECT id, name, end_weight_g AS endWeightG, portions FROM recipe_version WHERE recipe_id = ? AND active = 1',
    recipeId
  );
  if (!v) return null;
  const ingredients = await db.getAllAsync<{ foodId: string; amount: number }>(
    'SELECT food_id AS foodId, amount FROM recipe_ingredient WHERE recipe_version_id = ? ORDER BY position',
    v.id
  );
  return { name: v.name, endWeightG: v.endWeightG, portions: v.portions, ingredients };
}

/**
 * Bucht einen Teil eines Rezepts: nach Gramm (braucht Endgewicht) oder nach Portionen
 * (braucht Portionsanzahl). Ohne passende Angabe wird nichts erfunden (FOOD-017).
 */
export async function logRecipe(
  db: Db,
  versionId: string,
  part: { grams: number } | { portions: number },
  meal: Meal,
  when: When
) {
  const v = await db.getFirstAsync<{ name: string; endWeightG: number | null; portions: number | null }>(
    'SELECT name, end_weight_g AS endWeightG, portions FROM recipe_version WHERE id = ?',
    versionId
  );
  if (!v) throw new Error('recipe not found');
  const total = await versionTotal(db, versionId);
  let nutrients: Nutrients;
  let amount: number;
  let unit: EventUnit = 'g';
  if ('grams' in part) {
    if (!v.endWeightG) throw new Error('end weight required');
    nutrients = nutrientsForAmount(per100FromTotal(total, v.endWeightG), part.grams, 'g', 'g');
    amount = part.grams;
  } else {
    if (!v.portions) throw new Error('portions required');
    nutrients = fractionOf(total, part.portions / v.portions);
    if (v.endWeightG) amount = (v.endWeightG * part.portions) / v.portions;
    else {
      // Ohne Endgewicht ist das Gewicht einer Portion unbekannt: als Portionen speichern, nicht raten.
      amount = part.portions;
      unit = 'portion';
    }
  }
  return insertEvent(db, { kind: 'essen', meal }, when, {
    foodId: null,
    recipeVersionId: versionId,
    name: v.name,
    brand: null,
    amount,
    unit,
    nutrients,
  });
}

/** Entfernt ein Rezept aus der Liste. Versionen bleiben, damit alte Einträge verknüpft bleiben. */
export async function archiveRecipe(db: Db, recipeId: string) {
  await db.runAsync('UPDATE recipe_version SET active = 0 WHERE recipe_id = ?', recipeId);
}

// --------------------------------------------------------------------------- Einstellungen

// Das Kalorienziel steht seit Phase 4 versioniert in der Tabelle calorie_goal (data/goals.ts).
export type NutritionSettings = {
  /** Editierbares Trinkziel; 1500 ml als allgemeine DGE-Orientierung, keine Mindestmenge (TIME-007). */
  drinkGoalMl: number | null;
  /** Eigene Glas- und Flaschengrößen (TIME-004). */
  glassSizes: number[];
  /** Ansicht ohne Kalorienzahlen (TRACK-006). */
  hideNumbers: boolean;
  /** Allergien und Ernährungsweise für Hinweise an Produkten (COACH-009). */
  allergies: Allergen[];
  diet: Diet;
  /** Eigene Essenszeiten für den Mahlzeit-Vorschlag (COACH-007). */
  mealTimes: MealTimes;
};

export const DEFAULT_SETTINGS: NutritionSettings = {
  drinkGoalMl: 1500,
  glassSizes: [200, 250, 330, 500],
  hideNumbers: false,
  allergies: [],
  diet: 'alles',
  mealTimes: DEFAULT_MEAL_TIMES,
};

// Zuletzt geladene Essenszeiten, damit der Mahlzeit-Vorschlag ohne Datenbankzugriff auskommt.
let lastMealTimes: MealTimes = DEFAULT_MEAL_TIMES;
export const cachedMealTimes = () => lastMealTimes;

export async function loadNutritionSettings(db: Db): Promise<NutritionSettings> {
  const stored = await readState<Partial<NutritionSettings> & { kcalGoal?: unknown }>(db, 'nutrition_settings', {});
  // Alter Wert aus Phase 3; wurde mit Migration 4 nach calorie_goal übernommen.
  const { kcalGoal: _old, ...rest } = stored;
  const settings = { ...DEFAULT_SETTINGS, ...rest, mealTimes: { ...DEFAULT_MEAL_TIMES, ...rest.mealTimes } };
  lastMealTimes = settings.mealTimes;
  return settings;
}

export async function saveNutritionSettings(db: Db, settings: NutritionSettings) {
  await writeState(db, 'nutrition_settings', settings);
  lastMealTimes = settings.mealTimes;
}
