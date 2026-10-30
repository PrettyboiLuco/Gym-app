// Wöchentlicher Check-in (Phase 9.2, Register COACH-006, COACH-008, COACH-010, GOAL-007). Fasst eine Woche zusammen
// und macht höchstens einen Vorschlag; geändert wird erst nach Bestätigung (neue Version des Kalorienziels).
//
// Regeln Fassung 1 (Vorschlag, Schwellen fachlich nicht freigegeben – Phase 10.1):
// - Nur mit genug Daten: in beiden Wochen ≥ 4 Gewichtsmessungen (7-Tage-Schnitt) und ≥ 5 vollständig erfasste Tage.
// - Nie bei sensibler Situation (COACH-010) und nie ein Abnehm-Vorschlag bei Untergewicht (GOAL-007).
// - Lag das Essen im Schnitt > 150 kcal über dem Ziel, wird das Ziel nicht gesenkt, sondern erst Einhalten empfohlen.
// - Schritte von ±100 kcal, nie unter die Untergrenze (CALC-005); Ziel abnehmen: kein Rückgang → −100,
//   mehr als 1 % des Gewichts pro Woche verloren → +100. Zunehmen: kein Anstieg → +100, mehr als 0,5 % → −100.
//   Halten: mehr als ±0,5 kg → ±100 in Gegenrichtung.
// - Schlaf ist nur Kontext (COACH-006): kurzer Schlaf ergibt einen Hinweis, nie eine Kalorienänderung.

import { bmi, CALORIE_FLOOR, UNDERWEIGHT_BMI, type Goal } from './energy';
import { weekAverage } from './nutrition';
import { weightTrend, type WeightEntry } from './weight';

export const CHECKIN_RULES_VERSION = 1;
export const CHECKIN_EVERY_DAYS = 7;
const STEP_KCAL = 100;
const OVER_GOAL_KCAL = 150;
const SHORT_SLEEP_HOURS = 6;

export type CheckinDay = {
  day: string;
  kcal: number | null;
  entries: number;
  unknownKcal: number;
  goal: number | null;
  /** Eiweiß und Ballaststoffe gegessen (Summe der bekannten Werte) und Ziel des Tages (Coach, C9). */
  protein?: number | null;
  fiber?: number | null;
  goalProtein?: number | null;
  goalFiber?: number | null;
};

export type CheckinInput = {
  /** Letzter Tag der Woche (meist gestern, damit heute unvollständig nicht mitzählt). */
  weekEnd: string;
  weights: Pick<WeightEntry, 'day' | 'kg'>[];
  /** Genau die 7 Tage bis weekEnd. */
  days: CheckinDay[];
  workouts: number;
  /** Trainingstage pro Woche laut Plan; null = kein Plan. */
  plannedPerWeek: number | null;
  stepsAvg: number | null;
  sleepHours: number[];
  direction: Goal | null;
  sensitive: boolean;
  /** Modus „ohne Zahlen“ (TRACK-006): dann weder Kalorien zeigen noch vorschlagen. */
  hideNumbers: boolean;
  heightCm: number | null;
  /** Aktuelles Kalorienziel; null = keins. */
  currentGoal: number | null;
};

export type CheckinSummary = {
  weightAvg: number | null;
  weightAvgPrev: number | null;
  change: number | null;
  completeDays: number;
  incompleteDays: number;
  kcalAvg: number | null;
  goalAvg: number | null;
  workouts: number;
  plannedPerWeek: number | null;
  stepsAvg: number | null;
  sleepAvg: number | null;
  sleepDays: number;
  /** Schnitt über vollständige Tage; null = keine Ziele oder keine Tage. */
  proteinAvg: number | null;
  proteinGoal: number | null;
  fiberAvg: number | null;
  fiberGoal: number | null;
};

export type Missing = 'gewicht' | 'essen' | 'ziel' | 'richtung';

export type CheckinSuggestion =
  | { kind: 'kcal'; from: number; to: number; reason: 'keinFortschritt' | 'zuSchnell' | 'abweichung' }
  | { kind: 'zielEinhalten'; over: number }
  | { kind: 'mehrDaten'; missing: Missing[] }
  | { kind: 'passt' }
  | { kind: 'sensibel' }
  | { kind: 'ohneZahlen' };

export type CheckinHint = 'trainingWeniger' | 'trainingOk' | 'schlafKurz' | 'eiweissWenig' | 'ballaststoffeWenig';

export type CheckinResult = { summary: CheckinSummary; suggestion: CheckinSuggestion; hints: CheckinHint[] };

function shift(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Die 7 Tage bis einschließlich weekEnd, älteste zuerst. */
export function weekDays(weekEnd: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shift(weekEnd, i - 6));
}

/** Ist ein neuer Check-in fällig (letzter vor ≥ 7 Tagen oder noch keiner)? */
export function checkinDue(lastWeekEnd: string | null, today: string): boolean {
  if (!lastWeekEnd) return true;
  return Date.parse(`${today}T12:00:00Z`) - Date.parse(`${lastWeekEnd}T12:00:00Z`) >= CHECKIN_EVERY_DAYS * 86_400_000;
}

