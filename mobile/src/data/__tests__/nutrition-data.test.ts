// Ernährung in der echten Datenbank: übernimmt die Referenztests T-001–T-009, T-012–T-016,
// T-018 und T-024 sowie die Abnahmekriterien aus Kapitel 16 des Plans.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { FoodDraft } from '@/domain/nutrition';

import type { Db } from '../db';
import { migrate } from '../migrations';
import {
  archiveFood,
  archiveRecipe,
  copyMeal,
  daySums,
  deleteEvent,
  findFoodByBarcode,
  getFood,
  listDay,
  listFavoriteFoods,
  listRecipes,
  listTemplates,
  loadNutritionSettings,
  logFood,
  logRecipe,
  logTemplate,
  logWater,
  recentFoods,
  saveFood,
  saveNutritionSettings,
  saveRecipe,
  saveTemplateFromMeal,
  searchFoods,
  setFavorite,
  updateEvent,
  type When,
} from '../nutrition';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const when = (diaryDate = '2026-10-29'): When => ({
  diaryDate,
  at: new Date('2026-10-29T10:00:00Z'),
  timeZone: 'Europe/Berlin',
});

const bread: FoodDraft = {
  name: 'Vollkornbrot',
  brand: null,
  barcode: null,
  basis: 'g',
  per100: { kcal: 250, protein: 8, carbs: 40, fat: 3, fiber: null },
  servingAmount: 50,
};
const spread: FoodDraft = {
  name: 'Nuss-Nougat-Creme',
  brand: 'Marke A',
  barcode: '3017620422003',
  basis: 'g',
  per100: { kcal: 539, protein: 6.3, carbs: 57.5, fat: 30.9, fiber: null },
  servingAmount: 15,
};
const juice: FoodDraft = {
  name: 'Apfelsaft',
  brand: null,
  barcode: null,
  basis: 'ml',
  per100: { kcal: 40, protein: null, carbs: 10, fat: 0, fiber: null },
  servingAmount: null,
};

describe('Lebensmittel', () => {
  test('eigenes Produkt speichern, suchen, per Barcode finden (FOOD-001, FOOD-010)', async () => {
    const id = await saveFood(db, null, spread);
    expect((await searchFoods(db, 'nougat'))[0].id).toBe(id);
    expect((await searchFoods(db, 'marke'))[0].id).toBe(id);
    expect((await findFoodByBarcode(db, '3017620422003'))?.id).toBe(id);
  });
  test('Barcode als UPC-A gespeichert, als EAN-13 gescannt (und umgekehrt)', async () => {
    const upc = await saveFood(db, null, { ...spread, barcode: '036000291452' });
    expect((await findFoodByBarcode(db, '0036000291452'))?.id).toBe(upc);
    const ean = await saveFood(db, null, { ...bread, barcode: '0012345678905' });
    expect((await findFoodByBarcode(db, '012345678905'))?.id).toBe(ean);
    expect(await findFoodByBarcode(db, '4006381333931')).toBeNull();
  });
  test('roh und gekocht bleiben getrennt (FOOD-011)', async () => {
    const raw = await saveFood(db, null, { ...bread, name: 'Reis', prep: 'roh', per100: { kcal: 350, protein: 7, carbs: 77, fat: 1, fiber: null } });
    const cooked = await saveFood(db, null, { ...bread, name: 'Reis', prep: 'gekocht', per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: null } });
    expect((await getFood(db, raw))?.prep).toBe('roh');
    expect((await getFood(db, cooked))?.prep).toBe('gekocht');
    expect(await searchFoods(db, 'Reis')).toHaveLength(2);
    expect((await getFood(db, (await saveFood(db, null, bread))))?.prep).toBeNull();
    await logFood(db, raw, 60, { kind: 'essen', meal: 'mittag' }, when());
    expect((await listDay(db, '2026-10-29'))[0]).toMatchObject({ name: 'Reis', prep: 'roh', kcal: 210 });
  });
  test('gleichnamige Produkte werden nicht verschmolzen (FOOD-018)', async () => {
    await saveFood(db, null, bread);
    await saveFood(db, null, { ...bread, brand: 'Bäcker B' });
    expect(await searchFoods(db, 'Vollkornbrot')).toHaveLength(2);
  });
  test('entferntes Lebensmittel verschwindet aus Listen, alte Einträge bleiben', async () => {
    const id = await saveFood(db, null, spread);
    await setFavorite(db, id, true);
    await logFood(db, id, 15, { kind: 'essen', meal: 'fruehstueck' }, when());
    await archiveFood(db, id);
    expect(await searchFoods(db, 'nougat')).toEqual([]);
    expect(await listFavoriteFoods(db)).toEqual([]);
    expect(await recentFoods(db)).toEqual([]);
    expect(await findFoodByBarcode(db, '3017620422003')).toBeNull();
    expect((await listDay(db, '2026-10-29'))[0]).toMatchObject({ name: 'Nuss-Nougat-Creme' });
  });
  test('Favoriten', async () => {
    const id = await saveFood(db, null, bread);
    await setFavorite(db, id, true);
    expect((await listFavoriteFoods(db)).map((f) => f.id)).toEqual([id]);
  });
  test('leerer Name wird abgelehnt', async () => {
    await expect(saveFood(db, null, { ...bread, name: '  ' })).rejects.toThrow();
  });
});

