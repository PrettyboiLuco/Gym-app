import type { Exercise } from '@/data/training';
import { t } from '@/i18n';

/** Anzeigename: Startübungen kommen aus der Sprachdatei, eigene Übungen aus der Eingabe. */
export function exerciseName(exercise: Pick<Exercise, 'nameKey' | 'customName'> | undefined): string {
  if (!exercise) return '–';
  return exercise.nameKey ? t(exercise.nameKey) : (exercise.customName ?? '–');
}
