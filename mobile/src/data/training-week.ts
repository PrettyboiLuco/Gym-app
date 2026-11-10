// Trainingswoche Mo–So für „Heute“ und den Abschluss-Bildschirm: eine Quelle für Punkte und Zusammenfassung.

import { daysBetween, isoWeekday, shiftDay, weekStart } from '@/domain/dates';
import type { MuscleGroup } from '@/domain/exercises';
import { tallyMuscles, type MuscleTally } from '@/domain/muscle-map';
import { neglectedMuscle } from '@/domain/muscle-neglect';
import { plannedSetsByWeekday, trainedDays } from '@/domain/summary';
import { localDay, timeZone, zoneDay } from '@/domain/time';
import { nextDayIndex, taggedWeekdays, todayPlan, type TodayPlan } from '@/domain/training';

import { readState, writeState } from './app-state';
import { cardioMinutesByDay } from './cardio';
import { loadCoachSetup } from './coach';
import type { Db } from './db';
import { trainingDays } from './goals';
import { loadSpared, statusToday } from './readiness';
import { lastCompletedDayPosition, listActivePlans, listExercises, listSessions, type PlanSummary } from './training';

export type TrainingWeek = {
  done: boolean[];
  planned: boolean[];
  goal: number | null;
  todayIndex: number;
  /** Erledigte Arbeitssätze je Tag (Mo–So) und geplante Sätze je Tag aus dem aktiven Plan (Satz-Woche, T1). */
  doneSets: number[];
  plannedSets: number[];
};

/** Gespeicherte Trainingstage (ISO 1 = Montag): aus dem Coach, sonst die bevorzugten Tage (Planassistent, Plan-Datei). */
async function savedWeekdays(db: Db): Promise<number[]> {
  const [setup, preferred] = await Promise.all([loadCoachSetup(db), readState<number[]>(db, 'preferred_weekdays', [])]);
  return setup?.trainingWeekdays?.length ? setup.trainingWeekdays : preferred;
}

/**
 * Was steht heute an (aktiver Plan)? Training mit Plantag oder Ruhetag mit dem nächsten Plantag – nach Wochentagen im
 * Namen der Plantage oder den gespeicherten Trainingstagen (domain/training todayPlan). null ohne Plan mit Tagen.
 */
export async function loadTodayPlan(db: Db, today: string): Promise<{ plan: PlanSummary; today: TodayPlan; dayIndex: number } | null> {
  const plan = (await listActivePlans(db)).find((p) => p.days.length > 0);
  if (!plan) return null;
  const rotation = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
  const result = todayPlan(
    plan.days.map((d) => d.name),
    await savedWeekdays(db),
    isoWeekday(today),
    rotation
  );
  return { plan, today: result, dayIndex: result.kind === 'training' ? result.index : result.nextIndex };
}

