import type { Exercise } from '@/data/training';
import { t, tOptional } from '@/i18n';

/** Anzeigename: Startübungen kommen aus der Sprachdatei, eigene Übungen aus der Eingabe. */
export function exerciseName(exercise: Pick<Exercise, 'nameKey' | 'customName'> | undefined): string {
  if (!exercise) return '–';
  return exercise.nameKey ? t(exercise.nameKey) : (exercise.customName ?? '–');
}

/** Andere Namen einer Startübung für die Suche (TRAIN-003), z. B. „Squat“; eigene Übungen haben keine. */
export function exerciseSynonyms(exercise: Pick<Exercise, 'id' | 'nameKey'>): string[] {
  if (!exercise.nameKey) return [];
  return (tOptional(`exerciseSynonyms.${exercise.id}`) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}
