// Einblicke (Review W9): wählbare Kacheln mit Kurzwert und Verlauf sowie sachliche Wochen-Muster aus den letzten Wochen.
//
// Regeln:
// - Keine Serien, keine Bewertung: Kacheln und Muster beschreiben nur, was war („an 5 von 7 Tagen“, „Ø 2300 kcal“).
// - Essen zählt nur an vollständig erfassten Tagen (Einträge, alle kcal bekannt, nicht als unvollständig markiert) –
//   wie der Wochenschnitt der Ernährung (TRACK-002/004). Der laufende Ernährungstag zählt noch nicht.
// - Kacheln: Fenster 7 Tage, Verlauf 14 Tage (Gewicht 28 Tage, Training 8 Wochen); ein Schnitt erst ab 3 Tagen mit Wert.
// - Muster: Fenster 8 Wochen (Eiweiß 4 Wochen), nur mit genug Tagen (PATTERN_MIN); Unterschiede unter der Spürbarkeits-
//   grenze (SAME) heißen „etwa gleich“.
// - Sensible Situation / „ohne Kalorienzahlen“: keine Muster mit kcal-Zahlen (die Oberfläche blendet dazu kcal- und
//   Gewichtszahlen in den Kacheln aus).

import { isoWeekday, shiftDay } from './dates';
import { mean, roundDigits, roundTo } from './math';
import type { Modules } from './modules';
import type { Level } from './readiness';
import { weightTrend } from './weight';

export const INSIGHT_TILES = ['kalorien', 'eiweiss', 'gewicht', 'training', 'schritte', 'schlaf', 'bereitschaft'] as const;
export type InsightTile = (typeof INSIGHT_TILES)[number];
export const DEFAULT_INSIGHT_TILES: readonly InsightTile[] = ['kalorien', 'eiweiss', 'gewicht', 'training'];

/** Fenster der Kacheln, Länge der Verläufe und Mindestzahl Tage für einen Schnitt. */
export const TILE_DAYS = 7;
export const SPARK_DAYS = 14;
export const WEIGHT_SPARK_DAYS = 28;
export const TRAINING_SPARK_WEEKS = 8;
export const TILE_MIN_DAYS = 3;

/** Muster: Fenster und Mindestzahl Tage je Gruppe. */
export const PATTERN_WEEKS = 8;
export const PROTEIN_PATTERN_WEEKS = 4;
export const PATTERN_MIN = {
  weekendDays: 4,
  weekdayDays: 8,
  proteinDays: 14,
  trainingDays: 6,
  restDays: 6,
  trainedTotal: 8,
} as const;
/** Unterschiede darunter gelten als „etwa gleich“. */
export const SAME = { kcal: 50, sleepHours: 0.25, steps: 500 } as const;

export type InsightDay = {
  day: string;
  /** Nur an vollständig erfassten Tagen; sonst null. */
  food: { kcal: number; protein: number | null } | null;
  /** Eiweißziel dieses Tages in g (Coach); null = keins. */
  proteinGoal: number | null;
  trained: boolean;
  steps: number | null;
  sleepHours: number | null;
  /** Ampel des Tages (nur mit Morgen-Check und genug Grundlage). */
  readiness: Level | null;
};

/** Tagessumme aus dem Tagebuch → Essen eines vollständig erfassten Tages oder null. */
export function completeFood(row: {
  entries: number;
  kcal: number | null;
  unknownKcal: number;
  flagged?: number | boolean;
  protein: number | null;
}): InsightDay['food'] {
  if (row.entries <= 0 || row.kcal === null || row.unknownKcal > 0 || !!row.flagged) return null;
  return { kcal: row.kcal, protein: row.protein };
}

/** Gespeicherte Auswahl prüfen: nur bekannte Kacheln, keine doppelten, in fester Reihenfolge. */
export function cleanTiles(stored: unknown): InsightTile[] {
  if (!Array.isArray(stored)) return [...DEFAULT_INSIGHT_TILES];
  return INSIGHT_TILES.filter((tile) => stored.includes(tile));
}

