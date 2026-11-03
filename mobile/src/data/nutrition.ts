// Datenbankzugriffe für Ernährung und Getränke. Grundsätze aus dem Plan:
// - Jede Buchung speichert Name und Nährwerte als Schnappschuss (FOOD-012).
// - Essen und Getränke sind dieselbe Tabelle: ein Ereignis, beide Ansichten (TIME-005/006).
// - Tagebuchdatum, Verzehrzeit, Erfassungszeit und Zeitzone getrennt (TIME-001/003).

import { fuzzyBasis, parseMicros, scaleMicros, type Micros } from '@/domain/basis-foods';
import { BASIS_FOODS } from '@/domain/basis-foods-data';
import { ALLERGENS, combineFacts, DEFAULT_MEAL_TIMES, type Allergen, type Diet, type FoodDiet, type FoodFacts, type MealTimes } from '@/domain/diet';
import {
  barcodeVariants,
  fractionOf,
  guessDrinkType,
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
import { foldText } from '@/domain/text';

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
  fiber: number | null;
  sugar: number | null;
  satFat: number | null;
  salt: number | null;
  servingAmount: number | null;
  /** Packungsinhalt in g/ml, Koffein in mg je 100 g/ml (A3). */
  packageAmount: number | null;
  caffeine: number | null;
  /** Grundnahrungsmittel (A4): Verknüpfung zur mitgelieferten Liste, Portionen und Mikronährstoffe als JSON. */
  catalogId: string | null;
  catalogOrigin: string | null;
  portionsJson: string | null;
  /** Grundnahrungsmittel: Name und Synonyme, vereinfacht geschrieben, mit „|“ getrennt. */
  searchTerms: string | null;
  microsJson: string | null;
  favorite: number;
  /** JSON-Listen bzw. Angabe laut Produkt (COACH-009); null = unbekannt. Lesen mit `foodFacts`. */
  allergensJson: string | null;
  tracesJson: string | null;
  diet: FoodDiet | null;
};

