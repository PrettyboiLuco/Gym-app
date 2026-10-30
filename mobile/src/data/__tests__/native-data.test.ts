// Phase 6: Sicherung und Wiederherstellung, alles löschen, Schritte, Migration 7.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { writeState } from '../app-state';
import { currentSchemaVersion, deleteAllData, exportBackup, restoreBackup } from '../backup';
import type { Db } from '../db';
import { listActiveGoals, saveGoal, setCalorieGoal } from '../goals';
import { MIGRATIONS, migrate } from '../migrations';
import { logWater } from '../nutrition';
import { loadOnboardingDone, saveOnboardingDone } from '../profile';
import { loadReminders, saveReminders } from '../reminders';
import { addSteps, listSteps } from '../steps';
import { createTestDb } from '../testing/node-db';
import { addCustomExercise, listExercises, savePlan, startSession } from '../training';
import { addWeight, listWeights } from '../weights';
import { DEFAULT_REMINDERS } from '@/domain/reminders';

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

async function fill(target: Db) {
  await addWeight(target, '2026-10-30', 80.5);
  const exId = await addCustomExercise(target, 'Meine Übung', 'kabel', 'brust');
  await savePlan(target, null, { name: 'P', days: [{ name: 'A', items: [{ exerciseId: exId, sets: 1, repsMin: 5, repsMax: 8, restSeconds: 60 }] }] });
  await startSession(target, null);
  await logWater(target, 500, { diaryDate: '2026-10-30', at: new Date(), timeZone: 'Europe/Berlin' }, 'Wasser');
  await setCalorieGoal(target, 2300, '2026-10-01');
  await saveGoal(target, null, { kind: 'gewohnheit', habit: 'schritte', perWeek: 4, targetSteps: 9000 }, '2026-10-30', null);
  await addSteps(target, '2026-10-30', 9500);
  await saveOnboardingDone(target);
  await saveReminders(target, { ...DEFAULT_REMINDERS, timerAlerts: true });
  await writeState(target, 'timed_run', { laufend: true });
}

describe('Migration 7', () => {
  test('Ziele bleiben, Schritt-Gewohnheit möglich', async () => {
    const old = createTestDb();
    for (let v = 0; v < 6; v++) await old.execAsync(MIGRATIONS[v]);
    await old.execAsync('PRAGMA user_version = 6');
    // Stand Version 6: Beweglichkeitsziel direkt anlegen (der heutige Code kennt schon target_steps).
    await old.runAsync("INSERT INTO goal (id, kind, created_at_utc) VALUES ('g1', 'beweglichkeit', '2026-10-30T00:00:00Z')");
    await old.runAsync(
      "INSERT INTO goal_version (id, goal_id, version, valid_from, status, target_cm, created_at_utc) VALUES ('v1', 'g1', 1, '2026-10-30', 'aktiv', 5, '2026-10-30T00:00:00Z')"
    );
    await migrate(old);
    await saveGoal(old, null, { kind: 'gewohnheit', habit: 'schritte', perWeek: 3, targetSteps: 8000 }, '2026-10-30', null);
    const goals = await listActiveGoals(old);
    expect(goals.map((g) => g.kind)).toEqual(['beweglichkeit', 'gewohnheit']);
    expect(goals[1].targetSteps).toBe(8000);
    expect(await old.getAllAsync('PRAGMA foreign_key_check')).toEqual([]);
    old.close();
  });
});

describe('Sicherung und Wiederherstellung (TECH-014)', () => {
  test('Export enthält Daten, eigene Übungen, aber keine laufenden Zustände', async () => {
    await fill(db);
    const m = await exportBackup(db, null);
    expect(m.schemaVersion).toBe(await currentSchemaVersion(db));
    expect(m.tables.weight_entry).toHaveLength(1);
    expect(m.tables.exercise).toHaveLength(1);
    expect(m.appState.timed_run).toBeUndefined();
    expect((m.appState.reminders as { timerAlerts: boolean }).timerAlerts).toBe(true);
  });
  test('Export → alles löschen → Wiederherstellen ergibt denselben Stand', async () => {
    await fill(db);
    const before = await exportBackup(db, null);
    await deleteAllData(db);
    expect(await listWeights(db)).toHaveLength(0);
    await restoreBackup(db, JSON.parse(JSON.stringify(before)));
    const after = await exportBackup(db, null);
    expect(after.tables).toEqual(before.tables);
    expect(after.appState).toEqual(before.appState);
    expect(await db.getAllAsync('PRAGMA foreign_key_check')).toEqual([]);
  });
  test('Wiederherstellen in eine andere Datenbank (z. B. neues Handy)', async () => {
    await fill(db);
    const m = JSON.parse(JSON.stringify(await exportBackup(db, null)));
    const other = createTestDb();
    await migrate(other);
    await addWeight(other, '2026-01-01', 99);
    await restoreBackup(other, m);
    expect((await listWeights(other)).map((w) => w.kg)).toEqual([80.5]);
    expect((await listSteps(other))[0].steps).toBe(9500);
    expect(await loadOnboardingDone(other)).toBe(true);
    other.close();
  });
  test('kaputte Sicherung: nichts wird verändert', async () => {
    await fill(db);
    const m = JSON.parse(JSON.stringify(await exportBackup(db, null)));
    m.tables.weight_entry = [{ id: 'x', day: '2026-10-30', kg: -1, recorded_at_utc: 'x' }];
    await expect(restoreBackup(db, m)).rejects.toThrow();
    expect((await listWeights(db)).map((w) => w.kg)).toEqual([80.5]);
  });
  test('ältere Sicherung ohne neue Spalten lässt sich einspielen', async () => {
    await fill(db);
    const m = JSON.parse(JSON.stringify(await exportBackup(db, null)));
    for (const row of m.tables.goal_version) delete row.target_steps;
    m.schemaVersion = 6;
    await restoreBackup(db, m);
    expect((await listActiveGoals(db))[0].targetSteps).toBeNull();
  });
});

describe('Alle Daten löschen (LAW-006)', () => {
  test('eigene Daten weg, Startübungen bleiben, Erststart wieder offen', async () => {
    await fill(db);
    await deleteAllData(db);
    expect(await listWeights(db)).toHaveLength(0);
    expect(await listSteps(db)).toHaveLength(0);
    expect(await loadOnboardingDone(db)).toBe(false);
    expect((await loadReminders(db)).timerAlerts).toBe(false);
    const exercises = await listExercises(db);
    expect(exercises.some((e) => e.customName)).toBe(false);
    expect(exercises.length).toBeGreaterThan(50);
  });
});
