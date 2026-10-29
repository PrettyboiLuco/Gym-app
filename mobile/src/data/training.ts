// Datenbankzugriffe fürs Training. Grundsätze aus dem Plan:
// - Eine Planänderung erzeugt eine neue Version; alte Versionen und ihre Trainings bleiben (TRAIN-010–012).
// - Geplante und tatsächliche Werte sind getrennt; jeder Satz wird sofort gespeichert (TRAIN-013).
// - Letzte Leistung nur aus derselben Übung (TRAIN-014).

import type { Equipment, MuscleGroup } from '@/domain/exercises';
import type { IntervalConfig, PlanDraft, RestTimer } from '@/domain/training';

import { readState, writeState } from './app-state';
import { newId, nowUtc, type Db } from './db';

// ------------------------------------------------------------------------------------ Übungen

export type Exercise = {
  id: string;
  nameKey: string | null;
  customName: string | null;
  equipment: Equipment;
  muscleGroup: MuscleGroup;
};

const EXERCISE_COLUMNS =
  'id, name_key AS nameKey, custom_name AS customName, equipment, muscle_group AS muscleGroup';

export function listExercises(db: Db) {
  return db.getAllAsync<Exercise>(`SELECT ${EXERCISE_COLUMNS} FROM exercise`);
}

export async function addCustomExercise(db: Db, name: string, equipment: Equipment, muscleGroup: MuscleGroup) {
  const id = newId();
  await db.runAsync(
    'INSERT INTO exercise (id, name_key, custom_name, equipment, muscle_group, created_at_utc) VALUES (?, NULL, ?, ?, ?, ?)',
    id,
    name.trim(),
    equipment,
    muscleGroup,
    nowUtc()
  );
  return id;
}

/**
 * Ändert eine eigene Übung (Register UX-013). Die ID bleibt gleich, daher bleiben Pläne und
 * Verlauf verknüpft. Startübungen (name_key gesetzt) werden nicht verändert.
 */
export async function updateCustomExercise(
  db: Db,
  id: string,
  name: string,
  equipment: Equipment,
  muscleGroup: MuscleGroup
) {
  await db.runAsync(
    'UPDATE exercise SET custom_name = ?, equipment = ?, muscle_group = ? WHERE id = ? AND name_key IS NULL',
    name.trim(),
    equipment,
    muscleGroup,
    id
  );
}

// --------------------------------------------------------------------------------------- Pläne

export type PlanSummary = {
  planId: string;
  versionId: string;
  version: number;
  name: string;
  days: { id: string; position: number; name: string; itemCount: number }[];
};

export async function listActivePlans(db: Db): Promise<PlanSummary[]> {
  const versions = await db.getAllAsync<{ planId: string; versionId: string; version: number; name: string }>(
    `SELECT plan_id AS planId, id AS versionId, version, name FROM plan_version
     WHERE active = 1 ORDER BY created_at_utc DESC`
  );
  const result: PlanSummary[] = [];
  for (const v of versions) {
    const days = await db.getAllAsync<{ id: string; position: number; name: string; itemCount: number }>(
      `SELECT d.id, d.position, d.name, COUNT(i.id) AS itemCount
       FROM plan_day d LEFT JOIN plan_item i ON i.plan_day_id = d.id
       WHERE d.plan_version_id = ? GROUP BY d.id ORDER BY d.position`,
      v.versionId
    );
    result.push({ ...v, days });
  }
  return result;
}

/** Aktive Version eines Plans als bearbeitbarer Entwurf. */
export async function loadPlanDraft(db: Db, planId: string): Promise<PlanDraft | null> {
  const version = await db.getFirstAsync<{ id: string; name: string }>(
    'SELECT id, name FROM plan_version WHERE plan_id = ? AND active = 1',
    planId
  );
  return version ? loadVersionDraft(db, version.id, version.name) : null;
}

