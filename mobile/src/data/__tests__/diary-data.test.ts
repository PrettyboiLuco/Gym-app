// Tagebuch-Ausbau B1 mit echter SQLite: Migration 27 (alte Daten bleiben), Kopieren auf Tage, Mehrfachauswahl,
// Uhrzeit ändern, Befinden je Mahlzeit, Fasten-Timer, Sicherung/Wiederherstellung und CSV der neuen Daten.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { BACKUP_TABLES } from '@/domain/backup';

import { exportBackup, restoreBackup } from '../backup';
import type { Db } from '../db';
import { buildCsv } from '../export-csv';
import { currentFast, deleteFast, listFasts, loadFastingSettings, saveFastingSettings, startFast, stopFast } from '../fasting';
import { loadDayFeelings, saveMealFeeling } from '../meal-feeling';
import { MIGRATIONS, migrate } from '../migrations';
import {
  copyEventsToDays,
  daySums,
  getEvent,
  listDay,
  loadRecentDrinks,
  loggedMeals,
  logFoods,
  logQuick,
  rememberDrink,
  saveFood,
  updateEvent,
} from '../nutrition';
import { loadReminders, saveReminders } from '../reminders';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const TZ = 'Europe/Berlin';
const at = (day: string, hour: number, minute = 0) => {
  const d = new Date(`${day}T00:00:00`);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const quick = (kcal: number) => ({ name: 'Müsli', kcal, protein: 10, carbs: null, fat: null });

describe('Migration 27', () => {
  test('alte Daten bleiben erhalten, neue Tabellen sind leer und in der Sicherung', async () => {
    const old = createTestDb();
    await old.execAsync('PRAGMA foreign_keys = ON;');
    for (let v = 0; v < 26; v++) await old.execAsync(MIGRATIONS[v]);
    await old.execAsync('PRAGMA user_version = 26');
    await logQuick(old, quick(400), 'fruehstueck', { diaryDate: '2026-11-01', at: at('2026-11-01', 8), timeZone: TZ });
    await old.runAsync("INSERT INTO diary_day (day, incomplete, updated_at_utc) VALUES ('2026-11-01', 1, 'x')");
    await old.runAsync('INSERT INTO app_state (key, value) VALUES (\'reminders\', \'{"drink":{"enabled":true}}\')');
    const before = await old.getAllAsync('SELECT * FROM consumption_event');
    await migrate(old);
    expect((await old.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(MIGRATIONS.length);
    expect(await old.getAllAsync('SELECT * FROM consumption_event')).toEqual(before);
    expect(await old.getAllAsync('SELECT day, incomplete FROM diary_day')).toEqual([{ day: '2026-11-01', incomplete: 1 }]);
    // Alte Erinnerungs-Einstellungen ohne Mahlzeiten: Vorgaben ergänzt, nichts eingeschaltet.
    const r = await loadReminders(old);
    expect(r.drink.enabled).toBe(true);
    expect(Object.values(r.meals).every((m) => !m.enabled)).toBe(true);
    expect(await old.getAllAsync('SELECT * FROM meal_feeling')).toEqual([]);
    expect(await old.getAllAsync('SELECT * FROM fasting_period')).toEqual([]);
    expect(BACKUP_TABLES).toEqual(expect.arrayContaining(['meal_feeling', 'fasting_period']));
    old.close();
  });

  test('CHECK-Grenzen der neuen Tabellen', async () => {
    await expect(
      db.runAsync("INSERT INTO meal_feeling (id, day, meal, hunger, updated_at_utc) VALUES ('x', '2026-11-03', 'mittag', 6, 'x')")
    ).rejects.toThrow();
    await expect(db.runAsync("INSERT INTO meal_feeling (id, day, meal, updated_at_utc) VALUES ('x', '2026-11-03', 'brunch', 'x')")).rejects.toThrow();
    await expect(startFast(db, 60)).rejects.toThrow();
  });
});

describe('Kopieren auf mehrere Tage (W5)', () => {
  test('auf vergangene und kommende Tage, Uhrzeit und Mahlzeit bleiben, in einer Transaktion', async () => {
    const id = await logQuick(db, quick(500), 'fruehstueck', { diaryDate: '2026-11-03', at: at('2026-11-03', 7, 30), timeZone: TZ });
    const count = await copyEventsToDays(db, [id], ['2026-11-01', '2026-11-05', '2026-11-03', '2026-11-05', '2026-11-06'], TZ);
    expect(count).toBe(3);
    for (const day of ['2026-11-01', '2026-11-05', '2026-11-06']) {
      const [e] = await listDay(db, day);
      const when = new Date(e.occurredAt);
      expect([e.meal, e.kcal, when.getDate(), when.getHours(), when.getMinutes()]).toEqual(['fruehstueck', 500, Number(day.slice(8)), 7, 30]);
    }
    expect(await listDay(db, '2026-11-03')).toHaveLength(1);
  });

  test('geplante Einträge verfälschen keine vergangene Woche', async () => {
    await logQuick(db, quick(2000), 'mittag', { diaryDate: '2026-11-02', at: at('2026-11-02', 12), timeZone: TZ });
    const id = await logQuick(db, quick(900), 'abend', { diaryDate: '2026-11-03', at: at('2026-11-03', 19), timeZone: TZ });
    const before = await daySums(db, '2026-10-27', '2026-11-03');
    await copyEventsToDays(db, [id], ['2026-11-04', '2026-11-05', '2026-11-10'], TZ);
    // Check-in, Verbrauchsschätzung und Woche lesen Tage bis heute bzw. gestern – dort ändert sich nichts.
    expect(await daySums(db, '2026-10-27', '2026-11-03')).toEqual(before);
    // Am Tag selbst zählt der Eintrag wie jeder andere.
    expect((await daySums(db, '2026-11-04', '2026-11-04'))[0]).toMatchObject({ kcal: 900, entries: 1 });
  });

  test('unbekannte Einträge werden übersprungen', async () => {
    expect(await copyEventsToDays(db, ['gibt-es-nicht'], ['2026-11-05'], TZ)).toBe(0);
  });
});

describe('Mehrfachauswahl, Uhrzeit, Erinnerungs-Grundlage', () => {
  test('mehrere Lebensmittel auf einmal eintragen', async () => {
    const draft = (name: string) => ({
      name,
      brand: null,
      barcode: null,
      basis: 'g' as const,
      servingAmount: null,
      per100: { kcal: 100, protein: 1, carbs: 1, fat: 1, fiber: null },
    });
    const a = await saveFood(db, null, draft('Apfel'));
    const b = await saveFood(db, null, draft('Birne'));
    const ids = await logFoods(
      db,
      [
        { foodId: a, amount: 150 },
        { foodId: b, amount: 100 },
      ],
      { kind: 'essen', meal: 'snack' },
      { diaryDate: '2026-11-03', at: at('2026-11-03', 15), timeZone: TZ }
    );
    expect(ids).toHaveLength(2);
    expect((await listDay(db, '2026-11-03')).map((e) => [e.name, e.kcal])).toEqual([
      ['Apfel', 150],
      ['Birne', 100],
    ]);
    await expect(
      logFoods(
        db,
        [
          { foodId: a, amount: 1 },
          { foodId: 'fehlt', amount: 1 },
        ],
        { kind: 'essen', meal: 'snack' },
        { diaryDate: '2026-11-04', at: at('2026-11-04', 15), timeZone: TZ }
      )
    ).rejects.toThrow();
    // Alles oder nichts.
    expect(await listDay(db, '2026-11-04')).toEqual([]);
  });

  test('Uhrzeit ändern; Tageswechsel behält die Uhrzeit', async () => {
    const id = await logQuick(db, quick(300), 'mittag', { diaryDate: '2026-11-03', at: at('2026-11-03', 12), timeZone: TZ });
    await updateEvent(db, id, { amount: 1, meal: 'mittag', diaryDate: '2026-11-03', occurredAt: at('2026-11-03', 13, 45) });
    expect(new Date((await getEvent(db, id))!.occurredAt).getHours()).toBe(13);
    await updateEvent(db, id, { amount: 2, meal: 'abend', diaryDate: '2026-11-04' });
    const moved = (await getEvent(db, id))!;
    expect([moved.diaryDate, moved.meal, moved.kcal, new Date(moved.occurredAt).getDate(), new Date(moved.occurredAt).getMinutes()]).toEqual([
      '2026-11-04',
      'abend',
      600,
      4,
      45,
    ]);
  });

  test('Tage und Mahlzeiten mit Einträgen (für Mahlzeit-Erinnerungen); Getränke zählen nicht', async () => {
    await logQuick(db, quick(300), 'mittag', { diaryDate: '2026-11-03', at: at('2026-11-03', 12), timeZone: TZ });
    await logQuick(db, quick(300), 'fruehstueck', { diaryDate: '2026-11-05', at: at('2026-11-05', 8), timeZone: TZ });
    await db.runAsync(
      `INSERT INTO consumption_event (id, kind, drink_type, name, amount, unit, occurred_at_utc, recorded_at_utc, time_zone, utc_offset_min, diary_date)
       VALUES ('w', 'getraenk', 'wasser', 'Wasser', 250, 'ml', 'x', 'x', 'x', 60, '2026-11-03')`
    );
    expect([...(await loggedMeals(db, '2026-11-03', '2026-11-10'))].sort()).toEqual(['2026-11-03|mittag', '2026-11-05|fruehstueck']);
  });

  test('zuletzt genutzte Getränke', async () => {
    await rememberDrink(db, 'kaffee');
    await rememberDrink(db, 'tee');
    await rememberDrink(db, 'kaffee');
    expect(await loadRecentDrinks(db)).toEqual(['kaffee', 'tee']);
  });
});

describe('Befinden je Mahlzeit (W10)', () => {
  test('speichern, ändern, leer = entfernen', async () => {
    await saveMealFeeling(db, '2026-11-03', 'mittag', { hunger: 4, fullness: null, mood: 3 });
    await saveMealFeeling(db, '2026-11-03', 'mittag', { hunger: 4, fullness: 3, mood: 3 });
    expect(await loadDayFeelings(db, '2026-11-03')).toEqual({ mittag: { hunger: 4, fullness: 3, mood: 3 } });
    await saveMealFeeling(db, '2026-11-03', 'mittag', { hunger: null, fullness: null, mood: null });
    expect(await loadDayFeelings(db, '2026-11-03')).toEqual({});
  });
});

describe('Fasten-Timer (W8)', () => {
  test('aus als Standard, Start, Stopp, ein laufendes Fenster, Verlauf', async () => {
    expect(await loadFastingSettings(db)).toEqual({ enabled: false, hours: 16, notify: true });
    await saveFastingSettings(db, { enabled: true, hours: 14, notify: false });
    expect((await loadFastingSettings(db)).hours).toBe(14);
    const first = await startFast(db, 16, new Date('2026-11-02T19:00:00Z'));
    // Neuer Start beendet das laufende Fenster.
    const second = await startFast(db, 14, new Date('2026-11-03T20:00:00Z'));
    expect((await currentFast(db))?.id).toBe(second);
    await stopFast(db, second, new Date('2026-11-04T10:30:00Z'));
    expect(await currentFast(db)).toBeNull();
    const history = await listFasts(db);
    expect(history.map((p) => [p.id, p.endedAt])).toEqual([
      [second, '2026-11-04T10:30:00.000Z'],
      [first, '2026-11-03T20:00:00.000Z'],
    ]);
    // Ende nie vor dem Start.
    const third = await startFast(db, 12, new Date('2026-11-05T20:00:00Z'));
    await stopFast(db, third, new Date('2026-11-05T19:00:00Z'));
    expect((await listFasts(db))[0]).toMatchObject({ id: third, endedAt: '2026-11-05T20:00:00.000Z' });
    await deleteFast(db, first);
    expect(await listFasts(db)).toHaveLength(2);
  });
});

describe('Sicherung und CSV', () => {
  test('neue Daten kommen in die Sicherung und zurück; CSV je Bereich', async () => {
    await saveMealFeeling(db, '2026-11-03', 'abend', { hunger: 2, fullness: 4, mood: 5 });
    const id = await startFast(db, 16, new Date('2026-11-02T19:00:00Z'));
    await stopFast(db, id, new Date('2026-11-03T11:30:00Z'));
    await saveFastingSettings(db, { enabled: true, hours: 16, notify: true });
    await saveReminders(db, { ...(await loadReminders(db)), meals: { ...(await loadReminders(db)).meals, mittag: { enabled: true, time: '13:15' } } });
    const backup = JSON.parse(JSON.stringify(await exportBackup(db, null)));
    expect(backup.tables.meal_feeling).toHaveLength(1);
    expect(backup.tables.fasting_period).toHaveLength(1);

    const target = createTestDb();
    await migrate(target);
    await restoreBackup(target, backup);
    expect(await loadDayFeelings(target, '2026-11-03')).toEqual({ abend: { hunger: 2, fullness: 4, mood: 5 } });
    expect((await listFasts(target))[0]).toMatchObject({ id, plannedHours: 16, endedAt: '2026-11-03T11:30:00.000Z' });
    expect((await loadFastingSettings(target)).enabled).toBe(true);
    expect((await loadReminders(target)).meals.mittag).toEqual({ enabled: true, time: '13:15' });
    target.close();

    const feeling = await buildCsv(db, 'befinden');
    expect(feeling).toContain('Hunger (1–5)');
    expect(feeling).toContain('2026-11-03;Abendessen;2;4;5');
    const fasting = await buildCsv(db, 'fasten');
    expect(fasting).toContain('Geplant (h)');
    expect(fasting).toContain(';16;16,5');
  });
});
