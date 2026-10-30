// Datenbankzugriffe für Schlaf und den wöchentlichen Check-in (Phase 9.2, COACH-006, COACH-008).

import { weekDays, type CheckinInput, type CheckinResult, type CheckinSuggestion } from '@/domain/checkin';
import type { Profile } from '@/domain/profile';
import { stepsAverage } from '@/domain/steps';

import type { Goal } from '@/domain/energy';

import { readState, writeState } from './app-state';
import { newId, nowUtc, type Db } from './db';
import { activeWeightGoal, adjustCalorieGoal, calorieGoalOn, trainingDays } from './goals';
import { daySums, loadNutritionSettings } from './nutrition';
import { listSteps } from './steps';
import { listActivePlans } from './training';
import { listWeights } from './weights';

// --------------------------------------------------------------------------- Einrichtung (C1)

/** Angaben aus der Coach-Einrichtung; Grundlage für „Ziel ändern“ und den Check-in (Neu berechnen, C9). */
export type CoachSetup = {
  doneAt: string;
  goal: Goal;
  delta: number;
  steps: number;
  gymDays: number;
  sleepHours: number | null;
  trainingWeekdays: number[];
  /** Trainings- und Ruhetage unterschiedlich (C5). */
  split: boolean;
};

export const loadCoachSetup = (db: Db) => readState<CoachSetup | null>(db, 'coach_setup', null);
export const saveCoachSetup = (db: Db, setup: CoachSetup) => writeState(db, 'coach_setup', setup);
/** Nach dem Erststart einmal die Einrichtung öffnen. */
export const loadCoachPending = (db: Db) => readState<boolean>(db, 'coach_pending', false);
export const saveCoachPending = (db: Db, pending: boolean) => writeState(db, 'coach_pending', pending);

// ------------------------------------------------------------------------------------- Schlaf

export type SleepEntry = { id: string; day: string; hours: number; quality: number | null };

export function listSleep(db: Db, fromDay = '0000-01-01') {
  return db.getAllAsync<SleepEntry>(
    'SELECT id, day, hours, quality FROM sleep_entry WHERE day >= ? ORDER BY day DESC, recorded_at_utc DESC',
    fromDay
  );
}

/** Ein Eintrag pro Tag: ein neuer ersetzt den alten (Tag = Tag des Aufwachens). */
export async function saveSleep(db: Db, day: string, hours: number, quality: number | null) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sleep_entry WHERE day = ?', day);
    await db.runAsync(
      'INSERT INTO sleep_entry (id, day, hours, quality, recorded_at_utc) VALUES (?, ?, ?, ?, ?)',
      newId(),
      day,
      hours,
      quality,
      nowUtc()
    );
  });
}

export async function deleteSleep(db: Db, id: string) {
  await db.runAsync('DELETE FROM sleep_entry WHERE id = ?', id);
}

// ---------------------------------------------------------------------------------- Check-in

/** Sammelt alle Werte der Woche bis weekEnd (einschließlich). */
export async function checkinInput(db: Db, weekEnd: string, profile: Profile, timeZone: string): Promise<CheckinInput> {
  const days = weekDays(weekEnd);
  const from = days[0];
  // Der Vorschlag bezieht sich auf das Ziel, das ab heute gilt (der Tag nach der Woche).
  const today = new Date(Date.parse(`${weekEnd}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const [weights, sums, steps, sleep, plans, weightGoal, trained, current, settings] = await Promise.all([
    listWeights(db),
    daySums(db, from, weekEnd),
    listSteps(db, from),
    listSleep(db, from),
    listActivePlans(db),
    activeWeightGoal(db),
    // Etwas früher anfangen, damit Zeitzonen den ersten Tag nicht abschneiden; gezählt wird nach lokalem Tag.
    trainingDays(db, new Date(Date.parse(`${from}T00:00:00Z`) - 86_400_000).toISOString(), timeZone),
    calorieGoalOn(db, today),
    loadNutritionSettings(db),
  ]);
  const goals = await Promise.all(days.map((d) => calorieGoalOn(db, d)));
  const byDay = new Map(sums.map((s) => [s.day, s]));
  const plan = plans.find((p) => p.days.length > 0);
  return {
    weekEnd,
    weights,
    days: days.map((day, i) => {
      const s = byDay.get(day);
      return {
        day,
        kcal: s?.kcal ?? null,
        entries: s?.entries ?? 0,
        unknownKcal: s?.unknownKcal ?? 0,
        goal: goals[i]?.kcal ?? null,
        protein: s?.protein ?? null,
        fiber: s?.fiber ?? null,
        goalProtein: goals[i]?.macros?.protein ?? null,
        goalFiber: goals[i]?.macros?.fiber ?? null,
      };
    }),
    workouts: trained.filter((d) => d >= from && d <= weekEnd).length,
    plannedPerWeek: plan ? Math.min(7, plan.days.length) : null,
    stepsAvg: stepsAverage(steps, days),
    sleepHours: sleep.filter((s) => s.day <= weekEnd).map((s) => s.hours),
    direction: weightGoal?.direction ?? null,
    sensitive: profile.sensitive,
    hideNumbers: settings.hideNumbers,
    heightCm: profile.heightCm,
    currentGoal: current?.baseKcal ?? null,
  };
}

export type CheckinRecord = {
  id: string;
  weekEnd: string;
  rulesVersion: number;
  summary: string;
  suggestion: string | null;
  decision: 'angenommen' | 'abgelehnt' | 'ohne';
  createdAt: string;
};

export function listCheckins(db: Db, limit = 12) {
  return db.getAllAsync<CheckinRecord>(
    `SELECT id, week_end AS weekEnd, rules_version AS rulesVersion, summary, suggestion, decision, created_at_utc AS createdAt
     FROM checkin ORDER BY week_end DESC, created_at_utc DESC LIMIT ?`,
    limit
  );
}

export async function lastCheckinWeekEnd(db: Db): Promise<string | null> {
  const row = await db.getFirstAsync<{ weekEnd: string | null }>('SELECT MAX(week_end) AS weekEnd FROM checkin');
  return row?.weekEnd ?? null;
}

/**
 * Speichert den Check-in mit Entscheidung. Nur „angenommen“ ändert etwas: Ein Kalorienvorschlag wird als neue
 * Version ab `today` gespeichert, frühere Tage behalten ihr Ziel (GOAL-002). Alles in einer Transaktion.
 */
export async function saveCheckin(
  db: Db,
  result: CheckinResult & { weekEnd: string; rulesVersion: number },
  decision: CheckinRecord['decision'],
  today: string
) {
  const suggestion: CheckinSuggestion = result.suggestion;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO checkin (id, week_end, rules_version, summary, suggestion, decision, created_at_utc)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      result.weekEnd,
      result.rulesVersion,
      JSON.stringify({ summary: result.summary, hints: result.hints }),
      JSON.stringify(suggestion),
      decision,
      nowUtc()
    );
    if (decision === 'angenommen' && suggestion.kind === 'kcal') {
      await adjustCalorieGoal(db, suggestion.to, today, 'eigen', { checkin: result.weekEnd, rulesVersion: result.rulesVersion });
    }
  });
}
