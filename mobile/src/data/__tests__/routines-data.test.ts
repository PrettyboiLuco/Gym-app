// Phase 5: Migration 6, Routinen, Protokoll, Zeit-Sätze, Aufwärmen je Tag, Beweglichkeitstest.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { findTemplate } from '@/domain/routines';
import { newRun, stretchSteps } from '@/domain/timeline';

import type { Db } from '../db';
import { listActiveGoals, listGoalVersions, saveGoal, stretchDays, trainingDays } from '../goals';
import { MIGRATIONS, migrate } from '../migrations';
import {
  activateRoutineVersion,
  addFlexibilityTest,
  archiveRoutine,
  finishTimedSession,
  listFlexibilityTests,
  listRoutines,
  listRoutineVersions,
  listTimedSessions,
  loadRoutineDraft,
  loadRoutineVersion,
  loadTimedRun,
  saveRoutine,
  startTimedSession,
} from '../routines';
import { createTestDb } from '../testing/node-db';
import {
  addCustomExercise,
  completeTimedSet,
  listExercises,
  listSessionSets,
  loadPlanDraft,
  savePlan,
  startSession,
} from '../training';

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

describe('Migration 6', () => {
  test('Ziele aus Version 5 bleiben erhalten, Fremdschlüssel intakt', async () => {
    const old = createTestDb();
    await old.execAsync('PRAGMA foreign_keys = ON;');
    for (let v = 0; v < 5; v++) await old.execAsync(MIGRATIONS[v]);
    await old.execAsync('PRAGMA user_version = 5');
    await old.runAsync("INSERT INTO goal (id, kind, created_at_utc) VALUES ('g1', 'kraft', '2026-10-01T00:00:00Z')");
    await old.runAsync(
      `INSERT INTO goal_version (id, goal_id, version, valid_from, status, exercise_id, target_kg, target_reps, created_at_utc)
       VALUES ('v1', 'g1', 1, '2026-10-01', 'aktiv', 'kniebeuge', 100, 5, '2026-10-01T00:00:00Z')`
    );
    await migrate(old);
    const goals = await listActiveGoals(old);
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({ goalId: 'g1', kind: 'kraft', targetKg: 100, targetCm: null });
    expect(await old.getAllAsync('PRAGMA foreign_key_check')).toEqual([]);
    // Neue Arten sind jetzt erlaubt.
    await saveGoal(old, null, { kind: 'beweglichkeit', targetCm: 5 }, '2026-10-30', null);
    await saveGoal(old, null, { kind: 'gewohnheit', habit: 'dehnen', perWeek: 3 }, '2026-10-30', null);
    expect(await listActiveGoals(old)).toHaveLength(3);
    // Fremdschlüssel greifen weiterhin.
    await expect(
      old.runAsync(
        "INSERT INTO goal_version (id, goal_id, version, valid_from, status, created_at_utc) VALUES ('x', 'fehlt', 1, '2026-10-30', 'aktiv', 'x')"
      )
    ).rejects.toThrow();
    old.close();
  });
  test('Plank in alten Plänen: bisheriger Höchstwert wird zu Sekunden', async () => {
    const old = createTestDb();
    for (let v = 0; v < 5; v++) await old.execAsync(MIGRATIONS[v]);
    await old.execAsync('PRAGMA user_version = 5');
    // Stand vor Version 6: Plank mit Wiederholungen 30–60 geplant.
    await old.runAsync("INSERT INTO plan (id, created_at_utc) VALUES ('p', 'x')");
    await old.runAsync("INSERT INTO plan_version (id, plan_id, version, name, active, created_at_utc) VALUES ('v', 'p', 1, 'Alt', 1, 'x')");
    await old.runAsync("INSERT INTO plan_day (id, plan_version_id, position, name) VALUES ('d', 'v', 0, 'A')");
    await old.runAsync(
      "INSERT INTO plan_item (id, plan_day_id, position, exercise_id, sets, reps_min, reps_max, rest_seconds) VALUES ('i', 'd', 0, 'plank', 3, 30, 60, 60)"
    );
    const planId = 'p';
    await migrate(old);
    const item = (await loadPlanDraft(old, planId))?.days[0].items[0];
    expect(item).toMatchObject({ targetSeconds: 60, repsMin: 1, repsMax: 1 });
    old.close();
  });
  test('Dehn- und HIIT-Übungen vorhanden, Plank misst Zeit', async () => {
    const all = await listExercises(db);
    expect(all.find((e) => e.id === 'plank')?.measure).toBe('zeit');
    expect(all.find((e) => e.id === 'dehn_hueftbeuger')).toMatchObject({ kind: 'dehnung_statisch', sides: 'einseitig', holdSeconds: 30 });
    expect(all.find((e) => e.id === 'burpees')).toMatchObject({ kind: 'kraft', measure: 'wdh' });
    expect(all.find((e) => e.id === 'kniebeuge')).toMatchObject({ kind: 'kraft', sides: 'beidseitig', measure: 'wdh' });
  });
});

