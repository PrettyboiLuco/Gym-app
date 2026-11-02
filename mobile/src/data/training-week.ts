// Trainingswoche Mo–So für „Heute“ und den Abschluss-Bildschirm: eine Quelle für Punkte und Zusammenfassung.

import { daysBetween, shiftDay, weekStart } from '@/domain/dates';
import type { MuscleGroup } from '@/domain/exercises';
import { tallyMuscles, type MuscleTally } from '@/domain/muscle-map';
import { plannedSetsByWeekday, trainedDays } from '@/domain/summary';
import { localDay, timeZone } from '@/domain/time';
import { nextDayIndex } from '@/domain/training';

import { readState, writeState } from './app-state';
import { cardioMinutesByDay } from './cardio';
import { loadCoachSetup } from './coach';
import type { Db } from './db';
import { lastCompletedDayPosition, listActivePlans, listExercises, listSessions } from './training';

export type TrainingWeek = {
  done: boolean[];
  planned: boolean[];
  goal: number | null;
  todayIndex: number;
  /** Erledigte Arbeitssätze je Tag (Mo–So) und geplante Sätze je Tag aus dem aktiven Plan (Satz-Woche, T1). */
  doneSets: number[];
  plannedSets: number[];
};

export async function loadTrainingWeek(db: Db, today: string): Promise<TrainingWeek> {
  const [sessions, setup, preferred] = await Promise.all([listSessions(db, 30), loadCoachSetup(db), readState<number[]>(db, 'preferred_weekdays', [])]);
  const monday = weekStart(today);
  const cardio = await cardioMinutesByDay(db, monday);
  const days = [
    ...sessions.filter((s) => s.status === 'abgeschlossen').map((s) => localDay(new Date(s.startedAt), timeZone)),
    // Cardio für sich zählt als Trainingstag (A2).
    ...cardio.map((c) => c.day),
  ];
  // Geplante Trainingstage aus dem Coach, sonst die bevorzugten Tage aus dem Planassistenten (A8.3); ISO 1 = Montag.
  const planned = Array.from({ length: 7 }, (_, i) => (setup?.trainingWeekdays?.length ? setup.trainingWeekdays : preferred).includes(i + 1));
  const todayIndex = trainedDays([today], monday).indexOf(true);
  return {
    done: trainedDays(days, monday),
    planned,
    goal: setup?.gymDays ?? null,
    todayIndex,
    doneSets: await doneSetsByDay(db, monday),
    plannedSets: await plannedSets(db, planned, todayIndex),
  };
}

/** Erledigte Arbeitssätze (ohne Aufwärmen) je Tag dieser Woche, nach Ortszeit. */
async function doneSetsByDay(db: Db, monday: string): Promise<number[]> {
  const rows = await db.getAllAsync<{ startedAt: string }>(
    `SELECT s.started_at_utc AS startedAt FROM set_log l JOIN workout_session s ON s.id = l.session_id
     WHERE l.completed_at_utc IS NOT NULL AND l.set_type <> 'aufwaermen' AND s.started_at_utc >= ?`,
    `${shiftDay(monday, -1)}T00:00:00.000Z`
  );
  const out = Array.from({ length: 7 }, () => 0);
  for (const r of rows) {
    const i = daysBetween(monday, localDay(new Date(r.startedAt), timeZone));
    if (i >= 0 && i < 7) out[i]++;
  }
  return out;
}

/** Geplante Sätze je Wochentag aus dem aktiven Plan, Plantage in Reihenfolge ab dem nächsten fälligen. */
async function plannedSets(db: Db, planned: boolean[], todayIndex: number): Promise<number[]> {
  const plan = (await listActivePlans(db)).find((p) => p.days.length > 0);
  if (!plan) return Array.from({ length: 7 }, () => 0);
  const sets = await Promise.all(
    plan.days.map(async (d) => (await db.getFirstAsync<{ n: number | null }>('SELECT SUM(sets) AS n FROM plan_item WHERE plan_day_id = ?', d.id))?.n ?? 0)
  );
  const next = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
  return plannedSetsByWeekday(planned, todayIndex, sets, next);
}

/** Erledigte Sätze dieser Woche (Mo–So) je Muskelgruppe, meiste zuerst. Abgebrochene Trainings zählen mit
 * (die Sätze wurden gemacht); Dehn- und Mobilitätsübungen nicht. */