async function loadVersionDraft(db: Db, versionId: string, name: string): Promise<PlanDraft> {
  const days = await db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM plan_day WHERE plan_version_id = ? ORDER BY position',
    versionId
  );
  const draft: PlanDraft = { name, days: [] };
  for (const day of days) {
    const items = await db.getAllAsync<{
      exerciseId: string;
      sets: number;
      repsMin: number;
      repsMax: number;
      restSeconds: number;
    }>(
      `SELECT exercise_id AS exerciseId, sets, reps_min AS repsMin, reps_max AS repsMax, rest_seconds AS restSeconds
       FROM plan_item WHERE plan_day_id = ? ORDER BY position`,
      day.id
    );
    draft.days.push({ name: day.name, items });
  }
  return draft;
}

/**
 * Speichert einen Plan. Ohne planId entsteht ein neuer Plan (Version 1), sonst eine neue
 * Version, die die bisherige ablöst. Alles in einer Transaktion: scheitert etwas, bleibt der
 * alte Stand vollständig erhalten.
 */
export async function savePlan(db: Db, planId: string | null, draft: PlanDraft): Promise<string> {
  const id = planId ?? newId();
  await db.withTransactionAsync(async () => {
    const now = nowUtc();
    if (!planId) await db.runAsync('INSERT INTO plan (id, created_at_utc) VALUES (?, ?)', id, now);
    const last = await db.getFirstAsync<{ version: number }>(
      'SELECT MAX(version) AS version FROM plan_version WHERE plan_id = ?',
      id
    );
    await db.runAsync('UPDATE plan_version SET active = 0 WHERE plan_id = ?', id);
    const versionId = newId();
    await db.runAsync(
      'INSERT INTO plan_version (id, plan_id, version, name, active, created_at_utc) VALUES (?, ?, ?, ?, 1, ?)',
      versionId,
      id,
      (last?.version ?? 0) + 1,
      draft.name.trim(),
      now
    );
    for (const [dayIndex, day] of draft.days.entries()) {
      const dayId = newId();
      await db.runAsync(
        'INSERT INTO plan_day (id, plan_version_id, position, name) VALUES (?, ?, ?, ?)',
        dayId,
        versionId,
        dayIndex,
        day.name.trim()
      );
      for (const [itemIndex, item] of day.items.entries()) {
        await db.runAsync(
          `INSERT INTO plan_item (id, plan_day_id, position, exercise_id, sets, reps_min, reps_max, rest_seconds)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          newId(),
          dayId,
          itemIndex,
          item.exerciseId,
          item.sets,
          item.repsMin,
          item.repsMax,
          item.restSeconds
        );
      }
    }
  });
  return id;
}

export type PlanVersionInfo = { id: string; version: number; name: string; active: number; createdAt: string };

export function listPlanVersions(db: Db, planId: string) {
  return db.getAllAsync<PlanVersionInfo>(
    `SELECT id, version, name, active, created_at_utc AS createdAt FROM plan_version
     WHERE plan_id = ? ORDER BY version DESC`,
    planId
  );
}

/** Macht eine frühere Version wieder aktiv. Trainings aus späteren Versionen bleiben erhalten (TRAIN-011). */
export async function activatePlanVersion(db: Db, planId: string, versionId: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE plan_version SET active = 0 WHERE plan_id = ?', planId);
    await db.runAsync('UPDATE plan_version SET active = 1 WHERE id = ? AND plan_id = ?', versionId, planId);
  });
}

/** Entfernt einen Plan aus der Liste. Alte Trainings bleiben im Verlauf. */
export async function archivePlan(db: Db, planId: string) {
  await db.runAsync('UPDATE plan_version SET active = 0 WHERE plan_id = ?', planId);
}

// ------------------------------------------------------------------------------ Trainings

export type SessionInfo = {
  id: string;
  status: 'aktiv' | 'abgeschlossen' | 'abgebrochen';
  abortReason: string | null;
  startedAt: string;
  finishedAt: string | null;
  planName: string | null;
  dayName: string | null;
  dayPosition: number | null;
  planId: string | null;
};

const SESSION_SELECT = `SELECT s.id, s.status, s.abort_reason AS abortReason, s.started_at_utc AS startedAt,
  s.finished_at_utc AS finishedAt, v.name AS planName, d.name AS dayName, d.position AS dayPosition, v.plan_id AS planId
  FROM workout_session s
  LEFT JOIN plan_day d ON d.id = s.plan_day_id
  LEFT JOIN plan_version v ON v.id = d.plan_version_id`;

export function getActiveSession(db: Db) {
  return db.getFirstAsync<SessionInfo>(`${SESSION_SELECT} WHERE s.status = 'aktiv' ORDER BY s.started_at_utc DESC`);
}

export function getSession(db: Db, id: string) {
  return db.getFirstAsync<SessionInfo>(`${SESSION_SELECT} WHERE s.id = ?`, id);
}

export function listSessions(db: Db, limit = 50) {
  return db.getAllAsync<SessionInfo & { doneSets: number }>(
    `SELECT * FROM (${SESSION_SELECT}) AS x
     LEFT JOIN (SELECT session_id, COUNT(*) AS doneSets FROM set_log WHERE completed_at_utc IS NOT NULL GROUP BY session_id) c
       ON c.session_id = x.id
     ORDER BY x.startedAt DESC LIMIT ?`,
    limit
  );
}

/** Zuletzt absolvierter Tag eines Plans (über alle Versionen), für den Vorschlag „nächster Tag“. */
export async function lastCompletedDayPosition(db: Db, planId: string): Promise<number | null> {
  const row = await db.getFirstAsync<{ position: number }>(
    `SELECT d.position FROM workout_session s
     JOIN plan_day d ON d.id = s.plan_day_id
     JOIN plan_version v ON v.id = d.plan_version_id
     WHERE v.plan_id = ? AND s.status = 'abgeschlossen'
     ORDER BY s.finished_at_utc DESC LIMIT 1`,
    planId
  );
  return row?.position ?? null;
}

/** Startet ein Training. Mit Plantag werden die geplanten Sätze als offene Einträge angelegt. */
export async function startSession(db: Db, planDayId: string | null): Promise<string> {
  const id = newId();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO workout_session (id, plan_day_id, status, started_at_utc) VALUES (?, ?, 'aktiv', ?)",
      id,
      planDayId,
      nowUtc()
    );
    if (!planDayId) return;
    const items = await db.getAllAsync<{
      exerciseId: string;
      sets: number;
      repsMin: number;
      repsMax: number;
      restSeconds: number;
    }>(
      `SELECT exercise_id AS exerciseId, sets, reps_min AS repsMin, reps_max AS repsMax, rest_seconds AS restSeconds
       FROM plan_item WHERE plan_day_id = ? ORDER BY position`,
      planDayId
    );
    let position = 0;
    for (const item of items) {
      for (let s = 0; s < item.sets; s++) {
        await db.runAsync(
          `INSERT INTO set_log (id, session_id, exercise_id, position, planned_reps_min, planned_reps_max, rest_seconds)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          newId(),
          id,
          item.exerciseId,
          position++,
          item.repsMin,
          item.repsMax,
          item.restSeconds
        );
      }
    }
  });
  return id;
}

