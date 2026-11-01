// Ernährung schneller (A3): Migration 21, Schnelleintrag, Koffein, ganzer Tag kopieren, neue Nährwerte im Schnappschuss.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { Db } from '../db';
import { MIGRATIONS, migrate } from '../migrations';
import {
  copyDay,
  getFood,
  listDay,
  loadNutritionSettings,
  logCaffeineDrink,
  logFood,
  logQuick,
  saveFood,
  saveNutritionSettings,
  updateEvent,
} from '../nutrition';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const when = (day: string) => ({ diaryDate: day, at: new Date(`${day}T12:00:00Z`), timeZone: 'Europe/Berlin' });

describe('A3 Daten', () => {
  test('Migration 21 behält alte Einträge (neue Werte unbekannt)', async () => {
    const old = createTestDb();
    await old.execAsync('PRAGMA foreign_keys = ON;');
    for (let v = 0; v < 20; v++) await old.execAsync(MIGRATIONS[v]);
    await old.execAsync('PRAGMA user_version = 20');
    await old.runAsync(
      `INSERT INTO consumption_event (id, kind, meal, name, amount, unit, kcal, protein, carbs, fat, occurred_at_utc, recorded_at_utc, time_zone, utc_offset_min, diary_date)
       VALUES ('e1', 'essen', 'mittag', 'Alt', 100, 'g', 200, 10, 20, 5, '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z', 'Europe/Berlin', 120, '2026-10-01')`
    );
    await migrate(old);
    const [e] = await listDay(old, '2026-10-01');
    expect(e).toMatchObject({ kcal: 200, sugar: null, salt: null, caffeineMg: null });
    old.close();
  });

  test('Lebensmittel mit Zucker, Salz, Packung und Koffein; Eintrag rechnet mit, Mengenänderung skaliert', async () => {
    const id = await saveFood(db, null, {
      name: 'Cola',
      brand: null,
      barcode: null,
      basis: 'ml',
      per100: { kcal: 42, protein: 0, carbs: 10.6, fat: 0, fiber: 0, sugar: 10.6, satFat: 0, salt: 0.01 },
      servingAmount: 330,
      packageAmount: 1000,
      caffeine: 10,
    });
    expect(await getFood(db, id)).toMatchObject({ sugar: 10.6, packageAmount: 1000, caffeine: 10 });
    const eventId = await logFood(db, id, 330, { kind: 'getraenk', drinkType: 'softdrink' }, when('2026-11-01'));
    let [e] = await listDay(db, '2026-11-01');
    expect(e.sugar).toBeCloseTo(34.98, 2);
    expect(e.caffeineMg).toBeCloseTo(33, 5);
    await updateEvent(db, eventId, { amount: 660, meal: null, diaryDate: '2026-11-01' });
    [e] = await listDay(db, '2026-11-01');
    expect(e.caffeineMg).toBeCloseTo(66, 5);
    expect(e.sugar).toBeCloseTo(69.96, 2);
  });

  test('Schnelleintrag, Koffein-Getränk und ganzen Tag kopieren', async () => {
    await logQuick(db, { name: 'Kantine', kcal: 850, protein: 40, carbs: null, fat: null }, 'mittag', when('2026-11-01'));
    await logCaffeineDrink(db, { name: 'Espresso', ml: 40, kcal: 1, carbs: 0, sugar: 0, caffeineMg: 55, drinkType: 'kaffee_tee' }, when('2026-11-01'));
    const day = await listDay(db, '2026-11-01');
    expect(day.map((e) => [e.name, e.kcal, e.unit])).toEqual(
      expect.arrayContaining([
        ['Kantine', 850, 'portion'],
        ['Espresso', 1, 'ml'],
      ])
    );
    expect(day.find((e) => e.name === 'Kantine')?.carbs).toBeNull();
    expect(await copyDay(db, '2026-11-01', when('2026-11-02'))).toBe(2);
    const copied = await listDay(db, '2026-11-02');
    expect(copied.map((e) => e.name).sort()).toEqual(['Espresso', 'Kantine']);
    expect(copied.find((e) => e.name === 'Espresso')).toMatchObject({ kind: 'getraenk', caffeineMg: 55 });
  });

  test('Tagesgrenze wird gespeichert', async () => {
    await saveNutritionSettings(db, { ...(await loadNutritionSettings(db)), dayEndsAt: 4 });
    expect((await loadNutritionSettings(db)).dayEndsAt).toBe(4);
  });
});