export async function loadWeekSetsByMuscle(db: Db, today: string): Promise<{ group: MuscleGroup; sets: number }[]> {
  const monday = weekStart(today);
  const rows = await db.getAllAsync<{ startedAt: string; exerciseId: string }>(
    `SELECT s.started_at_utc AS startedAt, l.exercise_id AS exerciseId FROM set_log l
     JOIN workout_session s ON s.id = l.session_id
     WHERE l.completed_at_utc IS NOT NULL AND l.set_type <> 'aufwaermen' AND s.started_at_utc >= ?`,
    `${shiftDay(monday, -1)}T00:00:00.000Z`
  );
  const exercises = new Map((await listExercises(db)).map((e) => [e.id, e]));
  const counts = new Map<MuscleGroup, number>();
  for (const r of rows) {
    if (localDay(new Date(r.startedAt), timeZone) < monday) continue;
    const e = exercises.get(r.exerciseId);
    if (!e || e.kind !== 'kraft') continue;
    counts.set(e.muscleGroup, (counts.get(e.muscleGroup) ?? 0) + 1);
  }
  return [...counts.entries()].map(([group, sets]) => ({ group, sets })).sort((a, b) => b.sets - a.sets);
}

/** Geplante Sätze je Muskelgruppe für einen Plantag (kleine Muskelkarte auf „Heute“, U4). */
export async function plannedMuscles(db: Db, planDayId: string): Promise<Partial<Record<MuscleGroup, number>>> {
  const rows = await db.getAllAsync<{ group: MuscleGroup; sets: number }>(
    `SELECT e.muscle_group AS "group", SUM(i.sets) AS sets FROM plan_item i JOIN exercise e ON e.id = i.exercise_id
     WHERE i.plan_day_id = ? AND e.kind = 'kraft' GROUP BY e.muscle_group`,
    planDayId
  );
  return Object.fromEntries(rows.map((r) => [r.group, r.sets]));
}

/**
 * Arbeitssätze der Woche je Kartenmuskel (Muskelkarte, docs/Muskelkarte_Ausbau.md): Hauptmuskel ganz, mitbeteiligte
 * getrennt, Ganzkörper extra. Gleiche Auswahl wie loadWeekSetsByMuscle (Kraftübungen, ohne Aufwärmsätze).
 */
export async function loadWeekTally(db: Db, today: string): Promise<MuscleTally> {
  const monday = weekStart(today);
  const rows = await db.getAllAsync<{ startedAt: string; exerciseId: string }>(
    `SELECT s.started_at_utc AS startedAt, l.exercise_id AS exerciseId FROM set_log l
     JOIN workout_session s ON s.id = l.session_id
     WHERE l.completed_at_utc IS NOT NULL AND l.set_type <> 'aufwaermen' AND s.started_at_utc >= ?`,
    `${shiftDay(monday, -1)}T00:00:00.000Z`
  );
  const exercises = new Map((await listExercises(db)).map((e) => [e.id, e]));
  const perExercise = new Map<string, number>();
  for (const r of rows) {
    if (localDay(new Date(r.startedAt), timeZone) < monday) continue;
    const e = exercises.get(r.exerciseId);
    if (!e || e.kind !== 'kraft') continue;
    perExercise.set(e.id, (perExercise.get(e.id) ?? 0) + 1);
  }
  return tallyMuscles([...perExercise].map(([id, sets]) => ({ exercise: exercises.get(id)!, sets })));
}

/** Einstellungen der Muskelkarte: Ansicht, ob mitbeteiligte Muskeln halb zählen, Körperform (Punkte 2.3, 5.4). */
export type MapPrefs = { view: 'beide' | 'vorne' | 'hinten'; halfSecondary: boolean; body: 'm' | 'w' };
const MAP_PREFS_DEFAULT: MapPrefs = { view: 'beide', halfSecondary: true, body: 'm' };

export async function loadMapPrefs(db: Db): Promise<MapPrefs> {
  return { ...MAP_PREFS_DEFAULT, ...(await readState<Partial<MapPrefs>>(db, 'muscle_map', {})) };
}

export const saveMapPrefs = (db: Db, prefs: MapPrefs) => writeState(db, 'muscle_map', prefs);
