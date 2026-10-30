// Körperziele (Register GOAL-001–007, COACH-004, COACH-010). Mehrere Ziele gleichzeitig,
// jede Änderung als neue Version mit Gültig-ab-Datum. Keine Erfolgsgarantie und kein Zieldatum:
// angezeigt wird nur, wo man gerade steht (GOAL-006).

import { bmi, underweightLimitKg, UNDERWEIGHT_BMI, type Goal } from './energy';
import { parseWholeNumber } from './training';
import { BODY_WEIGHT_RANGE, LIFT_RANGE, parseLengthIn, parseWeightIn, type LengthUnit, type WeightUnit } from './units';

/** Bereich des Finger-Boden-Abstands in cm (0 = Boden erreicht). */
export const FLEX_RANGE = { min: 0, max: 100 } as const;

export const GOAL_KINDS = ['gewicht', 'kraft', 'gewohnheit', 'beweglichkeit'] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

export const DIRECTIONS = ['abnehmen', 'halten', 'zunehmen'] as const satisfies readonly Goal[];

/** Gewohnheiten, die die App heute schon messen kann; Schritte folgen mit Apple Health (Phase 6). */
export const HABITS = ['training', 'trinken', 'dehnen'] as const;
export type Habit = (typeof HABITS)[number];

export type GoalDraft =
  | { kind: 'gewicht'; direction: Goal; targetKg: number | null }
  | { kind: 'kraft'; exerciseId: string; targetKg: number; targetReps: number }
  | { kind: 'gewohnheit'; habit: Habit; perWeek: number }
  /** Beweglichkeit über den Finger-Boden-Test: Ziel-Abstand in cm (0 = Boden). */
  | { kind: 'beweglichkeit'; targetCm: number };

export type GoalForm = {
  kind: GoalKind;
  direction: Goal;
  targetWeight: string;
  exerciseId: string | null;
  liftWeight: string;
  reps: string;
  habit: Habit;
  perWeek: string;
  targetCm: string;
};

export const EMPTY_GOAL_FORM: GoalForm = {
  kind: 'gewicht',
  direction: 'halten',
  targetWeight: '',
  exerciseId: null,
  liftWeight: '',
  reps: '',
  habit: 'training',
  perWeek: '3',
  targetCm: '',
};

export type GoalProblem =
  | 'targetWeight'
  | 'direction'
  | 'heightNeeded'
  | 'underweight'
  | 'sensitive'
  | 'exercise'
  | 'lift'
  | 'reps'
  | 'perWeek'
  | 'targetCm';

export type GoalContext = { currentKg: number | null; heightCm: number | null; sensitive: boolean };

/**
 * Prüft ein Ziel. Abnehmen wird nicht unterstützt, wenn es in den Untergewichtsbereich führt, die
 * Person schon dort liegt oder eine sensible Situation angegeben ist – dann Verweis auf Fachleute
 * (GOAL-007, COACH-010). Ein Zielgewicht beim Abnehmen braucht deshalb die Größe.
 */
export function parseGoalForm(
  form: GoalForm,
  unit: WeightUnit,
  ctx: GoalContext,
  lengthUnit: LengthUnit = 'cm'
): { draft: GoalDraft | null; problems: GoalProblem[] } {
  const problems: GoalProblem[] = [];
  if (form.kind === 'beweglichkeit') {
    const targetCm = parseLengthIn(form.targetCm, lengthUnit, FLEX_RANGE);
    if (targetCm === null) return { draft: null, problems: ['targetCm'] };
    return { draft: { kind: 'beweglichkeit', targetCm: Math.max(0, targetCm) }, problems };
  }
  if (form.kind === 'gewicht') {
    const text = form.targetWeight.trim();
    const targetKg = form.direction === 'halten' || text === '' ? null : parseWeightIn(text, unit, BODY_WEIGHT_RANGE);
    if (form.direction !== 'halten' && text !== '' && targetKg === null) problems.push('targetWeight');
    if (form.direction === 'abnehmen') {
      if (ctx.sensitive) problems.push('sensitive');
      else if (ctx.currentKg !== null && ctx.heightCm !== null && bmi(ctx.currentKg, ctx.heightCm) < UNDERWEIGHT_BMI) {
        problems.push('underweight');
      } else if (targetKg !== null) {
        if (ctx.heightCm === null) problems.push('heightNeeded');
        else if (targetKg < underweightLimitKg(ctx.heightCm)) problems.push('underweight');
      }
    }
    if (targetKg !== null && ctx.currentKg !== null) {
      if (form.direction === 'abnehmen' && targetKg >= ctx.currentKg) problems.push('direction');
      if (form.direction === 'zunehmen' && targetKg <= ctx.currentKg) problems.push('direction');
    }
    if (problems.length > 0) return { draft: null, problems };
    return { draft: { kind: 'gewicht', direction: form.direction, targetKg }, problems };
  }
  if (form.kind === 'kraft') {
    if (!form.exerciseId) problems.push('exercise');
    const targetKg = parseWeightIn(form.liftWeight, unit, LIFT_RANGE);
    if (targetKg === null) problems.push('lift');
    const reps = parseWholeNumber(form.reps);
    if (reps === null || reps < 1 || reps > 100) problems.push('reps');
    if (problems.length > 0) return { draft: null, problems };
    return { draft: { kind: 'kraft', exerciseId: form.exerciseId!, targetKg: targetKg!, targetReps: reps! }, problems };
  }
  const perWeek = parseWholeNumber(form.perWeek);
  if (perWeek === null || perWeek < 1 || perWeek > 7) problems.push('perWeek');
  if (problems.length > 0) return { draft: null, problems };
  return { draft: { kind: 'gewohnheit', habit: form.habit, perWeek: perWeek! }, problems };
}

