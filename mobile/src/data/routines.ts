// Datenbankzugriffe für Dehnroutinen, HIIT-Abläufe, das Protokoll absolvierter Einheiten und den
// Beweglichkeitstest (Register STRETCH-003/005, HIIT-004/005). Grundsätze wie bei Plänen: Eine
// Änderung erzeugt eine neue Version; alte Versionen und ihr Protokoll bleiben erhalten.

import type { RoutineDraft, RoutineKind } from '@/domain/routines';
import { stepsTotalSeconds, type RunKind, type TimedRun } from '@/domain/timeline';

import { readState, writeState } from './app-state';
import { newId, nowUtc, type Db } from './db';

// ------------------------------------------------------------------------------------ Routinen

export type RoutineSummary = {
  routineId: string;
  versionId: string;
  version: number;
  kind: RoutineKind;
  name: string;
  itemCount: number;
};

export function listRoutines(db: Db, kind: RoutineKind) {
  return db.getAllAsync<RoutineSummary>(
    `SELECT r.id AS routineId, v.id AS versionId, v.version, r.kind, v.name,
       (SELECT COUNT(*) FROM routine_item i WHERE i.routine_version_id = v.id) AS itemCount
     FROM routine r JOIN routine_version v ON v.routine_id = r.id
     WHERE r.kind = ? AND v.active = 1 ORDER BY v.name COLLATE NOCASE`,
    kind
  );
}

type VersionRow = {
  id: string;
  name: string;
  switchSeconds: number;
  transitionSeconds: number;
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  roundRestSeconds: number;
};

const VERSION_COLUMNS = `id, name, switch_seconds AS switchSeconds, transition_seconds AS transitionSeconds,
  work_seconds AS workSeconds, rest_seconds AS restSeconds, rounds, round_rest_seconds AS roundRestSeconds`;

async function versionDraft(db: Db, kind: RoutineKind, v: VersionRow): Promise<RoutineDraft> {
  const items = await db.getAllAsync<{ exerciseId: string; seconds: number }>(
    'SELECT exercise_id AS exerciseId, seconds FROM routine_item WHERE routine_version_id = ? ORDER BY position',
    v.id
  );
  const { id: _id, ...rest } = v;
  return { kind, ...rest, items };
}

/** Aktive Version einer Routine als bearbeitbarer Entwurf. */
export async function loadRoutineDraft(db: Db, routineId: string): Promise<{ versionId: string; draft: RoutineDraft } | null> {
  const r = await db.getFirstAsync<{ kind: RoutineKind }>('SELECT kind FROM routine WHERE id = ?', routineId);
  const v = await db.getFirstAsync<VersionRow>(
    `SELECT ${VERSION_COLUMNS} FROM routine_version WHERE routine_id = ? AND active = 1`,
    routineId
  );
  if (!r || !v) return null;
  return { versionId: v.id, draft: await versionDraft(db, r.kind, v) };
}

/** Eine bestimmte Version (z. B. für ein Protokoll oder zum Starten). */
export async function loadRoutineVersion(db: Db, versionId: string): Promise<RoutineDraft | null> {
  const v = await db.getFirstAsync<VersionRow & { kind: RoutineKind }>(
    `SELECT v.id, v.name, v.switch_seconds AS switchSeconds, v.transition_seconds AS transitionSeconds,
       v.work_seconds AS workSeconds, v.rest_seconds AS restSeconds, v.rounds, v.round_rest_seconds AS roundRestSeconds, r.kind
     FROM routine_version v JOIN routine r ON r.id = v.routine_id WHERE v.id = ?`,
    versionId
  );
  if (!v) return null;
  const { kind, ...row } = v;
  return versionDraft(db, kind, row);
}

