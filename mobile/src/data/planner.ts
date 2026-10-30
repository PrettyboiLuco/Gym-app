// Einstellungen des Planassistenten (Phase 8): Lieblingsübungen und nicht verfügbare Geräte/Übungen
// gelten über Pläne hinweg und kommen mit in die Sicherung (app_state).

import type { Equipment } from '@/domain/exercises';

import { readState, writeState } from './app-state';
import type { Db } from './db';

export type PlannerPrefs = {
  /** Lieblingsübungen: bleiben bei jedem Umbau erhalten (TRAIN-006). */
  locked: string[];
  /** Dauerhaft nicht verfügbare Geräte bzw. Übungen (TRAIN-016). */
  blockedEquipment: Equipment[];
  blockedExercises: string[];
};

export const EMPTY_PREFS: PlannerPrefs = { locked: [], blockedEquipment: [], blockedExercises: [] };

export async function loadPlannerPrefs(db: Db): Promise<PlannerPrefs> {
  return { ...EMPTY_PREFS, ...(await readState<Partial<PlannerPrefs>>(db, 'planner_prefs', {})) };
}

export async function savePlannerPrefs(db: Db, prefs: PlannerPrefs) {
  await writeState(db, 'planner_prefs', prefs);
}
