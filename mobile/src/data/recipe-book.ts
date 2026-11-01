// Rezeptbuch im Tagebuch: eine Portion eintragen oder das Rezept als eigenes Rezept übernehmen (zum Anpassen).

import { ingredient, type BookRecipeView } from '@/domain/recipe-book';
import { BOOK_TO_BASIS } from '@/domain/recipe-book-basis';
import { fractionOf, type Meal } from '@/domain/nutrition';

import type { Db } from './db';
import { insertEvent, saveFood, saveRecipe, type When } from './nutrition';

/** Trägt Portionen eines Rezepts ins Tagebuch ein (Schnappschuss der Nährwerte, Einheit „Portion“). */
export function logBookRecipe(db: Db, recipe: BookRecipeView, portions: number, meal: Meal, when: When) {
  if (!(portions > 0)) throw new Error('portions must be positive');
  return insertEvent(db, { kind: 'essen', meal }, when, {
    foodId: null,
    recipeVersionId: null,
    name: recipe.name,
    brand: null,
    amount: portions,
    unit: 'portion',
    nutrients: fractionOf(recipe.perPortion, portions),
  });
}

/** Grundnahrungsmittel zur Zutat (A4.7): verknüpfter Eintrag, sonst die vom Nutzer geänderte Fassung. */
async function basisFoodFor(db: Db, ingredientId: string) {
  const catalog = BOOK_TO_BASIS[ingredientId];
  if (!catalog) return null;
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM food WHERE archived = 0 AND (catalog_id = ? OR catalog_origin = ?) ORDER BY catalog_id IS NULL LIMIT 1',
    catalog,
    catalog
  );
  return row?.id ?? null;
}

/**
 * Übernimmt ein Rezept in „Meine Rezepte“. Zutaten mit passendem Grundnahrungsmittel (A4) nutzen dieses; die übrigen
 * werden als eigene Lebensmittel angelegt bzw. wiederverwendet (gleicher Name), damit sie sich danach wie jedes
 * andere Lebensmittel ändern lassen.
 */
export async function copyBookRecipe(db: Db, recipe: BookRecipeView): Promise<string> {
  const ingredients: { foodId: string; amount: number }[] = [];
  for (const [id, amount] of recipe.ingredients) {
    const basis = await basisFoodFor(db, id);
    if (basis) {
      ingredients.push({ foodId: basis, amount });
      continue;
    }
    const ing = ingredient(id);
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM food WHERE source = 'eigen' AND archived = 0 AND name = ? AND basis = ? LIMIT 1",
      ing.name,
      ing.basis
    );
    const [kcal, protein, carbs, fat, fiber] = ing.per100;
    const foodId =
      existing?.id ??
      (await saveFood(db, null, {
        name: ing.name,
        brand: null,
        barcode: null,
        basis: ing.basis,
        per100: { kcal, protein, carbs, fat, fiber },
        servingAmount: null,
        allergens: ing.allergens,
        traces: null,
        diet: ing.diet,
      }));
    ingredients.push({ foodId, amount });
  }
  return saveRecipe(db, null, { name: recipe.name, endWeightG: null, portions: recipe.portions, ingredients });
}
