// Datenbankzugriffe für Kalorienziel, Körperziele und Körpermaße (Register GOAL, CALC, UX-002).
// Grundsatz: Ein neues Ziel ist eine neue Version mit Gültig-ab-Datum. Vergangene Tage behalten
// das Ziel, das damals galt (GOAL-002).

import type { Measurement, MeasureSite } from '@/domain/body';
import type { Goal } from '@/domain/energy';
import type { GoalDraft, GoalKind, Habit, LiftSet } from '@/domain/goals';
import { localDay } from '@/domain/time';

import { newId, nowUtc, type Db } from './db';

// ----------------------------------------------------------------------------- Kalorienziel

export type CalorieGoal = {
  id: string;
  validFrom: string;
  kcal: number | null;
  source: 'eigen' | 'rechner';
  inputs: string | null;
  createdAt: string;
};

const CALORIE_COLUMNS = 'id, valid_from AS validFrom, kcal, source, inputs, created_at_utc AS createdAt';

/** Das Kalorienziel, das an einem Tag galt; null = keins. */
export async function calorieGoalOn(db: Db, day: string): Promise<CalorieGoal | null> {
  const row = await db.getFirstAsync<CalorieGoal>(
    `SELECT ${CALORIE_COLUMNS} FROM calorie_goal WHERE valid_from <= ?
     ORDER BY valid_from DESC, created_at_utc DESC, rowid DESC LIMIT 1`,
    day
  );
  return row && row.kcal !== null ? row : null;
}

/** Neues Kalorienziel ab einem Tag (Standard: heute). `kcal = null` beendet das Ziel ab diesem Tag. */
export async function setCalorieGoal(
  db: Db,
  kcal: number | null,
  validFrom: string,
  source: CalorieGoal['source'] = 'eigen',
  inputs: unknown = null
) {
  await db.runAsync(
    'INSERT INTO calorie_goal (id, valid_from, kcal, source, inputs, created_at_utc) VALUES (?, ?, ?, ?, ?, ?)',
    newId(),
    validFrom,
    kcal,
    source,
    inputs === null ? null : JSON.stringify(inputs),
    nowUtc()
  );
}

export function listCalorieGoals(db: Db, limit = 20) {
  return db.getAllAsync<CalorieGoal>(
    `SELECT ${CALORIE_COLUMNS} FROM calorie_goal ORDER BY valid_from DESC, created_at_utc DESC, rowid DESC LIMIT ?`,
    limit
  );
}

// --------------------------------------------------------------------------------- Ziele

export type GoalVersion = {
  id: string;
  goalId: string;
  kind: GoalKind;
  version: number;
  validFrom: string;
  status: 'aktiv' | 'beendet';
  direction: Goal | null;
  targetKg: number | null;
  startKg: number | null;
  exerciseId: string | null;
  targetReps: number | null;
  habit: Habit | null;
  perWeek: number | null;
  targetCm: number | null;
  targetSteps: number | null;
  createdAt: string;
};

const VERSION_COLUMNS = `v.id, v.goal_id AS goalId, g.kind, v.version, v.valid_from AS validFrom, v.status,
  v.direction, v.target_kg AS targetKg, v.start_kg AS startKg, v.exercise_id AS exerciseId,
  v.target_reps AS targetReps, v.habit, v.per_week AS perWeek, v.target_cm AS targetCm, v.target_steps AS targetSteps, v.created_at_utc AS createdAt`;

/** Neueste Version jedes Ziels, das noch aktiv ist. */
export function listActiveGoals(db: Db) {
  return db.getAllAsync<GoalVersion>(
    `SELECT ${VERSION_COLUMNS} FROM goal_version v JOIN goal g ON g.id = v.goal_id
     WHERE v.version = (SELECT MAX(version) FROM goal_version WHERE goal_id = v.goal_id) AND v.status = 'aktiv'
     ORDER BY g.created_at_utc`
  );
}

/** Alle Versionen eines Ziels, neueste zuerst. */
export function listGoalVersions(db: Db, goalId: string) {
  return db.getAllAsync<GoalVersion>(
    `SELECT ${VERSION_COLUMNS} FROM goal_version v JOIN goal g ON g.id = v.goal_id
     WHERE v.goal_id = ? ORDER BY v.version DESC`,
    goalId
  );
}

