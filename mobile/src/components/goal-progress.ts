// Texte und Fortschritt der Ziele für Übersicht und Zielseite (Register GOAL-001–006).

import { exerciseName } from '@/components/exercise-name';
import { timeZone } from '@/components/nutrition-format';
import type { Db } from '@/data/db';
import { drinkGoalDays, liftSets, stretchDays, trainingDays, type GoalVersion } from '@/data/goals';
import { listFlexibilityTests } from '@/data/routines';
import { listSteps } from '@/data/steps';
import { stepGoalDays } from '@/domain/steps';
import { loadNutritionSettings } from '@/data/nutrition';
import type { Exercise } from '@/data/training';
import { listWeights } from '@/data/weights';
import { flexibilityProgress, habitWeeks, strengthProgress, weekStart, weightProgress } from '@/domain/goals';
import { shiftDay } from '@/domain/nutrition';
import type { Units } from '@/domain/units';
import { weightTrend } from '@/domain/weight';
import { formatDay, formatLength, formatWeight, t } from '@/i18n';

/** Kurzbeschreibung eines Ziels, z. B. „Abnehmen auf 75 kg“. */
export function goalTitle(goal: GoalVersion, units: Units, exercises: Exercise[]): string {
  if (goal.kind === 'gewicht') {
    const direction = t(`goals.direction.${goal.direction}`);
    return goal.targetKg === null
      ? t('goals.summary.gewicht', { direction })
      : t('goals.summary.gewichtTarget', { direction, target: formatWeight(goal.targetKg, units.weight) });
  }
  if (goal.kind === 'kraft') {
    return t('goals.summary.kraft', {
      exercise: exerciseName(exercises.find((e) => e.id === goal.exerciseId)),
      weight: formatWeight(goal.targetKg ?? 0, units.weight, 2),
      reps: goal.targetReps,
    });
  }
  if (goal.kind === 'beweglichkeit') {
    return t('goals.summary.beweglichkeit', { target: formatLength(goal.targetCm ?? 0, units.length) });
  }
  if (goal.habit === 'schritte') {
    return t('goals.summary.schritte', { steps: goal.targetSteps ?? 0, perWeek: goal.perWeek });
  }
  return t('goals.summary.gewohnheit', { habit: t(`goals.habit.${goal.habit}`), perWeek: goal.perWeek });
}

function signed(kg: number, units: Units) {
  const text = formatWeight(Math.abs(kg), units.weight);
  return kg > 0 ? `+${text}` : kg < 0 ? `−${text}` : text;
}

/** Fortschrittszeilen eines Ziels. Kein Zieldatum, keine Prognose (GOAL-006). */
export async function goalProgressLines(
  db: Db,
  goal: GoalVersion,
  units: Units,
  today: string,
  sensitive = false
): Promise<{ lines: string[]; reached: boolean }> {
  if (goal.kind === 'gewicht') {
    const weights = await listWeights(db);
    const trend = weightTrend(weights, today);
    // Ziel vor der ersten Messung gesetzt: erste Messung ab Gültigkeitsbeginn gilt als Start.
    const startKg = goal.startKg ?? weights.filter((w) => w.day >= goal.validFrom).at(-1)?.kg ?? null;
    const p = weightProgress({ direction: goal.direction!, targetKg: goal.targetKg, startKg }, trend);
    // Später „sensible Situation“ angegeben: altes Abnehmziel nicht stillschweigend weiterführen.
    const warning = sensitive && goal.direction === 'abnehmen' ? [t('goals.problems.sensitive')] : [];
    if (p.currentKg === null) return { lines: [...warning, t('goals.progress.noTrend')], reached: false };
    const lines = [...warning, t('goals.progress.current', { current: formatWeight(p.currentKg, units.weight) })];
    if (p.changeKg !== null) lines.push(t('goals.progress.change', { change: signed(p.changeKg, units) }));
    if (p.reached) lines.push(t('goals.progress.reached'));
    else if (p.remainingKg !== null) lines.push(t('goals.progress.remaining', { remaining: formatWeight(p.remainingKg, units.weight) }));
    return { lines, reached: p.reached };
  }
  if (goal.kind === 'kraft') {
    const sets = await liftSets(db, goal.exerciseId!, timeZone);
    const p = strengthProgress(sets, { targetKg: goal.targetKg!, targetReps: goal.targetReps! });
    const setText = (s: { weightKg: number; reps: number }) => `${formatWeight(s.weightKg, units.weight, 2)} × ${s.reps}`;
    const lines = [
      p.best
        ? t('goals.progress.best', { reps: goal.targetReps, best: setText(p.best) })
        : t('goals.progress.bestNone', { reps: goal.targetReps }),
    ];
    if (p.last) lines.push(t('goals.progress.last', { last: setText(p.last), date: formatDay(p.last.day) }));
    if (p.reached) lines.push(t('goals.progress.liftReached'));
    return { lines, reached: p.reached };
  }
  if (goal.kind === 'beweglichkeit') {
    const p = flexibilityProgress(await listFlexibilityTests(db), goal.targetCm ?? 0);
    if (!p.current) return { lines: [t('goals.progress.flexNone')], reached: false };
    const lines = [t('goals.progress.flexCurrent', { value: formatLength(p.current.cm, units.length), date: formatDay(p.current.day) })];
    if (p.start && p.start !== p.current) {
      lines.push(t('goals.progress.flexStart', { value: formatLength(p.start.cm, units.length), date: formatDay(p.start.day) }));
    }
    if (p.reached) lines.push(t('goals.progress.reached'));
    return { lines, reached: p.reached };
  }
  // Gewohnheit: aktuelle und drei vorherige Wochen.
  const from = shiftDay(weekStart(today), -21);
  const fromUtc = new Date(`${shiftDay(from, -1)}T00:00:00Z`).toISOString();
  let days: string[];
  if (goal.habit === 'training') {
    days = await trainingDays(db, fromUtc, timeZone);
  } else if (goal.habit === 'dehnen') {
    days = await stretchDays(db, fromUtc, timeZone);
  } else if (goal.habit === 'schritte') {
    days = stepGoalDays(await listSteps(db, from), goal.targetSteps ?? 0);
  } else {
    const settings = await loadNutritionSettings(db);
    if (!settings.drinkGoalMl) return { lines: [t('goals.progress.noDrinkGoal')], reached: false };
    days = await drinkGoalDays(db, from, settings.drinkGoalMl);
  }
  const weeks = habitWeeks(days, today, goal.perWeek!);
  return {
    lines: [
      t('goals.progress.week', { count: weeks[0].count, perWeek: goal.perWeek }),
      t('goals.progress.weeks', { reached: weeks.filter((w) => w.reached).length }),
    ],
    reached: weeks[0].reached,
  };
}
