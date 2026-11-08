// Daten für Meilensteine und Wochenbilanz (Ausbauplan A10.5/A10.6).

import { shiftDay } from '@/domain/dates';
import { loadModeOf } from '@/domain/logger';
import {
  balance,
  milestones,
  milestoneStats,
  newMilestones,
  weekResults,
  type Balance,
  type Milestone,
  type MilestoneStats,
  type SetSummary,
  type WeekResult,
} from '@/domain/motivation';
import { statusOn } from '@/domain/readiness';
import { zoneDay } from '@/domain/time';

import { readState, writeState } from './app-state';
import { loadCoachSetup } from './coach';
import type { Db } from './db';
import { loadProfile } from './profile';
import { listStatus } from './readiness';
import { listActivePlans, listExercises } from './training';
import { loadPreferredWeekdays } from './training-stats';

export type Motivation = {
  milestones: Milestone[];
  stats: MilestoneStats;
  fresh: Milestone[];
  weeks: WeekResult[];
  goal: number | null;
  last4: Balance;
  month: Balance;
  total: Balance;
  /** Wochenbilanz eingeschaltet (Standard an; bei sensibler Situation immer aus). */
  showBalance: boolean;
};

const loadBalanceOn = (db: Db) => readState<boolean>(db, 'balance_on', true);
export const saveBalanceOn = (db: Db, on: boolean) => writeState(db, 'balance_on', on);
export const markMilestonesSeen = async (db: Db, ids: string[]) =>
  writeState(db, 'milestones_seen', [...new Set([...(await readState<string[]>(db, 'milestones_seen', [])), ...ids])]);

/** Wochenziel: Coach-Einrichtung, sonst bevorzugte Wochentage, sonst Tage des aktiven Plans. */
async function weeklyGoal(db: Db): Promise<number | null> {
  const setup = await loadCoachSetup(db);
  if (setup?.gymDays) return setup.gymDays;
  const preferred = await loadPreferredWeekdays(db);
  if (preferred.length) return preferred.length;
  const plan = (await listActivePlans(db)).find((p) => p.days.length > 0);
  return plan ? Math.min(6, plan.days.length) : null;
}

/**
 * Kennzahlen der Sätze direkt per SQL (Prüfung 08.11.): „Heute“ lud dafür bei jedem Besuch alle Sätze aller Zeiten.
 * Gleiche Zählweise wie bisher – Arbeitssätze ohne Aufwärmen in abgeschlossenen Trainings, älteste zuerst.
 */
async function setSummary(db: Db): Promise<SetSummary> {
  const where = `FROM set_log l JOIN workout_session s ON s.id = l.session_id
     WHERE s.status = 'abgeschlossen' AND l.completed_at_utc IS NOT NULL AND l.set_type <> 'aufwaermen'`;
  const nth = (n: number) =>
    db.getFirstAsync<{ at: string; tz: string | null }>(
      `SELECT s.started_at_utc AS at, s.time_zone AS tz ${where} ORDER BY s.started_at_utc, l.position LIMIT 1 OFFSET ?`,
      n - 1
    );
  const [count, n1000, n5000, heavyRows, exercises] = await Promise.all([
    db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n ${where}`),
    nth(1000),
    nth(5000),
    // Kandidaten ab 100 kg (wenige Zeilen); ob das Gewicht als Last zählt, hängt an der Übung.
    db.getAllAsync<{ at: string; tz: string | null; exerciseId: string; kg: number }>(
      `SELECT s.started_at_utc AS at, s.time_zone AS tz, l.exercise_id AS exerciseId, l.weight_kg AS kg ${where}
       AND l.weight_kg >= 100 AND l.reps >= 1 ORDER BY s.started_at_utc, l.position`
    ),
    listExercises(db),
  ]);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const normal = (id: string) => {
    const e = byId.get(id);
    return e ? loadModeOf(e) === 'normal' : true;
  };
  const heavy = heavyRows.find((r) => normal(r.exerciseId)) ?? null;
  // Bestwert: höchstes Gewicht mit echter Last – je Übung das Maximum, dann über die Übungen mit normaler Last.
  const best = await db.getAllAsync<{ exerciseId: string; kg: number }>(
    `SELECT l.exercise_id AS exerciseId, MAX(l.weight_kg) AS kg ${where} AND l.reps >= 1 AND l.weight_kg IS NOT NULL GROUP BY l.exercise_id`
  );
  return {
    count: count?.n ?? 0,
    day1000: n1000 ? zoneDay(n1000.at, n1000.tz) : null,
    day5000: n5000 ? zoneDay(n5000.at, n5000.tz) : null,
    heavy: heavy ? { day: zoneDay(heavy.at, heavy.tz), exerciseId: heavy.exerciseId } : null,
    bestKg: best.reduce((max, r) => (normal(r.exerciseId) ? Math.max(max, r.kg) : max), 0),
  };
}

export async function loadMotivation(db: Db, today: string): Promise<Motivation> {
  const [sessions, cardio, sets, periods, goal, seen, on, profile] = await Promise.all([
    db.getAllAsync<{ at: string; tz: string | null }>(
      "SELECT started_at_utc AS at, time_zone AS tz FROM workout_session WHERE status = 'abgeschlossen' ORDER BY started_at_utc"
    ),
    db.getAllAsync<{ day: string }>('SELECT DISTINCT day FROM cardio_log WHERE completed_at_utc IS NOT NULL'),
    setSummary(db),
    listStatus(db),
    weeklyGoal(db),
    readState<string[]>(db, 'milestones_seen', []),
    loadBalanceOn(db),
    loadProfile(db),
  ]);
  const sessionDays = sessions.map((s) => zoneDay(s.at, s.tz));
  const trainingDays = [...new Set([...sessionDays, ...cardio.map((c) => c.day)])];
  const weeks = goal ? weekResults(trainingDays, goal, today, (d) => statusOn(periods, d) !== null) : [];
  const input = {
    sessionDays,
    summary: sets,
    weeks,
  };
  const all = milestones(input);
  const monthStart = `${today.slice(0, 7)}-01`;
  const four = shiftDay(today, -27);
  return {
    milestones: all,
    stats: milestoneStats(input),
    fresh: newMilestones(all, seen),
    weeks,
    goal,
    last4: balance(weeks, four, today),
    month: balance(weeks, monthStart, today),
    total: balance(weeks, '0000-01-01', today),
    showBalance: on && !profile.sensitive,
  };
}
