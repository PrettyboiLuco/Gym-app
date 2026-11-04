// Prüftest (Ernährung UI 3): „Zuletzt gegessen“ im Hinzufügen-Bildschirm, ein Tipp trägt erneut ein, „Wie gestern“ mit Rückgängig.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { FoodDraft } from '@/domain/nutrition';

import type { Db } from '../db';
import { migrate } from '../migrations';
import { archiveFood, copyMealEntries, listDay, logFood, logItems, logQuick, logWater, recentEntries, removeEvents, saveFood } from '../nutrition';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const when = (day = '2026-11-03', time = '08:15') => ({ diaryDate: day, at: new Date(`${day}T${time}:00Z`), timeZone: 'Europe/Berlin' });
const oats: FoodDraft = {
  name: 'Haferflocken',
  brand: null,
  barcode: null,
  basis: 'g',
  per100: { kcal: 370, protein: 13, carbs: 59, fat: 7, fiber: 10 },
  servingAmount: 40,
};
const skyr: FoodDraft = {
  name: 'Skyr',
  brand: 'Hof',
  barcode: null,
  basis: 'g',
  per100: { kcal: 63, protein: 11, carbs: 4, fat: 0.2, fiber: 0 },
  servingAmount: 150,
};
const juice: FoodDraft = {
  name: 'Apfelsaft',
  brand: null,
  barcode: null,
  basis: 'ml',
  per100: { kcal: 40, protein: 0, carbs: 10, fat: 0, fiber: 0 },
  servingAmount: null,
};
const breakfast = { kind: 'essen', meal: 'fruehstueck' } as const;

describe('Zuletzt gegessen', () => {
  test('jedes Lebensmittel und jeder Schnelleintrag nur einmal, neueste zuerst, mit der letzten Menge', async () => {
    const o = await saveFood(db, null, oats);
    const s = await saveFood(db, null, skyr);
    await logFood(db, o, 40, breakfast, when('2026-11-01'));
    await logQuick(db, { name: 'Kantine', kcal: 650, protein: null, carbs: null, fat: null }, 'mittag', when('2026-11-01'));
    await logFood(db, s, 150, breakfast, when('2026-11-02'));
    await logFood(db, o, 60, breakfast, when('2026-11-03'));
    await logQuick(db, { name: 'kantine ', kcal: 700, protein: null, carbs: null, fat: null }, 'mittag', when('2026-11-03'));

    const recent = await recentEntries(db);
    expect(recent.map((r) => [r.name.trim(), r.amount, r.unit])).toEqual([
      ['kantine', 1, 'portion'],
      ['Haferflocken', 60, 'g'],
      ['Skyr', 150, 'g'],
    ]);
    expect(recent[1]).toMatchObject({ foodId: o, kcal: 222 });
    expect(recent[0].foodId).toBeNull();
  });

  test('höchstens so viele wie verlangt; archivierte Lebensmittel fehlen', async () => {
    const o = await saveFood(db, null, oats);
    const s = await saveFood(db, null, skyr);
    await logFood(db, o, 40, breakfast, when());
    await logFood(db, s, 150, breakfast, when());
    for (let i = 0; i < 12; i++) await logQuick(db, { name: `Snack ${i}`, kcal: 100 + i, protein: null, carbs: null, fat: null }, 'snack', when());
    expect(await recentEntries(db)).toHaveLength(10);
    await archiveFood(db, s);
    expect((await recentEntries(db, 'essen', 50)).map((r) => r.name)).not.toContain('Skyr');
  });

  test('Getränke nur mit Lebensmittel (Wasser hat eigene Knöpfe), Essen getrennt von Getränken', async () => {
    const j = await saveFood(db, null, juice);
    await logWater(db, 250, when(), 'Wasser');
    await logFood(db, j, 200, { kind: 'getraenk', drinkType: 'saft' }, when());
    await logQuick(db, { name: 'Brezel', kcal: 220, protein: null, carbs: null, fat: null }, 'snack', when());
    expect((await recentEntries(db, 'getraenk')).map((r) => r.name)).toEqual(['Apfelsaft']);
    expect((await recentEntries(db, 'essen')).map((r) => r.name)).toEqual(['Brezel']);
  });

  test('ein Tipp trägt mit derselben Menge ein: Lebensmittel mit aktuellen Werten, Schnelleintrag als Kopie', async () => {
    const o = await saveFood(db, null, oats);
    await logFood(db, o, 60, breakfast, when('2026-11-02'));
    await logQuick(db, { name: 'Kantine', kcal: 650, protein: 30, carbs: null, fat: null }, 'mittag', when('2026-11-02'));
    await saveFood(db, o, { ...oats, per100: { ...oats.per100, kcal: 400 } });
    const [quick, food] = await recentEntries(db);

    const ids = await logItems(db, [{ eventId: food.eventId }, { eventId: quick.eventId }, { foodId: o, amount: 40 }], breakfast, when());
    expect(ids).toHaveLength(3);
    const today = await listDay(db, '2026-11-03');
    expect(today.map((e) => [e.name, e.amount, e.kcal, e.meal])).toEqual([
      ['Haferflocken', 60, 240, 'fruehstueck'],
      ['Kantine', 1, 650, 'fruehstueck'],
      ['Haferflocken', 40, 160, 'fruehstueck'],
    ]);
    expect(today[1]).toMatchObject({ foodId: null, protein: 30, carbs: null });
  });

  test('Eintrag eines archivierten Lebensmittels wird als Kopie eingetragen', async () => {
    const o = await saveFood(db, null, oats);
    const id = await logFood(db, o, 50, breakfast, when('2026-11-02'));
    await archiveFood(db, o);
    await logItems(db, [{ eventId: id }], breakfast, when());
    expect((await listDay(db, '2026-11-03'))[0]).toMatchObject({ name: 'Haferflocken', amount: 50, kcal: 185 });
  });
});

describe('Wie gestern mit Rückgängig', () => {
  test('kopiert die Mahlzeit vom Vortag und nimmt genau diese Einträge wieder zurück', async () => {
    const o = await saveFood(db, null, oats);
    await logFood(db, o, 40, breakfast, when('2026-11-02'));
    await logQuick(db, { name: 'Kaffee mit Milch', kcal: 40, protein: null, carbs: null, fat: null }, 'fruehstueck', when('2026-11-02'));
    const own = await logFood(db, o, 10, { kind: 'essen', meal: 'mittag' }, when());

    const ids = await copyMealEntries(db, '2026-11-02', 'fruehstueck', when());
    expect(ids).toHaveLength(2);
    expect((await listDay(db, '2026-11-03')).filter((e) => e.meal === 'fruehstueck').map((e) => e.name)).toEqual(['Haferflocken', 'Kaffee mit Milch']);

    await removeEvents(db, ids);
    expect((await listDay(db, '2026-11-03')).map((e) => e.id)).toEqual([own]);
    expect(await listDay(db, '2026-11-02')).toHaveLength(2);
  });

  test('leere Mahlzeit am Vortag: nichts kopiert', async () => {
    expect(await copyMealEntries(db, '2026-11-02', 'abend', when())).toEqual([]);
    await removeEvents(db, []);
  });
});