const FOOD_COLUMNS = `id, source, barcode, name, brand, basis, prep, kcal, protein, carbs, fat, fiber, sugar, sat_fat AS satFat, salt,
  package_amount AS packageAmount, caffeine, catalog_id AS catalogId, catalog_origin AS catalogOrigin, portions AS portionsJson,
  micros AS microsJson, search_terms AS searchTerms,
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

/** Zusammengefasste Angaben mehrerer Lebensmittel, z. B. Zutaten eines Rezepts oder einer Vorlage (COACH-009). */
export async function factsForFoods(db: Db, foodIds: (string | null)[]): Promise<FoodFacts> {
  const parts: FoodFacts[] = [];
  for (const id of foodIds) {
    const food = id ? await getFood(db, id) : null;
    // Zutat ohne gespeichertes Lebensmittel: Angaben unbekannt.
    parts.push(food ? foodFacts(food) : { allergens: null, traces: null, diet: null });
  }
  return combineFacts(parts);
}

export async function recipeFacts(db: Db, versionId: string): Promise<FoodFacts> {
  const rows = await db.getAllAsync<{ foodId: string | null }>('SELECT food_id AS foodId FROM recipe_ingredient WHERE recipe_version_id = ?', versionId);
  return factsForFoods(
    db,
    rows.map((r) => r.foodId)
  );
}

const listText = (list: Allergen[] | null | undefined) => (list == null ? null : JSON.stringify(list));

export function per100(food: Pick<Food, 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'> & Partial<Pick<Food, 'sugar' | 'satFat' | 'salt'>>): Nutrients {
  return {
    kcal: food.kcal,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
    sugar: food.sugar ?? null,
    satFat: food.satFat ?? null,
    salt: food.salt ?? null,
  };
}

/**
 * Suche in eigenen Lebensmitteln, Grundnahrungsmitteln (A4) und gespeicherten Produkten. Reihenfolge: Favoriten,
 * Grundnahrungsmittel, eigene, Produkte; Treffer am Wortanfang vor Treffern mitten im Wort. Findet auch Synonyme
 * („Hühnchen“ → Hähnchen) und – wenn sonst wenig kommt – Einträge mit einem Tippfehler. Gleichnamige Produkte bleiben getrennt (FOOD-018).
 */
export async function searchFoods(db: Db, query: string, limit = 50) {
  const q = query.trim();
  const like = `%${q}%`;
  const folded = foldText(q);
  const rows = await db.getAllAsync<Food>(
    `SELECT ${FOOD_COLUMNS} FROM food WHERE archived = 0 AND (name LIKE ? OR brand LIKE ? OR barcode = ? OR search_terms LIKE ?)
     ORDER BY favorite DESC,
       -- Name oder Synonym genau gleich („Eier“ → Hühnerei) vor Teiltreffern („Eierfrucht“ → Aubergine)
       CASE WHEN lower(name) = lower(?) OR ('|' || search_terms || '|') LIKE ? THEN 0 ELSE 1 END,
       CASE WHEN catalog_id IS NOT NULL OR catalog_origin IS NOT NULL THEN 0 WHEN source = 'eigen' THEN 1 ELSE 2 END,
       CASE WHEN name LIKE ? OR search_terms LIKE ? THEN 0 ELSE 1 END,
       length(name), name COLLATE NOCASE LIMIT ?`,
    like,
    like,
    q,
    `%${folded}%`,
    q,
    `%| ${folded} |%`,
    `${q}%`,
    `% ${folded}%`,
    limit
  );
  if (rows.length >= 5 || folded.length < 4) return rows;
  // Tippfehler: unscharf in der Liste suchen und die passenden Einträge nachladen.
  const ids = fuzzyBasis(q, BASIS_FOODS, 10)
    .map((f) => f.id)
    .filter((id) => !rows.some((r) => r.catalogId === id));
  if (ids.length === 0) return rows;
  const extra = await db.getAllAsync<Food>(`SELECT ${FOOD_COLUMNS} FROM food WHERE archived = 0 AND catalog_id IN (${ids.map(() => '?').join(', ')})`, ...ids);
  extra.sort((a, b) => ids.indexOf(a.catalogId!) - ids.indexOf(b.catalogId!));
  return [...rows, ...extra].slice(0, limit);
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

/** Gespeichertes Lebensmittel zu einem Barcode, auch wenn es unter der anderen Schreibweise (UPC-A/EAN-13) liegt. */
export function findFoodByBarcode(db: Db, barcode: string) {
  const variants = barcodeVariants(barcode);
  return db.getFirstAsync<Food>(
    `SELECT ${FOOD_COLUMNS} FROM food WHERE barcode IN (${variants.map(() => '?').join(', ')}) AND archived = 0 ORDER BY updated_at_utc DESC`,
    ...variants
  );
}

/**
 * Speichert ein Lebensmittel. Änderungen bleiben privat auf dem Gerät und werden nicht an
 * Open Food Facts gesendet (FOOD-010). Alte Tagebucheinträge ändern sich nicht (Schnappschuss).
 */
/**
 * Früher gescannte Getränke kamen oft als Gramm an (fehlende Packungseinheit bei Open Food Facts). Ist ein gescanntes
 * Produkt eindeutig ein Getränk, wird es auf ml umgestellt – die Nährwerte bleiben (bei Getränken je 100 ml angegeben).
 * Gibt das (ggf. korrigierte) Lebensmittel zurück.
 */
export async function repairDrinkBasis<T extends { id: string; source: Food['source']; basis: NutrientBasis; name: string }>(db: Db, food: T): Promise<T> {
  if (food.source !== 'off' || food.basis !== 'g' || guessDrinkType(food.name) === null) return food;
  await db.runAsync("UPDATE food SET basis = 'ml', updated_at_utc = ? WHERE id = ?", nowUtc(), food.id);
  return { ...food, basis: 'ml' };
}

export async function saveFood(db: Db, id: string | null, draft: FoodDraft, source: Food['source'] = 'eigen') {
  const now = nowUtc();
  const foodId = id ?? newId();
  const { kcal, protein, carbs, fat, fiber } = draft.per100;
  const extra = [draft.per100.sugar ?? null, draft.per100.satFat ?? null, draft.per100.salt ?? null, draft.packageAmount ?? null];
  if (id) {
    // Allergene nur ändern, wenn der Entwurf sie mitbringt (z. B. aus dem Formular); sonst bleiben sie.
    if (draft.allergens !== undefined) await db.runAsync('UPDATE food SET allergens = ? WHERE id = ?', listText(draft.allergens), id);
    if (draft.traces !== undefined) await db.runAsync('UPDATE food SET traces = ? WHERE id = ?', listText(draft.traces), id);
    if (draft.diet !== undefined) await db.runAsync('UPDATE food SET diet = ? WHERE id = ?', draft.diet, id);
    await db.runAsync(
      `UPDATE food SET name = ?, brand = ?, barcode = ?, basis = ?, prep = ?, kcal = ?, protein = ?, carbs = ?, fat = ?,
       fiber = ?, serving_amount = ?, updated_at_utc = ? WHERE id = ?`,
      draft.name.trim(),
      draft.brand?.trim() || null,
      draft.barcode,
      draft.basis,
      draft.prep ?? null,
      kcal,
      protein,
      carbs,
      fat,
      fiber,
      draft.servingAmount,
      now,
      id
    );
    await db.runAsync('UPDATE food SET sugar = ?, sat_fat = ?, salt = ?, package_amount = ? WHERE id = ?', ...extra, id);
    // Koffein hat kein Formularfeld: nur ändern, wenn der Entwurf es mitbringt (Phase 1 Scan, F5).
    if (draft.caffeine !== undefined) await db.runAsync('UPDATE food SET caffeine = ? WHERE id = ?', draft.caffeine, id);
    // Grundnahrungsmittel selbst geändert (A4): Verknüpfung lösen, damit Listen-Aktualisierungen nichts überschreiben.
    await db.runAsync('UPDATE food SET catalog_id = NULL WHERE id = ?', id);
  } else {
    await db.runAsync(
      `INSERT INTO food (id, source, barcode, name, brand, basis, prep, kcal, protein, carbs, fat, serving_amount,
       favorite, fetched_at_utc, created_at_utc, updated_at_utc, allergens, traces, diet, fiber)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
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
      draft.diet ?? null,
      fiber
    );
    await db.runAsync(
      'UPDATE food SET sugar = ?, sat_fat = ?, salt = ?, package_amount = ?, caffeine = ? WHERE id = ?',
      ...extra,
      draft.caffeine ?? null,
      foodId
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
  fiber: number | null;
  sugar: number | null;
  satFat: number | null;
  salt: number | null;
  /** Koffein in mg (A3), null = unbekannt. */
  caffeineMg: number | null;
  /** Mikronährstoffe als JSON (A4), null = unbekannt. */
  microsJson: string | null;
  diaryDate: string;
  occurredAt: string;
  prep: Prep | null;
};

