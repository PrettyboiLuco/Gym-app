// Allergien, Ernährungsweise und Essenszeiten (Phase 9.3/9.4, Register COACH-007, COACH-009).
// Grundsatz: Die App sagt nie „allergenfrei“. Sie zeigt, was die Produktangaben enthalten, und weist darauf
// hin, wenn Angaben fehlen. Maßgeblich bleibt das Etikett.

import type { Meal } from './nutrition';

/** Die 14 Hauptallergene nach EU-Lebensmittelinformationsverordnung (Anhang II). */
export const ALLERGENS = [
  'gluten',
  'krebstiere',
  'eier',
  'fisch',
  'erdnuesse',
  'soja',
  'milch',
  'schalenfruechte',
  'sellerie',
  'senf',
  'sesam',
  'sulfite',
  'lupinen',
  'weichtiere',
] as const;
export type Allergen = (typeof ALLERGENS)[number];

/** Schlüssel in Open Food Facts (allergens_tags/traces_tags) → eigene Schlüssel. */
const OFF_ALLERGENS: Record<string, Allergen> = {
  'en:gluten': 'gluten',
  'en:crustaceans': 'krebstiere',
  'en:eggs': 'eier',
  'en:fish': 'fisch',
  'en:peanuts': 'erdnuesse',
  'en:soybeans': 'soja',
  'en:milk': 'milch',
  'en:nuts': 'schalenfruechte',
  'en:celery': 'sellerie',
  'en:mustard': 'senf',
  'en:sesame-seeds': 'sesam',
  'en:sulphur-dioxide-and-sulphites': 'sulfite',
  'en:lupin': 'lupinen',
  'en:molluscs': 'weichtiere',
};

/** Liest Allergen-Tags; keine Liste = unbekannt (null), leere Liste = keine angegeben. */
export function allergensFromOff(tags: unknown): Allergen[] | null {
  if (!Array.isArray(tags)) return null;
  const found = tags.map((t) => (typeof t === 'string' ? OFF_ALLERGENS[t] : undefined)).filter((a): a is Allergen => !!a);
  return [...new Set(found)];
}

export const DIETS = ['alles', 'vegetarisch', 'vegan'] as const;
export type Diet = (typeof DIETS)[number];
/** Angabe am Produkt; null = unbekannt. */
export type FoodDiet = 'vegan' | 'vegetarisch' | 'nicht_vegetarisch';

/** ingredients_analysis_tags aus Open Food Facts; „vielleicht“ und „unbekannt“ bleiben unbekannt. */
export function dietFromOff(tags: unknown): FoodDiet | null {
  if (!Array.isArray(tags)) return null;
  if (tags.includes('en:vegan')) return 'vegan';
  if (tags.includes('en:non-vegetarian')) return 'nicht_vegetarisch';
  if (tags.includes('en:vegetarian')) return 'vegetarisch';
  return null;
}

export type DietPrefs = { allergies: Allergen[]; diet: Diet };
export const EMPTY_DIET_PREFS: DietPrefs = { allergies: [], diet: 'alles' };

export type FoodFacts = { allergens: Allergen[] | null; traces: Allergen[] | null; diet: FoodDiet | null };

/** Hinweise für ein Lebensmittel. `unknown` = keine Angaben vorhanden, obwohl Allergien eingetragen sind. */
export type DietCheck = {
  contains: Allergen[];
  traces: Allergen[];
  unknown: boolean;
  /** Passt laut Angabe nicht zur Ernährungsweise (oder Angabe fehlt). */
  dietConflict: 'nein' | 'ja' | 'unbekannt';
};

export function dietCheck(food: FoodFacts, prefs: DietPrefs): DietCheck {
  const contains = (food.allergens ?? []).filter((a) => prefs.allergies.includes(a));
  const traces = (food.traces ?? []).filter((a) => prefs.allergies.includes(a) && !contains.includes(a));
  const unknown = prefs.allergies.length > 0 && food.allergens === null;
  let dietConflict: DietCheck['dietConflict'] = 'nein';
  if (prefs.diet !== 'alles') {
    if (food.diet === null) dietConflict = 'unbekannt';
    else if (food.diet === 'nicht_vegetarisch' || (prefs.diet === 'vegan' && food.diet === 'vegetarisch')) dietConflict = 'ja';
  }
  return { contains, traces, unknown, dietConflict };
}

/** Gibt es etwas Auffälliges? (Für ein Warnzeichen in Listen.) */
export function needsAttention(check: DietCheck): boolean {
  return check.contains.length > 0 || check.traces.length > 0 || check.dietConflict === 'ja';
}

// ------------------------------------------------------------------------------- Essenszeiten

/** Übliche Uhrzeiten (volle Stunde) der Hauptmahlzeiten; null = diese Mahlzeit gibt es meist nicht. */
export type MealTimes = { fruehstueck: number | null; mittag: number | null; abend: number | null };
export const DEFAULT_MEAL_TIMES: MealTimes = { fruehstueck: 7, mittag: 12, abend: 18 };

/**
 * Vorschlag der Mahlzeit nach den eigenen Essenszeiten (COACH-007: Alltag statt „optimaler Uhrzeit“):
 * die Hauptmahlzeit, deren Zeit höchstens 2 Stunden entfernt ist, sonst Snack. Bleibt frei wählbar.
 */
export function suggestMealAt(hour: number, times: MealTimes): Meal {
  let best: { meal: Meal; distance: number } | null = null;
  for (const meal of ['fruehstueck', 'mittag', 'abend'] as const) {
    const at = times[meal];
    if (at === null) continue;
    const raw = Math.abs(hour - at);
    const distance = Math.min(raw, 24 - raw);
    if (distance <= 2 && (!best || distance < best.distance)) best = { meal, distance };
  }
  return best?.meal ?? 'snack';
}
