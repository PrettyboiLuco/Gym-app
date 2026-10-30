// Datenbank-Tests Phase 8: Planumbau als neue Version, Befristung, Rückgängig, Ersatz im Training,
// Verlauf für Steigerung, Sicherung (TRAIN-008–012, -016, -018).

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { MORE_STRENGTH_EXERCISES } from '@/domain/exercises';
import type { PlanDraft } from '@/domain/training';

import { exportBackup, restoreBackup } from '../backup';
import type { Db } from '../db';
import { migrate } from '../migrations';
import { EMPTY_PREFS, loadPlannerPrefs, savePlannerPrefs } from '../planner';
import { createTestDb } from '../testing/node-db';
import {
  activatePlanVersion,
  activeVersion,
  addCustomExercise,
  completeSet,
  exerciseHistory,
  expireTemporaryPlans,
  finishSession,
  lastFinishedAt,
  listExercises,
  listPlanVersions,
  listSessionSets,
  loadPlanDraft,
  replaceOpenSets,
  savePlan,
  startSession,
} from '../training';

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const item = (exerciseId: string) => ({ exerciseId, sets: 2, repsMin: 8, repsMax: 12, restSeconds: 90, targetSeconds: null });
const standard: PlanDraft = {
  name: 'PPL',
  days: [
    { name: 'Push', items: [item('bankdruecken')], warmup: true, cooldown: true },
    { name: 'Pull', items: [item('latzug')], warmup: true, cooldown: true },
  ],
};
const rebuilt: PlanDraft = { name: 'PPL', days: [{ name: 'Ganzkörper', items: [item('bankdruecken'), item('latzug')], warmup: true, cooldown: true }] };

async function logsSnapshot() {
  return JSON.stringify([
    await db.getAllAsync('SELECT * FROM workout_session ORDER BY id'),
    await db.getAllAsync('SELECT * FROM set_log ORDER BY id'),
  ]);
}

