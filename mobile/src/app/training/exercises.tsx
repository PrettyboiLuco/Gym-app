import { useRef, useState } from 'react';
import type { ScrollViewInstance } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { Choice, Field, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { addCustomExercise, listExercises, updateCustomExercise, type Exercise } from '@/data/training';
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type MuscleGroup } from '@/domain/exercises';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

export default function ExercisesScreen() {
  const theme = useTheme();
  const { data: exercises, reload, db } = useLoad(listExercises, [] as Exercise[]);
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('kurzhantel');
  const [muscle, setMuscle] = useState<MuscleGroup>('brust');
  const [error, setError] = useState(false);
  // ID der eigenen Übung, die gerade bearbeitet wird (UX-013); null = neue Übung.
  const [editing, setEditing] = useState<string | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);

  function reset() {
    setEditing(null);
    setName('');
    setError(false);
  }

  function startEdit(e: Exercise) {
    setEditing(e.id);
    setName(e.customName ?? '');
    setEquipment(e.equipment);
    setMuscle(e.muscleGroup);
    setError(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function save() {
    if (!name.trim()) {
      setError(true);
      return;
    }
    if (editing) await updateCustomExercise(db, editing, name, equipment, muscle);
    else await addCustomExercise(db, name, equipment, muscle);
    reset();
    await reload();
  }

  return (
    <Screen withHeader scrollRef={scrollRef}>
      <Card title={editing ? t('exercises.editTitle') : t('exercises.custom')}>
        {editing ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('exercises.editHint')}
          </ThemedText>
        ) : null}
        <Field label={t('exercises.customName')} value={name} onChangeText={setName} />
        <Choice
          label={t('exercises.equipment')}
          options={EQUIPMENT}
          value={equipment}
          onChange={setEquipment}
          format={(v) => t(`equipment.${v}`)}
        />
        <Choice
          label={t('exercises.muscleGroup')}
          options={MUSCLE_GROUPS}
          value={muscle}
          onChange={setMuscle}
          format={(v) => t(`muscle.${v}`)}
        />
        {error ? <ThemedText style={{ color: theme.danger }}>{t('exercises.nameMissing')}</ThemedText> : null}
        <Button label={editing ? t('common.save') : t('common.add')} onPress={save} />
        {editing ? <Button label={t('common.cancel')} variant="danger" onPress={reset} /> : null}
      </Card>

      {MUSCLE_GROUPS.map((group) => {
        const inGroup = exercises
          .filter((e) => e.muscleGroup === group)
          .sort((a, b) => exerciseName(a).localeCompare(exerciseName(b)));
        if (inGroup.length === 0) return null;
        return (
          <Card key={group} title={t(`muscle.${group}`)}>
            {inGroup.map((e) => (
              <ListRow
                key={e.id}
                title={exerciseName(e)}
                subtitle={t(`equipment.${e.equipment}`)}
                accessory={e.customName ? t('common.edit') : undefined}
                onPress={e.customName ? () => startEdit(e) : undefined}
              />
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
