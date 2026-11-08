// Beendetes Training bearbeiten, löschen oder ein Krafttraining nachtragen (Prüfung 05.11.2026).
// Laufende Trainings bleiben hier außen vor: die gehören dem Trainings-Bildschirm mit Pausen und Mitteilungen.

import { setOrder } from '@/domain/logger';
import { timeZone } from '@/domain/time';
import { setTimes, type EditedSet, type PlannedFields } from '@/domain/workout-edit';

import { newId, type Db } from './db';
import { getSession, listSessionSets, type SessionInfo, type SetRow } from './training';

export type WorkoutForEdit = { session: SessionInfo; sets: SetRow[] };

/** Training mit seinen erledigten Sätzen; null, wenn es fehlt oder noch läuft. */
export async function loadWorkoutForEdit(db: Db, sessionId: string): Promise<WorkoutForEdit | null> {
  const session = await getSession(db, sessionId);
  if (!session || session.status === 'aktiv') return null;
  const sets = (await listSessionSets(db, sessionId)).filter((s) => s.completedAt !== null);
  return { session, sets };
}

/** Geplante Sätze eines Plantags als Vorlage zum Nachtragen (Reihenfolge wie im Training, Supersätze verschränkt). */
export async function plannedSetsForDay(db: Db, planDayId: string): Promise<(PlannedFields & { exerciseId: string })[]> {
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
  return setOrder(items).map((slot) => {
    const item = items[slot.itemIndex];
    const timed = item.targetSeconds !== null;
    return {
      exerciseId: item.exerciseId,
      plannedRepsMin: timed ? null : item.repsMin,
      plannedRepsMax: timed ? null : item.repsMax,
      plannedSeconds: item.targetSeconds,
      restSeconds: slot.restSeconds,
      superset: slot.superset,
    };
  });
}

export type WorkoutSave = {
  /** null = neues, nachgetragenes Training. */
  sessionId: string | null;
  /** Nur beim Nachtragen: Plantag als Vorlage (zählt dann für „nächster Tag“ und Steigerung). */
  planDayId?: string | null;
  startedAtUtc: string;
  finishedAtUtc: string;
  sets: EditedSet[];
};

/**
 * Speichert ein bearbeitetes oder nachgetragenes Training in einer Transaktion: Zeiten, erledigte Sätze (geändert, neu,
 * entfernt). Offene, nie erledigte Sätze eines beendeten Trainings bleiben unverändert dahinter stehen.
 */
export async function saveWorkout(db: Db, input: WorkoutSave): Promise<string> {
  const id = input.sessionId ?? newId();
  await db.withTransactionAsync(async () => {
    let oldStart: string | null = null;
    let previous = new Map<string, string>();
    let open: { id: string }[] = [];
    if (input.sessionId) {
      const session = await db.getFirstAsync<{ status: string; startedAt: string }>(
        'SELECT status, started_at_utc AS startedAt FROM workout_session WHERE id = ?',
        input.sessionId
      );
      if (!session) throw new Error('Training nicht gefunden');
      if (session.status === 'aktiv') throw new Error('Laufendes Training wird im Training bearbeitet');
      oldStart = session.startedAt;
      const rows = await db.getAllAsync<{ id: string; completedAt: string | null }>(
        'SELECT id, completed_at_utc AS completedAt FROM set_log WHERE session_id = ? ORDER BY position',
        input.sessionId
      );
      previous = new Map(rows.filter((r) => r.completedAt).map((r) => [r.id, r.completedAt!]));
      open = rows.filter((r) => !r.completedAt);
      const keep = new Set(input.sets.map((s) => s.id).filter(Boolean));
      for (const doneId of previous.keys()) if (!keep.has(doneId)) await db.runAsync('DELETE FROM set_log WHERE id = ?', doneId);
      await db.runAsync('UPDATE workout_session SET started_at_utc = ?, finished_at_utc = ? WHERE id = ?', input.startedAtUtc, input.finishedAtUtc, id);
    } else {
      await db.runAsync(
        "INSERT INTO workout_session (id, plan_day_id, status, started_at_utc, finished_at_utc, time_zone) VALUES (?, ?, 'abgeschlossen', ?, ?, ?)",
        id,
        input.planDayId ?? null,
        input.startedAtUtc,
        input.finishedAtUtc,
        timeZone
      );
    }
    const times = setTimes(input.sets, previous, { oldStartUtc: oldStart, startedAtUtc: input.startedAtUtc, finishedAtUtc: input.finishedAtUtc });
    for (const [position, set] of input.sets.entries()) {
      if (set.id && previous.has(set.id)) {
        await db.runAsync(
          `UPDATE set_log SET exercise_id = ?, position = ?, set_type = ?, weight_kg = ?, reps = ?, seconds = ?, completed_at_utc = ?
           WHERE id = ? AND session_id = ?`,
          set.exerciseId,
          position,
          set.setType,
          set.weightKg,
          set.reps,
          set.seconds,
          times[position],
          set.id,
          id
        );
      } else {
        await db.runAsync(
          `INSERT INTO set_log (id, session_id, exercise_id, position, planned_reps_min, planned_reps_max, rest_seconds, planned_seconds,
           superset, set_type, weight_kg, reps, seconds, completed_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          newId(),
          id,
          set.exerciseId,
          position,
          set.plannedRepsMin,
          set.plannedRepsMax,
          set.restSeconds,
          set.plannedSeconds,
          set.superset,
          set.setType,
          set.weightKg,
          set.reps,
          set.seconds,
          times[position]
        );
      }
    }
    for (const [i, row] of open.entries()) await db.runAsync('UPDATE set_log SET position = ? WHERE id = ?', input.sets.length + i, row.id);
  });
  return id;
}

/**
 * Löscht ein beendetes Training mit allen Sätzen und dem Cardio darin. Aufwärmen/Cool-down bleiben als eigene
 * Dehn-Einheit im Verlauf, nur die Verbindung zum Training fällt weg.
 */
export async function deleteWorkout(db: Db, sessionId: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    const session = await db.getFirstAsync<{ status: string }>('SELECT status FROM workout_session WHERE id = ?', sessionId);
    if (!session) return;
    if (session.status === 'aktiv') throw new Error('Laufendes Training wird im Training beendet');
    await db.runAsync('DELETE FROM set_log WHERE session_id = ?', sessionId);
    await db.runAsync('DELETE FROM cardio_log WHERE session_id = ?', sessionId);
    await db.runAsync('UPDATE timed_session SET workout_session_id = NULL WHERE workout_session_id = ?', sessionId);
    await db.runAsync('DELETE FROM workout_session WHERE id = ?', sessionId);
  });
}
