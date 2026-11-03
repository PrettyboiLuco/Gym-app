// Daten für „Was fehlt mir heute?“ und die Nährstoff-Suche (Ausbauplan B2, W3): Kandidaten aus Grundnahrungsmitteln
// und Favoriten, Lücken des Tages und Vorschläge. Eingetragen wird über logFood (data/nutrition.ts).

import { MICRO_KEYS, parseMicros, parsePortions, sumMicros, type BasisGroup, type MicroKey } from '@/domain/basis-foods';
import { BASIS_FOODS } from '@/domain/basis-foods-data';
import { ALLERGENS, type Allergen } from '@/domain/diet';
import { fitsDiet, openGaps, rankFoods, suggestFoods, type Gap, type GapFood, type GapKey, type RankBy, type Suggestion } from '@/domain/nutrient-gaps';
import { sumNutrients } from '@/domain/nutrition';

import type { Db } from './db';
import { listDay, loadNutritionSettings, type ConsumptionEvent } from './nutrition';
import { loadDayTargets, type DayTargets } from './targets-settings';

const GROUPS = new Map<string, BasisGroup>(BASIS_FOODS.map((f) => [f.id, f.group]));

type Row = {
  id: string;
  name: string;
  basis: 'g' | 'ml';
  kcal: number;
  protein: number | null;
  fiber: number | null;
  micros: string | null;
  portions: string | null;
  serving: number | null;
  catalog: string | null;
  favorite: number;
  diet: GapFood['diet'];
  allergens: string | null;
};

function parseAllergens(json: string | null): Allergen[] | null {
  if (json === null) return null;
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) ? list.filter((a): a is Allergen => (ALLERGENS as readonly string[]).includes(a)) : null;
  } catch {
    return null;
  }
}

const toFood = (r: Row): GapFood => ({
  id: r.id,
  name: r.name,
  basis: r.basis,
  kcal: r.kcal,
  protein: r.protein,
  fiber: r.fiber,
  micros: parseMicros(r.micros),
  portions: parsePortions(r.portions),
  serving: r.serving,
  group: r.catalog ? (GROUPS.get(r.catalog) ?? null) : null,
  favorite: r.favorite === 1,
  diet: r.diet,
  allergens: parseAllergens(r.allergens),
});

const COLUMNS = `id, name, basis, kcal, protein, fiber, micros, portions, serving_amount AS serving,
  COALESCE(catalog_id, catalog_origin) AS catalog, favorite, diet, allergens`;

/** Grundnahrungsmittel und Favoriten mit bekannten kcal (Kandidaten für Vorschläge). */
export async function gapCandidates(db: Db): Promise<GapFood[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT ${COLUMNS} FROM food WHERE archived = 0 AND kcal IS NOT NULL AND kcal > 0
       AND (catalog_id IS NOT NULL OR catalog_origin IS NOT NULL OR favorite = 1)`
  );
  return rows.map(toFood);
}

/** Alle gespeicherten Lebensmittel nach einem Nährstoff (je 100 g/ml oder je 100 kcal). */
export async function rankFoodsBy(db: Db, key: GapKey, by: RankBy, limit = 30) {
  const rows = await db.getAllAsync<Row>(`SELECT ${COLUMNS} FROM food WHERE archived = 0 AND kcal IS NOT NULL`);
  return rankFoods(rows.map(toFood), key, by, limit);
}

export type GapsDay = {
  targets: DayTargets;
  events: ConsumptionEvent[];
  eaten: { kcal: number; protein: number; fiber: number; micros: Partial<Record<MicroKey, number>> };
  gaps: Gap[];
  kcalLeft: number | null;
  suggestions: Suggestion[];
};

/** Lücken und Vorschläge für einen Tag; bei sensibler Situation oder „ohne Zahlen“ keine Vorschläge. */
export async function loadGapsDay(db: Db, day: string): Promise<GapsDay> {
  const [targets, events, settings] = await Promise.all([loadDayTargets(db, day), listDay(db, day), loadNutritionSettings(db)]);
  const sums = sumNutrients(events);
  const micros = sumMicros(events.map((e) => parseMicros(e.microsJson))).values;
  const eaten = { kcal: sums.values.kcal, protein: sums.values.protein, fiber: sums.values.fiber, micros };
  if (targets.hidden) return { targets, events, eaten, gaps: [], kcalLeft: null, suggestions: [] };
  const gaps = openGaps({
    protein: targets.macros ? { target: targets.macros.protein, eaten: eaten.protein } : null,
    fiber: targets.macros ? { target: targets.macros.fiber, eaten: eaten.fiber } : null,
    micros: targets.pinned.filter((k) => MICRO_KEYS.includes(k)).map((k) => ({ key: k, target: targets.refs[k].target, eaten: micros[k] ?? 0 })),
  });
  const kcalLeft = targets.kcal === null ? null : Math.round(targets.kcal - eaten.kcal);
  // Eigene Favoriten hat die Person selbst gewählt; Grundnahrungsmittel müssen zu Ernährungsweise und Allergien passen.
  const foods = (await gapCandidates(db)).filter((f) => f.favorite || fitsDiet(f, settings.diet, settings.allergies));
  return { targets, events, eaten, gaps, kcalLeft, suggestions: suggestFoods(gaps, kcalLeft, foods) };
}