describe('Tagebuch', () => {
  test('60 g bei 250 kcal/100 g ergibt 150 kcal (T-001)', async () => {
    const id = await saveFood(db, null, bread);
    await logFood(db, id, 60, { kind: 'essen', meal: 'fruehstueck' }, when());
    expect((await listDay(db, '2026-10-29'))[0].kcal).toBe(150);
  });
  test('unbekannter Nährwert bleibt im Eintrag unbekannt (T-003)', async () => {
    const id = await saveFood(db, null, juice);
    await logFood(db, id, 250, { kind: 'getraenk', drinkType: 'saft' }, when());
    expect((await listDay(db, '2026-10-29'))[0].protein).toBeNull();
  });
  test('Katalogänderung verändert alte Einträge nicht (T-016, FOOD-012)', async () => {
    const id = await saveFood(db, null, bread);
    await logFood(db, id, 100, { kind: 'essen', meal: 'mittag' }, when());
    await saveFood(db, id, { ...bread, per100: { ...bread.per100, kcal: 300 } });
    expect((await listDay(db, '2026-10-29'))[0].kcal).toBe(250);
    await logFood(db, id, 100, { kind: 'essen', meal: 'mittag' }, when());
    expect((await listDay(db, '2026-10-29'))[1].kcal).toBe(300);
  });
  test('Nachtrag für gestern bleibt am gewählten Tag (T-018, TIME-001)', async () => {
    const id = await saveFood(db, null, bread);
    await logFood(db, id, 50, { kind: 'essen', meal: 'abend' }, when('2026-10-28'));
    expect(await listDay(db, '2026-10-28')).toHaveLength(1);
    expect(await listDay(db, '2026-10-29')).toHaveLength(0);
  });
  test('Getränk 250 ml bei 40 kcal/100 ml: genau einmal 100 kcal und 250 ml (T-012, TIME-005)', async () => {
    const id = await saveFood(db, null, juice);
    await logFood(db, id, 250, { kind: 'getraenk', drinkType: 'saft' }, when());
    const day = await listDay(db, '2026-10-29');
    expect(day).toHaveLength(1);
    expect(day[0]).toMatchObject({ kind: 'getraenk', amount: 250, unit: 'ml', kcal: 100 });
  });
  test('Menge auf 500 ml ändern ergibt einmal 200 kcal (T-013, TIME-006)', async () => {
    const food = await saveFood(db, null, juice);
    const id = await logFood(db, food, 250, { kind: 'getraenk', drinkType: 'saft' }, when());
    await updateEvent(db, id, { amount: 500, meal: null, diaryDate: '2026-10-29' });
    const day = await listDay(db, '2026-10-29');
    expect(day).toHaveLength(1);
    expect(day[0]).toMatchObject({ amount: 500, kcal: 200 });
  });
  test('Löschen entfernt den Eintrag aus beiden Ansichten (T-024)', async () => {
    const food = await saveFood(db, null, juice);
    const id = await logFood(db, food, 250, { kind: 'getraenk', drinkType: 'saft' }, when());
    await deleteEvent(db, id);
    expect(await listDay(db, '2026-10-29')).toHaveLength(0);
  });
  test('Wasser zählt 0 kcal', async () => {
    await logWater(db, 330, when(), 'Wasser');
    expect((await listDay(db, '2026-10-29'))[0]).toMatchObject({ drinkType: 'wasser', kcal: 0, amount: 330 });
  });
  test('Mahlzeit auf anderen Tag verschieben', async () => {
    const food = await saveFood(db, null, bread);
    const id = await logFood(db, food, 50, { kind: 'essen', meal: 'abend' }, when());
    await updateEvent(db, id, { amount: 50, meal: 'snack', diaryDate: '2026-10-28' });
    expect((await listDay(db, '2026-10-28'))[0].meal).toBe('snack');
  });
  test('Menge 0 wird abgelehnt', async () => {
    const food = await saveFood(db, null, bread);
    await expect(logFood(db, food, 0, { kind: 'essen', meal: 'abend' }, when())).rejects.toThrow();
  });
  test('Zuletzt gegessen', async () => {
    const a = await saveFood(db, null, bread);
    await logFood(db, a, 50, { kind: 'essen', meal: 'abend' }, when());
    expect((await recentFoods(db)).map((f) => f.id)).toEqual([a]);
  });
  test('Wie gestern: Mahlzeit kopieren', async () => {
    const a = await saveFood(db, null, bread);
    await logFood(db, a, 50, { kind: 'essen', meal: 'fruehstueck' }, when('2026-10-28'));
    expect(await copyMeal(db, '2026-10-28', 'fruehstueck', when('2026-10-29'))).toBe(1);
    expect((await listDay(db, '2026-10-29'))[0]).toMatchObject({ name: 'Vollkornbrot', kcal: 125 });
  });
  test('Tagessummen für die Woche zählen unbekannte kcal', async () => {
    const a = await saveFood(db, null, bread);
    const b = await saveFood(db, null, { ...juice, per100: { ...juice.per100, kcal: null } });
    await logFood(db, a, 100, { kind: 'essen', meal: 'mittag' }, when());
    await logFood(db, b, 200, { kind: 'getraenk', drinkType: 'saft' }, when());
    expect(await daySums(db, '2026-10-23', '2026-10-29')).toEqual([
      expect.objectContaining({ day: '2026-10-29', kcal: 250, entries: 2, unknownKcal: 1 }),
    ]);
  });
});