/** Kacheln, die zu den eingeschalteten Bereichen passen (Ernährung bzw. Bereitschaft/Morgen-Check). */
export function availableTiles(modules: Pick<Modules, 'ernaehrung' | 'bereitschaft'>): InsightTile[] {
  return INSIGHT_TILES.filter((tile) => {
    if (tile === 'kalorien' || tile === 'eiweiss') return modules.ernaehrung;
    if (tile === 'schlaf' || tile === 'bereitschaft') return modules.bereitschaft;
    return true;
  });
}

export type TileSummary = {
  tile: InsightTile;
  /** mean = Schnitt (kcal, g, kg, Schritte, h) · count = „value von of Tagen“. */
  kind: 'mean' | 'count';
  /** Hauptwert; null = zu wenig Daten. */
  value: number | null;
  /** Bezug bei „count“, z. B. 7 Tage oder Tage mit Eiweißziel. */
  of: number | null;
  /** Tage mit Wert im Fenster (für „an x Tagen erfasst“). */
  days: number;
  /** Nur Gewicht: Veränderung des Trends zur Vorwoche. */
  change: number | null;
  /** Verlauf, ältester zuerst; null = kein Wert an diesem Tag bzw. in dieser Woche. */
  spark: (number | null)[];
  /** Training: Verlauf je Woche als Säulen statt als Linie. */
  bars: boolean;
  /** Nur Bereitschaft: Ampel je Tag, ältester zuerst. */
  levels: (Level | null)[];
};

/** Tage von `end` rückwärts, ältester zuerst. */
const lastDays = (end: string, count: number) => Array.from({ length: count }, (_, i) => shiftDay(end, i - count + 1));

function byDay(days: readonly InsightDay[]) {
  const map = new Map(days.map((d) => [d.day, d]));
  return (day: string) => map.get(day);
}

const meanIfEnough = (values: number[], min = TILE_MIN_DAYS) => (values.length >= min ? mean(values) : null);

const base = (tile: InsightTile): TileSummary => ({ tile, kind: 'mean', value: null, of: null, days: 0, change: null, spark: [], bars: false, levels: [] });

/**
 * Kurzwerte aller Kacheln.
 * - `today`: heute (Training, Schritte, Schlaf, Bereitschaft, Gewicht zählen bis einschließlich heute)
 * - `foodEnd`: letzter abgeschlossener Ernährungstag (meist gestern)
 */
