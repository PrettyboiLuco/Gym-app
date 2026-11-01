// Essen planen (Ausbauplan A9): Wochenplan, Vorschlag passend zu Kalorien-/Eiweißziel und Ernährungsweise,
// Einkaufsliste nach Abteilung und Meal-Prep. Reine Logik ohne Datenbank.

import { BASIS_FOODS } from './basis-foods-data';
import { portionGrams, type BasisGroup } from './basis-foods';
import { dietCheck, type DietPrefs } from './diet';
import type { Meal, NutrientBasis, Nutrients } from './nutrition';
import { BOOK_TO_BASIS } from './recipe-book-basis';
import { ingredient, type BookRecipeView } from './recipe-book';

export type PlanSource = 'buch' | 'eigen';
export type PlanEntry = { id: string; day: string; meal: Meal; source: PlanSource; ref: string; name: string; portions: number; eatenEventId: string | null };
export type NewPlanEntry = Omit<PlanEntry, 'id' | 'eatenEventId'>;

/** Anteil am Tagesziel je Mahlzeit für den Vorschlag. */
export const MEAL_SHARE: Record<Meal, number> = { fruehstueck: 0.25, mittag: 0.35, abend: 0.3, snack: 0.1 };
export const PORTION_STEPS = [0.5, 1, 1.5, 2] as const;

export function weekDaysFrom(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${monday}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Passt ein Buchrezept zu Ernährungsweise und Allergien? */
export function fitsPrefs(recipe: BookRecipeView, prefs: DietPrefs): boolean {
  const check = dietCheck({ allergens: recipe.allergens, traces: [], diet: recipe.diet }, prefs);
  return check.contains.length === 0 && check.dietConflict === 'nein';
}

export type SuggestInput = {
  days: string[];
  recipes: readonly BookRecipeView[];
  prefs: DietPrefs;
  /** kcal- und Eiweißziel je Tag (null = kein Ziel → 2.000 kcal als Rahmen, Eiweiß egal). */
  goalKcal: number | null;
  goalProtein: number | null;
  /** Schon geplante Einträge; deren Plätze bleiben, sie zählen für Abwechslung und Tagessumme mit. */
  existing: NewPlanEntry[];
  /** Ob Snacks vorgeschlagen werden. */
  snacks: boolean;
};

/**
 * Füllt leere Plätze (Frühstück, Mittag, Abend, optional Snack) mit Rezepten aus dem Buch: Portionen so, dass die
 * Mahlzeit ihren Anteil am kcal-Ziel trifft; Eiweiß unter dem anteiligen Ziel kostet Punkte, Wiederholung innerhalb
 * von 2 Tagen auch. Gleiches Ergebnis bei gleicher Eingabe (keine Zufallswahl).
 */
export function suggestWeek(input: SuggestInput): NewPlanEntry[] {
  const kcalGoal = input.goalKcal ?? 2000;
  const meals: Meal[] = input.snacks ? ['fruehstueck', 'mittag', 'abend', 'snack'] : ['fruehstueck', 'mittag', 'abend'];
  const pool = input.recipes.filter((r) => fitsPrefs(r, input.prefs));
  const planned = [...input.existing];
  const out: NewPlanEntry[] = [];
  const near = (a: string, b: string) => Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) <= 2 * 86_400_000;
  for (const day of input.days) {
    for (const meal of meals) {
      if (planned.some((e) => e.day === day && e.meal === meal)) continue;
      const target = kcalGoal * MEAL_SHARE[meal];
      const proteinTarget = input.goalProtein === null ? null : input.goalProtein * MEAL_SHARE[meal];
      let best: { recipe: BookRecipeView; portions: number; score: number } | null = null;
      for (const recipe of pool.filter((r) => r.meal === meal)) {
        const kcal = recipe.perPortion.kcal ?? 0;
        if (kcal <= 0) continue;
        const repeat = planned.some((e) => e.ref === recipe.id && near(e.day, day)) ? 1 : 0;
        for (const portions of PORTION_STEPS) {
          const k = kcal * portions;
          const p = (recipe.perPortion.protein ?? 0) * portions;
          const kcalMiss = Math.abs(k - target) / target;
          const proteinMiss = proteinTarget ? Math.max(0, proteinTarget - p) / proteinTarget : 0;
          const score = kcalMiss + proteinMiss * 0.5 + repeat + (portions === 1 ? 0 : 0.05);
          if (!best || score < best.score || (score === best.score && recipe.id < best.recipe.id)) best = { recipe, portions, score };
        }
      }
      if (!best) continue;
      const entry: NewPlanEntry = { day, meal, source: 'buch', ref: best.recipe.id, name: best.recipe.name, portions: best.portions };
      out.push(entry);
      planned.push(entry);
    }
  }
  return out;
}

/** Tagessumme der geplanten Einträge (Nährwerte je Portion kommen von außen). */
export function dayTotals(entries: PlanEntry[], perPortion: (e: PlanEntry) => Nutrients | null): Map<string, { kcal: number; protein: number; unknown: number }> {
  const out = new Map<string, { kcal: number; protein: number; unknown: number }>();
  for (const e of entries) {
    const n = perPortion(e);
    const t = out.get(e.day) ?? { kcal: 0, protein: 0, unknown: 0 };
    if (!n || n.kcal === null) t.unknown++;
    else {
      t.kcal += n.kcal * e.portions;
      t.protein += (n.protein ?? 0) * e.portions;
    }
    out.set(e.day, t);
  }
  return out;
}

