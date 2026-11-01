import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { Field, ListRow } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import type { Exercise } from '@/data/training';
import { MUSCLE_GROUPS } from '@/domain/exercises';
import { exerciseName, matchesExercise } from '@/format/exercise-name';
import { t } from '@/i18n';

const MAX_SHOWN = 60;

/** Übungsliste mit Suche, nach Muskelgruppe sortiert. */
export function ExercisePicker({ exercises, onPick, onCancel }: { exercises: Exercise[]; onPick: (exercise: Exercise) => void; onCancel: () => void }) {
  const [query, setQuery] = useState('');
  const filtered = exercises
    // Suche auch nach anderen Namen, Muskelgruppe, Zielmuskel und Gerät, z. B. „Squat“, „obere Brust“ oder „Kabel Seil“.
    .filter((e) => matchesExercise(e, query))
    .sort((a, b) => MUSCLE_GROUPS.indexOf(a.muscleGroup) - MUSCLE_GROUPS.indexOf(b.muscleGroup) || exerciseName(a).localeCompare(exerciseName(b)));
  // Bei rund 1000 Übungen nur die ersten Treffer zeigen, damit die Liste flüssig bleibt.
  const shown = filtered.slice(0, MAX_SHOWN);

  return (
    <Card title={t('plan.pickTitle')}>
      <Field label={t('plan.search')} value={query} onChangeText={setQuery} autoFocus />
      {filtered.length > MAX_SHOWN ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('plan.pickMore', { shown: MAX_SHOWN, count: filtered.length })}
        </ThemedText>
      ) : null}
      {shown.map((exercise) => (
        <ListRow
          key={exercise.id}
          title={exerciseName(exercise)}
          subtitle={`${t(`muscle.${exercise.muscleGroup}`)} · ${t(`equipment.${exercise.equipment}`)}`}
          accessory="+"
          onPress={() => onPick(exercise)}
        />
      ))}
      <Button label={t('common.cancel')} variant="secondary" onPress={onCancel} />
    </Card>
  );
}