export function tileSummaries(
  days: readonly InsightDay[],
  weights: { day: string; kg: number }[],
  today: string,
  foodEnd: string
): Record<InsightTile, TileSummary> {
  const at = byDay(days);
  const foodWindow = lastDays(foodEnd, TILE_DAYS).map((d) => at(d));
  const foodSpark = lastDays(foodEnd, SPARK_DAYS).map((d) => at(d));
  const window = lastDays(today, TILE_DAYS).map((d) => at(d));
  const spark = lastDays(today, SPARK_DAYS).map((d) => at(d));

  // Kalorien: Schnitt über vollständig erfasste Tage.
  const kcal = foodWindow.flatMap((d) => (d?.food ? [d.food.kcal] : []));
  const kalorien = { ...base('kalorien'), value: meanIfEnough(kcal), days: kcal.length, spark: foodSpark.map((d) => d?.food?.kcal ?? null) };

  // Eiweiß: mit Ziel „an x von y Tagen erreicht“, ohne Ziel der Schnitt in g.
  const withGoal = foodWindow.filter((d): d is InsightDay => !!d?.food && d.food.protein !== null && d.proteinGoal !== null && d.proteinGoal > 0);
  const proteinValues = foodWindow.flatMap((d) => (d?.food && d.food.protein !== null ? [d.food.protein] : []));
  const eiweiss: TileSummary = withGoal.length
    ? {
        ...base('eiweiss'),
        kind: 'count',
        value: withGoal.filter((d) => (d.food!.protein ?? 0) >= d.proteinGoal!).length,
        of: withGoal.length,
        days: withGoal.length,
        spark: foodSpark.map((d) => d?.food?.protein ?? null),
      }
    : { ...base('eiweiss'), value: meanIfEnough(proteinValues), days: proteinValues.length, spark: foodSpark.map((d) => d?.food?.protein ?? null) };

  // Gewicht: Trend (Ø 7 Tage) und Veränderung zur Vorwoche; Verlauf = Trend je Tag.
  const trend = weightTrend(weights, today);
  const before = weightTrend(weights, shiftDay(today, -7));
  const weighDays = new Set(weights.filter((w) => w.day <= today && w.day > shiftDay(today, -TILE_DAYS)).map((w) => w.day)).size;
  const gewicht = {
    ...base('gewicht'),
    value: trend,
    change: trend !== null && before !== null ? trend - before : null,
    days: weighDays,
    spark: lastDays(today, WEIGHT_SPARK_DAYS).map((d) => weightTrend(weights, d)),
  };

  // Training: Tage in den letzten 7 Tagen; Verlauf = Trainingstage je 7-Tage-Block der letzten 8 Wochen.
  const trainedIn = (end: string) => lastDays(end, 7).filter((d) => at(d)?.trained).length;
  const training: TileSummary = {
    ...base('training'),
    kind: 'count',
    value: trainedIn(today),
    of: TILE_DAYS,
    days: trainedIn(today),
    bars: true,
    spark: Array.from({ length: TRAINING_SPARK_WEEKS }, (_, i) => trainedIn(shiftDay(today, -7 * (TRAINING_SPARK_WEEKS - 1 - i)))),
  };

  const steps = window.flatMap((d) => (d?.steps != null ? [d.steps] : []));
  const schritte = { ...base('schritte'), value: meanIfEnough(steps), days: steps.length, spark: spark.map((d) => d?.steps ?? null) };

  const sleep = window.flatMap((d) => (d?.sleepHours != null ? [d.sleepHours] : []));
  const schlaf = { ...base('schlaf'), value: meanIfEnough(sleep), days: sleep.length, spark: spark.map((d) => d?.sleepHours ?? null) };

  // Bereitschaft: wie oft die Ampel grün war – unter den Tagen mit Ampel. Verlauf als Ampel-Punkte.
  const levels = window.flatMap((d) => (d?.readiness ? [d.readiness] : []));
  const bereitschaft: TileSummary = {
    ...base('bereitschaft'),
    kind: 'count',
    value: levels.length ? levels.filter((l) => l === 'gruen').length : null,
    of: levels.length || null,
    days: levels.length,
    levels: spark.map((d) => d?.readiness ?? null),
  };

  return { kalorien, eiweiss, gewicht, training, schritte, schlaf, bereitschaft };
}

export type Direction = 'mehr' | 'weniger' | 'gleich';

export type WeekPattern =
  | { key: 'wochenendeKcal'; direction: Direction; diff: number; weekend: number; weekday: number; days: number }
  | { key: 'eiweissZiel'; perWeek: number; hits: number; of: number }
  | { key: 'trainingKcal'; training: number; rest: number; days: number }
  | { key: 'trainingWochentage'; weekdays: number[]; weeks: number }
  | { key: 'schlafWochenende'; direction: Direction; diff: number; days: number }
  | { key: 'schritteTraining'; direction: Direction; training: number; rest: number; days: number };

const isWeekend = (day: string) => isoWeekday(day) >= 6;
const direction = (diff: number, same: number): Direction => (Math.abs(diff) < same ? 'gleich' : diff > 0 ? 'mehr' : 'weniger');

/**
 * Sachliche Wochen-Muster aus den letzten 8 Wochen – nur, wo genug Tage vorliegen. Reihenfolge fest.
 * `hideNumbers`: sensible Situation bzw. „ohne Kalorienzahlen“ → keine Muster mit kcal.
 */