// ----------------------------------------------------------------------------- Meal-Prep

/** N Portionen eines Rezepts auf N aufeinanderfolgende Tage (je 1 Portion) zur gleichen Mahlzeit. */
export function mealPrep(entry: Omit<NewPlanEntry, 'day' | 'portions'>, startDay: string, portions: number): NewPlanEntry[] {
  return weekDaysFrom(startDay)
    .slice(0, Math.max(1, Math.min(7, Math.round(portions))))
    .map((day) => ({ ...entry, day, portions: 1 }));
}

// --------------------------------------------------------------------------- Einkaufsliste

export const DEPARTMENTS = ['obst_gemuese', 'brot', 'fleisch_fisch', 'milch_eier', 'trocken', 'konserven', 'tiefkuehl', 'getraenke', 'sonstiges'] as const;
export type Department = (typeof DEPARTMENTS)[number];

const GROUP_DEPARTMENT: Record<BasisGroup, Department> = {
  obst: 'obst_gemuese',
  gemuese: 'obst_gemuese',
  kartoffeln: 'obst_gemuese',
  brot: 'brot',
  fleisch_fisch: 'fleisch_fisch',
  eier_milch: 'milch_eier',
  pflanzlich_eiweiss: 'milch_eier',
  getreide: 'trocken',
  huelsenfruechte: 'trocken',
  nuesse_samen: 'trocken',
  backen_sonstiges: 'trocken',
  fette_oele: 'konserven',
  aufstriche_saucen: 'konserven',
  suesses_snacks: 'sonstiges',
  getraenke: 'getraenke',
};

const BASIS_BY_ID = new Map(BASIS_FOODS.map((f) => [f.id, f]));

/** Abteilung über das Grundnahrungsmittel; Tiefkühlware am Namen („TK“). */
export function departmentFor(name: string, basisId: string | null): Department {
  if (/\bTK\b|tiefkühl/i.test(name)) return 'tiefkuehl';
  if (/\(Dose|Dose\b|passiert|Glas\b/i.test(name)) return 'konserven';
  const basis = basisId ? BASIS_BY_ID.get(basisId) : undefined;
  return basis ? GROUP_DEPARTMENT[basis.group] : 'sonstiges';
}

export type ShoppingSource = { key: string; name: string; amount: number; basis: NutrientBasis; basisId: string | null };
export type ShoppingItem = { key: string; name: string; amount: number; basis: NutrientBasis; department: Department; pieces: number | null };

/** Zutaten eines Buchrezepts für `portions` Portionen als Einkaufszeilen. */
export function bookShopping(recipe: BookRecipeView, portions: number): ShoppingSource[] {
  const factor = portions / recipe.portions;
  return recipe.ingredients.map(([id, amount]) => {
    const ing = ingredient(id);
    return { key: `buch:${id}`, name: ing.name, amount: amount * factor, basis: ing.basis, basisId: BOOK_TO_BASIS[id] ?? null };
  });
}

/**
 * Fasst gleiche Zutaten zusammen, rundet auf (ab 50 g auf 5 g, sonst auf 1 g) und sortiert nach Abteilung und Name.
 * Bei Stückware (z. B. Eier) steht zusätzlich die ungefähre Stückzahl dabei.
 */
export function shoppingList(sources: ShoppingSource[]): ShoppingItem[] {
  const merged = new Map<string, ShoppingSource>();
  for (const s of sources) {
    const key = s.basisId ? `basis:${s.basisId}|${s.basis}` : `${s.key}|${s.basis}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, amount: prev.amount + s.amount } : { ...s, key });
  }
  return [...merged.values()]
    .map((s) => {
      const amount = s.amount >= 50 ? Math.ceil(s.amount / 5) * 5 : Math.max(1, Math.ceil(s.amount));
      const basis = s.basisId ? BASIS_BY_ID.get(s.basisId) : undefined;
      const per = basis ? portionGrams('stueck', basis.portions, basis.serving) : null;
      const pieces = per && /Stück|Ei\b|\(mittel\)|\(M\)/.test(basis!.portions.map((p) => p.label).join(' ')) ? Math.ceil(amount / per) : null;
      return { key: s.key, name: s.name, amount, basis: s.basis, department: departmentFor(s.name, s.basisId), pieces };
    })
    .sort((a, b) => DEPARTMENTS.indexOf(a.department) - DEPARTMENTS.indexOf(b.department) || a.name.localeCompare(b.name, 'de'));
}

/** Text zum Teilen (Nachricht, Notizen): Abteilungen als Überschrift, Häkchen für Erledigtes. */
export function shoppingText(items: ShoppingItem[], checked: Set<string>, title: (d: Department) => string, unit: (i: ShoppingItem) => string): string {
  const lines: string[] = [];
  for (const dep of DEPARTMENTS) {
    const list = items.filter((i) => i.department === dep);
    if (!list.length) continue;
    lines.push(`\n${title(dep)}`);
    for (const i of list) lines.push(`${checked.has(i.key) ? '☑' : '☐'} ${unit(i)} ${i.name}`);
  }
  return lines.join('\n').trim();
}
