// Gemeinsame Hilfen für Plan-Editor und Planassistent: Aufwärm-/Cool-down-Dauer und Tagesnamen.

import { holdLookup, routineMinutes } from '@/components/timed';
import type { Exercise } from '@/data/training';
import type { MuscleGroup } from '@/domain/exercises';
import type { DayType } from '@/domain/planner';
import { blockDraft, cooldownItems, warmupItems } from '@/domain/routines';
import type { PlanItemDraft } from '@/domain/training';
import { t } from '@/i18n';

/** Dauer des vorgeschlagenen Aufwärmens bzw. Cool-downs in Sekunden (STRETCH-001: in der Zeitschätzung). */
export function blockSeconds(items: Pick<PlanItemDraft, 'exerciseId'>[], exercises: Exercise[], kind: 'aufwaermen' | 'cooldown'): number {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const groups = [...new Set(items.map((i) => byId.get(i.exerciseId)?.muscleGroup).filter((g): g is MuscleGroup => !!g))];
  const hold = holdLookup(exercises);
  const block = kind === 'aufwaermen' ? warmupItems(groups, hold) : cooldownItems(groups, hold);
  return routineMinutes(blockDraft(block), exercises) * 60;
}

/** Aufwärmen + Cool-down eines Tages, wie es der Planassistent in die Dauer einrechnet. */
export function extraSecondsFor(exercises: Exercise[], warmup = true, cooldown = true) {
  return (items: PlanItemDraft[]) =>
    (warmup ? blockSeconds(items, exercises, 'aufwaermen') : 0) + (cooldown ? blockSeconds(items, exercises, 'cooldown') : 0);
}

export function dayLabel(type: DayType, letter: string | null): string {
  return letter ? `${t(`dayType.${type}`)} ${letter}` : t(`dayType.${type}`);
}