describe('Eigene Übungen mit Art (STRETCH-007)', () => {
  test('eigene Dehnübung, einseitig, 40 s', async () => {
    const id = await addCustomExercise(db, 'Meine Dehnung', 'koerpergewicht', 'nacken', {
      kind: 'dehnung_statisch',
      sides: 'einseitig',
      holdSeconds: 40,
      measure: 'zeit',
    });
    expect((await listExercises(db)).find((e) => e.id === id)).toMatchObject({ kind: 'dehnung_statisch', holdSeconds: 40 });
  });
});

describe('Routinen versioniert (STRETCH-003, HIIT-004)', () => {
  test('Vorlage übernehmen, ändern, alte Version wieder verwenden', async () => {
    const template = { ...findTemplate('buero_nacken')!, name: 'Büro' };
    const id = await saveRoutine(db, null, template);
    await saveRoutine(db, id, { ...template, name: 'Büro kurz', items: template.items.slice(0, 2) });
    expect((await loadRoutineDraft(db, id))?.draft.items).toHaveLength(2);
    const versions = await listRoutineVersions(db, id);
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
    await activateRoutineVersion(db, id, versions[1].id);
    expect((await loadRoutineDraft(db, id))?.draft.name).toBe('Büro');
    expect((await loadRoutineVersion(db, versions[0].id))?.items).toHaveLength(2);
  });
  test('HIIT: Liste nach Art getrennt, entfernen behält Versionen', async () => {
    const id = await saveRoutine(db, null, { ...findTemplate('bauch_anfaenger')!, name: 'Mein Bauch' });
    expect(await listRoutines(db, 'hiit')).toHaveLength(1);
    expect(await listRoutines(db, 'dehnen')).toHaveLength(0);
    await archiveRoutine(db, id);
    expect(await listRoutines(db, 'hiit')).toHaveLength(0);
    expect(await listRoutineVersions(db, id)).toHaveLength(1);
  });
  test('ungültige Werte lehnt die Datenbank ab', async () => {
    await expect(saveRoutine(db, null, { ...findTemplate('morgens')!, name: 'x', switchSeconds: 99 })).rejects.toThrow();
    expect(await listRoutines(db, 'dehnen')).toHaveLength(0);
  });
});

describe('Protokoll (STRETCH-005, HIIT-005)', () => {
  const steps = stretchSteps([{ exerciseId: 'dehn_kobra', seconds: 20, bothSides: false }], 5, 10);
  test('Start speichert laufenden Ablauf, Ende schreibt Protokoll und löscht ihn', async () => {
    const run = await startTimedSession(
      db,
      { kind: 'dehnen', name: 'Morgens', source: 'vorlage:morgens', routineVersionId: null, workoutSessionId: null },
      newRun({ kind: 'dehnen', title: 'Morgens', steps, sessionId: '', workoutSessionId: null }, Date.parse('2026-10-30T07:00:00Z'))
    );
    expect((await loadTimedRun(db))?.sessionId).toBe(run.sessionId);
    await finishTimedSession(db, run.sessionId, 'abgeschlossen', { doneSeconds: 25, roundsDone: 1 });
    expect(await loadTimedRun(db)).toBeNull();
    const [s] = await listTimedSessions(db);
    expect(s).toMatchObject({ status: 'abgeschlossen', doneSeconds: 25, plannedSeconds: 25, items: '["dehn_kobra"]' });
    expect(await stretchDays(db, '2026-10-01T00:00:00Z', 'Europe/Berlin')).toEqual(['2026-10-30']);
  });
  test('Abbruch wegen Schmerz wird vermerkt und zählt nicht als Dehntag', async () => {
    const run = await startTimedSession(
      db,
      { kind: 'dehnen', name: 'X', source: 'eigen', routineVersionId: null, workoutSessionId: null },
      newRun({ kind: 'dehnen', title: 'X', steps, sessionId: '', workoutSessionId: null }, Date.now())
    );
    await finishTimedSession(db, run.sessionId, 'abgebrochen', { doneSeconds: 5, roundsDone: 0, reason: 'schmerz' });
    expect((await listTimedSessions(db))[0]).toMatchObject({ status: 'abgebrochen', abortReason: 'schmerz' });
    expect(await stretchDays(db, '2000-01-01T00:00:00Z', 'Europe/Berlin')).toEqual([]);
  });
  test('abgeschlossenes HIIT zählt als Trainingstag', async () => {
    const run = await startTimedSession(
      db,
      { kind: 'hiit', name: 'Bauch', source: 'vorlage:bauch_anfaenger', routineVersionId: null, workoutSessionId: null },
      newRun({ kind: 'hiit', title: 'Bauch', steps, sessionId: '', workoutSessionId: null }, Date.parse('2026-10-29T18:00:00Z'))
    );
    await finishTimedSession(db, run.sessionId, 'abgeschlossen', { doneSeconds: 25, roundsDone: 2 });
    expect(await trainingDays(db, '2026-10-01T00:00:00Z', 'Europe/Berlin')).toEqual(['2026-10-29']);
  });
  test('zweites Beenden ändert ein abgeschlossenes Protokoll nicht', async () => {
    const run = await startTimedSession(
      db,
      { kind: 'dehnen', name: 'X', source: 'eigen', routineVersionId: null, workoutSessionId: null },
      newRun({ kind: 'dehnen', title: 'X', steps, sessionId: '', workoutSessionId: null }, Date.now())
    );
    await finishTimedSession(db, run.sessionId, 'abgeschlossen', { doneSeconds: 25, roundsDone: 1 });
    await finishTimedSession(db, run.sessionId, 'abgebrochen', { doneSeconds: 1, roundsDone: 0, reason: 'schmerz' });
    expect((await listTimedSessions(db))[0].status).toBe('abgeschlossen');
  });
});

