// Logger-Paket (A1): Migration 19, Supersätze, Aufwärmsätze, Satz-Details, Bestleistungen ohne Aufwärmsätze.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { Db } from '../db';
import { MIGRATIONS, migrate } from '../migrations';
import { createTestDb } from '../testing/node-db';
import {
  addCustomExercise,
  addWarmupSets,
  completeSet,
  exerciseBests,
  finishSession,
  getSession,
  listActivePlans,
  listExercises,
  listSessionSets,
  loadPlanDraft,
  previousBests,
  savePlan,
  setSessionNote,
  startSession,
  updateSetDetails,
} from '../training';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const item = (exerciseId: string, sets: number, restSeconds: number, superset: number | null = null) => ({
  exerciseId,
  sets,
  repsMin: 8,
  repsMax: 12,
  restSeconds,
  superset,
});

describe('Migration 19', () => {
  test('alte Sätze werden Arbeitssätze, die neue Katalog-Übung ist da', async () => {
    const old = createTestDb();
    await old.execAsync('PRAGMA foreign_keys = ON;');
    for (let v = 0; v < 18; v++) await old.execAsync(MIGRATIONS[v]);
    await old.execAsync('PRAGMA user_version = 18');
    await old.runAsync("INSERT INTO workout_session (id, status, started_at_utc) VALUES ('s1', 'abgeschlossen', '2026-10-01T10:00:00Z')");
    await old.runAsync(
      "INSERT INTO set_log (id, session_id, exercise_id, position, rest_seconds, weight_kg, reps, completed_at_utc) VALUES ('l1', 's1', 'bankdruecken', 0, 90, 80, 8, '2026-10-01T10:05:00Z')"
    );
    await migrate(old);
    const [row] = await listSessionSets(old, 's1');
    expect(row).toMatchObject({ setType: 'arbeit', rir: null, note: null, superset: null, weightKg: 80 });
    expect((await listExercises(old)).some((e) => e.id === 'klimmzuege_maschine')).toBe(true);
    expect(await old.getAllAsync('PRAGMA foreign_key_check')).toEqual([]);
    old.close();
  });
});

describe('Supersätze', () => {
  test('Plan speichert die Gruppe, das Training läuft im Wechsel mit Pause nach der Runde', async () => {
    const planId = await savePlan(db, null, {
      name: 'S',
      days: [{ name: 'A', items: [item('bankdruecken', 1, 120), item('latzug', 2, 90, 1), item('rudern_maschine', 2, 60, 1)] }],
    });
    expect((await loadPlanDraft(db, planId))?.days[0].items.map((i) => i.superset ?? null)).toEqual([null, 1, 1]);
    const [plan] = await listActivePlans(db);
    const sessionId = await startSession(db, plan.days[0].id);
    const rows = await listSessionSets(db, sessionId);
    expect(rows.map((r) => [r.exerciseId, r.restSeconds, r.superset])).toEqual([
      ['bankdruecken', 120, null],
      ['latzug', 0, 1],
      ['rudern_maschine', 60, 1],
      ['latzug', 0, 1],
      ['rudern_maschine', 60, 1],
    ]);
  });
});

describe('Aufwärmsätze und Details', () => {
  test('Aufwärmsätze kommen vor den ersten Satz und zählen nicht für Bestleistungen', async () => {
    await savePlan(db, null, { name: 'P', days: [{ name: 'A', items: [item('bankdruecken', 2, 90)] }] });
    const [plan] = await listActivePlans(db);

    // Erstes Training: 80 kg × 8.
    const first = await startSession(db, plan.days[0].id);
    for (const r of await listSessionSets(db, first)) await completeSet(db, r.id, 80, 8);
    await finishSession(db, first, 'abgeschlossen');

    // Zweites Training: Aufwärmsatz mit 100 kg (absichtlich schwer) zählt nicht als Bestleistung.
    const second = await startSession(db, plan.days[0].id);
    const ids = await addWarmupSets(db, second, 'bankdruecken', [8, 5]);
    const rows = await listSessionSets(db, second);
    expect(rows.map((r) => [r.setType, r.position])).toEqual([
      ['aufwaermen', 0],
      ['aufwaermen', 1],
      ['arbeit', 2],
      ['arbeit', 3],
    ]);
    await completeSet(db, ids[0], 100, 8);
    await updateSetDetails(db, rows[2].id, { rir: 2, note: 'Sitz 4', setType: 'versagen' });
    await completeSet(db, rows[2].id, 82.5, 8);
    await setSessionNote(db, second, '  gut geschlafen ');
    await finishSession(db, second, 'abgeschlossen');

    const after = await listSessionSets(db, second);
    expect(after[2]).toMatchObject({ rir: 2, note: 'Sitz 4', setType: 'versagen' });
    expect((await getSession(db, second))?.note).toBe('gut geschlafen');

    const [prev] = await previousBests(db, ['bankdruecken'], 'keins', '2027-01-01T00:00:00Z');
    expect(prev.maxKg).toBe(82.5);
    const bests = await exerciseBests(db, 'bankdruecken');
    expect(bests.map((b) => [b.weightKg, b.e1rm])).toEqual([
      [80, 101.3],
      [82.5, 104.5],
    ]);
  });
});

describe('Gewichtsart eigener Übungen', () => {
  test('wird gespeichert und gelesen', async () => {
    const id = await addCustomExercise(db, 'Klimmzug-Maschine Studio', 'maschine', 'ruecken', { loadMode: 'unterstuetzt' });
    expect((await listExercises(db)).find((e) => e.id === id)?.loadMode).toBe('unterstuetzt');
  });
});