async function dayIdOf(planId: string, position = 0) {
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT d.id FROM plan_day d JOIN plan_version v ON v.id = d.plan_version_id WHERE v.plan_id = ? AND v.active = 1 AND d.position = ?`,
    planId,
    position
  );
  return row!.id;
}

describe('Übungsdaten (8.1)', () => {
  test('neue Kraftübungen sind da, eigene Übung speichert ihr Bewegungsmuster', async () => {
    const all = await listExercises(db);
    for (const e of MORE_STRENGTH_EXERCISES) expect(all.some((x) => x.id === e.id)).toBe(true);
    const id = await addCustomExercise(db, 'Landmine Press', 'langhantel', 'schultern', { pattern: 'druecken_vertikal' });
    expect((await listExercises(db)).find((e) => e.id === id)?.pattern).toBe('druecken_vertikal');
    // Dehnübungen bekommen kein Kraft-Muster.
    const stretch = await addCustomExercise(db, 'Dehnen X', 'koerpergewicht', 'beine', { kind: 'dehnung_statisch', holdSeconds: 30, measure: 'zeit', pattern: 'kniebeuge' });
    expect((await listExercises(db)).find((e) => e.id === stretch)?.pattern).toBeNull();
  });
});

describe('Umbau als neue Version (TRAIN-009–012)', () => {
  test('Logs bleiben beim Umbau und beim Rückgängigmachen Byte für Byte gleich', async () => {
    const planId = await savePlan(db, null, standard);
    const session = await startSession(db, await dayIdOf(planId));
    const [first] = await listSessionSets(db, session);
    await completeSet(db, first.id, 80, 10);
    await finishSession(db, session, 'abgeschlossen');
    const before = await logsSnapshot();

    const previous = (await activeVersion(db, planId))!;
    await savePlan(db, planId, rebuilt, { note: 'Planassistent: 2 → 1 Tage' });
    expect(await logsSnapshot()).toBe(before);
    expect((await activeVersion(db, planId))?.note).toBe('Planassistent: 2 → 1 Tage');

    await activatePlanVersion(db, planId, previous.id);
    expect(await logsSnapshot()).toBe(before);
    expect(await loadPlanDraft(db, planId)).toEqual(standard);
  });
});

describe('Befristung „nur diese Woche“ (TRAIN-008)', () => {
  test('nach Ablauf gilt wieder die Standardversion, die unverändert blieb', async () => {
    const planId = await savePlan(db, null, standard);
    const std = (await activeVersion(db, planId))!;
    await savePlan(db, planId, rebuilt, { validUntil: '2026-11-01', returnVersionId: std.id });
    const temp = (await activeVersion(db, planId))!;
    expect(temp.validUntil).toBe('2026-11-01');
    expect(temp.returnVersionId).toBe(std.id);

    expect(await expireTemporaryPlans(db, '2026-11-01')).toEqual([]); // letzter Tag gilt noch
    expect((await activeVersion(db, planId))?.id).toBe(temp.id);
    expect(await expireTemporaryPlans(db, '2026-11-02')).toEqual(['PPL']);
    expect((await activeVersion(db, planId))?.id).toBe(std.id);
    expect(await loadPlanDraft(db, planId)).toEqual(standard);
    expect(await listPlanVersions(db, planId)).toHaveLength(2);
  });

  test('abgelaufene befristete Version bewusst wieder gewählt: gilt ohne Frist', async () => {
    const planId = await savePlan(db, null, standard);
    const std = (await activeVersion(db, planId))!;
    await savePlan(db, planId, rebuilt, { validUntil: '2026-11-01', returnVersionId: std.id });
    const temp = (await activeVersion(db, planId))!;
    await expireTemporaryPlans(db, '2026-11-02');
    await activatePlanVersion(db, planId, temp.id, '2026-11-03');
    expect((await activeVersion(db, planId))?.validUntil).toBeNull();
    expect(await expireTemporaryPlans(db, '2026-11-04')).toEqual([]);
  });

  test('ohne Frist wird keine Rückkehr-Version gespeichert', async () => {
    const planId = await savePlan(db, null, standard);
    await savePlan(db, planId, rebuilt, { returnVersionId: 'egal' });
    expect((await activeVersion(db, planId))?.returnVersionId).toBeNull();
  });
});

describe('Gerät belegt im Training (TRAIN-016)', () => {
  test('nur offene Sätze wechseln die Übung, erledigte bleiben', async () => {
    const planId = await savePlan(db, null, standard);
    const session = await startSession(db, await dayIdOf(planId));
    const [done] = await listSessionSets(db, session);
    await completeSet(db, done.id, 80, 10);
    await replaceOpenSets(db, session, 'bankdruecken', 'brustpresse');
    const sets = await listSessionSets(db, session);
    expect(sets.map((s) => [s.exerciseId, s.completedAt !== null])).toEqual([
      ['bankdruecken', true],
      ['brustpresse', false],
    ]);
    // Der Plan bleibt unverändert.
    expect(await loadPlanDraft(db, planId)).toEqual(standard);
  });
});

describe('Verlauf für Steigerungsregeln (TRAIN-018)', () => {
  test('neueste Einheit zuerst, abgebrochene zählen nicht', async () => {
    const planId = await savePlan(db, null, standard);
    const day = await dayIdOf(planId);
    for (const [weight, status] of [[70, 'abgeschlossen'], [75, 'abgebrochen'], [72.5, 'abgeschlossen']] as const) {
      const s = await startSession(db, day);
      for (const set of await listSessionSets(db, s)) await completeSet(db, set.id, weight, 10);
      await finishSession(db, s, status);
    }
    const current = await startSession(db, day);
    const history = await exerciseHistory(db, 'bankdruecken', current, Date.now());
    expect(history.map((h) => h.sets[0].weightKg)).toEqual([72.5, 70]);
    expect(history[0].daysAgo).toBe(0);
    expect(await lastFinishedAt(db)).not.toBeNull();
  });
});

describe('Sicherung (TECH-014)', () => {
  test('befristete Version und Einstellungen überstehen Sicherung und Wiederherstellung', async () => {
    const planId = await savePlan(db, null, standard);
    const std = (await activeVersion(db, planId))!;
    await savePlan(db, planId, rebuilt, { validUntil: '2026-11-01', returnVersionId: std.id, note: 'befristet' });
    await savePlannerPrefs(db, { ...EMPTY_PREFS, locked: ['bankdruecken'], blockedEquipment: ['kabel'] });
    const backup = await exportBackup(db, null);
    const other = createTestDb();
    await migrate(other);
    await restoreBackup(other, JSON.parse(JSON.stringify(backup)));
    expect((await activeVersion(other, planId))?.returnVersionId).toBe(std.id);
    expect((await loadPlannerPrefs(other)).locked).toEqual(['bankdruecken']);
    expect(await expireTemporaryPlans(other, '2026-11-02')).toEqual(['PPL']);
    other.close();
  });
});
