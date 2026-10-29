import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { Choice, Field, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { addCustomExercise, listExercises, type Exercise } from '@/data/training';
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

  async function add() {
    if (!name.trim()) {
      setError(true);
      return;
    }
    setError(false);
    await addCustomExercise(db, name, equipment, muscle);
    setName('');
    await reload();
  }

  return (
    <Screen withHeader>
      <Card title={t('exercises.custom')}>
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
        <Button label={t('common.add')} onPress={add} />
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
                accessory={e.customName ? '★' : undefined}
              />
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