describe('Pläne mit Zeit-Sätzen und Aufwärmen (UX-011, STRETCH-001)', () => {
  test('Zeit-Übung und Aufwärmen/Cool-down je Tag werden gespeichert und ins Training übernommen', async () => {
    const planId = await savePlan(db, null, {
      name: 'Rumpf',
      days: [
        {
          name: 'A',
          warmup: true,
          cooldown: false,
          items: [
            { exerciseId: 'plank', sets: 2, repsMin: 1, repsMax: 1, restSeconds: 60, targetSeconds: 45 },
            { exerciseId: 'crunches', sets: 1, repsMin: 10, repsMax: 15, restSeconds: 60 },
          ],
        },
      ],
    });
    const draft = await loadPlanDraft(db, planId);
    expect(draft?.days[0]).toMatchObject({ warmup: true, cooldown: false });
    expect(draft?.days[0].items[0].targetSeconds).toBe(45);
    expect(draft?.days[0].items[1].targetSeconds).toBeNull();
    const dayId = (await db.getFirstAsync<{ id: string }>('SELECT id FROM plan_day'))!.id;
    const session = await startSession(db, dayId);
    const sets = await listSessionSets(db, session);
    expect(sets[0]).toMatchObject({ plannedSeconds: 45, plannedRepsMin: null });
    expect(sets[2]).toMatchObject({ plannedSeconds: null, plannedRepsMin: 10 });
    await completeTimedSet(db, sets[0].id, 50);
    expect((await listSessionSets(db, session))[0]).toMatchObject({ seconds: 50, reps: null, weightKg: 0 });
  });
  test('alte Pläne: Aufwärmen und Cool-down standardmäßig an', async () => {
    const planId = await savePlan(db, null, {
      name: 'Alt',
      days: [{ name: 'A', items: [{ exerciseId: 'kniebeuge', sets: 1, repsMin: 5, repsMax: 5, restSeconds: 90 }] }],
    });
    expect((await loadPlanDraft(db, planId))?.days[0]).toMatchObject({ warmup: true, cooldown: true });
  });
});

describe('Beweglichkeitstest', () => {
  test('speichern und auflisten, Grenzen in der Datenbank', async () => {
    await addFlexibilityTest(db, '2026-10-01', 15);
    await addFlexibilityTest(db, '2026-10-30', 8);
    expect((await listFlexibilityTests(db)).map((t) => t.cm)).toEqual([8, 15]);
    await expect(addFlexibilityTest(db, '2026-10-30', -5)).rejects.toThrow();
  });
  test('Beweglichkeitsziel als neue Version', async () => {
    const id = await saveGoal(db, null, { kind: 'beweglichkeit', targetCm: 10 }, '2026-10-01', null);
    await saveGoal(db, id, { kind: 'beweglichkeit', targetCm: 5 }, '2026-10-30', null);
    expect((await listGoalVersions(db, id)).map((v) => v.targetCm)).toEqual([5, 10]);
  });
});