// Die Zubereitung (roh/gekocht) kommt nur zur Anzeige vom Lebensmittel; Nährwerte bleiben Schnappschuss.
const EVENT_COLUMNS = `id, kind, meal, drink_type AS drinkType, food_id AS foodId, recipe_version_id AS recipeVersionId,
  name, brand, amount, unit, kcal, protein, carbs, fat, fiber, sugar, sat_fat AS satFat, salt, caffeine_mg AS caffeineMg, micros AS microsJson,
  diary_date AS diaryDate, occurred_at_utc AS occurredAt,
  (SELECT prep FROM food WHERE food.id = consumption_event.food_id) AS prep`;

/** Wann und wo: Tagebuchdatum ist frei wählbar (Nachtrag für gestern), Zeitzone wird mitgespeichert. */
export type When = { diaryDate: string; at: Date; timeZone: string };

export type Target = { kind: 'essen'; meal: Meal } | { kind: 'getraenk'; drinkType: DrinkType };

export async function insertEvent(
  db: Db,
  target: Target,
  when: When,
  data: {
    foodId: string | null;
    recipeVersionId: string | null;
    name: string;
    brand: string | null;
    amount: number;
    unit: EventUnit;
    nutrients: Nutrients;
    /** Koffein in mg (A3); fehlt = unbekannt. */
    caffeineMg?: number | null;
    /** Mikronährstoffe der Menge (A4). */
    micros?: Micros | null;
  }
) {
  const id = newId();
  await db.runAsync(
    `INSERT INTO consumption_event (id, kind, meal, drink_type, food_id, recipe_version_id, name, brand, amount, unit,
     kcal, protein, carbs, fat, fiber, sugar, sat_fat, salt, caffeine_mg, micros, occurred_at_utc, recorded_at_utc, time_zone,
     utc_offset_min, diary_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    data.nutrients.fiber,
    data.nutrients.sugar ?? null,
    data.nutrients.satFat ?? null,
    data.nutrients.salt ?? null,
    data.caffeineMg ?? null,
    data.micros ? JSON.stringify(data.micros) : null,
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
    caffeineMg: food.caffeine == null ? null : (food.caffeine * amount) / 100,
    micros: scaleMicros(parseMicros(food.microsJson), amount / 100),
  });
}

/** Schnelleintrag (A3): nur kcal und optional Makros, ohne Lebensmittel – z. B. Kantine oder Restaurant. */
export async function logQuick(
  db: Db,
  entry: { name: string; kcal: number; protein: number | null; carbs: number | null; fat: number | null },
  meal: Meal,
  when: When
) {
  return insertEvent(db, { kind: 'essen', meal }, when, {
    foodId: null,
    recipeVersionId: null,
    name: entry.name,
    brand: null,
    amount: 1,
    unit: 'portion',
    nutrients: { kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat, fiber: null },
  });
}

/** Getränk mit bekanntem Koffein (Schnellwahl Kaffee, Espresso, Tee …), A3. */
export async function logCaffeineDrink(
  db: Db,
  drink: { name: string; ml: number; kcal: number; carbs: number; sugar: number; caffeineMg: number; drinkType: DrinkType },
  when: When
) {
  return insertEvent(db, { kind: 'getraenk', drinkType: drink.drinkType }, when, {
    foodId: null,
    recipeVersionId: null,
    name: drink.name,
    brand: null,
    amount: drink.ml,
    unit: 'ml',
    nutrients: { kcal: drink.kcal, protein: 0, carbs: drink.carbs, fat: 0, fiber: 0, sugar: drink.sugar, satFat: 0, salt: 0 },
    caffeineMg: drink.caffeineMg,
  });
}

/** Ganzen Tag kopieren (A3): alle Einträge – Essen und Getränke – auf einen anderen Tag. */
export async function copyDay(db: Db, fromDate: string, when: When) {
  const source = await db.getAllAsync<ConsumptionEvent>(
    `SELECT ${EVENT_COLUMNS} FROM consumption_event WHERE diary_date = ? ORDER BY occurred_at_utc`,
    fromDate
  );
  await db.withTransactionAsync(async () => {
    for (const e of source) {
      const target: Target = e.kind === 'essen' ? { kind: 'essen', meal: e.meal ?? 'snack' } : { kind: 'getraenk', drinkType: e.drinkType ?? 'sonstiges' };
      await insertEvent(db, target, when, {
        foodId: e.foodId,
        recipeVersionId: e.recipeVersionId,
        name: e.name,
        brand: e.brand,
        amount: e.amount,
        unit: e.unit,
        nutrients: { kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, fiber: e.fiber, sugar: e.sugar, satFat: e.satFat, salt: e.salt },
        caffeineMg: e.caffeineMg,
        micros: parseMicros(e.microsJson),
      });
    }
  });
  return source.length;
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
    nutrients: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, salt: 0 },
    caffeineMg: 0,
  });
}

export function listDay(db: Db, diaryDate: string) {
  return db.getAllAsync<ConsumptionEvent>(`SELECT ${EVENT_COLUMNS} FROM consumption_event WHERE diary_date = ? ORDER BY occurred_at_utc`, diaryDate);
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
    `UPDATE consumption_event SET amount = ?, meal = ?, diary_date = ?, kcal = ?, protein = ?, carbs = ?, fat = ?, fiber = ?,
     sugar = ?, sat_fat = ?, salt = ?, caffeine_mg = ?, micros = ? WHERE id = ?`,
    change.amount,
    event.kind === 'essen' ? change.meal : null,
    change.diaryDate,
    scale(event.kcal),
    scale(event.protein),
    scale(event.carbs),
    scale(event.fat),
    scale(event.fiber),
    scale(event.sugar),
    scale(event.satFat),
    scale(event.salt),
    scale(event.caffeineMg),
    event.microsJson ? JSON.stringify(scaleMicros(parseMicros(event.microsJson), factor)) : null,
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
        nutrients: { kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, fiber: e.fiber, sugar: e.sugar, satFat: e.satFat, salt: e.salt },
        caffeineMg: e.caffeineMg,
        micros: parseMicros(e.microsJson),
      });
    }
  });
  return source.length;
}

/** Summen pro Tag für die Wochenansicht. */
export function daySums(db: Db, fromDate: string, toDate: string) {
  return db.getAllAsync<{
    day: string;
    kcal: number | null;
    entries: number;
    unknownKcal: number;
    protein: number | null;
    fiber: number | null;
    flagged: number;
  }>(
    `SELECT e.diary_date AS day, SUM(e.kcal) AS kcal, COUNT(*) AS entries, SUM(e.protein) AS protein, SUM(e.fiber) AS fiber,
       SUM(CASE WHEN e.kcal IS NULL THEN 1 ELSE 0 END) AS unknownKcal, COALESCE(MAX(d.incomplete), 0) AS flagged
     FROM consumption_event e LEFT JOIN diary_day d ON d.day = e.diary_date
     WHERE e.diary_date BETWEEN ? AND ? GROUP BY e.diary_date`,
    fromDate,
    toDate
  );
}

/** Tag bewusst als „nicht vollständig erfasst“ markieren (A7.2) – zählt dann nicht für Schnitt und Verbrauch. */
export async function setDayIncomplete(db: Db, day: string, incomplete: boolean) {
  await db.runAsync(
    `INSERT INTO diary_day (day, incomplete, updated_at_utc) VALUES (?, ?, ?)
     ON CONFLICT (day) DO UPDATE SET incomplete = excluded.incomplete, updated_at_utc = excluded.updated_at_utc`,
    day,
    incomplete ? 1 : 0,
    nowUtc()
  );
}

export async function isDayIncomplete(db: Db, day: string): Promise<boolean> {
  return ((await db.getFirstAsync<{ incomplete: number }>('SELECT incomplete FROM diary_day WHERE day = ?', day))?.incomplete ?? 0) === 1;
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
  const templates = await db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM meal_template ORDER BY name COLLATE NOCASE');
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
    const last = await db.getFirstAsync<{ version: number | null }>('SELECT MAX(version) AS version FROM recipe_version WHERE recipe_id = ?', id);
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
        `INSERT INTO recipe_ingredient (id, recipe_version_id, position, food_id, name, amount, unit, kcal, protein, carbs, fat, fiber,
         sugar, sat_fat, salt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        n.fat,
        n.fiber,
        n.sugar ?? null,
        n.satFat ?? null,
        n.salt ?? null
      );
    }
  });
  return id;
}