export async function loadTrainingWeek(db: Db, today: string): Promise<TrainingWeek> {
  const [sessions, setup, saved] = await Promise.all([listSessions(db, 30), loadCoachSetup(db), savedWeekdays(db)]);
  const monday = weekStart(today);
  const cardio = await cardioMinutesByDay(db, monday);
  const days = [
    ...sessions.filter((s) => s.status === 'abgeschlossen').map((s) => zoneDay(s.startedAt, s.timeZone)),
    // Cardio für sich zählt als Trainingstag (A2).
    ...cardio.map((c) => c.day),
  ];
  // Geplante Trainingstage: Wochentage in den Namen der Plantage („Push (So)“), sonst aus dem Coach bzw. die bevorzugten
  // Tage aus dem Planassistenten (A8.3); ISO 1 = Montag.
  const plan = (await listActivePlans(db)).find((p) => p.days.length > 0);
  const tags = plan ? taggedWeekdays(plan.days.map((d) => d.name)) : null;
  const weekdays = tags ? tags.filter((t): t is number => t !== null) : saved;
  const planned = Array.from({ length: 7 }, (_, i) => weekdays.includes(i + 1));
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

/** Woche eines Trainings (Zusammenfassung): die seines lokalen Starttags, auch wenn es nach Mitternacht endet. */
export function loadTrainingWeekOf(db: Db, startedAtUtc: string): Promise<TrainingWeek> {
  return loadTrainingWeek(db, localDay(new Date(startedAtUtc), timeZone));
}

/** Erledigte Arbeitssätze (ohne Aufwärmen) je Tag dieser Woche, nach Ortszeit. */
async function doneSetsByDay(db: Db, monday: string): Promise<number[]> {
  const rows = await db.getAllAsync<{ startedAt: string; tz: string | null }>(
    `SELECT s.started_at_utc AS startedAt, s.time_zone AS tz FROM set_log l JOIN workout_session s ON s.id = l.session_id
     WHERE l.completed_at_utc IS NOT NULL AND l.set_type <> 'aufwaermen' AND s.started_at_utc >= ?`,
    `${shiftDay(monday, -1)}T00:00:00.000Z`
  );
  const out = Array.from({ length: 7 }, () => 0);
  for (const r of rows) {
    const i = daysBetween(monday, zoneDay(r.startedAt, r.tz));
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
  // Plantage mit Wochentag im Namen: jeder Tag an seinem Wochentag.
  const tags = taggedWeekdays(plan.days.map((d) => d.name));
  if (tags) {
    const out = Array.from({ length: 7 }, () => 0);
    tags.forEach((wd, i) => {
      if (wd !== null) out[wd - 1] += sets[i];
    });
    return out;
  }
  const next = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
  return plannedSetsByWeekday(planned, todayIndex, sets, next);
}

/** Erledigte Sätze dieser Woche (Mo–So) je Muskelgruppe, meiste zuerst. Abgebrochene Trainings zählen mit
 * (die Sätze wurden gemacht); Dehn- und Mobilitätsübungen nicht. */
export async function loadWeekSetsByMuscle(db: Db, today: string): Promise<{ group: MuscleGroup; sets: number }[]> {
  const monday = weekStart(today);
  const rows = await db.getAllAsync<{ startedAt: string; tz: string | null; exerciseId: string }>(
    `SELECT s.started_at_utc AS startedAt, s.time_zone AS tz, l.exercise_id AS exerciseId FROM set_log l
     JOIN workout_session s ON s.id = l.session_id
     WHERE l.completed_at_utc IS NOT NULL AND l.set_type <> 'aufwaermen' AND s.started_at_utc >= ?`,
    `${shiftDay(monday, -1)}T00:00:00.000Z`
  );
  const exercises = new Map((await listExercises(db)).map((e) => [e.id, e]));
  const counts = new Map<MuscleGroup, number>();
  for (const r of rows) {
    if (zoneDay(r.startedAt, r.tz) < monday) continue;
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
  const rows = await db.getAllAsync<{ startedAt: string; tz: string | null; exerciseId: string }>(
    `SELECT s.started_at_utc AS startedAt, s.time_zone AS tz, l.exercise_id AS exerciseId FROM set_log l
     JOIN workout_session s ON s.id = l.session_id
     WHERE l.completed_at_utc IS NOT NULL AND l.set_type <> 'aufwaermen' AND s.started_at_utc >= ? AND s.started_at_utc < ?`,
    `${shiftDay(monday, -1)}T00:00:00.000Z`,
    `${shiftDay(monday, 8)}T00:00:00.000Z`
  );
  const exercises = new Map((await listExercises(db)).map((e) => [e.id, e]));
  const perExercise = new Map<string, number>();
  const sunday = shiftDay(monday, 6);
  for (const r of rows) {
    // Nur Trainings dieser Woche (lokaler Starttag Mo–So) – beim Blättern in ältere Wochen zählen spätere nicht mit.
    const day = zoneDay(r.startedAt, r.tz);
    if (day < monday || day > sunday) continue;
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

/**
 * Daten für den Muskel-Hinweis „zuletzt vor N Tagen“: Muskelgruppen des aktiven Plans, letzter Trainingstag je Gruppe
 * (Hauptmuskel der Kraftübung, erledigte Arbeitssätze), laufender Status und geschonte Bereiche.
 */
export async function loadMuscleNeglect(db: Db, today: string): Promise<{ group: MuscleGroup; days: number; lastDay: string } | null> {
  const plan = (await listActivePlans(db)).find((p) => p.days.length > 0);
  if (!plan) return null;
  const dayIds = plan.days.map((d) => d.id);
  const [planned, last, status, spared] = await Promise.all([
    db.getAllAsync<{ group: MuscleGroup }>(
      `SELECT DISTINCT e.muscle_group AS "group" FROM plan_item i JOIN exercise e ON e.id = i.exercise_id
       WHERE e.kind = 'kraft' AND i.plan_day_id IN (${dayIds.map(() => '?').join(', ')})`,
      ...dayIds
    ),
    db.getAllAsync<{ group: MuscleGroup; at: string; tz: string | null }>(
      `SELECT e.muscle_group AS "group", MAX(s.started_at_utc) AS at, s.time_zone AS tz
       FROM set_log l JOIN workout_session s ON s.id = l.session_id JOIN exercise e ON e.id = l.exercise_id
       WHERE l.completed_at_utc IS NOT NULL AND l.set_type <> 'aufwaermen' AND e.kind = 'kraft'
       GROUP BY e.muscle_group`
    ),
    statusToday(db, today),
    loadSpared(db, today),
  ]);
  return neglectedMuscle({
    planned: planned.map((p) => p.group),
    lastTrained: Object.fromEntries(last.map((r) => [r.group, zoneDay(r.at, r.tz)])),
    today,
    status: status?.status ?? null,
    spared: spared?.areas ?? [],
  });
}

/**
 * Daten für „Dein Jahr“ im Verlauf: Trainingstage der letzten 52 Wochen (Kraft, HIIT, Cardio) und die Stunden aus
 * Trainingsdauer, Cardio-Minuten und Dehn-/HIIT-Einheiten.
 */
export async function loadYear(db: Db, today: string): Promise<{ days: string[]; minutes: number }> {
  const from = shiftDay(weekStart(today), -7 * 51);
  const fromUtc = `${shiftDay(from, -1)}T00:00:00.000Z`;
  const [days, sessions, cardio, timed] = await Promise.all([
    trainingDays(db, fromUtc, timeZone),
    db.getFirstAsync<{ m: number | null }>(
      `SELECT SUM((julianday(finished_at_utc) - julianday(started_at_utc)) * 1440) AS m FROM workout_session
       WHERE status = 'abgeschlossen' AND finished_at_utc > started_at_utc AND started_at_utc >= ?`,
      fromUtc
    ),
    db.getFirstAsync<{ m: number | null }>('SELECT SUM(minutes) AS m FROM cardio_log WHERE session_id IS NULL AND completed_at_utc IS NOT NULL AND day >= ?', from),
    db.getFirstAsync<{ m: number | null }>("SELECT SUM(done_seconds) / 60.0 AS m FROM timed_session WHERE status <> 'aktiv' AND started_at_utc >= ?", fromUtc),
  ]);
  return { days: days.filter((d) => d >= from && d <= today), minutes: Math.round((sessions?.m ?? 0) + (cardio?.m ?? 0) + (timed?.m ?? 0)) };
}