async function insertVersion(db: Db, goalId: string, validFrom: string, status: GoalVersion['status'], v: Partial<GoalVersion>) {
  const last = await db.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM goal_version WHERE goal_id = ?',
    goalId
  );
  await db.runAsync(
    `INSERT INTO goal_version (id, goal_id, version, valid_from, status, direction, target_kg, start_kg, exercise_id,
     target_reps, habit, per_week, target_cm, target_steps, created_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    goalId,
    (last?.version ?? 0) + 1,
    validFrom,
    status,
    v.direction ?? null,
    v.targetKg ?? null,
    v.startKg ?? null,
    v.exerciseId ?? null,
    v.targetReps ?? null,
    v.habit ?? null,
    v.perWeek ?? null,
    v.targetCm ?? null,
    v.targetSteps ?? null,
    nowUtc()
  );
}

/**
 * Speichert ein Ziel als neue Version. Es gibt höchstens ein aktives Gewichtsziel: Ein neues
 * Gewichtsziel wird zur nächsten Version des vorhandenen. Der Startwert eines Gewichtsziels bleibt
 * erhalten, solange die Richtung gleich bleibt; sonst gilt das aktuelle Gewicht als neuer Start.
 */
export async function saveGoal(db: Db, goalId: string | null, draft: GoalDraft, validFrom: string, currentKg: number | null) {
  let id = goalId;
  if (!id && draft.kind === 'gewicht') {
    const existing = (await listActiveGoals(db)).find((g) => g.kind === 'gewicht');
    id = existing?.goalId ?? null;
  }
  await db.withTransactionAsync(async () => {
    if (!id) {
      id = newId();
      await db.runAsync('INSERT INTO goal (id, kind, created_at_utc) VALUES (?, ?, ?)', id, draft.kind, nowUtc());
    }
    if (draft.kind === 'gewicht') {
      const previous = (await listGoalVersions(db, id))[0];
      const keepStart = previous && previous.status === 'aktiv' && previous.direction === draft.direction;
      await insertVersion(db, id, validFrom, 'aktiv', {
        direction: draft.direction,
        targetKg: draft.targetKg,
        startKg: keepStart ? previous.startKg : currentKg,
      });
    } else if (draft.kind === 'kraft') {
      await insertVersion(db, id, validFrom, 'aktiv', {
        exerciseId: draft.exerciseId,
        targetKg: draft.targetKg,
        targetReps: draft.targetReps,
      });
    } else if (draft.kind === 'beweglichkeit') {
      await insertVersion(db, id, validFrom, 'aktiv', { targetCm: draft.targetCm });
    } else {
      await insertVersion(db, id, validFrom, 'aktiv', { habit: draft.habit, perWeek: draft.perWeek, targetSteps: draft.targetSteps ?? null });
    }
  });
  return id!;
}

/** Beendet ein Ziel ab einem Tag: neue Version mit Status „beendet“, alte Versionen bleiben. */
export async function endGoal(db: Db, goalId: string, validFrom: string) {
  const previous = (await listGoalVersions(db, goalId))[0];
  if (!previous || previous.status === 'beendet') return;
  await insertVersion(db, goalId, validFrom, 'beendet', previous);
}

/** Aktives Gewichtsziel, falls vorhanden (für den Kalorienrechner). */
export async function activeWeightGoal(db: Db) {
  return (await listActiveGoals(db)).find((g) => g.kind === 'gewicht') ?? null;
}

// -------------------------------------------------------------------- Fortschrittsdaten

/** Erledigte Sätze einer Übung mit lokalem Tag (für Kraftziele, GOAL-005). */
export async function liftSets(db: Db, exerciseId: string, timeZone: string): Promise<LiftSet[]> {
  const rows = await db.getAllAsync<{ weightKg: number; reps: number; at: string }>(
    `SELECT weight_kg AS weightKg, reps, completed_at_utc AS at FROM set_log
     WHERE exercise_id = ? AND completed_at_utc IS NOT NULL AND weight_kg IS NOT NULL AND reps IS NOT NULL`,
    exerciseId
  );
  return rows.map((r) => ({ weightKg: r.weightKg, reps: r.reps, day: localDay(new Date(r.at), timeZone) }));
}

/**
 * Trainingstage: Tage mit mindestens einem erledigten Satz (auch bei abgebrochenem Training) oder
 * einer abgeschlossenen HIIT-Einheit (HIIT-005 „zählt als Training“).
 */
export async function trainingDays(db: Db, fromUtc: string, timeZone: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ at: string }>(
    `SELECT completed_at_utc AS at FROM set_log WHERE completed_at_utc IS NOT NULL AND completed_at_utc >= ?
     UNION ALL
     SELECT started_at_utc AS at FROM timed_session WHERE kind = 'hiit' AND status = 'abgeschlossen' AND started_at_utc >= ?`,
    fromUtc,
    fromUtc
  );
  return [...new Set(rows.map((r) => localDay(new Date(r.at), timeZone)))];
}

/** Tage mit abgeschlossener Dehnroutine oder Cool-down (Gewohnheit „dehnen“). */
export async function stretchDays(db: Db, fromUtc: string, timeZone: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ at: string }>(
    `SELECT started_at_utc AS at FROM timed_session
     WHERE kind IN ('dehnen', 'cooldown') AND status = 'abgeschlossen' AND started_at_utc >= ?`,
    fromUtc
  );
  return [...new Set(rows.map((r) => localDay(new Date(r.at), timeZone)))];
}

/** Tage, an denen das Trinkziel erreicht wurde (Getränke in ml, wie im Tagebuch). */
export async function drinkGoalDays(db: Db, fromDay: string, goalMl: number): Promise<string[]> {
  const rows = await db.getAllAsync<{ day: string }>(
    `SELECT diary_date AS day FROM consumption_event
     WHERE kind = 'getraenk' AND unit = 'ml' AND diary_date >= ?
     GROUP BY diary_date HAVING SUM(amount) >= ?`,
    fromDay,
    goalMl
  );
  return rows.map((r) => r.day);
}

// ------------------------------------------------------------------------------ Körpermaße

export function listMeasurements(db: Db) {
  return db.getAllAsync<Measurement>(
    'SELECT id, day, site, cm FROM body_measurement ORDER BY day DESC, recorded_at_utc DESC, rowid DESC'
  );
}

/** Speichert mehrere Maße eines Tages in einem Schritt. */
export async function addMeasurements(db: Db, day: string, values: Partial<Record<MeasureSite, number>>) {
  await db.withTransactionAsync(async () => {
    for (const [site, cm] of Object.entries(values)) {
      if (cm === undefined) continue;
      await db.runAsync(
        'INSERT INTO body_measurement (id, day, site, cm, recorded_at_utc) VALUES (?, ?, ?, ?, ?)',
        newId(),
        day,
        site,
        cm,
        nowUtc()
      );
    }
  });
}

export async function deleteMeasurement(db: Db, id: string) {
  await db.runAsync('DELETE FROM body_measurement WHERE id = ?', id);
}