async function versionTotal(db: Db, versionId: string): Promise<Nutrients> {
  const rows = await db.getAllAsync<Nutrients>(
    'SELECT kcal, protein, carbs, fat, fiber, sugar, sat_fat AS satFat, salt FROM recipe_ingredient WHERE recipe_version_id = ?',
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
export async function logRecipe(db: Db, versionId: string, part: { grams: number } | { portions: number }, meal: Meal, when: When) {
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
  /** Der Ernährungstag endet um diese Stunde (0 = Mitternacht, bis 5 Uhr) – Essen um 1 Uhr zählt dann noch zum Vortag (A3). */
  dayEndsAt: number;
};

export const DEFAULT_SETTINGS: NutritionSettings = {
  drinkGoalMl: 1500,
  glassSizes: [200, 250, 330, 500],
  hideNumbers: false,
  allergies: [],
  diet: 'alles',
  mealTimes: DEFAULT_MEAL_TIMES,
  dayEndsAt: 0,
};

// Zuletzt geladene Essenszeiten, damit der Mahlzeit-Vorschlag ohne Datenbankzugriff auskommt.
let lastMealTimes: MealTimes = DEFAULT_MEAL_TIMES;
export const cachedMealTimes = () => lastMealTimes;
let lastDayEnd = 0;
export const cachedDayEnd = () => lastDayEnd;

export async function loadNutritionSettings(db: Db): Promise<NutritionSettings> {
  const stored = await readState<Partial<NutritionSettings> & { kcalGoal?: unknown }>(db, 'nutrition_settings', {});
  // Alter Wert aus Phase 3; wurde mit Migration 4 nach calorie_goal übernommen.
  const { kcalGoal: _old, ...rest } = stored;
  const settings = { ...DEFAULT_SETTINGS, ...rest, mealTimes: { ...DEFAULT_MEAL_TIMES, ...rest.mealTimes } };
  lastMealTimes = settings.mealTimes;
  lastDayEnd = settings.dayEndsAt;
  return settings;
}

export async function saveNutritionSettings(db: Db, settings: NutritionSettings) {
  await writeState(db, 'nutrition_settings', settings);
  lastMealTimes = settings.mealTimes;
  lastDayEnd = settings.dayEndsAt;
}
