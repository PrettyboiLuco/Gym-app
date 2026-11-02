// Datenbankzugriffe fürs Training. Grundsätze aus dem Plan:
// - Eine Planänderung erzeugt eine neue Version; alte Versionen und ihre Trainings bleiben (TRAIN-010–012).
// - Geplante und tatsächliche Werte sind getrennt; jeder Satz wird sofort gespeichert (TRAIN-013).
// - Letzte Leistung nur aus derselben Übung (TRAIN-014).

import type { CardioActivity } from '@/domain/cardio';
import type { Equipment, ExerciseKind, Measure, MovementPattern, MuscleGroup, Sides } from '@/domain/exercises';
import { estimateOneRepMax, setOrder, type LoadMode, type PlateSetup, type SetType } from '@/domain/logger';
import type { PastSession } from '@/domain/progression';
import { daysSince } from '@/domain/progression';
import type { PreviousBest } from '@/domain/summary';
import { localDay, timeZone } from '@/domain/time';
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
  kind: ExerciseKind;
  sides: Sides;
  holdSeconds: number | null;
  measure: Measure;
  /** Bewegungsmuster einer eigenen Übung (Phase 8.1); Startübungen: siehe domain/exercises.ts. */
  pattern: MovementPattern | null;
  /** Gewichtsart (A1): null = aus der Übung abgeleitet (siehe domain/logger.ts loadModeOf). */
  loadMode: LoadMode | null;
};

/** Eigenschaften einer eigenen Übung (UX-013, STRETCH-007, UX-011). */
export type ExerciseFields = Pick<Exercise, 'equipment' | 'muscleGroup' | 'kind' | 'sides' | 'holdSeconds' | 'measure' | 'pattern'> & {
  loadMode?: LoadMode | null;
};

const EXERCISE_COLUMNS = `id, name_key AS nameKey, custom_name AS customName, equipment, muscle_group AS muscleGroup,
  kind, sides, hold_seconds AS holdSeconds, measure, pattern, load_mode AS loadMode`;

export function listExercises(db: Db) {
  return db.getAllAsync<Exercise>(`SELECT ${EXERCISE_COLUMNS} FROM exercise`);
}

const KRAFT_DEFAULTS = { kind: 'kraft', sides: 'beidseitig', holdSeconds: null, measure: 'wdh', pattern: null } as const;

