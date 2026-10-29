// Datenbank-Tests: übernimmt die SQLite-Referenztests T-010 bis T-017 für die echten Tabellen.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { PlanDraft } from '@/domain/training';

import type { Db } from '../db';
import { MIGRATIONS, migrate } from '../migrations';
import { createTestDb } from '../testing/node-db';
import {
  activatePlanVersion,
  addSet,
  completeSet,
  finishSession,
  lastCompletedDayPosition,
  lastPerformance,
  listActivePlans,
  listExercises,
  listPlanVersions,
  listSessionSets,
  loadPlanDraft,
  loadRestTimer,
  savePlan,
  saveRestTimer,
  startSession,
} from '../training';
import { addWeight, deleteWeight, listWeights } from '../weights';

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const pushPull: PlanDraft = {
  name: 'Push/Pull',
  days: [
    { name: 'Push', items: [{ exerciseId: 'bankdruecken', sets: 3, repsMin: 6, repsMax: 10, restSeconds: 120 }] },
    { name: 'Pull', items: [{ exerciseId: 'latzug', sets: 2, repsMin: 8, repsMax: 12, restSeconds: 90 }] },
  ],
};

async function dumpSetLog() {
  return db.getAllAsync('SELECT * FROM set_log ORDER BY id');
}

describe('Migrationen', () => {
  test('Datenbank steht auf neuester Version', async () => {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(MIGRATIONS.length);
  });
  test('zweites Migrieren ändert nichts und verliert keine Daten', async () => {
    await addWeight(db, '2026-10-29', 80.5);
    await migrate(db);
    expect(await listWeights(db)).toHaveLength(1);
  });
  test('Startübungen sind vorhanden', async () => {
    expect((await listExercises(db)).length).toBeGreaterThanOrEqual(20);
  });
});

describe('Gewicht', () => {
  test('speichern, auflisten, löschen', async () => {
    await addWeight(db, '2026-10-28', 81);
    await addWeight(db, '2026-10-29', 80.5);
    const list = await listWeights(db);
    expect(list.map((w) => w.kg)).toEqual([80.5, 81]);
    await deleteWeight(db, list[0].id);
    expect(await listWeights(db)).toHaveLength(1);
  });
  test('Gewicht 0 wird von der Datenbank abgelehnt', async () => {
    await expect(addWeight(db, '2026-10-29', 0)).rejects.toThrow();
  });
});

describe('Pläne und Versionen', () => {
  test('neuer Plan wird als Version 1 gespeichert und wieder geladen', async () => {
    const planId = await savePlan(db, null, pushPull);
    expect(await loadPlanDraft(db, planId)).toEqual(pushPull);
    const plans = await listActivePlans(db);
    expect(plans[0].version).toBe(1);
    expect(plans[0].days.map((d) => d.name)).toEqual(['Push', 'Pull']);
  });

  test('Planwechsel lässt bisherige Trainings unverändert (T-010)', async () => {
    const planId = await savePlan(db, null, pushPull);
    const [plan] = await listActivePlans(db);
    const session = await startSession(db, plan.days[0].id);
    const sets = await listSessionSets(db, session);
    await completeSet(db, sets[0].id, 60, 8);
    await finishSession(db, session, 'abgeschlossen');
    const before = await dumpSetLog();

    await savePlan(db, planId, { ...pushPull, name: 'Push/Pull neu', days: [pushPull.days[1]] });
    expect(await dumpSetLog()).toEqual(before);
    expect((await listPlanVersions(db, planId)).map((v) => v.version)).toEqual([2, 1]);
  });

  test('Rückkehr zur alten Version behält Trainings nach dem Wechsel (T-011)', async () => {
    const planId = await savePlan(db, null, pushPull);
    await savePlan(db, planId, { ...pushPull, name: 'Version 2' });
    const [v2] = await listActivePlans(db);
    const session = await startSession(db, v2.days[0].id);
    await finishSession(db, session, 'abgeschlossen');

    const versions = await listPlanVersions(db, planId);
    await activatePlanVersion(db, planId, versions.find((v) => v.version === 1)!.id);
    const [active] = await listActivePlans(db);
    expect(active.version).toBe(1);
    expect((await db.getAllAsync('SELECT id FROM workout_session')).length).toBe(1);
  });

  test('fehlgeschlagenes Speichern lässt alten Plan vollständig erhalten (T-015)', async () => {
    const planId = await savePlan(db, null, pushPull);
    const broken: PlanDraft = {
      name: 'Kaputt',
      days: [{ name: 'X', items: [{ exerciseId: 'gibt-es-nicht', sets: 3, repsMin: 8, repsMax: 10, restSeconds: 60 }] }],
    };
    await expect(savePlan(db, planId, broken)).rejects.toThrow();
    const [plan] = await listActivePlans(db);
    expect(plan.version).toBe(1);
    expect(plan.name).toBe('Push/Pull');
  });
});

