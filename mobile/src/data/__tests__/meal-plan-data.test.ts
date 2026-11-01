// A9: Plan speichern, als gegessen eintragen, Einkaufsliste aus Buch- und eigenen Rezepten, Häkchen, Import speichern.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { BASIS_FOODS } from '@/domain/basis-foods-data';

import { syncBasisFoods } from '../basis-foods';
import type { Db } from '../db';
import {
  addPlanEntries,
  checkedKeys,
  cleanEatenLinks,
  listPlan,
  logPlanEntry,
  planNutrients,
  resetChecked,
  saveImportedRecipe,
  setChecked,
  shoppingFor,
} from '../meal-plan';
import { migrate } from '../migrations';
import { deleteEvent, listDay, saveFood } from '../nutrition';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const when = (day: string) => ({ diaryDate: day, at: new Date(`${day}T12:00:00Z`), timeZone: 'Europe/Berlin' });

describe('Wochenplan', () => {
  test('planen, eintragen, gelöschter Eintrag gibt den Plan frei', async () => {
    await addPlanEntries(db, [{ day: '2026-11-02', meal: 'fruehstueck', source: 'buch', ref: 'a_protein_porridge', name: 'Porridge', portions: 1 }]);
    let [entry] = await listPlan(db, '2026-11-02', '2026-11-08');
    expect(entry).toMatchObject({ meal: 'fruehstueck', eatenEventId: null });
    const n = await planNutrients(db, [entry]);
    expect(n.get(entry.id)?.kcal).toBeGreaterThan(0);
    const eventId = await logPlanEntry(db, entry, when('2026-11-02'));
    expect((await listDay(db, '2026-11-02'))[0]).toMatchObject({ id: eventId, unit: 'portion', meal: 'fruehstueck' });
    [entry] = await listPlan(db, '2026-11-02', '2026-11-08');
    expect(entry.eatenEventId).toBe(eventId);
    await deleteEvent(db, eventId);
    await cleanEatenLinks(db);
    [entry] = await listPlan(db, '2026-11-02', '2026-11-08');
    expect(entry.eatenEventId).toBeNull();
  });
});

describe('Einkaufsliste', () => {
  test('Buch- und eigene Rezepte zusammengefasst; Gegessenes zählt nicht; Häkchen je Woche', async () => {
    await syncBasisFoods(db, BASIS_FOODS, 1);
    const oats = (await db.getFirstAsync<{ id: string }>("SELECT id FROM food WHERE catalog_id = 'usda-08120'"))!.id;
    const own = await saveImportedRecipe(db, 'Overnight Oats', 2, [{ foodId: oats, amount: 160 }]);
    const recipeId = own;
    await addPlanEntries(db, [
      { day: '2026-11-03', meal: 'fruehstueck', source: 'buch', ref: 'a_protein_porridge', name: 'Porridge', portions: 1 },
      { day: '2026-11-04', meal: 'fruehstueck', source: 'eigen', ref: recipeId, name: 'Overnight Oats', portions: 1 },
    ]);
    const items = await shoppingFor(db, '2026-11-02', '2026-11-08');
    const oatItem = items.find((i) => i.name.startsWith('Haferflocken'))!;
    // Porridge (Buch) + 80 g aus dem eigenen Rezept, gleiche Grundzutat → eine Zeile
    expect(items.filter((i) => i.name.startsWith('Haferflocken'))).toHaveLength(1);
    expect(oatItem.amount).toBeGreaterThanOrEqual(80);
    expect(oatItem.department).toBe('trocken');

    const [first] = await listPlan(db, '2026-11-03', '2026-11-03');
    await logPlanEntry(db, first, when('2026-11-03'));
    const after = await shoppingFor(db, '2026-11-02', '2026-11-08');
    expect(after.find((i) => i.name.startsWith('Haferflocken'))!.amount).toBe(80);

    await setChecked(db, '2026-11-02', oatItem.key, true);
    expect([...(await checkedKeys(db, '2026-11-02'))]).toEqual([oatItem.key]);
    expect((await checkedKeys(db, '2026-11-09')).size).toBe(0);
    await resetChecked(db, '2026-11-02');
    expect((await checkedKeys(db, '2026-11-02')).size).toBe(0);
  });

  test('eigenes Lebensmittel ohne Grundnahrungsmittel landet unter Sonstiges', async () => {
    const id = await saveFood(db, null, {
      name: 'Proteinpulver Vanille',
      brand: 'X',
      barcode: null,
      basis: 'g',
      per100: { kcal: 380, protein: 75, carbs: 8, fat: 6, fiber: 0 },
      servingAmount: 30,
    });
    const r = await saveImportedRecipe(db, 'Shake', 1, [{ foodId: id, amount: 30 }]);
    await addPlanEntries(db, [{ day: '2026-11-05', meal: 'snack', source: 'eigen', ref: r, name: 'Shake', portions: 2 }]);
    expect(await shoppingFor(db, '2026-11-05', '2026-11-05')).toEqual([
      expect.objectContaining({ name: 'Proteinpulver Vanille', amount: 60, department: 'sonstiges' }),
    ]);
  });
});
