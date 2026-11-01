// A10: Migration 26 behält Maße, neue Stellen, Ziele für Maße, Blutdruck, Meilensteine aus der Datenbank.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { addBloodPressure, deleteBloodPressure, listBloodPressure } from '../blood-pressure';
import type { Db } from '../db';
import { addMeasurements, listMeasurements, loadMeasureGoals, saveMeasureGoals } from '../goals';
import { MIGRATIONS, migrate } from '../migrations';
import { loadMotivation, markMilestonesSeen, saveBalanceOn } from '../motivation';
import { createTestDb } from '../testing/node-db';
import { savePreferredWeekdays } from '../training-stats';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

describe('Körper', () => {
  test('Migration 26 behält alte Maße', async () => {
    const old = createTestDb();
    await old.execAsync('PRAGMA foreign_keys = ON;');
    for (let v = 0; v < 25; v++) await old.execAsync(MIGRATIONS[v]);
    await old.execAsync('PRAGMA user_version = 25');
    await old.runAsync("INSERT INTO body_measurement (id, day, site, cm, recorded_at_utc) VALUES ('m1', '2026-10-01', 'taille', 84, 'x')");
    await migrate(old);
    expect((await listMeasurements(old)).map((m) => [m.site, m.cm])).toEqual([['taille', 84]]);
    await addMeasurements(old, '2026-10-02', { wade: 38, nacken: 40, unterarm: 31 });
    expect((await listMeasurements(old)).length).toBe(4);
    old.close();
  });

  test('Ziele für Maße und Blutdruck', async () => {
    await saveMeasureGoals(db, { taille: 80 });
    expect(await loadMeasureGoals(db)).toEqual({ taille: 80 });
    await addBloodPressure(db, { day: '2026-11-01', measuredAt: '2026-11-01T06:30:00Z', systolic: 124, diastolic: 79, pulse: 58, note: ' morgens ' });
    const [bp] = await listBloodPressure(db);
    expect(bp).toMatchObject({ systolic: 124, diastolic: 79, pulse: 58, note: 'morgens' });
    await expect(addBloodPressure(db, { day: '2026-11-01', measuredAt: 'x', systolic: 400, diastolic: 79, pulse: null, note: null })).rejects.toThrow();
    await deleteBloodPressure(db, bp.id);
    expect(await listBloodPressure(db)).toEqual([]);
  });
});

describe('Meilensteine und Bilanz', () => {
  test('aus Trainings; gesehen = nicht mehr neu; Bilanz abschaltbar', async () => {
    await savePreferredWeekdays(db, [1, 3]);
    for (let i = 0; i < 10; i++) {
      const at = new Date(Date.parse('2026-10-05T17:00:00Z') + Math.floor(i / 2) * 7 * 86_400_000 + (i % 2) * 2 * 86_400_000).toISOString();
      await db.runAsync("INSERT INTO workout_session (id, status, started_at_utc, finished_at_utc) VALUES (?, 'abgeschlossen', ?, ?)", `s${i}`, at, at);
    }
    let m = await loadMotivation(db, '2026-11-08');
    expect(m.milestones.map((x) => x.id)).toEqual(['training_1', 'planwochen_4', 'training_10']);
    expect(m.goal).toBe(2);
    expect(m.total).toEqual({ done: 5, counted: 5 });
    await markMilestonesSeen(
      db,
      m.fresh.map((f) => f.id)
    );
    await saveBalanceOn(db, false);
    m = await loadMotivation(db, '2026-11-08');
    expect(m.fresh).toEqual([]);
    expect(m.showBalance).toBe(false);
  });
});
