// Adaptiver Energiebedarf (Ausbauplan A7). Ohne KI: Energiebilanz aus den eigenen Daten. Alle Zahlen sind Vorschläge
// bis zur Fachprüfung (docs/Fachpruefung_Mappe.md, Abschnitt J).
//
// Regeln Fassung 1:
// - Fenster: die 28 Tage bis gestern. Gezählt werden nur vollständig erfasste Tage (Einträge, alle kcal bekannt, nicht
//   als „nicht vollständig“ markiert); mindestens 14, sonst „noch am Lernen“.
// - Gewicht: geglätteter Trend (7-Tage-Schnitt über Tagesmittel, mind. 4 Messtage) am Anfang und am Ende des Fensters;
//   die Zeit zwischen den Mitten beider Wochen ist die Spanne (21 Tage).
// - Verbrauch = Ø Aufnahme − (Trendänderung × 7.700 kcal/kg) ÷ Spanne, auf 10 kcal gerundet.
// - Unsicherheit = 7.700 × 0,3 kg ÷ Spanne + 100 kcal, auf 50 gerundet (Wasserschwankung im Trend + Erfassungsfehler).
// - Check-in Fassung 2 (nur, wenn gewählt): Ziel = Verbrauch + Abstand der Coach-Einrichtung (z. B. −500), auf 50 kcal
//   gerundet, höchstens ±200 kcal Änderung je Woche, unter 100 kcal Unterschied kein Vorschlag, nie unter die Untergrenze, kein Senken bei Untergewicht; ohne
//   Schätzung gilt Fassung 1.
//
// Regeln Fassung 2 (03.11.2026): wie Fassung 1, die Untergrenze ist max(1200, Ruheenergie) statt nur 1200 (CALC-005,
// `floor`; der Check-in prüft sie zusätzlich in applyV2).

import { shiftDay } from './dates';
import { bmi, CALORIE_FLOOR, UNDERWEIGHT_BMI } from './energy';
import { mean, roundTo } from './math';
import { weightTrend, type WeightEntry } from './weight';

export const ADAPTIVE_RULES_VERSION = 2;
export const WINDOW_DAYS = 28;
export const MIN_COMPLETE_DAYS = 14;
export const KCAL_PER_KG = 7700;
export const TREND_NOISE_KG = 0.3;
export const BASE_UNCERTAINTY = 100;
export const MAX_WEEKLY_CHANGE = 200;
export const ROUND_TO = 50;
/** Kleinere Änderungen sind im Rauschen der Schätzung – dann „passt“. */
export const MIN_CHANGE = 100;

export type IntakeDay = { day: string; kcal: number | null; entries: number; unknownKcal: number; flagged?: number | boolean };

export type Estimate =
  | {
      kind: 'schaetzung';
      kcal: number;
      plusMinus: number;
      intakeAvg: number;
      completeDays: number;
      trendStart: number;
      trendEnd: number;
      change: number;
      spanDays: number;
      from: string;
      to: string;
    }
  | { kind: 'lernen'; completeDays: number; needed: number; weightStart: boolean; weightEnd: boolean; from: string; to: string };

const isComplete = (d: IntakeDay) => d.entries > 0 && d.kcal !== null && d.unknownKcal === 0 && !d.flagged;

/** Geschätzter Verbrauch für das Fenster bis `endDay` (meist gestern). */
export function estimateExpenditure(days: IntakeDay[], weights: Pick<WeightEntry, 'day' | 'kg'>[], endDay: string, windowDays = WINDOW_DAYS): Estimate {
  const from = shiftDay(endDay, -(windowDays - 1));
  const complete = days.filter((d) => d.day >= from && d.day <= endDay && isComplete(d));
  const trendStart = weightTrend(weights, shiftDay(from, 6));
  const trendEnd = weightTrend(weights, endDay);
  if (complete.length < MIN_COMPLETE_DAYS || trendStart === null || trendEnd === null) {
    return {
      kind: 'lernen',
      completeDays: complete.length,
      needed: MIN_COMPLETE_DAYS,
      weightStart: trendStart !== null,
      weightEnd: trendEnd !== null,
      from,
      to: endDay,
    };
  }
  const spanDays = windowDays - 7;
  const intakeAvg = mean(complete.map((d) => d.kcal ?? 0))!;
  const change = trendEnd - trendStart;
  const kcal = roundTo(intakeAvg - (change * KCAL_PER_KG) / spanDays, 10);
  const plusMinus = roundTo((KCAL_PER_KG * TREND_NOISE_KG) / spanDays + BASE_UNCERTAINTY, ROUND_TO);
  return { kind: 'schaetzung', kcal, plusMinus, intakeAvg, completeDays: complete.length, trendStart, trendEnd, change, spanDays, from, to: endDay };
}

