// Rezeptbuch im Tagebuch: eine Portion eintragen oder das Rezept als eigenes Rezept übernehmen (zum Anpassen).

import { ingredient, type BookRecipeView } from '@/domain/recipe-book';
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

/**
 * Übernimmt ein Rezept in „Meine Rezepte“. Zutaten werden als eigene Lebensmittel angelegt bzw. wiederverwendet
 * (gleicher Name), damit sie sich danach wie jedes andere Lebensmittel ändern lassen.
 */
export async function copyBookRecipe(db: Db, recipe: BookRecipeView): Promise<string> {
  const ingredients: { foodId: string; amount: number }[] = [];
  for (const [id, amount] of recipe.ingredients) {
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
