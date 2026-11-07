// Daten für Meilensteine und Wochenbilanz (Ausbauplan A10.5/A10.6).

import { shiftDay } from '@/domain/dates';
import { loadModeOf } from '@/domain/logger';
import { balance, milestones, milestoneStats, newMilestones, weekResults, type Balance, type Milestone, type MilestoneStats, type WeekResult } from '@/domain/motivation';
import { statusOn } from '@/domain/readiness';
import { localDay, timeZone } from '@/domain/time';

import { readState, writeState } from './app-state';
import { loadCoachSetup } from './coach';
import type { Db } from './db';
import { loadProfile } from './profile';
import { listStatus } from './readiness';
import { listActivePlans, listExercises } from './training';
import { allSets, loadPreferredWeekdays } from './training-stats';

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

export async function loadMotivation(db: Db, today: string): Promise<Motivation> {
  const [sessions, cardio, sets, exercises, periods, goal, seen, on, profile] = await Promise.all([
    db.getAllAsync<{ at: string }>("SELECT started_at_utc AS at FROM workout_session WHERE status = 'abgeschlossen' ORDER BY started_at_utc"),
    db.getAllAsync<{ day: string }>('SELECT DISTINCT day FROM cardio_log WHERE completed_at_utc IS NOT NULL'),
    allSets(db),
    listExercises(db),
    listStatus(db),
    weeklyGoal(db),
    readState<string[]>(db, 'milestones_seen', []),
    loadBalanceOn(db),
    loadProfile(db),
  ]);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const sessionDays = sessions.map((s) => localDay(new Date(s.at), timeZone));
  const trainingDays = [...new Set([...sessionDays, ...cardio.map((c) => c.day)])];
  const weeks = goal ? weekResults(trainingDays, goal, today, (d) => statusOn(periods, d) !== null) : [];
  const input = {
    sessionDays,
    sets: sets
      .filter((s) => s.setType !== 'aufwaermen')
      .map((s) => {
        const e = byId.get(s.exerciseId);
        return { day: s.day, exerciseId: s.exerciseId, weightKg: s.weightKg, reps: s.reps, normal: e ? loadModeOf(e) === 'normal' : true };
      }),
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
