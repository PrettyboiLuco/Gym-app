// Prüftest (Gutachten 2): Löschen im Tagebuch lässt sich rückgängig machen – gleiche ID, alle Spalten, Wochenplan-Vermerk.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { Db } from '../db';
import { addPlanEntries, listPlan, logPlanEntry } from '../meal-plan';
import { migrate } from '../migrations';
import { deleteEvent, listDay, logCaffeineDrink, restoreEvent } from '../nutrition';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const when = (day: string) => ({ diaryDate: day, at: new Date(`${day}T08:15:00Z`), timeZone: 'America/New_York' });
const row = (id: string) => db.getFirstAsync<Record<string, unknown>>('SELECT * FROM consumption_event WHERE id = ?', id);

describe('Tagebuch: Löschen und Rückgängig', () => {
  test('Eintrag kommt mit gleicher ID und allen Werten zurück (auch Erfassungszeit und Zeitzone)', async () => {
    const id = await logCaffeineDrink(
      db,
      { name: 'Cappuccino', ml: 200, kcal: 80, carbs: 6, sugar: 6, caffeineMg: 75, drinkType: 'kaffee_tee' },
      when('2026-11-03')
    );
    const before = await row(id);
    expect(before).not.toBeNull();

    const deleted = await deleteEvent(db, id);
    expect(deleted).not.toBeNull();
    expect(await row(id)).toBeNull();
    expect(await listDay(db, '2026-11-03')).toHaveLength(0);

    await restoreEvent(db, deleted!);
    expect(await row(id)).toEqual(before);
    expect((await listDay(db, '2026-11-03')).map((e) => e.id)).toEqual([id]);
  });

  test('Gegessen-Vermerk im Wochenplan wird beim Löschen gelöst und beim Rückgängig wieder gesetzt', async () => {
    await addPlanEntries(db, [{ day: '2026-11-02', meal: 'mittag', source: 'buch', ref: 'a_protein_porridge', name: 'Porridge', portions: 1 }]);
    const [entry] = await listPlan(db, '2026-11-02', '2026-11-08');
    const eventId = await logPlanEntry(db, entry, when('2026-11-02'));

    const deleted = await deleteEvent(db, eventId);
    expect(deleted?.plannedIds).toEqual([entry.id]);
    expect((await listPlan(db, '2026-11-02', '2026-11-08'))[0].eatenEventId).toBeNull();

    await restoreEvent(db, deleted!);
    expect((await listPlan(db, '2026-11-02', '2026-11-08'))[0].eatenEventId).toBe(eventId);
  });

  test('Löschen eines unbekannten Eintrags: nichts zum Wiederherstellen', async () => {
    expect(await deleteEvent(db, 'gibt-es-nicht')).toBeNull();
  });
});