describe('Vorlagen („Nutella-Brot“)', () => {
  test('gleiche Vorlage ergibt dieselbe Berechnung (FOOD-013)', async () => {
    const a = await saveFood(db, null, bread);
    const b = await saveFood(db, null, spread);
    await logFood(db, a, 50, { kind: 'essen', meal: 'fruehstueck' }, when('2026-10-28'));
    await logFood(db, b, 20, { kind: 'essen', meal: 'fruehstueck' }, when('2026-10-28'));
    const tpl = await saveTemplateFromMeal(db, 'Nutella-Brot', '2026-10-28', 'fruehstueck');
    expect((await listTemplates(db))[0].items).toHaveLength(2);
    await logTemplate(db, tpl, 'snack', when());
    const before = (await listDay(db, '2026-10-28')).reduce((s, e) => s + (e.kcal ?? 0), 0);
    const after = (await listDay(db, '2026-10-29')).reduce((s, e) => s + (e.kcal ?? 0), 0);
    expect(after).toBeCloseTo(before);
  });
  test('leere Mahlzeit kann keine Vorlage werden', async () => {
    await expect(saveTemplateFromMeal(db, 'Leer', '2026-10-29', 'abend')).rejects.toThrow();
  });
});

describe('Rezepte', () => {
  async function chili(endWeightG: number | null, portions: number | null) {
    const meat = await saveFood(db, null, { ...bread, name: 'Hackfleisch', per100: { kcal: 250, protein: 20, carbs: 0, fat: 18, fiber: null } });
    const beans = await saveFood(db, null, { ...bread, name: 'Bohnen', per100: { kcal: 100, protein: 7, carbs: 15, fat: 1, fiber: null } });
    // 400 g × 250 + 200 g × 100 = 1200 kcal
    return saveRecipe(db, null, {
      name: 'Chili',
      endWeightG,
      portions,
      ingredients: [
        { foodId: meat, amount: 400 },
        { foodId: beans, amount: 200 },
      ],
    });
  }
  test('1200 kcal, 800 g Endgewicht: 200 g ergeben 300 kcal (T-007)', async () => {
    await chili(800, 4);
    const [recipe] = await listRecipes(db);
    expect(recipe.total.kcal).toBe(1200);
    await logRecipe(db, recipe.versionId, { grams: 200 }, 'abend', when());
    expect((await listDay(db, '2026-10-29'))[0].kcal).toBe(300);
  });
  test('1 von 4 Portionen ergibt 300 kcal', async () => {
    await chili(800, 4);
    const [recipe] = await listRecipes(db);
    await logRecipe(db, recipe.versionId, { portions: 1 }, 'abend', when());
    expect((await listDay(db, '2026-10-29'))[0]).toMatchObject({ kcal: 300, amount: 200 });
  });
  test('ohne Endgewicht keine Grammportion (T-008)', async () => {
    await chili(null, 4);
    const [recipe] = await listRecipes(db);
    await expect(logRecipe(db, recipe.versionId, { grams: 200 }, 'abend', when())).rejects.toThrow();
  });
  test('ohne Portionsanzahl keine Portion', async () => {
    await chili(800, null);
    const [recipe] = await listRecipes(db);
    await expect(logRecipe(db, recipe.versionId, { portions: 1 }, 'abend', when())).rejects.toThrow();
  });
  test('Portion ohne Endgewicht wird als Portion gespeichert, nicht als Gramm geraten', async () => {
    await chili(null, 4);
    const [recipe] = await listRecipes(db);
    await logRecipe(db, recipe.versionId, { portions: 2 }, 'abend', when());
    const [entry] = await listDay(db, '2026-10-29');
    expect(entry).toMatchObject({ kcal: 600, amount: 2, unit: 'portion' });
    await updateEvent(db, entry.id, { amount: 1, meal: 'abend', diaryDate: '2026-10-29' });
    expect((await listDay(db, '2026-10-29'))[0]).toMatchObject({ kcal: 300, amount: 1, unit: 'portion' });
  });
  test('entferntes Rezept verschwindet aus der Liste, alte Einträge bleiben', async () => {
    const id = await chili(800, 4);
    const [recipe] = await listRecipes(db);
    await logRecipe(db, recipe.versionId, { portions: 1 }, 'abend', when());
    await archiveRecipe(db, id);
    expect(await listRecipes(db)).toEqual([]);
    expect((await listDay(db, '2026-10-29'))[0]).toMatchObject({ name: 'Chili', kcal: 300 });
  });
  test('Endgewicht 0 wird abgelehnt (T-009)', async () => {
    await expect(chili(0, 4)).rejects.toThrow();
  });
});

describe('Einstellungen', () => {
  test('Standard: 1500 ml Orientierung, Glasgrößen', async () => {
    expect(await loadNutritionSettings(db)).toEqual({
      drinkGoalMl: 1500,
      glassSizes: [200, 250, 330, 500],
      hideNumbers: false,
      allergies: [],
      diet: 'alles',
      mealTimes: { fruehstueck: 7, mittag: 12, abend: 18 },
    });
  });
  test('eigene Vorgabe bleibt erhalten (TIME-010)', async () => {
    await saveNutritionSettings(db, { ...(await loadNutritionSettings(db)), drinkGoalMl: 2000, glassSizes: [300], hideNumbers: true });
    expect((await loadNutritionSettings(db)).drinkGoalMl).toBe(2000);
  });
});