export type WeekBalance = { from: string; to: string; intakeAvg: number | null; completeDays: number; change: number | null; expenditure: number | null };

/**
 * Wochenverlauf Aufnahme gegen Verbrauch (4 Wochen, älteste zuerst). Der Verbrauch einer einzelnen Woche schwankt
 * stark mit dem Wasserhaushalt – er ist Anschauung, die Schätzung über 28 Tage ist die Grundlage.
 */
export function weeklyBalance(days: IntakeDay[], weights: Pick<WeightEntry, 'day' | 'kg'>[], endDay: string, weeks = 4): WeekBalance[] {
  const out: WeekBalance[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const to = shiftDay(endDay, -7 * w);
    const from = shiftDay(to, -6);
    const complete = days.filter((d) => d.day >= from && d.day <= to && isComplete(d));
    const intakeAvg = mean(complete.map((d) => d.kcal ?? 0));
    const end = weightTrend(weights, to);
    const start = weightTrend(weights, shiftDay(to, -7));
    const change = end !== null && start !== null ? end - start : null;
    const expenditure = intakeAvg !== null && change !== null && complete.length >= 4 ? roundTo(intakeAvg - (change * KCAL_PER_KG) / 7, 10) : null;
    out.push({ from, to, intakeAvg, completeDays: complete.length, change, expenditure });
  }
  return out;
}

export type V2Input = {
  estimate: Estimate;
  /** Abstand aus der Coach-Einrichtung (z. B. −500 für Abnehmen); null = keine Einrichtung. */
  delta: number | null;
  currentGoal: number | null;
  weightKg: number | null;
  heightCm: number | null;
  /** Untergrenze max(1200, Ruheenergie) (CALC-005); ohne Angabe 1200. */
  floor?: number;
};

export type V2Result =
  | { kind: 'kcal'; from: number; to: number; target: number; capped: boolean }
  | { kind: 'passt'; target: number }
  | { kind: 'ohne'; why: 'lernen' | 'keineEinrichtung' | 'keinZiel' };

/** Vorschlag nach Fassung 2 (nur Zahlenteil; Sperren wie sensibel/ohne Zahlen/Status prüft der Check-in vorher). */
export function suggestV2(i: V2Input): V2Result {
  if (i.estimate.kind !== 'schaetzung') return { kind: 'ohne', why: 'lernen' };
  if (i.delta === null) return { kind: 'ohne', why: 'keineEinrichtung' };
  if (i.currentGoal === null) return { kind: 'ohne', why: 'keinZiel' };
  const floor = i.floor ?? CALORIE_FLOOR;
  const target = Math.max(floor, roundTo(i.estimate.kcal + i.delta, ROUND_TO));
  let to = Math.max(i.currentGoal - MAX_WEEKLY_CHANGE, Math.min(i.currentGoal + MAX_WEEKLY_CHANGE, target));
  to = Math.max(floor, roundTo(to, ROUND_TO));
  const underweight = i.weightKg !== null && i.heightCm !== null && bmi(i.weightKg, i.heightCm) < UNDERWEIGHT_BMI;
  if (to < i.currentGoal && underweight) return { kind: 'passt', target };
  if (Math.abs(to - i.currentGoal) < MIN_CHANGE) return { kind: 'passt', target };
  return { kind: 'kcal', from: i.currentGoal, to, target, capped: to !== target };
}
