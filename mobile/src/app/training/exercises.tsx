import { router } from 'expo-router';
import { Fragment, useRef, useState } from 'react';
import { Pressable, StyleSheet, type ScrollViewInstance } from 'react-native';

import { Button, Card } from '@/components/card';
import { ExerciseMedia } from '@/components/exercise-media';
import { Choice, Field, ListRow } from '@/components/fields';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addCustomExercise, listExercises, updateCustomExercise, type Exercise } from '@/data/training';
import {
  EQUIPMENT,
  EXERCISE_KINDS,
  EXERCISE_META,
  isStretchKind,
  MEASURES,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
  patternOf,
  SIDES,
  type Equipment,
  type ExerciseKind,
  type Measure,
  type MovementPattern,
  type MuscleGroup,
  type Sides,
} from '@/domain/exercises';
import { LOAD_MODES, type LoadMode } from '@/domain/logger';
import { mediaFor } from '@/domain/media';
import { targetsOf, type Target } from '@/domain/targets';
import { parseWholeNumber } from '@/domain/training';
import { exerciseName, exerciseTarget, matchesExercise } from '@/format/exercise-name';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { t, tOptional } from '@/i18n';
import { EXERCISE_MEDIA } from '@/media/exercise-media';

/** Startübung mit Kurzanleitung oder Planassistent-Daten (Muster, Ersatzübungen). */
function hasInfo(e: Exercise): boolean {
  return tOptional(`exerciseHow.${e.id}`) !== null || EXERCISE_META[e.id] !== undefined || mediaFor(EXERCISE_MEDIA, e.id) !== null;
}

/** Übungen einer Muskelgruppe nach Zielmuskel, in der festen Reihenfolge; ohne Zuordnung unter „Weitere“. */
function groupByTarget(list: Exercise[], group: MuscleGroup): [Target | 'sonstige' | null, Exercise[]][] {
  const targets = targetsOf(group);
  if (targets.length === 0) return [[null, list]];
  const byTarget = new Map<Target | 'sonstige', Exercise[]>();
  for (const e of list) {
    const target = exerciseTarget(e) ?? 'sonstige';
    byTarget.set(target, [...(byTarget.get(target) ?? []), e]);
  }
  return [...targets, 'sonstige' as const].filter((tg) => byTarget.has(tg)).map((tg) => [tg, byTarget.get(tg)!]);
}

