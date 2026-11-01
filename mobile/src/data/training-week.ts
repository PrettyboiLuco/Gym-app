// Trainingswoche Mo–So für „Heute“ und den Abschluss-Bildschirm: eine Quelle für Punkte und Zusammenfassung.

import { timeZone } from '@/components/nutrition-format';
import type { MuscleGroup } from '@/domain/exercises';
import { weekStart } from '@/domain/goals';
import { trainedDays } from '@/domain/summary';
import { localDay } from '@/domain/time';

import { cardioMinutesByDay } from './cardio';
import { loadCoachSetup } from './coach';
import { readState } from './app-state';
import type { Db } from './db';
import { listExercises, listSessions } from './training';

export type TrainingWeek = { done: boolean[]; planned: boolean[]; goal: number | null; todayIndex: number };

export async function loadTrainingWeek(db: Db, today: string): Promise<TrainingWeek> {
  const [sessions, setup, preferred] = await Promise.all([listSessions(db, 30), loadCoachSetup(db), readState<number[]>(db, 'preferred_weekdays', [])]);
  const monday = weekStart(today);
  const cardio = await cardioMinutesByDay(db, monday);
  const days = [
    ...sessions.filter((s) => s.status === 'abgeschlossen').map((s) => localDay(new Date(s.startedAt), timeZone)),
    // Cardio für sich zählt als Trainingstag (A2).
    ...cardio.map((c) => c.day),
  ];
  return {
    done: trainedDays(days, monday),
    // Geplante Trainingstage aus dem Coach, sonst die bevorzugten Tage aus dem Planassistenten (A8.3); ISO 1 = Montag.
    planned: Array.from({ length: 7 }, (_, i) => (setup?.trainingWeekdays?.length ? setup.trainingWeekdays : preferred).includes(i + 1)),
    goal: setup?.gymDays ?? null,
    todayIndex: trainedDays([today], monday).indexOf(true),
  };
}

/** Erledigte Sätze dieser Woche (Mo–So) je Muskelgruppe, meiste zuerst. Abgebrochene Trainings zählen mit
 * (die Sätze wurden gemacht); Dehn- und Mobilitätsübungen nicht. */
export async function loadWeekSetsByMuscle(db: Db, today: string): Promise<{ group: MuscleGroup; sets: number }[]> {
  const monday = weekStart(today);
  const rows = await db.getAllAsync<{ startedAt: string; exerciseId: string }>(
    `SELECT s.started_at_utc AS startedAt, l.exercise_id AS exerciseId FROM set_log l
     JOIN workout_session s ON s.id = l.session_id
     WHERE l.completed_at_utc IS NOT NULL AND l.set_type <> 'aufwaermen' AND s.started_at_utc >= ?`,
    new Date(Date.parse(`${monday}T00:00:00Z`) - 86_400_000).toISOString()
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