/** Speichert eine Routine als neue Version (ohne routineId: neue Routine, Version 1). */
export async function saveRoutine(db: Db, routineId: string | null, draft: RoutineDraft): Promise<string> {
  const id = routineId ?? newId();
  await db.withTransactionAsync(async () => {
    const now = nowUtc();
    if (!routineId) await db.runAsync('INSERT INTO routine (id, kind, created_at_utc) VALUES (?, ?, ?)', id, draft.kind, now);
    const last = await db.getFirstAsync<{ version: number | null }>(
      'SELECT MAX(version) AS version FROM routine_version WHERE routine_id = ?',
      id
    );
    await db.runAsync('UPDATE routine_version SET active = 0 WHERE routine_id = ?', id);
    const versionId = newId();
    await db.runAsync(
      `INSERT INTO routine_version (id, routine_id, version, name, active, switch_seconds, transition_seconds, work_seconds,
       rest_seconds, rounds, round_rest_seconds, created_at_utc) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      versionId,
      id,
      (last?.version ?? 0) + 1,
      draft.name.trim(),
      draft.switchSeconds,
      draft.transitionSeconds,
      draft.workSeconds,
      draft.restSeconds,
      draft.rounds,
      draft.roundRestSeconds,
      now
    );
    for (const [position, item] of draft.items.entries()) {
      await db.runAsync(
        'INSERT INTO routine_item (id, routine_version_id, position, exercise_id, seconds) VALUES (?, ?, ?, ?, ?)',
        newId(),
        versionId,
        position,
        item.exerciseId,
        draft.kind === 'hiit' ? draft.workSeconds : item.seconds
      );
    }
  });
  return id;
}

export type RoutineVersionInfo = { id: string; version: number; name: string; active: number; createdAt: string };

export function listRoutineVersions(db: Db, routineId: string) {
  return db.getAllAsync<RoutineVersionInfo>(
    `SELECT id, version, name, active, created_at_utc AS createdAt FROM routine_version
     WHERE routine_id = ? ORDER BY version DESC`,
    routineId
  );
}

/** Frühere Version wieder verwenden; das Protokoll späterer Versionen bleibt (STRETCH-003). */
export async function activateRoutineVersion(db: Db, routineId: string, versionId: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE routine_version SET active = 0 WHERE routine_id = ?', routineId);
    await db.runAsync('UPDATE routine_version SET active = 1 WHERE id = ? AND routine_id = ?', versionId, routineId);
  });
}

/** Aus der Liste entfernen; Versionen und Protokoll bleiben. */
export async function archiveRoutine(db: Db, routineId: string) {
  await db.runAsync('UPDATE routine_version SET active = 0 WHERE routine_id = ?', routineId);
}

// ------------------------------------------------------------------------------------ Protokoll

export type TimedSession = {
  id: string;
  kind: RunKind;
  name: string;
  source: string;
  routineVersionId: string | null;
  workoutSessionId: string | null;
  status: 'aktiv' | 'abgeschlossen' | 'abgebrochen';
  abortReason: string | null;
  plannedSeconds: number;
  doneSeconds: number | null;
  roundsDone: number | null;
  items: string;
  startedAt: string;
  finishedAt: string | null;
};

const SESSION_COLUMNS = `id, kind, name, source, routine_version_id AS routineVersionId, workout_session_id AS workoutSessionId,
  status, abort_reason AS abortReason, planned_seconds AS plannedSeconds, done_seconds AS doneSeconds,
  rounds_done AS roundsDone, items, started_at_utc AS startedAt, finished_at_utc AS finishedAt`;

/** Legt die Einheit im Protokoll an und speichert den laufenden Ablauf, damit er einen Neustart übersteht. */
export async function startTimedSession(
  db: Db,
  info: { kind: RunKind; name: string; source: string; routineVersionId: string | null; workoutSessionId: string | null },
  run: Omit<TimedRun, 'sessionId'>
): Promise<TimedRun> {
  const id = newId();
  const exerciseIds = [...new Set(run.steps.map((s) => s.exerciseId))];
  await db.runAsync(
    `INSERT INTO timed_session (id, kind, name, source, routine_version_id, workout_session_id, status, planned_seconds,
     items, started_at_utc) VALUES (?, ?, ?, ?, ?, ?, 'aktiv', ?, ?, ?)`,
    id,
    info.kind,
    info.name,
    info.source,
    info.routineVersionId,
    info.workoutSessionId,
    stepsTotalSeconds(run.steps),
    JSON.stringify(exerciseIds),
    new Date(run.startedAtMs).toISOString()
  );
  const full: TimedRun = { ...run, sessionId: id };
  await saveTimedRun(db, full);
  return full;
}

/** Beendet die Einheit: abgeschlossen oder abgebrochen (z. B. „schmerz“, STRETCH-006/HIIT-007). */
export async function finishTimedSession(
  db: Db,
  sessionId: string,
  status: 'abgeschlossen' | 'abgebrochen',
  result: { doneSeconds: number; roundsDone: number | null; reason?: string }
) {
  await db.runAsync(
    `UPDATE timed_session SET status = ?, abort_reason = ?, done_seconds = ?, rounds_done = ?, finished_at_utc = ?
     WHERE id = ? AND status = 'aktiv'`,
    status,
    result.reason ?? null,
    result.doneSeconds,
    result.roundsDone,
    nowUtc(),
    sessionId
  );
  await saveTimedRun(db, null);
}

export function listTimedSessions(db: Db, limit = 50) {
  return db.getAllAsync<TimedSession>(`SELECT ${SESSION_COLUMNS} FROM timed_session ORDER BY started_at_utc DESC LIMIT ?`, limit);
}

export function getTimedSession(db: Db, id: string) {
  return db.getFirstAsync<TimedSession>(`SELECT ${SESSION_COLUMNS} FROM timed_session WHERE id = ?`, id);
}

/** Aufwärmen/Cool-down, die zu einem Krafttraining gehören. */
export function timedSessionsForWorkout(db: Db, workoutSessionId: string) {
  return db.getAllAsync<TimedSession>(
    `SELECT ${SESSION_COLUMNS} FROM timed_session WHERE workout_session_id = ? ORDER BY started_at_utc`,
    workoutSessionId
  );
}

export async function deleteTimedSession(db: Db, id: string) {
  await db.runAsync("DELETE FROM timed_session WHERE id = ? AND status <> 'aktiv'", id);
}

/** Startzeiten abgeschlossener Einheiten bestimmter Arten (für Gewohnheiten). */
export async function timedSessionTimes(db: Db, kinds: RunKind[], fromUtc: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ at: string }>(
    `SELECT started_at_utc AS at FROM timed_session
     WHERE status = 'abgeschlossen' AND started_at_utc >= ? AND kind IN (${kinds.map(() => '?').join(', ')})`,
    fromUtc,
    ...kinds
  );
  return rows.map((r) => r.at);
}

// ------------------------------------------------------------------------ laufender Ablauf

export const loadTimedRun = (db: Db) => readState<TimedRun | null>(db, 'timed_run', null);
export const saveTimedRun = (db: Db, run: TimedRun | null) => writeState(db, 'timed_run', run);

/** Sprachansage an/aus (Standard an). */
export const loadVoice = (db: Db) => readState<boolean>(db, 'timed_voice', true);
export const saveVoice = (db: Db, on: boolean) => writeState(db, 'timed_voice', on);

// ------------------------------------------------------------------------ Beweglichkeitstest

export type FlexibilityTest = { id: string; day: string; cm: number };

export function listFlexibilityTests(db: Db) {
  return db.getAllAsync<FlexibilityTest>(
    "SELECT id, day, cm FROM flexibility_test WHERE test = 'finger_boden' ORDER BY day DESC, recorded_at_utc DESC, rowid DESC"
  );
}

export async function addFlexibilityTest(db: Db, day: string, cm: number) {
  await db.runAsync(
    "INSERT INTO flexibility_test (id, day, test, cm, recorded_at_utc) VALUES (?, ?, 'finger_boden', ?, ?)",
    newId(),
    day,
    cm,
    nowUtc()
  );
}

export async function deleteFlexibilityTest(db: Db, id: string) {
  await db.runAsync('DELETE FROM flexibility_test WHERE id = ?', id);
}
