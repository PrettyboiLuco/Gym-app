// Wöchentlicher Check-in (Phase 9.2, Register COACH-006, COACH-008, COACH-010, GOAL-007). Fasst eine Woche zusammen
// und macht höchstens einen Vorschlag; geändert wird erst nach Bestätigung (neue Version des Kalorienziels).
//
// Regeln Fassung 1 (Vorschlag, Schwellen fachlich nicht freigegeben – Phase 10.1):
// - Nur mit genug Daten: in beiden Wochen an ≥ 4 Tagen gewogen (7-Tage-Schnitt über Tagesmittel) und ≥ 5 vollständig erfasste Tage.
// - Nie bei sensibler Situation (COACH-010) und nie ein Abnehm-Vorschlag bei Untergewicht (GOAL-007).
// - Lag das Essen im Schnitt > 150 kcal über dem Ziel, wird das Ziel nicht gesenkt, sondern erst Einhalten empfohlen.
// - Schritte von ±100 kcal, nie unter die Untergrenze max(1200, Ruheenergie) (CALC-005; bis 03.11.2026 wurde hier
//   nur 1200 geprüft); Ziel abnehmen: kein Rückgang → −100,
//   mehr als 1 % des Gewichts pro Woche verloren → +100. Zunehmen: kein Anstieg → +100, mehr als 0,5 % → −100.
//   Halten: mehr als ±0,5 kg → ±100 in Gegenrichtung.
// - Schlaf ist nur Kontext (COACH-006): kurzer Schlaf ergibt einen Hinweis, nie eine Kalorienänderung.
// - Status krank/verletzt/Pause in der Woche (A6.7): kein Kalorienvorschlag.

import type { V2Result } from './adaptive';
import { daysBetween, shiftDay, weekDays as weekFrom } from './dates';
import { bmi, CALORIE_FLOOR, UNDERWEIGHT_BMI, type Goal } from './energy';
import { mean } from './math';
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
  /** Vom Nutzer als nicht vollständig erfasst markiert (A7.2). */
  flagged?: number;
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
  /** Status krank/verletzt/Pause in dieser Woche (A6): dann kein Kalorienvorschlag. */
  paused?: string | null;
  /** Untergrenze max(1200, Ruheenergie) (CALC-005, energy.ts calorieFloor); ohne Angabe 1200. */
  floor?: number;
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
  | { kind: 'kcal'; from: number; to: number; reason: 'keinFortschritt' | 'zuSchnell' | 'abweichung' | 'verbrauch' | 'untergrenze' }
  | { kind: 'zielEinhalten'; over: number }
  | { kind: 'mehrDaten'; missing: Missing[] }
  | { kind: 'passt' }
  | { kind: 'sensibel' }
  | { kind: 'ohneZahlen' }
  | { kind: 'pausiert' };

export type CheckinHint = 'trainingWeniger' | 'trainingOk' | 'schlafKurz' | 'eiweissWenig' | 'ballaststoffeWenig';

export type CheckinResult = {
  summary: CheckinSummary;
  suggestion: CheckinSuggestion;
  hints: CheckinHint[];
  /** Untergrenze, mit der gerechnet wurde (für Fassung 2, applyV2); fehlt = 1200. */
  floor?: number;
};

/** Die 7 Tage bis einschließlich weekEnd, älteste zuerst (anders als dates.weekDays, das ab Montag zählt). */
export function weekDaysUntil(weekEnd: string): string[] {
  return weekFrom(shiftDay(weekEnd, -6));
}

/** Alter Name von weekDaysUntil – bleibt nur, bis app/progress/checkin.tsx auf weekDaysUntil umgestellt ist. */
export const weekDays = weekDaysUntil;

/** Ist ein neuer Check-in fällig (letzter vor ≥ 7 Tagen oder noch keiner)? */
export function checkinDue(lastWeekEnd: string | null, today: string): boolean {
  if (!lastWeekEnd) return true;
  return daysBetween(lastWeekEnd, today) >= CHECKIN_EVERY_DAYS;
}

export function weeklyCheckin(input: CheckinInput): CheckinResult {
  const weightAvg = weightTrend(input.weights, input.weekEnd);
  const weightAvgPrev = weightTrend(input.weights, shiftDay(input.weekEnd, -7));
  const change = weightAvg !== null && weightAvgPrev !== null ? weightAvg - weightAvgPrev : null;
  const week = weekAverage(input.days);
  const goals = input.days.filter((d) => d.goal !== null).map((d) => d.goal as number);
  const sleepAvg = mean(input.sleepHours);
  const summary: CheckinSummary = {
    weightAvg,
    weightAvgPrev,
    change,
    completeDays: week.trackedDays,
    incompleteDays: week.incompleteDays,
    kcalAvg: week.average,
    goalAvg: mean(goals),
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

  return { summary, suggestion: suggest(input, summary), hints, floor: input.floor ?? CALORIE_FLOOR };
}

/** Eiweiß und Ballaststoffe im Schnitt der vollständig erfassten Tage, mit Ziel (C9). */
function macroAverages(days: CheckinDay[]) {
  const complete = days.filter((d) => d.entries > 0 && d.kcal !== null && d.unknownKcal === 0 && !d.flagged);
  const avg = (values: (number | null | undefined)[]) => mean(values.filter((v): v is number => typeof v === 'number'));
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
  // Krank, verletzt oder Pause: Gewicht und Essen sagen in dieser Woche wenig über das Ziel aus (A6.7).
  if (input.paused) return { kind: 'pausiert' };
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
  const floor = input.floor ?? CALORIE_FLOOR;
  const to = Math.max(floor, goal + delta);
  if (to === goal) return { kind: 'passt' };
  // Liegt das eigene Ziel unter der Untergrenze, ist das der Grund – nicht der Gewichtsverlauf (Phase 1 Scan, F8).
  if (goal < floor && to > goal) return { kind: 'kcal', from: goal, to, reason: 'untergrenze' };
  return { kind: 'kcal', from: goal, to, reason };
}

/**
 * Check-in Fassung 2 (A7.4): ersetzt den Kalorienvorschlag durch „Verbrauch + Ziel-Abstand“. Sperren (sensible
 * Situation, ohne Zahlen, Status) bleiben; ohne Schätzung bleibt der Vorschlag nach Fassung 1.
 */
export function applyV2(result: CheckinResult, v2: V2Result): CheckinResult & { rulesVersion: 1 | 2 } {
  const blocked = ['sensibel', 'ohneZahlen', 'pausiert'].includes(result.suggestion.kind);
  if (blocked || v2.kind === 'ohne') return { ...result, rulesVersion: 1 };
  // Untergrenze des Check-ins (max(1200, Ruheenergie)) gilt auch hier, selbst wenn suggestV2 nur 1200 kannte.
  const floor = result.floor ?? CALORIE_FLOOR;
  const to = v2.kind === 'kcal' ? Math.max(floor, v2.to) : null;
  const suggestion: CheckinSuggestion =
    v2.kind === 'kcal' && to !== v2.from
      ? { kind: 'kcal', from: v2.from, to: to!, reason: v2.from < floor && to! > v2.from ? 'untergrenze' : 'verbrauch' }
      : { kind: 'passt' };
  return { ...result, suggestion, rulesVersion: 2 };
}
