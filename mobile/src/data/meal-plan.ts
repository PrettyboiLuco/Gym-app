// Datenbankzugriffe für Wochenplan, Einkaufsliste und Rezept-Import (Ausbauplan A9).

import { bookShopping, shoppingList, type NewPlanEntry, type PlanEntry, type ShoppingItem, type ShoppingSource } from '@/domain/meal-plan';
import { fractionOf, type Nutrients } from '@/domain/nutrition';
import { findBookRecipe } from '@/domain/recipe-book';

import { newId, nowUtc, type Db } from './db';
import { getFood, listRecipes, loadRecipeDraft, logRecipe, saveRecipe, type When } from './nutrition';
import { onlineAllowed } from './online';
import { logBookRecipe } from './recipe-book';

const COLUMNS = 'id, day, meal, source, ref, name, portions, eaten_event_id AS eatenEventId';

export function listPlan(db: Db, from: string, to: string) {
  return db.getAllAsync<PlanEntry>(`SELECT ${COLUMNS} FROM meal_plan WHERE day BETWEEN ? AND ? ORDER BY day, meal, created_at_utc`, from, to);
}

export async function addPlanEntries(db: Db, entries: NewPlanEntry[]) {
  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      await db.runAsync(
        'INSERT INTO meal_plan (id, day, meal, source, ref, name, portions, eaten_event_id, created_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)',
        newId(),
        e.day,
        e.meal,
        e.source,
        e.ref,
        e.name,
        e.portions,
        nowUtc()
      );
    }
  });
}

export async function deletePlanEntry(db: Db, id: string) {
  await db.runAsync('DELETE FROM meal_plan WHERE id = ?', id);
}

/** Nährwerte einer Portion: Buchrezept direkt, eigenes Rezept aus der aktiven Version (nur mit Portionsangabe). */
export async function planNutrients(db: Db, entries: PlanEntry[]): Promise<Map<string, Nutrients | null>> {
  const out = new Map<string, Nutrients | null>();
  const own = await listRecipes(db);
  for (const e of entries) {
    if (e.source === 'buch') out.set(e.id, findBookRecipe(e.ref)?.perPortion ?? null);
    else {
      const r = own.find((x) => x.recipeId === e.ref);
      out.set(e.id, r?.portions ? fractionOf(r.total, 1 / r.portions) : null);
    }
  }
  return out;
}

/** Geplante Mahlzeit als gegessen eintragen (Schnappschuss wie beim normalen Eintragen) und im Plan vermerken. */
export async function logPlanEntry(db: Db, entry: PlanEntry, when: When): Promise<string> {
  let eventId: string;
  if (entry.source === 'buch') {
    const recipe = findBookRecipe(entry.ref);
    if (!recipe) throw new Error('recipe not found');
    eventId = await logBookRecipe(db, recipe, entry.portions, entry.meal, when);
  } else {
    const r = (await listRecipes(db)).find((x) => x.recipeId === entry.ref);
    if (!r?.portions) throw new Error('recipe without portions');
    eventId = await logRecipe(db, r.versionId, { portions: entry.portions }, entry.meal, when);
  }
  await db.runAsync('UPDATE meal_plan SET eaten_event_id = ? WHERE id = ?', eventId, entry.id);
  return eventId;
}

/** Gegessen-Vermerk lösen, wenn der Tagebucheintrag inzwischen gelöscht wurde. */
export async function cleanEatenLinks(db: Db) {
  await db.runAsync('UPDATE meal_plan SET eaten_event_id = NULL WHERE eaten_event_id IS NOT NULL AND eaten_event_id NOT IN (SELECT id FROM consumption_event)');
}

// --------------------------------------------------------------------------- Einkaufsliste

/** Einkaufsliste für einen Zeitraum; bereits gegessene Mahlzeiten zählen nicht mehr. */
export async function shoppingFor(db: Db, from: string, to: string): Promise<ShoppingItem[]> {
  const entries = (await listPlan(db, from, to)).filter((e) => !e.eatenEventId);
  const sources: ShoppingSource[] = [];
  const own = await listRecipes(db);
  for (const e of entries) {
    if (e.source === 'buch') {
      const recipe = findBookRecipe(e.ref);
      if (recipe) sources.push(...bookShopping(recipe, e.portions));
      continue;
    }
    const r = own.find((x) => x.recipeId === e.ref);
    const draft = r ? await loadRecipeDraft(db, r.recipeId) : null;
    if (!r || !draft) continue;
    // Rezept ohne Portionsangabe: eine geplante Portion = das ganze Rezept (vorher immer genau 1 Rezept, Phase 1 Scan).
    const factor = r.portions ? e.portions / r.portions : e.portions;
    for (const ing of draft.ingredients) {
      const food = await getFood(db, ing.foodId);
      if (!food) continue;
      sources.push({ key: `food:${food.id}`, name: food.name, amount: ing.amount * factor, basis: food.basis, basisId: food.catalogId ?? food.catalogOrigin });
    }
  }
  return shoppingList(sources);
}

export async function checkedKeys(db: Db, week: string): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ key: string }>('SELECT key FROM shopping_check WHERE checked = 1 AND key LIKE ?', `${week}|%`);
  return new Set(rows.map((r) => r.key.slice(week.length + 1)));
}

export async function setChecked(db: Db, week: string, key: string, checked: boolean) {
  await db.runAsync(
    `INSERT INTO shopping_check (key, checked, updated_at_utc) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET checked = excluded.checked, updated_at_utc = excluded.updated_at_utc`,
    `${week}|${key}`,
    checked ? 1 : 0,
    nowUtc()
  );
}

export async function resetChecked(db: Db, week: string) {
  await db.runAsync('DELETE FROM shopping_check WHERE key LIKE ?', `${week}|%`);
}

// ----------------------------------------------------------------------------- Rezept-Import

/** Online-Funktionen sind ausgeschaltet (Nutzer oder Anbieter, siehe online.ts). */
export class OnlineDisabledError extends Error {}

/** Webseite laden (mit Zeitlimit). Im Browser verhindern viele Seiten das Laden (CORS) – dann Fehler. */
export async function fetchPage(url: string, timeoutMs = 15_000): Promise<string> {
  if (!onlineAllowed()) throw new OnlineDisabledError();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/html' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Übernommenes Rezept als eigenes Rezept speichern. */
export async function saveImportedRecipe(db: Db, name: string, portions: number | null, ingredients: { foodId: string; amount: number }[]) {
  return saveRecipe(db, null, { name: name.trim() || 'Rezept', endWeightG: null, portions, ingredients });
}
