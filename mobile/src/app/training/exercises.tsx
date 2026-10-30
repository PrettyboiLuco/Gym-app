import { useRef, useState } from 'react';
import type { ScrollViewInstance } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { Choice, Field, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { addCustomExercise, listExercises, updateCustomExercise, type Exercise } from '@/data/training';
import {
  EQUIPMENT,
  EXERCISE_KINDS,
  isStretchKind,
  MEASURES,
  MUSCLE_GROUPS,
  SIDES,
  type Equipment,
  type ExerciseKind,
  type Measure,
  type MuscleGroup,
  type Sides,
} from '@/domain/exercises';
import { parseWholeNumber } from '@/domain/training';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

export default function ExercisesScreen() {
  const theme = useTheme();
  const { data: exercises, reload, db } = useLoad(listExercises, [] as Exercise[]);
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('kurzhantel');
  const [muscle, setMuscle] = useState<MuscleGroup>('brust');
  const [kind, setKind] = useState<ExerciseKind>('kraft');
  const [measure, setMeasure] = useState<Measure>('wdh');
  const [sides, setSides] = useState<Sides>('beidseitig');
  const [hold, setHold] = useState('30');
  const [error, setError] = useState<'name' | 'hold' | null>(null);
  // ID der eigenen Übung, die gerade bearbeitet wird (UX-013); null = neue Übung.
  const [editing, setEditing] = useState<string | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);

  function reset() {
    setEditing(null);
    setName('');
    setKind('kraft');
    setMeasure('wdh');
    setSides('beidseitig');
    setHold('30');
    setError(null);
  }

  function startEdit(e: Exercise) {
    setEditing(e.id);
    setName(e.customName ?? '');
    setEquipment(e.equipment);
    setMuscle(e.muscleGroup);
    setKind(e.kind);
    setMeasure(e.measure);
    setSides(e.sides);
    setHold(String(e.holdSeconds ?? 30));
    setError(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function save() {
    if (!name.trim()) {
      setError('name');
      return;
    }
    const stretch = isStretchKind(kind);
    const holdSeconds = stretch ? parseWholeNumber(hold) : null;
    if (stretch && (holdSeconds === null || holdSeconds < 5 || holdSeconds > 300)) {
      setError('hold');
      return;
    }
    // Dehn- und Mobilitätsübungen laufen immer auf Zeit (STRETCH-007).
    const fields = { kind, sides, holdSeconds, measure: stretch ? ('zeit' as const) : measure };
    if (editing) await updateCustomExercise(db, editing, name, equipment, muscle, fields);
    else await addCustomExercise(db, name, equipment, muscle, fields);
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
        <Choice label={t('exercises.kind')} options={EXERCISE_KINDS} value={kind} onChange={setKind} format={(v) => t(`exercises.kindOption.${v}`)} />
        {isStretchKind(kind) ? (
          <>
            <Choice label={t('exercises.sides')} options={SIDES} value={sides} onChange={setSides} format={(v) => t(`exercises.sidesOption.${v}`)} />
            <Field label={t('exercises.hold')} value={hold} onChangeText={setHold} keyboardType="number-pad" />
          </>
        ) : (
          <>
            <Choice label={t('exercises.measure')} options={MEASURES} value={measure} onChange={setMeasure} format={(v) => t(`exercises.measureOption.${v}`)} />
            <Choice label={t('exercises.sides')} options={SIDES} value={sides} onChange={setSides} format={(v) => t(`exercises.sidesOption.${v}`)} />
          </>
        )}
        {error ? (
          <ThemedText style={{ color: theme.danger }}>{error === 'name' ? t('exercises.nameMissing') : t('exercises.holdInvalid')}</ThemedText>
        ) : null}
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
                subtitle={[
                  t(`equipment.${e.equipment}`),
                  e.kind !== 'kraft' ? t(`exercises.kindOption.${e.kind}`) : null,
                  e.measure === 'zeit' && e.kind === 'kraft' ? t('exercises.measureOption.zeit') : null,
                  e.sides === 'einseitig' ? t('exercises.sidesOption.einseitig') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
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
