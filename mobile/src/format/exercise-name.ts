import type { Exercise } from '@/data/training';
import { patternOf } from '@/domain/exercises';
import { targetOf, type Target } from '@/domain/targets';
import { normalize } from '@/domain/text';
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

/** Zielmuskel einer Übung für Liste und Suche (z. B. „Obere Brust“); null = Muskelgruppe ohne Unterteilung. */
export function exerciseTarget(exercise: Pick<Exercise, 'id' | 'muscleGroup' | 'pattern'>): Target | null {
  return targetOf(exercise, patternOf(exercise));
}

/**
 * Passt die Übung zur Suche? Jedes Wort muss in Name, anderen Namen, Muskelgruppe, Zielmuskel oder Gerät vorkommen;
 * Groß-/Kleinschreibung und Umlaute egal („Kabel Trizeps Seil“, „schraeg kurzhantel“).
 */
export function matchesExercise(exercise: Exercise, query: string): boolean {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const target = exerciseTarget(exercise);
  const haystack = normalize(
    [
      exerciseName(exercise),
      ...exerciseSynonyms(exercise),
      t(`muscle.${exercise.muscleGroup}`),
      target ? t(`target.${target}`) : '',
      t(`equipment.${exercise.equipment}`),
    ].join(' ')
  );
  return words.every((w) => haystack.includes(w));
}
