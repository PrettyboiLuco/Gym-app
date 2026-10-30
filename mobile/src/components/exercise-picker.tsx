import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { exerciseName, exerciseSynonyms } from '@/components/exercise-name';
import { Field, ListRow } from '@/components/fields';
import type { Exercise } from '@/data/training';
import { MUSCLE_GROUPS } from '@/domain/exercises';
import { t } from '@/i18n';

/** Übungsliste mit Suche, nach Muskelgruppe sortiert. */
export function ExercisePicker({
  exercises,
  onPick,
  onCancel,
}: {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const filtered = exercises
    // Suche auch nach anderen Namen, Muskelgruppe und Gerät, z. B. „Squat“, „Brust“ oder „Kabel“.
    .filter(
      (e) =>
        !needle ||
        [exerciseName(e), ...exerciseSynonyms(e), t(`muscle.${e.muscleGroup}`), t(`equipment.${e.equipment}`)].some((text) =>
          text.toLowerCase().includes(needle)
        )
    )
    .sort(
      (a, b) =>
        MUSCLE_GROUPS.indexOf(a.muscleGroup) - MUSCLE_GROUPS.indexOf(b.muscleGroup) ||
        exerciseName(a).localeCompare(exerciseName(b))
    );

  return (
    <Card title={t('plan.pickTitle')}>
      <Field label={t('plan.search')} value={query} onChangeText={setQuery} autoFocus />
      {filtered.map((exercise) => (
        <ListRow
          key={exercise.id}
          title={exerciseName(exercise)}
          subtitle={`${t(`muscle.${exercise.muscleGroup}`)} · ${t(`equipment.${exercise.equipment}`)}`}
          accessory="+"
          onPress={() => onPick(exercise)}
        />
      ))}
      <Button label={t('common.cancel')} variant="danger" onPress={onCancel} />
    </Card>
  );
}