export function weekPatterns(
  days: readonly InsightDay[],
  options: { today: string; foodEnd: string; modules: Pick<Modules, 'ernaehrung' | 'bereitschaft'>; hideNumbers: boolean }
): WeekPattern[] {
  const { today, foodEnd, modules, hideNumbers } = options;
  const at = byDay(days);
  const span = PATTERN_WEEKS * 7;
  const foodDays = lastDays(foodEnd, span)
    .map((d) => at(d))
    .filter((d): d is InsightDay => !!d?.food);
  const allDays = lastDays(today, span).map((d) => at(d) ?? null);
  const out: WeekPattern[] = [];

  if (modules.ernaehrung && !hideNumbers) {
    const weekend = foodDays.filter((d) => isWeekend(d.day)).map((d) => d.food!.kcal);
    const weekday = foodDays.filter((d) => !isWeekend(d.day)).map((d) => d.food!.kcal);
    if (weekend.length >= PATTERN_MIN.weekendDays && weekday.length >= PATTERN_MIN.weekdayDays) {
      const we = roundTo(mean(weekend)!, 10);
      const wd = roundTo(mean(weekday)!, 10);
      const diff = roundTo(mean(weekend)! - mean(weekday)!, 10);
      out.push({ key: 'wochenendeKcal', direction: direction(diff, SAME.kcal), diff: Math.abs(diff), weekend: we, weekday: wd, days: foodDays.length });
    }
  }

  if (modules.ernaehrung) {
    const proteinDays = lastDays(foodEnd, PROTEIN_PATTERN_WEEKS * 7)
      .map((d) => at(d))
      .filter((d): d is InsightDay => !!d?.food && d.food.protein !== null && d.proteinGoal !== null && d.proteinGoal > 0);
    if (proteinDays.length >= PATTERN_MIN.proteinDays) {
      const hits = proteinDays.filter((d) => d.food!.protein! >= d.proteinGoal!).length;
      out.push({ key: 'eiweissZiel', perWeek: Math.round((hits / proteinDays.length) * 7), hits, of: proteinDays.length });
    }
  }

  if (modules.ernaehrung && !hideNumbers) {
    const trained = foodDays.filter((d) => d.trained).map((d) => d.food!.kcal);
    const rest = foodDays.filter((d) => !d.trained).map((d) => d.food!.kcal);
    if (trained.length >= PATTERN_MIN.trainingDays && rest.length >= PATTERN_MIN.restDays) {
      out.push({ key: 'trainingKcal', training: roundTo(mean(trained)!, 10), rest: roundTo(mean(rest)!, 10), days: foodDays.length });
    }
  }

  // Häufigste Trainingstage: Wochentage, an denen in mindestens der Hälfte der Wochen trainiert wurde (höchstens drei).
  const trainedDays = allDays.filter((d): d is InsightDay => !!d?.trained);
  if (trainedDays.length >= PATTERN_MIN.trainedTotal) {
    const counts = [1, 2, 3, 4, 5, 6, 7].map((w) => ({ w, n: trainedDays.filter((d) => isoWeekday(d.day) === w).length }));
    const weekdays = counts
      .filter((c) => c.n >= PATTERN_WEEKS / 2)
      .sort((a, b) => b.n - a.n || a.w - b.w)
      .slice(0, 3)
      .map((c) => c.w)
      .sort((a, b) => a - b);
    if (weekdays.length) out.push({ key: 'trainingWochentage', weekdays, weeks: PATTERN_WEEKS });
  }

  if (modules.bereitschaft) {
    const slept = allDays.filter((d): d is InsightDay => d?.sleepHours != null);
    const weekend = slept.filter((d) => isWeekend(d.day)).map((d) => d.sleepHours!);
    const weekday = slept.filter((d) => !isWeekend(d.day)).map((d) => d.sleepHours!);
    if (weekend.length >= PATTERN_MIN.weekendDays && weekday.length >= PATTERN_MIN.weekdayDays) {
      const diff = roundDigits(mean(weekend)! - mean(weekday)!, 1);
      out.push({ key: 'schlafWochenende', direction: direction(diff, SAME.sleepHours), diff: Math.abs(diff), days: slept.length });
    }
  }

  // Schritte des laufenden Tages sind noch nicht fertig – bis gestern.
  const stepDays = lastDays(shiftDay(today, -1), span)
    .map((d) => at(d))
    .filter((d): d is InsightDay => d?.steps != null);
  const stepsTrained = stepDays.filter((d) => d.trained).map((d) => d.steps!);
  const stepsRest = stepDays.filter((d) => !d.trained).map((d) => d.steps!);
  if (stepsTrained.length >= PATTERN_MIN.trainingDays && stepsRest.length >= PATTERN_MIN.restDays) {
    const training = roundTo(mean(stepsTrained)!, 100);
    const rest = roundTo(mean(stepsRest)!, 100);
    out.push({ key: 'schritteTraining', direction: direction(mean(stepsTrained)! - mean(stepsRest)!, SAME.steps), training, rest, days: stepDays.length });
  }

  return out;
}