export function weeklyCheckin(input: CheckinInput): CheckinResult {
  const weightAvg = weightTrend(input.weights, input.weekEnd);
  const weightAvgPrev = weightTrend(input.weights, shift(input.weekEnd, -7));
  const change = weightAvg !== null && weightAvgPrev !== null ? weightAvg - weightAvgPrev : null;
  const week = weekAverage(input.days);
  const goals = input.days.filter((d) => d.goal !== null).map((d) => d.goal as number);
  const sleepAvg = input.sleepHours.length ? input.sleepHours.reduce((s, h) => s + h, 0) / input.sleepHours.length : null;
  const summary: CheckinSummary = {
    weightAvg,
    weightAvgPrev,
    change,
    completeDays: week.trackedDays,
    incompleteDays: week.incompleteDays,
    kcalAvg: week.average,
    goalAvg: goals.length ? goals.reduce((s, g) => s + g, 0) / goals.length : null,
    workouts: input.workouts,
    plannedPerWeek: input.plannedPerWeek,
    stepsAvg: input.stepsAvg,
    sleepAvg,
    sleepDays: input.sleepHours.length,
    ...macroAverages(input.days),
  };

  const hints: CheckinHint[] = [];
  if (input.plannedPerWeek !== null) hints.push(input.workouts < input.plannedPerWeek ? 'trainingWeniger' : 'trainingOk');
  if (sleepAvg !== null && input.sleepHours.length >= 3 && sleepAvg < SHORT_SLEEP_HOURS) hints.push('schlafKurz');
  // Makros nur als Hinweis, nie als Kalorienänderung; ohne Zahlen-Modus nicht.
  if (!input.hideNumbers && !input.sensitive) {
    if (summary.proteinAvg !== null && summary.proteinGoal !== null && summary.proteinAvg < summary.proteinGoal * 0.8) hints.push('eiweissWenig');
    if (summary.fiberAvg !== null && summary.fiberGoal !== null && summary.fiberAvg < summary.fiberGoal * 0.8) hints.push('ballaststoffeWenig');
  }

  return { summary, suggestion: suggest(input, summary), hints };
}

/** Eiweiß und Ballaststoffe im Schnitt der vollständig erfassten Tage, mit Ziel (C9). */
function macroAverages(days: CheckinDay[]) {
  const complete = days.filter((d) => d.entries > 0 && d.kcal !== null && d.unknownKcal === 0);
  const avg = (values: (number | null | undefined)[]) => {
    const known = values.filter((v): v is number => typeof v === 'number');
    return known.length ? known.reduce((s, v) => s + v, 0) / known.length : null;
  };
  return {
    proteinAvg: avg(complete.map((d) => d.protein)),
    proteinGoal: avg(days.map((d) => d.goalProtein)),
    fiberAvg: avg(complete.map((d) => d.fiber)),
    fiberGoal: avg(days.map((d) => d.goalFiber)),
  };
}

function suggest(input: CheckinInput, s: CheckinSummary): CheckinSuggestion {
  if (input.sensitive) return { kind: 'sensibel' };
  if (input.hideNumbers) return { kind: 'ohneZahlen' };
  const missing: Missing[] = [];
  if (input.direction === null) missing.push('richtung');
  if (input.currentGoal === null) missing.push('ziel');
  if (s.change === null) missing.push('gewicht');
  if (s.completeDays < 5) missing.push('essen');
  if (missing.length > 0) return { kind: 'mehrDaten', missing };

  const goal = input.currentGoal as number;
  const change = s.change as number;
  const weight = s.weightAvg as number;
  if (s.kcalAvg !== null && s.goalAvg !== null && s.kcalAvg - s.goalAvg > OVER_GOAL_KCAL) {
    return { kind: 'zielEinhalten', over: Math.round(s.kcalAvg - s.goalAvg) };
  }

  let delta = 0;
  let reason: 'keinFortschritt' | 'zuSchnell' | 'abweichung' = 'keinFortschritt';
  if (input.direction === 'abnehmen') {
    if (change >= 0) delta = -STEP_KCAL;
    else if (-change > weight * 0.01) {
      delta = STEP_KCAL;
      reason = 'zuSchnell';
    }
  } else if (input.direction === 'zunehmen') {
    if (change <= 0) delta = STEP_KCAL;
    else if (change > weight * 0.005) {
      delta = -STEP_KCAL;
      reason = 'zuSchnell';
    }
  } else if (Math.abs(change) > 0.5) {
    delta = change > 0 ? -STEP_KCAL : STEP_KCAL;
    reason = 'abweichung';
  }
  if (delta === 0) return { kind: 'passt' };
  // Kein Senken bei Untergewicht oder unter die Untergrenze (GOAL-007, CALC-005).
  if (delta < 0 && input.heightCm !== null && bmi(weight, input.heightCm) < UNDERWEIGHT_BMI) return { kind: 'passt' };
  const to = Math.max(CALORIE_FLOOR, goal + delta);
  if (to === goal) return { kind: 'passt' };
  return { kind: 'kcal', from: goal, to, reason };
}