// ------------------------------------------------------------------------------- Fortschritt

export type WeightProgress = {
  startKg: number | null;
  currentKg: number | null;
  targetKg: number | null;
  /** Veränderung seit dem Start (negativ = abgenommen). */
  changeKg: number | null;
  /** Noch bis zum Ziel (immer ≥ 0), null ohne Ziel oder Trend. */
  remainingKg: number | null;
  reached: boolean;
};

/**
 * Fortschritt eines Gewichtsziels anhand des 7-Tage-Durchschnitts, nie eines Einzelwerts.
 * Ohne Trend gibt es keine Aussage.
 */
export function weightProgress(
  goal: { direction: Goal; targetKg: number | null; startKg: number | null },
  trendKg: number | null
): WeightProgress {
  const changeKg = trendKg !== null && goal.startKg !== null ? trendKg - goal.startKg : null;
  if (trendKg === null || goal.targetKg === null || goal.direction === 'halten') {
    return { startKg: goal.startKg, currentKg: trendKg, targetKg: goal.targetKg, changeKg, remainingKg: null, reached: false };
  }
  const reached = goal.direction === 'abnehmen' ? trendKg <= goal.targetKg : trendKg >= goal.targetKg;
  return {
    startKg: goal.startKg,
    currentKg: trendKg,
    targetKg: goal.targetKg,
    changeKg,
    remainingKg: reached ? 0 : Math.abs(goal.targetKg - trendKg),
    reached,
  };
}

export type LiftSet = { weightKg: number; reps: number; day: string };

/**
 * Kraftziel aus erledigten Sätzen derselben Übung (GOAL-005, wie TRAIN-014): bester Satz mit
 * mindestens den Ziel-Wiederholungen und der zuletzt erledigte Satz.
 */
export function strengthProgress(sets: LiftSet[], target: { targetKg: number; targetReps: number }) {
  const qualifying = sets.filter((s) => s.reps >= target.targetReps);
  const best = qualifying.reduce<LiftSet | null>((b, s) => (b === null || s.weightKg > b.weightKg ? s : b), null);
  const last = sets.reduce<LiftSet | null>((l, s) => (l === null || s.day >= l.day ? s : l), null);
  return { best, last, reached: best !== null && best.weightKg >= target.targetKg };
}

/**
 * Beweglichkeitsziel aus Finger-Boden-Tests (Liste absteigend nach Tag): erster Test als Start,
 * neuester als aktueller Wert. Kleiner ist besser.
 */
export function flexibilityProgress(tests: { day: string; cm: number }[], targetCm: number) {
  if (tests.length === 0) return { start: null, current: null, reached: false };
  const current = tests[0];
  const start = tests[tests.length - 1];
  return { start, current, reached: current.cm <= targetCm };
}

/** Montag der Woche (YYYY-MM-DD), in der `day` liegt. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/**
 * Wochenquote einer Gewohnheit: zählt verschiedene Tage pro Woche (Mo–So) für die aktuelle und
 * die `weeks − 1` vorherigen Wochen. Keine Strafe oder Serie, nur die Zahl (TRACK-006).
 */
export function habitWeeks(days: string[], today: string, perWeek: number, weeks = 4) {
  const unique = [...new Set(days)];
  const result: { start: string; count: number; reached: boolean }[] = [];
  let start = weekStart(today);
  for (let i = 0; i < weeks; i++) {
    const end = new Date(`${start}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 6);
    const endDay = end.toISOString().slice(0, 10);
    const count = unique.filter((d) => d >= start && d <= endDay).length;
    result.push({ start, count, reached: count >= perWeek });
    const prev = new Date(`${start}T12:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 7);
    start = prev.toISOString().slice(0, 10);
  }
  return result;
}
