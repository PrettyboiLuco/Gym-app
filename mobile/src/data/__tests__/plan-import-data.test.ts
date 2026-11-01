// Plan-Datei übernehmen: alter Plan archiviert, Abläufe und eigene Übungen angelegt, Ziele nur auf Wunsch.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import { parsePlanFile } from '@/domain/plan-file';

import type { Db } from '../db';
import { calorieGoalOn } from '../goals';
import { migrate } from '../migrations';
import { loadNutritionSettings } from '../nutrition';
import { applyPlanImport } from '../plan-import';
import { listRoutines, loadRoutineDraft } from '../routines';
import { createTestDb } from '../testing/node-db';
import { listActivePlans, listExercises, loadPlanDraft, savePlan } from '../training';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

async function lucsPlan() {
  const text = readFileSync(join(__dirname, '../presets/lucs-training.myhealth.json'), 'utf8');
  const known = new Set((await listExercises(db)).map((e) => e.id));
  const r = parsePlanFile(text, known);
  if (!r.ok) throw new Error(`Plan-Datei ungültig: ${JSON.stringify(r)}`);
  return r;
}

describe('Plan übernehmen', () => {
  test('ersetzt den alten Plan und übernimmt alles aus der Datei', async () => {
    await savePlan(db, null, { name: 'Alter Plan', days: [{ name: 'A', items: [{ exerciseId: 'latzug', sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 }] }] });
    const imp = await lucsPlan();
    const done = await applyPlanImport(db, imp, { replace: true, goals: true }, '2026-10-31');

    expect(done).toMatchObject({ archivedPlans: 1, routines: 2, customExercises: 8, goalsSet: true });
    const plans = await listActivePlans(db);
    expect(plans.map((p) => p.planId)).toEqual([done.planId]);
    const draft = await loadPlanDraft(db, done.planId);
    expect(draft?.days.map((d) => d.name)).toEqual(['Push (So)', 'Pull (Mo)', 'Oberkörper (Mi)', 'Beine (Fr)']);
    expect(draft?.days[3].items[1]).toMatchObject({ exerciseId: 'beinpresse', sets: 3, rir: '2', note: expect.stringContaining('Polster') });

    const routines = await listRoutines(db, 'dehnen');
    expect(routines.map((r) => r.name).sort()).toEqual(['Lucs Dehnroutine', 'Massagepistole']);
    const stretch = await loadRoutineDraft(db, routines.find((r) => r.name === 'Lucs Dehnroutine')!.routineId);
    expect(stretch?.draft.items).toHaveLength(10);
    expect(stretch?.draft.items.every((i) => !i.exerciseId.startsWith('eigen:'))).toBe(true);

    expect((await calorieGoalOn(db, '2026-10-31'))?.kcal).toBe(3900);
    expect((await loadNutritionSettings(db)).drinkGoalMl).toBe(5000);
  });

  test('zweiter Import legt keine eigenen Übungen oder Abläufe doppelt an; Ziele nur auf Wunsch', async () => {
    const imp = await lucsPlan();
    await applyPlanImport(db, imp, { replace: true, goals: false }, '2026-10-31');
    const count = (await listExercises(db)).length;
    await applyPlanImport(db, imp, { replace: true, goals: false }, '2026-10-31');
    expect((await listExercises(db)).length).toBe(count);
    expect(await listActivePlans(db)).toHaveLength(1);
    expect((await listRoutines(db, 'dehnen')).filter((r) => r.name === 'Massagepistole')).toHaveLength(1);
    expect((await calorieGoalOn(db, '2026-10-31'))?.kcal ?? null).not.toBe(3900);
  });
});
