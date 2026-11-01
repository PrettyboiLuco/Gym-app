// Rezeptbuch: mitgelieferte Rezepte nach Ziel (Harte Diät bis Masse). Nährwerte werden aus den Zutaten berechnet,
// nie von Hand eingetragen – so passen Rezept, Portion und Tagebuch immer zusammen. Die Werte je 100 g/ml sind
// Richtwerte für übliche Produkte; maßgeblich bleiben die Angaben auf der Packung.

import type { Allergen, FoodDiet } from './diet';
import type { Meal, NutrientBasis, Nutrients } from './nutrition';
import { BOOK_INGREDIENTS, BOOK_RECIPES } from './recipe-book-data';

export const BOOK_GOALS = ['diaet_hart', 'diaet', 'erhalt', 'aufbau', 'masse'] as const;
export type BookGoal = (typeof BOOK_GOALS)[number];

export type BookIngredient = {
  name: string;
  basis: NutrientBasis;
  /** kcal, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe je 100 g bzw. 100 ml. */
  per100: [kcal: number, protein: number, carbs: number, fat: number, fiber: number];
  diet: FoodDiet;
  allergens: Allergen[];
};

export type BookRecipe = {
  id: string;
  name: string;
  goal: BookGoal;
  meal: Meal;
  minutes: number;
  /** Für so viele Portionen gelten die Mengen. */
  portions: number;
  /** [Zutaten-ID, Menge in g bzw. ml] für das ganze Rezept. */
  ingredients: [string, number][];
  steps: string[];
  tip?: string;
};

/**
 * Grenzen je Ziel (pro Portion). Ein Test prüft jedes Rezept dagegen, damit „Harte Diät“ nie ein
 * 900-kcal-Teller ist. `proteinShare` = Anteil der Kalorien aus Eiweiß.
 */
export const GOAL_LIMITS: Record<BookGoal, { minKcal: number; maxKcal: number; proteinShare: number; minProtein: number }> = {
  diaet_hart: { minKcal: 150, maxKcal: 400, proteinShare: 0.4, minProtein: 20 },
  diaet: { minKcal: 300, maxKcal: 600, proteinShare: 0.25, minProtein: 25 },
  erhalt: { minKcal: 450, maxKcal: 800, proteinShare: 0.15, minProtein: 20 },
  aufbau: { minKcal: 700, maxKcal: 1100, proteinShare: 0.18, minProtein: 35 },
  masse: { minKcal: 1050, maxKcal: 1800, proteinShare: 0.12, minProtein: 45 },
};

export type BookIngredientLine = { id: string; name: string; amount: number; basis: NutrientBasis };

export type BookRecipeView = BookRecipe & {
  /** Nährwerte einer Portion. */
  perPortion: Nutrients;
  diet: FoodDiet;
  allergens: Allergen[];
};

const round = (v: number, digits = 1) => Math.round(v * 10 ** digits) / 10 ** digits;

export function ingredient(id: string): BookIngredient {
  const ing = BOOK_INGREDIENTS[id];
  if (!ing) throw new Error(`unknown ingredient ${id}`);
  return ing;
}

/** Nährwerte einer Portion aus den Zutaten. */
export function perPortion(recipe: BookRecipe): Nutrients {
  const sum = [0, 0, 0, 0, 0];
  for (const [id, amount] of recipe.ingredients) {
    const values = ingredient(id).per100;
    for (let i = 0; i < 5; i++) sum[i] += (values[i] * amount) / 100;
  }
  const [kcal, protein, carbs, fat, fiber] = sum.map((v) => v / recipe.portions);
  return { kcal: Math.round(kcal), protein: round(protein), carbs: round(carbs), fat: round(fat), fiber: round(fiber) };
}

/** Ernährungsweise des Rezepts: die „strengste“ Zutat entscheidet. */
export function recipeDiet(recipe: BookRecipe): FoodDiet {
  const diets = recipe.ingredients.map(([id]) => ingredient(id).diet);
  if (diets.includes('nicht_vegetarisch')) return 'nicht_vegetarisch';
  if (diets.includes('vegetarisch')) return 'vegetarisch';
  return 'vegan';
}

export function recipeAllergens(recipe: BookRecipe): Allergen[] {
  return [...new Set(recipe.ingredients.flatMap(([id]) => ingredient(id).allergens))];
}

export function viewRecipe(recipe: BookRecipe): BookRecipeView {
  return { ...recipe, perPortion: perPortion(recipe), diet: recipeDiet(recipe), allergens: recipeAllergens(recipe) };
}

/** Zutaten für eine gewünschte Portionszahl (gerundet auf 5 g, kleine Mengen auf 1 g). */
export function scaledIngredients(recipe: BookRecipe, portions: number): BookIngredientLine[] {
  const factor = portions / recipe.portions;
  return recipe.ingredients.map(([id, amount]) => {
    const raw = amount * factor;
    const ing = ingredient(id);
    return { id, name: ing.name, basis: ing.basis, amount: raw >= 50 ? Math.round(raw / 5) * 5 : Math.max(1, Math.round(raw)) };
  });
}

export const ALL_BOOK_RECIPES: BookRecipeView[] = BOOK_RECIPES.map(viewRecipe);

export function findBookRecipe(id: string): BookRecipeView | null {
  return ALL_BOOK_RECIPES.find((r) => r.id === id) ?? null;
}

export type BookFilter = { goal: BookGoal | null; meal: Meal | null; diet: 'alles' | 'vegetarisch' | 'vegan' };

export function filterBook(recipes: readonly BookRecipeView[], filter: BookFilter): BookRecipeView[] {
  return recipes.filter(
    (r) =>
      (filter.goal === null || r.goal === filter.goal) &&
      (filter.meal === null || r.meal === filter.meal) &&
      (filter.diet === 'alles' || (filter.diet === 'vegetarisch' ? r.diet !== 'nicht_vegetarisch' : r.diet === 'vegan'))
  );
}

/** Passendes Ziel aus dem Coach-Ziel (abnehmen → Diät, zunehmen → Aufbau, halten → Erhalt). */
export function goalForCoach(goal: 'halten' | 'abnehmen' | 'zunehmen' | null): BookGoal | null {
  return goal === 'abnehmen' ? 'diaet' : goal === 'zunehmen' ? 'aufbau' : goal === 'halten' ? 'erhalt' : null;
}