describe('Training und Sätze', () => {
  test('geplante Sätze werden angelegt, Ist-Werte getrennt gespeichert', async () => {
    await savePlan(db, null, pushPull);
    const [plan] = await listActivePlans(db);
    const session = await startSession(db, plan.days[0].id);
    const sets = await listSessionSets(db, session);
    expect(sets).toHaveLength(3);
    expect(sets[0]).toMatchObject({ plannedRepsMin: 6, plannedRepsMax: 10, weightKg: null, reps: null });
    await completeSet(db, sets[0].id, 62.5, 9);
    const after = await listSessionSets(db, session);
    expect(after[0]).toMatchObject({ plannedRepsMin: 6, weightKg: 62.5, reps: 9 });
    expect(after[0].completedAt).not.toBeNull();
  });

  test('zusätzlicher Satz übernimmt Pause und Zielbereich', async () => {
    await savePlan(db, null, pushPull);
    const [plan] = await listActivePlans(db);
    const session = await startSession(db, plan.days[0].id);
    await addSet(db, session, 'bankdruecken');
    const sets = await listSessionSets(db, session);
    expect(sets).toHaveLength(4);
    expect(sets[3]).toMatchObject({ restSeconds: 120, plannedRepsMin: 6, position: 3 });
  });

  test('letzte Leistung kommt aus dem vorigen Training derselben Übung', async () => {
    await savePlan(db, null, pushPull);
    const [plan] = await listActivePlans(db);
    const first = await startSession(db, plan.days[0].id);
    const sets = await listSessionSets(db, first);
    await completeSet(db, sets[0].id, 60, 10);
    await completeSet(db, sets[1].id, 60, 8);
    await finishSession(db, first, 'abgeschlossen');
    const second = await startSession(db, plan.days[0].id);
    expect(await lastPerformance(db, 'bankdruecken', second)).toEqual([
      { weightKg: 60, reps: 10 },
      { weightKg: 60, reps: 8 },
    ]);
    expect(await lastPerformance(db, 'latzug', second)).toEqual([]);
  });

  test('abgebrochenes Training zählt nicht als absolviert (TRAIN-015)', async () => {
    const planId = await savePlan(db, null, pushPull);
    const [plan] = await listActivePlans(db);
    const s1 = await startSession(db, plan.days[0].id);
    await finishSession(db, s1, 'abgeschlossen');
    const s2 = await startSession(db, plan.days[1].id);
    await finishSession(db, s2, 'abgebrochen', 'Schmerz');
    expect(await lastCompletedDayPosition(db, planId)).toBe(0);
  });

  test('negatives Gewicht wird von der Datenbank abgelehnt', async () => {
    const session = await startSession(db, null);
    await addSet(db, session, 'kniebeuge');
    const [set] = await listSessionSets(db, session);
    await expect(completeSet(db, set.id, -5, 5)).rejects.toThrow();
  });
});

describe('Pausentimer-Zustand', () => {
  test('wird gespeichert und nach Neustart wieder gelesen', async () => {
    expect(await loadRestTimer(db)).toBeNull();
    await saveRestTimer(db, { endAtMs: 1000, durationMs: 90000, generation: 3 });
    expect(await loadRestTimer(db)).toEqual({ endAtMs: 1000, durationMs: 90000, generation: 3 });
    await saveRestTimer(db, null);
    expect(await loadRestTimer(db)).toBeNull();
  });
});