export async function addCustomExercise(db: Db, name: string, equipment: Equipment, muscleGroup: MuscleGroup, more: Partial<ExerciseFields> = {}) {
  const id = newId();
  const f = { ...KRAFT_DEFAULTS, ...more };
  await db.runAsync(
    `INSERT INTO exercise (id, name_key, custom_name, equipment, muscle_group, created_at_utc, kind, sides, hold_seconds, measure, pattern,
     load_mode) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    name.trim(),
    equipment,
    muscleGroup,
    nowUtc(),
    f.kind,
    f.sides,
    f.holdSeconds,
    f.measure,
    f.kind === 'kraft' ? f.pattern : null,
    f.kind === 'kraft' ? (f.loadMode ?? null) : null
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
  muscleGroup: MuscleGroup,
  more: Partial<ExerciseFields> = {}
) {
  const f = { ...KRAFT_DEFAULTS, ...more };
  await db.runAsync(
    `UPDATE exercise SET custom_name = ?, equipment = ?, muscle_group = ?, kind = ?, sides = ?, hold_seconds = ?, measure = ?,
     pattern = ?, load_mode = ? WHERE id = ? AND name_key IS NULL`,
    name.trim(),
    equipment,
    muscleGroup,
    f.kind,
    f.sides,
    f.holdSeconds,
    f.measure,
    f.kind === 'kraft' ? f.pattern : null,
    f.kind === 'kraft' ? (f.loadMode ?? null) : null,
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
  const version = await db.getFirstAsync<{ id: string; name: string }>('SELECT id, name FROM plan_version WHERE plan_id = ? AND active = 1', planId);
  return version ? loadVersionDraft(db, version.id, version.name) : null;
}

async function loadVersionDraft(db: Db, versionId: string, name: string): Promise<PlanDraft> {
  const days = await db.getAllAsync<{ id: string; name: string; warmup: number; cooldown: number }>(
    'SELECT id, name, warmup, cooldown FROM plan_day WHERE plan_version_id = ? ORDER BY position',
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
      targetSeconds: number | null;
      rir: string | null;
      note: string | null;
      label: string | null;
      superset: number | null;
    }>(
      `SELECT exercise_id AS exerciseId, sets, reps_min AS repsMin, reps_max AS repsMax, rest_seconds AS restSeconds,
       target_seconds AS targetSeconds, rir, note, label, superset FROM plan_item WHERE plan_day_id = ? ORDER BY position`,
      day.id
    );
    // RIR, Hinweis und Anzeigename nur mitgeben, wenn gesetzt – so bleibt ein Plan ohne diese Angaben unverändert.
    const clean = items.map(({ rir, note, label, superset, ...rest }) => ({
      ...rest,
      ...(rir ? { rir } : {}),
      ...(note ? { note } : {}),
      ...(label ? { label } : {}),
      ...(superset != null ? { superset } : {}),
    }));
    const cardio = await db.getAllAsync<{ activity: CardioActivity; minutes: number; atEnd: number; note: string | null }>(
      'SELECT activity, minutes, at_end AS atEnd, note FROM plan_cardio WHERE plan_day_id = ? ORDER BY position',
      day.id
    );
    draft.days.push({
      name: day.name,
      items: clean,
      warmup: day.warmup === 1,
      cooldown: day.cooldown === 1,
      // Cardio nur mitgeben, wenn vorhanden – so bleibt ein Plan ohne Cardio unverändert.
      ...(cardio.length
        ? { cardio: cardio.map((c) => ({ activity: c.activity, minutes: c.minutes, atEnd: c.atEnd === 1, ...(c.note ? { note: c.note } : {}) })) }
        : {}),
    });
  }
  return draft;
}

/** Zusatzangaben einer neuen Version: Grund und Befristung (TRAIN-008). */
export type VersionOptions = { note?: string | null; validUntil?: string | null; returnVersionId?: string | null };

/**
 * Speichert einen Plan. Ohne planId entsteht ein neuer Plan (Version 1), sonst eine neue
 * Version, die die bisherige ablöst. Alles in einer Transaktion: scheitert etwas, bleibt der
 * alte Stand vollständig erhalten.
 */
export async function savePlan(db: Db, planId: string | null, draft: PlanDraft, options: VersionOptions = {}): Promise<string> {
  const id = planId ?? newId();
  await db.withTransactionAsync(async () => {
    const now = nowUtc();
    if (!planId) await db.runAsync('INSERT INTO plan (id, created_at_utc) VALUES (?, ?)', id, now);
    const last = await db.getFirstAsync<{ version: number }>('SELECT MAX(version) AS version FROM plan_version WHERE plan_id = ?', id);
    await db.runAsync('UPDATE plan_version SET active = 0 WHERE plan_id = ?', id);
    const versionId = newId();
    await db.runAsync(
      `INSERT INTO plan_version (id, plan_id, version, name, active, created_at_utc, note, valid_until, return_version_id)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      versionId,
      id,
      (last?.version ?? 0) + 1,
      draft.name.trim(),
      now,
      options.note ?? null,
      options.validUntil ?? null,
      options.validUntil ? (options.returnVersionId ?? null) : null
    );
    for (const [dayIndex, day] of draft.days.entries()) {
      const dayId = newId();
      await db.runAsync(
        'INSERT INTO plan_day (id, plan_version_id, position, name, warmup, cooldown) VALUES (?, ?, ?, ?, ?, ?)',
        dayId,
        versionId,
        dayIndex,
        day.name.trim(),
        day.warmup === false ? 0 : 1,
        day.cooldown === false ? 0 : 1
      );
      for (const [itemIndex, item] of day.items.entries()) {
        const timed = item.targetSeconds != null;
        await db.runAsync(
          `INSERT INTO plan_item (id, plan_day_id, position, exercise_id, sets, reps_min, reps_max, rest_seconds, target_seconds, rir, note, label, superset)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          newId(),
          dayId,
          itemIndex,
          item.exerciseId,
          item.sets,
          timed ? 1 : item.repsMin,
          timed ? 1 : item.repsMax,
          item.restSeconds,
          item.targetSeconds ?? null,
          item.rir?.trim() || null,
          item.note?.trim() || null,
          item.label?.trim() || null,
          item.superset ?? null
        );
      }
      for (const [position, c] of (day.cardio ?? []).entries()) {
        await db.runAsync(
          'INSERT INTO plan_cardio (id, plan_day_id, position, activity, minutes, at_end, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
          newId(),
          dayId,
          position,
          c.activity,
          c.minutes,
          c.atEnd === false ? 0 : 1,
          c.note?.trim() || null
        );
      }
    }
  });
  return id;
}

export type PlanVersionInfo = {
  id: string;
  version: number;
  name: string;
  active: number;
  createdAt: string;
  note: string | null;
  /** Befristet bis einschließlich (YYYY-MM-DD), danach gilt returnVersionId wieder. */
  validUntil: string | null;
  returnVersionId: string | null;
};

const VERSION_COLUMNS = `id, version, name, active, created_at_utc AS createdAt, note, valid_until AS validUntil,
  return_version_id AS returnVersionId`;

export function listPlanVersions(db: Db, planId: string) {
  return db.getAllAsync<PlanVersionInfo>(`SELECT ${VERSION_COLUMNS} FROM plan_version WHERE plan_id = ? ORDER BY version DESC`, planId);
}

export function activeVersion(db: Db, planId: string) {
  return db.getFirstAsync<PlanVersionInfo>(`SELECT ${VERSION_COLUMNS} FROM plan_version WHERE plan_id = ? AND active = 1`, planId);
}

/**
 * Macht eine frühere Version wieder aktiv. Trainings aus späteren Versionen bleiben erhalten (TRAIN-011).
 * Wird eine abgelaufene befristete Version bewusst wieder gewählt, gilt sie ab jetzt ohne Frist.
 */
export async function activatePlanVersion(db: Db, planId: string, versionId: string, today?: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE plan_version SET active = 0 WHERE plan_id = ?', planId);
    await db.runAsync('UPDATE plan_version SET active = 1 WHERE id = ? AND plan_id = ?', versionId, planId);
    if (today) {
      await db.runAsync('UPDATE plan_version SET valid_until = NULL, return_version_id = NULL WHERE id = ? AND valid_until < ?', versionId, today);
    }
  });
}

/**
 * Beendet abgelaufene befristete Versionen (TRAIN-008): Am Tag nach valid_until gilt wieder die Version,
 * von der aus geändert wurde. Gibt die Namen der betroffenen Pläne zurück (für einen Hinweis).
 */
export function expireTemporaryPlans(db: Db, today: string): Promise<string[]> {
  // „Heute“ und „Training“ können gleichzeitig laden; nie zwei Transaktionen parallel starten.
  expiring ??= expireNow(db, today).finally(() => {
    expiring = null;
  });
  return expiring;
}

let expiring: Promise<string[]> | null = null;

async function expireNow(db: Db, today: string): Promise<string[]> {
  const expired = await db.getAllAsync<{ planId: string; returnVersionId: string; name: string }>(
    `SELECT v.plan_id AS planId, v.return_version_id AS returnVersionId, r.name FROM plan_version v
     JOIN plan_version r ON r.id = v.return_version_id
     WHERE v.active = 1 AND v.valid_until IS NOT NULL AND v.valid_until < ?`,
    today
  );
  for (const row of expired) await activatePlanVersion(db, row.planId, row.returnVersionId);
  return expired.map((row) => row.name);
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
  /** Aufwärmen/Cool-down vorschlagen (vom Plantag; freies Training: ja). */
  warmup: number | null;
  cooldown: number | null;
  /** Notiz zum ganzen Training (A1). */
  note: string | null;
};

const SESSION_SELECT = `SELECT s.id, s.status, s.abort_reason AS abortReason, s.started_at_utc AS startedAt, s.note,
  s.finished_at_utc AS finishedAt, v.name AS planName, d.name AS dayName, d.position AS dayPosition, v.plan_id AS planId,
  d.warmup AS warmup, d.cooldown AS cooldown
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

/** Zwei Starts innerhalb dieser Zeit gelten als Doppeltipp. */
const DOUBLE_START_MS = 10_000;

/** Startet ein Training. Mit Plantag werden die geplanten Sätze als offene Einträge angelegt. */
export async function startSession(db: Db, planDayId: string | null): Promise<string> {
  // Doppeltipp-Schutz: Wurde dasselbe Training gerade eben (≤ 10 s) gestartet, gilt dieses (Phase 1 Scan, F2).
  const recent = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM workout_session WHERE status = 'aktiv' AND plan_day_id IS ? AND started_at_utc >= ? ORDER BY started_at_utc DESC LIMIT 1`,
    planDayId,
    new Date(Date.now() - DOUBLE_START_MS).toISOString()
  );
  if (recent) return recent.id;
  const id = newId();
  await db.withTransactionAsync(async () => {
    await db.runAsync("INSERT INTO workout_session (id, plan_day_id, status, started_at_utc) VALUES (?, ?, 'aktiv', ?)", id, planDayId, nowUtc());
    if (!planDayId) return;
    const items = await db.getAllAsync<{
      exerciseId: string;
      sets: number;
      repsMin: number;
      repsMax: number;
      restSeconds: number;
      targetSeconds: number | null;
      superset: number | null;
    }>(
      `SELECT exercise_id AS exerciseId, sets, reps_min AS repsMin, reps_max AS repsMax, rest_seconds AS restSeconds,
       target_seconds AS targetSeconds, superset FROM plan_item WHERE plan_day_id = ? ORDER BY position`,
      planDayId
    );
    // Supersätze laufen im Wechsel, Pause erst nach der Runde (domain/logger.ts setOrder).
    for (const [position, slot] of setOrder(items).entries()) {
      const item = items[slot.itemIndex];
      const timed = item.targetSeconds !== null;
      await db.runAsync(
        `INSERT INTO set_log (id, session_id, exercise_id, position, planned_reps_min, planned_reps_max, rest_seconds,
         planned_seconds, superset) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        id,
        item.exerciseId,
        position,
        timed ? null : item.repsMin,
        timed ? null : item.repsMax,
        slot.restSeconds,
        item.targetSeconds,
        slot.superset
      );
    }
    // Geplantes Cardio als offene Einträge (A2).
    const cardio = await db.getAllAsync<{ activity: string; minutes: number; atEnd: number }>(
      'SELECT activity, minutes, at_end AS atEnd FROM plan_cardio WHERE plan_day_id = ? ORDER BY position',
      planDayId
    );
    for (const c of cardio) {
      await db.runAsync(
        `INSERT INTO cardio_log (id, session_id, activity, day, planned_minutes, at_end, created_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        id,
        c.activity,
        localDay(new Date(), timeZone),
        c.minutes,
        c.atEnd,
        nowUtc()
      );
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
  /** Zeit-Satz (UX-011): geplante und tatsächliche Sekunden. */
  plannedSeconds: number | null;
  seconds: number | null;
  completedAt: string | null;
  /** A1: Satzart, Wiederholungen in Reserve (0–5), Notiz, Supersatz-Gruppe. */
  setType: SetType;
  rir: number | null;
  note: string | null;
  superset: number | null;
};

export function listSessionSets(db: Db, sessionId: string) {
  return db.getAllAsync<SetRow>(
    `SELECT id, exercise_id AS exerciseId, position, planned_reps_min AS plannedRepsMin,
       planned_reps_max AS plannedRepsMax, rest_seconds AS restSeconds, weight_kg AS weightKg, reps,
       planned_seconds AS plannedSeconds, seconds, completed_at_utc AS completedAt,
       set_type AS setType, rir, note, superset
     FROM set_log WHERE session_id = ? ORDER BY position`,
    sessionId
  );
}

export async function completeSet(db: Db, setId: string, weightKg: number, reps: number) {
  await db.runAsync('UPDATE set_log SET weight_kg = ?, reps = ?, completed_at_utc = ? WHERE id = ?', weightKg, reps, nowUtc(), setId);
}

/** Zeit-Satz erledigt (z. B. Plank 45 s); Gewicht optional, Standard 0 (UX-011). */
export async function completeTimedSet(db: Db, setId: string, seconds: number, weightKg = 0) {
  await db.runAsync('UPDATE set_log SET seconds = ?, weight_kg = ?, reps = NULL, completed_at_utc = ? WHERE id = ?', seconds, weightKg, nowUtc(), setId);
}

export async function reopenSet(db: Db, setId: string) {
  await db.runAsync('UPDATE set_log SET completed_at_utc = NULL WHERE id = ?', setId);
}

/** Satzart, RIR oder Notiz eines Satzes ändern (auch nach dem Abhaken). */
export async function updateSetDetails(db: Db, setId: string, change: { setType?: SetType; rir?: number | null; note?: string | null }) {
  if (change.setType !== undefined) await db.runAsync('UPDATE set_log SET set_type = ? WHERE id = ?', change.setType, setId);
  if (change.rir !== undefined) await db.runAsync('UPDATE set_log SET rir = ? WHERE id = ?', change.rir, setId);
  if (change.note !== undefined) await db.runAsync('UPDATE set_log SET note = ? WHERE id = ?', change.note?.trim() || null, setId);
}

/** Notiz zum ganzen Training. */
export async function setSessionNote(db: Db, sessionId: string, note: string | null) {
  await db.runAsync('UPDATE workout_session SET note = ? WHERE id = ?', note?.trim() || null, sessionId);
}

/**
 * Aufwärmsätze vor dem ersten Satz einer Übung einfügen (A1). Gibt die neuen Satz-IDs in Reihenfolge zurück,
 * damit die Oberfläche die vorgeschlagenen Gewichte in die Felder schreiben kann (gespeichert wird erst mit ✓).
 */
export async function addWarmupSets(db: Db, sessionId: string, exerciseId: string, reps: number[]): Promise<string[]> {
  const ids = reps.map(() => newId());
  await db.withTransactionAsync(async () => {
    const first = await db.getFirstAsync<{ position: number; superset: number | null }>(
      'SELECT position, superset FROM set_log WHERE session_id = ? AND exercise_id = ? ORDER BY position LIMIT 1',
      sessionId,
      exerciseId
    );
    const at = first?.position ?? 0;
    // Platz schaffen: alle Sätze ab dieser Stelle rücken nach hinten.
    await db.runAsync('UPDATE set_log SET position = position + ? WHERE session_id = ? AND position >= ?', reps.length, sessionId, at);
    for (const [i, r] of reps.entries()) {
      await db.runAsync(
        `INSERT INTO set_log (id, session_id, exercise_id, position, planned_reps_min, planned_reps_max, rest_seconds, set_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'aufwaermen')`,
        ids[i],
        sessionId,
        exerciseId,
        at + i,
        r,
        r,
        60
      );
    }
  });
  return ids;
}

/** Zusätzlicher Satz für eine Übung, übernimmt Pause und Zielbereich des letzten Satzes. */
export async function addSet(db: Db, sessionId: string, exerciseId: string) {
  const last = await db.getFirstAsync<{ restSeconds: number; repsMin: number | null; repsMax: number | null; plannedSeconds: number | null }>(
    `SELECT rest_seconds AS restSeconds, planned_reps_min AS repsMin, planned_reps_max AS repsMax,
     planned_seconds AS plannedSeconds
     FROM set_log WHERE session_id = ? AND exercise_id = ? AND set_type <> 'aufwaermen' ORDER BY position DESC LIMIT 1`,
    sessionId,
    exerciseId
  );
  const max = await db.getFirstAsync<{ position: number | null }>('SELECT MAX(position) AS position FROM set_log WHERE session_id = ?', sessionId);
  await db.runAsync(
    `INSERT INTO set_log (id, session_id, exercise_id, position, planned_reps_min, planned_reps_max, rest_seconds,
     planned_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    sessionId,
    exerciseId,
    (max?.position ?? -1) + 1,
    last?.repsMin ?? null,
    last?.repsMax ?? null,
    last?.restSeconds ?? 90,
    last?.plannedSeconds ?? null
  );
}

/** Beendet ein Training. Nicht erledigte geplante Sätze bleiben als „nicht gemacht“ stehen. */
export async function finishSession(
  db: Db,
  sessionId: string,
  status: 'abgeschlossen' | 'abgebrochen',
  reason?: string,
  /** Ende zu einem früheren Zeitpunkt (vergessenes Training: Zeit des letzten Satzes). */
  finishedAtUtc?: string
) {
  await db.runAsync(
    'UPDATE workout_session SET status = ?, abort_reason = ?, finished_at_utc = ? WHERE id = ?',
    status,
    reason ?? null,
    finishedAtUtc ?? nowUtc(),
    sessionId
  );
}

export type LastPerformance = { weightKg: number; reps: number | null; seconds: number | null }[];

/** Erledigte Sätze dieser Übung aus dem letzten anderen Training. */
export async function lastPerformance(db: Db, exerciseId: string, excludeSessionId: string): Promise<LastPerformance> {
  const last = await db.getFirstAsync<{ sessionId: string }>(
    `SELECT session_id AS sessionId FROM set_log
     WHERE exercise_id = ? AND session_id <> ? AND completed_at_utc IS NOT NULL AND set_type <> 'aufwaermen'
     ORDER BY completed_at_utc DESC LIMIT 1`,
    exerciseId,
    excludeSessionId
  );
  if (!last) return [];
  return db.getAllAsync<{ weightKg: number; reps: number | null; seconds: number | null }>(
    `SELECT weight_kg AS weightKg, reps, seconds FROM set_log
     WHERE session_id = ? AND exercise_id = ? AND completed_at_utc IS NOT NULL AND set_type <> 'aufwaermen' ORDER BY position`,
    last.sessionId,
    exerciseId
  );
}

/**
 * Gerät belegt (TRAIN-016): offene Sätze einer Übung in diesem Training auf eine Ersatzübung umstellen.
 * Erledigte Sätze und der Plan bleiben unverändert; die Ersatzübung hat ihren eigenen Verlauf (TRAIN-014).
 */
export async function replaceOpenSets(db: Db, sessionId: string, fromExerciseId: string, toExerciseId: string) {
  await db.runAsync(
    'UPDATE set_log SET exercise_id = ? WHERE session_id = ? AND exercise_id = ? AND completed_at_utc IS NULL',
    toExerciseId,
    sessionId,
    fromExerciseId
  );
}

/**
 * Frühere Einheiten einer Übung (neueste zuerst) mit ihren erledigten Sätzen, für die Steigerungsregeln
 * (TRAIN-018). Abgebrochene Trainings zählen nicht.
 */
export async function exerciseHistory(db: Db, exerciseId: string, excludeSessionId: string, nowMs: number, limit = 3): Promise<PastSession[]> {
  const sessions = await db.getAllAsync<{ sessionId: string; at: string }>(
    `SELECT l.session_id AS sessionId, MAX(l.completed_at_utc) AS at FROM set_log l
     JOIN workout_session s ON s.id = l.session_id
     WHERE l.exercise_id = ? AND l.session_id <> ? AND l.completed_at_utc IS NOT NULL AND s.status <> 'abgebrochen'
       AND l.set_type <> 'aufwaermen'
     GROUP BY l.session_id ORDER BY at DESC, s.rowid DESC LIMIT ?`,
    exerciseId,
    excludeSessionId,
    limit
  );
  const result: PastSession[] = [];
  for (const s of sessions) {
    const sets = await db.getAllAsync<{ weightKg: number; reps: number | null; seconds: number | null; rir: number | null }>(
      `SELECT weight_kg AS weightKg, reps, seconds, rir FROM set_log
       WHERE session_id = ? AND exercise_id = ? AND completed_at_utc IS NOT NULL AND set_type <> 'aufwaermen' ORDER BY position`,
      s.sessionId,
      exerciseId
    );
    result.push({ daysAgo: daysSince(s.at, nowMs), sets });
  }
  return result;
}

/** Ende des letzten abgeschlossenen Trainings (für den Hinweis zum Wiedereinstieg, TRAIN-015). */
export async function lastFinishedAt(db: Db): Promise<string | null> {
  const row = await db.getFirstAsync<{ at: string | null }>("SELECT MAX(finished_at_utc) AS at FROM workout_session WHERE status = 'abgeschlossen'");
  return row?.at ?? null;
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

/** Steigerungsvorschläge im Training anzeigen (Standard: an, TRAIN-018). */
export const loadProgressionOn = (db: Db) => readState<boolean>(db, 'progression_on', true);
export const saveProgressionOn = (db: Db, on: boolean) => writeState(db, 'progression_on', on);

export type IntervalRun = { config: IntervalConfig; startedAtMs: number } | null;
export const loadIntervalRun = (db: Db) => readState<IntervalRun>(db, 'interval_run', null);
export const saveIntervalRun = (db: Db, run: IntervalRun) => writeState(db, 'interval_run', run);

/**
 * Bisher Bestes je Übung aus früheren, nicht abgebrochenen Trainings (vor `beforeIso`), für die
 * Bestleistungen nach einem Training. Übungen ohne früheren Satz fehlen in der Liste.
 */
export async function previousBests(db: Db, exerciseIds: string[], excludeSessionId: string, beforeIso: string): Promise<PreviousBest[]> {
  const result: PreviousBest[] = [];
  for (const exerciseId of exerciseIds) {
    const rows = await db.getAllAsync<{ weightKg: number | null; reps: number | null; seconds: number | null }>(
      `SELECT l.weight_kg AS weightKg, l.reps, l.seconds FROM set_log l
       JOIN workout_session s ON s.id = l.session_id
       WHERE l.exercise_id = ? AND l.session_id <> ? AND l.completed_at_utc IS NOT NULL
         AND s.status <> 'abgebrochen' AND s.started_at_utc < ? AND l.set_type <> 'aufwaermen'`,
      exerciseId,
      excludeSessionId,
      beforeIso
    );
    if (rows.length === 0) continue;
    const lifted = rows.filter((r) => r.reps != null && r.reps > 0);
    const maxKg = lifted.length ? Math.max(...lifted.map((r) => r.weightKg ?? 0)) : null;
    const minKg = lifted.length ? Math.min(...lifted.map((r) => r.weightKg ?? 0)) : null;
    result.push({
      exerciseId,
      maxKg,
      minKg,
      repsAtMaxKg: maxKg === null ? null : Math.max(...lifted.filter((r) => (r.weightKg ?? 0) === maxKg).map((r) => r.reps ?? 0)),
      maxReps: lifted.length ? Math.max(...lifted.map((r) => r.reps ?? 0)) : null,
      maxSeconds: rows.some((r) => r.seconds != null) ? Math.max(...rows.map((r) => r.seconds ?? 0)) : null,
    });
  }
  return result;
}

/** Bester Satz je abgeschlossenem Training einer Übung (für den Kraftverlauf), älteste zuerst. */
export type ExerciseBest = {
  sessionId: string;
  at: string;
  weightKg: number;
  reps: number | null;
  seconds: number | null;
  /** Bestes geschätztes 1RM dieses Trainings (A1), null ohne passenden Satz. */
  e1rm: number | null;
};

export async function exerciseBests(db: Db, exerciseId: string, loadMode?: LoadMode): Promise<ExerciseBest[]> {
  const rows = await db.getAllAsync<{ sessionId: string; at: string; weightKg: number | null; reps: number | null; seconds: number | null }>(
    `SELECT l.session_id AS sessionId, s.started_at_utc AS at, l.weight_kg AS weightKg, l.reps, l.seconds
     FROM set_log l JOIN workout_session s ON s.id = l.session_id
     WHERE l.exercise_id = ? AND l.completed_at_utc IS NOT NULL AND s.status <> 'abgebrochen' AND l.set_type <> 'aufwaermen'
     ORDER BY s.started_at_utc`,
    exerciseId
  );
  const mode = loadMode ?? 'normal';
  const bySession = new Map<string, ExerciseBest>();
  for (const r of rows) {
    const prev = bySession.get(r.sessionId);
    const kg = r.weightKg ?? 0;
    const e1rm = mode === 'unterstuetzt' || r.reps == null ? null : estimateOneRepMax(kg, r.reps);
    const bestE1rm = e1rm !== null && (prev?.e1rm == null || e1rm > prev.e1rm) ? e1rm : (prev?.e1rm ?? null);
    // Gegengewicht: weniger ist besser.
    const heavier = mode === 'unterstuetzt' ? kg < (prev?.weightKg ?? Infinity) : kg > (prev?.weightKg ?? -Infinity);
    const better =
      !prev || (r.seconds != null ? (r.seconds ?? 0) > (prev.seconds ?? 0) : heavier || (kg === prev.weightKg && (r.reps ?? 0) > (prev.reps ?? 0)));
    if (better) bySession.set(r.sessionId, { sessionId: r.sessionId, at: r.at, weightKg: kg, reps: r.reps, seconds: r.seconds, e1rm: bestE1rm });
    else if (prev) prev.e1rm = bestE1rm;
  }
  return [...bySession.values()].sort((a, b) => a.at.localeCompare(b.at));
}

/** RIR und Hinweise des Plantags eines Trainings, je Übung (für die Anzeige im Training). */
export type PlanHint = { rir: string | null; note: string | null; label: string | null };

/** RIR, Hinweis und Anzeigename der Plan-Übungen eines Trainings, je Übung (erste Nennung zählt). */
export async function planHintsForSession(db: Db, sessionId: string): Promise<Record<string, PlanHint>> {
  const rows = await db.getAllAsync<{ exerciseId: string } & PlanHint>(
    `SELECT i.exercise_id AS exerciseId, i.rir, i.note, i.label FROM plan_item i
     JOIN workout_session s ON s.plan_day_id = i.plan_day_id
     WHERE s.id = ? ORDER BY i.position`,
    sessionId
  );
  const result: Record<string, PlanHint> = {};
  for (const r of rows) if (!result[r.exerciseId]) result[r.exerciseId] = { rir: r.rir, note: r.note, label: r.label };
  return result;
}

/** Stange und vorhandene Scheiben für den Scheibenrechner (A1), in der Anzeigeeinheit. */
export const loadPlateSetup = (db: Db) => readState<PlateSetup | null>(db, 'plate_setup', null);
export const savePlateSetup = (db: Db, setup: PlateSetup) => writeState(db, 'plate_setup', setup);
