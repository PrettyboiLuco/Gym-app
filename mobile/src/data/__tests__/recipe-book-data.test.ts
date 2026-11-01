// Rezeptbuch: Portion eintragen und als eigenes Rezept übernehmen.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { BASIS_FOODS } from '@/domain/basis-foods-data';
import { findBookRecipe } from '@/domain/recipe-book';

import { syncBasisFoods } from '../basis-foods';
import type { Db } from '../db';
import { migrate } from '../migrations';
import { listDay, listRecipes, loadRecipeDraft, updateEvent } from '../nutrition';
import { copyBookRecipe, logBookRecipe } from '../recipe-book';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const when = { diaryDate: '2026-11-01', at: new Date('2026-11-01T12:00:00Z'), timeZone: 'Europe/Berlin' };

describe('Rezeptbuch im Tagebuch', () => {
  test('anderthalb Portionen eintragen, danach Menge ändern', async () => {
    const shake = findBookRecipe('m_masse_shake')!;
    const id = await logBookRecipe(db, shake, 1.5, 'snack', when);
    const [entry] = await listDay(db, '2026-11-01');
    expect(entry).toMatchObject({ name: 'Masse-Shake', amount: 1.5, unit: 'portion', meal: 'snack' });
    expect(entry.kcal).toBeCloseTo(shake.perPortion.kcal! * 1.5, 0);
    await updateEvent(db, id, { amount: 1, meal: 'snack', diaryDate: '2026-11-01' });
    const [after] = await listDay(db, '2026-11-01');
    expect(after.kcal).toBeCloseTo(shake.perPortion.kcal!, 0);
  });

  test('übernehmen legt ein eigenes Rezept mit gleichen Nährwerten an, Zutaten werden wiederverwendet', async () => {
    const chili = findBookRecipe('d_chili_light')!;
    const recipeId = await copyBookRecipe(db, chili);
    const [summary] = await listRecipes(db);
    expect(summary).toMatchObject({ recipeId, name: 'Chili con Carne light', portions: 4 });
    expect(summary.total.kcal! / 4).toBeCloseTo(chili.perPortion.kcal!, 0);
    expect((await loadRecipeDraft(db, recipeId))?.ingredients).toHaveLength(chili.ingredients.length);

    const foods = async () => (await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM food WHERE source = 'eigen'"))!.n;
    const before = await foods();
    await copyBookRecipe(db, findBookRecipe('d_bolognese_light')!);
    // Bolognese teilt Hack, Passata, Zwiebel, Tomatenmark mit dem Chili: nur Nudeln und Karotten kommen neu dazu.
    expect((await foods()) - before).toBe(2);
  });

  test('übernehmen nutzt Grundnahrungsmittel (A4.7), Nährwerte bleiben nah am Rezeptbuch', async () => {
    await syncBasisFoods(db, BASIS_FOODS, 1);
    const before = (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM food'))!.n;
    const chili = findBookRecipe('d_chili_light')!;
    const recipeId = await copyBookRecipe(db, chili);
    const draft = (await loadRecipeDraft(db, recipeId))!;
    const linked = await db.getAllAsync<{ catalogId: string | null }>(
      `SELECT catalog_id AS catalogId FROM food WHERE id IN (${draft.ingredients.map(() => '?').join(', ')})`,
      ...draft.ingredients.map((i) => i.foodId)
    );
    expect(linked.every((f) => f.catalogId !== null)).toBe(true);
    expect((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM food'))!.n).toBe(before);
    const [summary] = await listRecipes(db);
    expect(Math.abs(summary.total.kcal! / 4 - chili.perPortion.kcal!) / chili.perPortion.kcal!).toBeLessThan(0.15);
  });
});