export default function ExercisesScreen() {
  const theme = useTheme();
  const { data: exercises, reload, db } = useLoad(listExercises, [] as Exercise[]);
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('kurzhantel');
  const [muscle, setMuscle] = useState<MuscleGroup>('brust');
  const [kind, setKind] = useState<ExerciseKind>('kraft');
  const [measure, setMeasure] = useState<Measure>('wdh');
  const [sides, setSides] = useState<Sides>('beidseitig');
  // Gewichtsart (A1): „auto“ leitet sie aus Gerät und Seite ab.
  const [loadMode, setLoadMode] = useState<LoadMode | 'auto'>('auto');
  const [hold, setHold] = useState('30');
  // Bewegungsmuster für den Planassistenten (Phase 8.1); „auto“ = aus der Muskelgruppe.
  const [pattern, setPattern] = useState<MovementPattern | 'auto'>('auto');
  const [error, setError] = useState<'name' | 'hold' | null>(null);
  // Startübung, deren Kurzanleitung gerade aufgeklappt ist.
  const [openHow, setOpenHow] = useState<string | null>(null);
  // ID der eigenen Übung, die gerade bearbeitet wird (UX-013); null = neue Übung.
  const [editing, setEditing] = useState<string | null>(null);
  // Formular für eigene Übungen nur auf Wunsch: oben steht sonst gleich die Suche und die Liste.
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  // Übersicht: aufgeklappte Muskelgruppen, Suche und Gerätefilter (rund 1000 Übungen).
  const [openGroups, setOpenGroups] = useState<MuscleGroup[]>([]);
  const [query, setQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | 'alle'>('alle');

  function reset() {
    setCreating(false);
    setLoadMode('auto');
    setEditing(null);
    setName('');
    setKind('kraft');
    setMeasure('wdh');
    setSides('beidseitig');
    setHold('30');
    setPattern('auto');
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
    setLoadMode(e.loadMode ?? 'auto');
    setHold(String(e.holdSeconds ?? 30));
    setPattern(e.pattern ?? 'auto');
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
    const fields = {
      kind,
      sides,
      holdSeconds,
      measure: stretch ? ('zeit' as const) : measure,
      pattern: pattern === 'auto' ? null : pattern,
      loadMode: loadMode === 'auto' ? null : loadMode,
    };
    if (editing) await updateCustomExercise(db, editing, name, equipment, muscle, fields);
    else await addCustomExercise(db, name, equipment, muscle, fields);
    reset();
    await reload();
  }

  function renderRow(e: Exercise) {
    return (
      <Fragment key={e.id}>
        <ListRow
          title={exerciseName(e)}
          subtitle={[
            t(`equipment.${e.equipment}`),
            e.kind !== 'kraft' ? t(`exercises.kindOption.${e.kind}`) : null,
            e.measure === 'zeit' && e.kind === 'kraft' ? t('exercises.measureOption.zeit') : null,
            e.sides === 'einseitig' ? t('exercises.sidesOption.einseitig') : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          accessory={e.customName ? t('common.edit') : hasInfo(e) ? (openHow === e.id ? 'collapse' : 'info') : undefined}
          onPress={e.customName ? () => startEdit(e) : hasInfo(e) ? () => setOpenHow((id) => (id === e.id ? null : e.id)) : undefined}
        />
        {openHow === e.id ? <ExerciseMedia exerciseId={e.id} label={exerciseName(e)} /> : null}
        {openHow === e.id && e.kind === 'kraft' ? (
          <Button label={t('exerciseProgress.open')} variant="secondary" size="compact" onPress={() => router.push(`/training/exercise/${e.id}`)} />
        ) : null}
        {openHow === e.id ? (
          <ThemedText type="small" themeColor="textSecondary">
            {[
              tOptional(`exerciseHow.${e.id}`),
              EXERCISE_META[e.id] ? `${t(`pattern.${patternOf(e)}`)} · ${t(`exercises.levelOption.${EXERCISE_META[e.id].level}`)}` : null,
              EXERCISE_META[e.id]?.alternatives.length
                ? t('exercises.alternatives', {
                    list: EXERCISE_META[e.id].alternatives.map((id) => exerciseName(exercises.find((x) => x.id === id))).join(', '),
                  })
                : null,
            ]
              .filter(Boolean)
              .join('\n')}
          </ThemedText>
        ) : null}
      </Fragment>
    );
  }

  const filtering = query.trim().length > 0 || equipmentFilter !== 'alle';
  const visible = exercises
    .filter((e) => (equipmentFilter === 'alle' || e.equipment === equipmentFilter) && matchesExercise(e, query))
    .sort((a, b) => exerciseName(a).localeCompare(exerciseName(b)));

  return (
    <Screen withHeader scrollRef={scrollRef}>
      {!editing && !creating ? (
        <Button
          label={t('exercises.customOpen')}
          variant="secondary"
          icon={<Icon name="plus" color={theme.text} size={18} />}
          onPress={() => setCreating(true)}
        />
      ) : null}
      {editing || creating ? (
        <Card title={editing ? t('exercises.editTitle') : t('exercises.custom')}>
          {editing ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('exercises.editHint')}
            </ThemedText>
          ) : null}
          <Field label={t('exercises.customName')} value={name} onChangeText={setName} />
          <Choice label={t('exercises.equipment')} options={EQUIPMENT} value={equipment} onChange={setEquipment} format={(v) => t(`equipment.${v}`)} />
          <Choice label={t('exercises.muscleGroup')} options={MUSCLE_GROUPS} value={muscle} onChange={setMuscle} format={(v) => t(`muscle.${v}`)} />
          <Choice label={t('exercises.kind')} options={EXERCISE_KINDS} value={kind} onChange={setKind} format={(v) => t(`exercises.kindOption.${v}`)} />
          {isStretchKind(kind) ? (
            <>
              <Choice label={t('exercises.sides')} options={SIDES} value={sides} onChange={setSides} format={(v) => t(`exercises.sidesOption.${v}`)} />
              <Field label={t('exercises.hold')} value={hold} onChangeText={setHold} keyboardType="number-pad" />
            </>
          ) : (
            <>
              <Choice
                label={t('exercises.measure')}
                options={MEASURES}
                value={measure}
                onChange={setMeasure}
                format={(v) => t(`exercises.measureOption.${v}`)}
              />
              <Choice label={t('exercises.sides')} options={SIDES} value={sides} onChange={setSides} format={(v) => t(`exercises.sidesOption.${v}`)} />
              <Choice
                chips
                label={t('logger.loadMode')}
                options={['auto', ...LOAD_MODES] as const}
                value={loadMode}
                onChange={setLoadMode}
                format={(v) => t(`logger.loadModes.${v}`)}
              />
              <Choice
                label={t('exercises.pattern')}
                options={['auto', ...MOVEMENT_PATTERNS] as const}
                value={pattern}
                onChange={setPattern}
                format={(v) => (v === 'auto' ? t('exercises.patternAuto') : t(`pattern.${v}`))}
              />
            </>
          )}
          {error ? <ThemedText style={{ color: theme.danger }}>{error === 'name' ? t('exercises.nameMissing') : t('exercises.holdInvalid')}</ThemedText> : null}
          <Button label={editing ? t('common.save') : t('common.add')} onPress={save} />
          <Button label={t('common.cancel')} variant="secondary" onPress={reset} />
        </Card>
      ) : null}

      <Card title={t('exercises.browseTitle')}>
        <Field label={t('exercises.search')} placeholder={t('exercises.searchPlaceholder')} value={query} onChangeText={setQuery} autoCorrect={false} />
        <Choice
          scroll
          label={t('exercises.equipmentFilter')}
          options={['alle', ...EQUIPMENT] as const}
          value={equipmentFilter}
          onChange={setEquipmentFilter}
          format={(v) => (v === 'alle' ? t('exercises.allEquipment') : t(`equipment.${v}`))}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('exercises.count', { count: visible.length })}
        </ThemedText>
      </Card>

      {MUSCLE_GROUPS.map((group) => {
        const inGroup = visible.filter((e) => e.muscleGroup === group);
        if (inGroup.length === 0) return null;
        // Bei Suche oder Gerätefilter sind alle Gruppen mit Treffern offen, sonst nur die angetippte.
        const expanded = filtering || openGroups.includes(group);
        const sections = groupByTarget(inGroup, group);
        return (
          <Card key={group}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${t(`muscle.${group}`)}, ${t('exercises.count', { count: inGroup.length })}`}
              onPress={() => setOpenGroups((open) => (open.includes(group) ? open.filter((g) => g !== group) : [...open, group]))}
              style={({ pressed }) => [styles.groupHeader, { opacity: pressed ? 0.6 : 1 }]}>
              <ThemedText type="smallBold" style={styles.grow}>
                {t(`muscle.${group}`)} ({inGroup.length})
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary }}>{expanded ? '−' : '+'}</ThemedText>
            </Pressable>
            {expanded
              ? sections.map(([target, list]) => (
                  <Fragment key={target ?? 'alle'}>
                    {target ? (
                      <ThemedText type="small" themeColor="textSecondary" style={styles.targetTitle}>
                        {t(`target.${target}`)} ({list.length})
                      </ThemedText>
                    ) : null}
                    {list.map((e) => renderRow(e))}
                  </Fragment>
                ))
              : null}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  grow: { flex: 1 },
  targetTitle: { marginTop: Spacing.two },
});
