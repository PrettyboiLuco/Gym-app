// Plan-Datei übernehmen (siehe domain/plan-file.ts). Fügt Plan, Abläufe und eigene Übungen hinzu; auf Wunsch
// werden die bisherigen Pläne archiviert (Trainings und Gewichte bleiben im Verlauf) und Tagesziele gesetzt.

import { CUSTOM_PREFIX, type PlanImport } from '@/domain/plan-file';

import { loadCoachSetup, saveCoachSetup } from './coach';
import type { Db } from './db';
import { adjustCalorieGoal } from './goals';
import { loadNutritionSettings, saveNutritionSettings } from './nutrition';
import { archiveRoutine, listRoutines, saveRoutine } from './routines';
import { addCustomExercise, archivePlan, listActivePlans, savePlan } from './training';

export type ImportOptions = { replace: boolean; goals: boolean };
export type ImportResult = { planId: string; archivedPlans: number; routines: number; customExercises: number; weekdaysSet: boolean; goalsSet: boolean };

export async function applyPlanImport(db: Db, imp: PlanImport, options: ImportOptions, today: string): Promise<ImportResult> {
  // 1. Eigene Übungen: vorhandene gleichen Namens wiederverwenden (zweiter Import legt nichts doppelt an).
  const ids = new Map<string, string>();
  for (const c of imp.customExercises) {
    const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM exercise WHERE custom_name = ? LIMIT 1', c.name);
    const id =
      existing?.id ??
      (await addCustomExercise(db, c.name, c.equipment, c.muscleGroup, {
        kind: c.kind,
        sides: c.sides,
        holdSeconds: c.holdSeconds,
        measure: c.kind === 'kraft' ? 'wdh' : 'zeit',
      }));
    ids.set(`${CUSTOM_PREFIX}${c.key}`, id);
  }
  const resolve = (id: string) => ids.get(id) ?? id;

  // 2. Bisherige Pläne archivieren (nur aus der Liste – alte Trainings, Sätze und Gewichte bleiben erhalten).
  let archivedPlans = 0;
  if (options.replace) {
    for (const p of await listActivePlans(db)) {
      await archivePlan(db, p.planId);
      archivedPlans++;
    }
  }

  // 3. Plan
  const planId = await savePlan(
    db,
    null,
    { ...imp.draft, days: imp.draft.days.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i, exerciseId: resolve(i.exerciseId) })) })) },
    { note: imp.note ?? undefined }
  );

  // 4. Abläufe (z. B. Dehnroutine); gleichnamige alte ersetzen statt doppeln.
  const existing = await listRoutines(db, 'dehnen');
  for (const r of imp.routines) {
    for (const old of existing.filter((e) => e.name.trim().toLowerCase() === r.name.trim().toLowerCase())) await archiveRoutine(db, old.routineId);
    await saveRoutine(db, null, { ...r, items: r.items.map((i) => ({ ...i, exerciseId: resolve(i.exerciseId) })) });
  }

  // 5. Trainingstage im Coach (falls eingerichtet) – für die Wochenpunkte und Erinnerungen.
  let weekdaysSet = false;
  if (imp.weekdays) {
    const setup = await loadCoachSetup(db);
    if (setup) {
      await saveCoachSetup(db, { ...setup, trainingWeekdays: imp.weekdays, gymDays: imp.weekdays.length });
      weekdaysSet = true;
    }
  }

  // 6. Tagesziele nur nach Bestätigung.
  let goalsSet = false;
  if (options.goals) {
    if (imp.goals.kcal !== null) {
      await adjustCalorieGoal(db, imp.goals.kcal, today, 'eigen');
      goalsSet = true;
    }
    if (imp.goals.drinkMl !== null) {
      const settings = await loadNutritionSettings(db);
      await saveNutritionSettings(db, { ...settings, drinkGoalMl: imp.goals.drinkMl });
      goalsSet = true;
    }
  }

  return { planId, archivedPlans, routines: imp.routines.length, customExercises: imp.customExercises.length, weekdaysSet, goalsSet };
}