export type SetRow = {
  id: string;
  exerciseId: string;
  position: number;
  plannedRepsMin: number | null;
  plannedRepsMax: number | null;
  restSeconds: number;
  weightKg: number | null;
  reps: number | null;
  completedAt: string | null;
};

export function listSessionSets(db: Db, sessionId: string) {
  return db.getAllAsync<SetRow>(
    `SELECT id, exercise_id AS exerciseId, position, planned_reps_min AS plannedRepsMin,
       planned_reps_max AS plannedRepsMax, rest_seconds AS restSeconds, weight_kg AS weightKg, reps,
       completed_at_utc AS completedAt
     FROM set_log WHERE session_id = ? ORDER BY position`,
    sessionId
  );
}

export async function completeSet(db: Db, setId: string, weightKg: number, reps: number) {
  await db.runAsync(
    'UPDATE set_log SET weight_kg = ?, reps = ?, completed_at_utc = ? WHERE id = ?',
    weightKg,
    reps,
    nowUtc(),
    setId
  );
}

export async function reopenSet(db: Db, setId: string) {
  await db.runAsync('UPDATE set_log SET completed_at_utc = NULL WHERE id = ?', setId);
}

/** Zusätzlicher Satz für eine Übung, übernimmt Pause und Zielbereich des letzten Satzes. */
export async function addSet(db: Db, sessionId: string, exerciseId: string) {
  const last = await db.getFirstAsync<{ restSeconds: number; repsMin: number | null; repsMax: number | null }>(
    `SELECT rest_seconds AS restSeconds, planned_reps_min AS repsMin, planned_reps_max AS repsMax
     FROM set_log WHERE session_id = ? AND exercise_id = ? ORDER BY position DESC LIMIT 1`,
    sessionId,
    exerciseId
  );
  const max = await db.getFirstAsync<{ position: number | null }>(
    'SELECT MAX(position) AS position FROM set_log WHERE session_id = ?',
    sessionId
  );
  await db.runAsync(
    `INSERT INTO set_log (id, session_id, exercise_id, position, planned_reps_min, planned_reps_max, rest_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    sessionId,
    exerciseId,
    (max?.position ?? -1) + 1,
    last?.repsMin ?? null,
    last?.repsMax ?? null,
    last?.restSeconds ?? 90
  );
}

/** Beendet ein Training. Nicht erledigte geplante Sätze bleiben als „nicht gemacht“ stehen. */
export async function finishSession(db: Db, sessionId: string, status: 'abgeschlossen' | 'abgebrochen', reason?: string) {
  await db.runAsync(
    'UPDATE workout_session SET status = ?, abort_reason = ?, finished_at_utc = ? WHERE id = ?',
    status,
    reason ?? null,
    nowUtc(),
    sessionId
  );
}

export type LastPerformance = { weightKg: number; reps: number }[];

/** Erledigte Sätze dieser Übung aus dem letzten anderen Training. */
export async function lastPerformance(db: Db, exerciseId: string, excludeSessionId: string): Promise<LastPerformance> {
  const last = await db.getFirstAsync<{ sessionId: string }>(
    `SELECT session_id AS sessionId FROM set_log
     WHERE exercise_id = ? AND session_id <> ? AND completed_at_utc IS NOT NULL
     ORDER BY completed_at_utc DESC LIMIT 1`,
    exerciseId,
    excludeSessionId
  );
  if (!last) return [];
  return db.getAllAsync<{ weightKg: number; reps: number }>(
    `SELECT weight_kg AS weightKg, reps FROM set_log
     WHERE session_id = ? AND exercise_id = ? AND completed_at_utc IS NOT NULL ORDER BY position`,
    last.sessionId,
    exerciseId
  );
}

/** Entfernt einen noch nicht erledigten Satz (z. B. versehentlich hinzugefügt). Erledigte Sätze bleiben. */
export async function deleteOpenSet(db: Db, setId: string) {
  await db.runAsync('DELETE FROM set_log WHERE id = ? AND completed_at_utc IS NULL', setId);
}

// ----------------------------------------------------------------- gespeicherter App-Zustand
// Timer und Einstellungen überstehen so das Schließen der App (HEALTH-011).

export const loadRestTimer = (db: Db) => readState<RestTimer>(db, 'rest_timer', null);
export const saveRestTimer = (db: Db, timer: RestTimer) => writeState(db, 'rest_timer', timer);

/** Pause nach jedem Satz automatisch starten (Standard: an). */
export const loadRestAuto = (db: Db) => readState<boolean>(db, 'rest_auto', true);
export const saveRestAuto = (db: Db, on: boolean) => writeState(db, 'rest_auto', on);

export type IntervalRun = { config: IntervalConfig; startedAtMs: number } | null;
export const loadIntervalRun = (db: Db) => readState<IntervalRun>(db, 'interval_run', null);
export const saveIntervalRun = (db: Db, run: IntervalRun) => writeState(db, 'interval_run', run);
