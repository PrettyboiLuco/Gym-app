import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { ExercisePicker } from '@/components/exercise-picker';
import { ConfirmButton, Field, ListRow } from '@/components/fields';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { listActivePlans, listExercises, type Exercise, type PlanSummary } from '@/data/training';
import { deleteWorkout, loadWorkoutForEdit, plannedSetsForDay, saveWorkout, type WorkoutForEdit } from '@/data/workout-edit';
import { formatTime } from '@/domain/reminders';
import { localDay, localMinutes, timeZone, todayDay } from '@/domain/time';
import type { WeightUnit } from '@/domain/units';
import { groupRows, orderForNewSet, parseEditRows, parseWorkoutTime, rowTexts, workoutMinutes, type EditRow, type PlannedFields } from '@/domain/workout-edit';
import { exerciseName } from '@/format/exercise-name';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { t } from '@/i18n';
import { useUnits } from '@/providers/profile-provider';

/** Bearbeiten-Formular: Zeitpunkt und Sätze als Feldtexte. */
type Form = { day: string; time: string; minutes: string; planDayId: string | null; rows: EditRow[] };

type Loaded = { initial: Form | null; exercises: Exercise[]; plans: PlanSummary[]; missing: boolean };

const NEW = 'neu';
let keySeq = 0;
const nextKey = () => `r${++keySeq}`;

const NO_PLAN: PlannedFields = { plannedRepsMin: null, plannedRepsMax: null, plannedSeconds: null, restSeconds: 90, superset: null };

/** Bestehendes Training als Formular (Gewichte in der Anzeigeeinheit). */
function formOf(workout: WorkoutForEdit, exercises: Exercise[], unit: WeightUnit): Form {
  const timedIds = new Set(exercises.filter((e) => e.measure === 'zeit').map((e) => e.id));
  const { session, sets } = workout;
  const started = new Date(session.startedAt);
  return {
    day: localDay(started, timeZone),
    time: formatTime(localMinutes(started, timeZone)),
    minutes: String(workoutMinutes(session.startedAt, session.finishedAt)),
    planDayId: null,
    rows: sets.map((s) => ({
      key: `s-${s.id}`,
      id: s.id,
      exerciseId: s.exerciseId,
      order: s.position,
      setType: s.setType,
      timed: s.seconds != null || timedIds.has(s.exerciseId),
      plannedRepsMin: s.plannedRepsMin,
      plannedRepsMax: s.plannedRepsMax,
      plannedSeconds: s.plannedSeconds,
      restSeconds: s.restSeconds,
      superset: s.superset,
      ...rowTexts(s, unit),
    })),
  };
}

async function load(db: Db, id: string, unit: WeightUnit): Promise<Loaded> {
  const isNew = id === NEW;
  const [workout, exercises, plans] = await Promise.all([
    isNew ? Promise.resolve(null) : loadWorkoutForEdit(db, id),
    listExercises(db),
    isNew ? listActivePlans(db) : Promise.resolve([] as PlanSummary[]),
  ]);
  return { initial: workout ? formOf(workout, exercises, unit) : null, exercises, plans, missing: !isNew && !workout };
}

/** Vorschlag beim Nachtragen: heute, vor einer Stunde (auf 5 Minuten), 60 Minuten. */
function newForm(planDayId: string | null, rows: EditRow[]): Form {
  const started = Date.now() - 60 * 60_000;
  const minutes = Math.floor(localMinutes(new Date(started), timeZone) / 5) * 5;
  return { day: localDay(new Date(started), timeZone), time: formatTime(minutes), minutes: '60', planDayId, rows };
}

/**
 * Beendetes Training bearbeiten oder ein Krafttraining nachtragen (Prüfung 05.11.2026). Getrennt vom Trainings-Bildschirm:
 * keine Pausen, Mitteilungen oder Live-Anzeige, nur Zeitpunkt und Sätze.
 */
export default function WorkoutEditScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? NEW;
  const isNew = id === NEW;
  const theme = useTheme();
  const unit = useUnits().weight;
  const { data, loaded, db } = useLoad((db) => load(db, id, unit), { initial: null, exercises: [], plans: [], missing: false } as Loaded, id);
  // Beim Nachtragen der Stand nach der Vorlagenwahl; beim Bearbeiten das geladene Training.
  const [template, setTemplate] = useState<Form | null>(null);
  const [edited, setEdited] = useState<Form | null>(null);
  const [picking, setPicking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const base = isNew ? template : data.initial;
  const form = edited ?? base;
  const byId = new Map(data.exercises.map((e) => [e.id, e]));
  const isTimed = (exerciseId: string) => byId.get(exerciseId)?.measure === 'zeit';

  const dirty = form !== null && base !== null && JSON.stringify(form) !== JSON.stringify(base);
  const allowLeave = useUnsavedGuard(dirty && !busy);

  async function chooseTemplate(planDayId: string | null) {
    haptic.tap();
    const planned = planDayId ? await plannedSetsForDay(db, planDayId) : [];
    const rows = planned.map((p, i) => ({
      ...p,
      key: nextKey(),
      id: null,
      order: i,
      setType: 'arbeit' as const,
      timed: p.plannedSeconds != null || isTimed(p.exerciseId),
      weight: '',
      reps: '',
      seconds: '',
    }));
    setTemplate(newForm(planDayId, rows));
    setEdited(null);
  }

  const update = (change: Partial<Form>) => form && setEdited({ ...form, ...change });
  const updateRow = (key: string, change: Partial<EditRow>) => {
    setInvalid((list) => list.filter((k) => k !== key));
    if (form) setEdited({ ...form, rows: form.rows.map((r) => (r.key === key ? { ...r, ...change } : r)) });
  };

  function addSet(exerciseId: string) {
    if (!form) return;
    haptic.tap();
    const mine = form.rows.filter((r) => r.exerciseId === exerciseId).sort((a, b) => a.order - b.order);
    const last = mine.at(-1);
    // Neuer Satz übernimmt die Werte des letzten (meist gleiches Gewicht), wie im Training.
    const row: EditRow = {
      ...(last
        ? { ...last, setType: last.setType === 'aufwaermen' ? 'arbeit' : last.setType }
        : { ...NO_PLAN, setType: 'arbeit', weight: '', reps: '', seconds: '' }),
      key: nextKey(),
      id: null,
      exerciseId,
      timed: last?.timed ?? isTimed(exerciseId),
      order: orderForNewSet(form.rows, exerciseId),
    };
    update({ rows: [...form.rows, row] });
  }

  function removeRow(key: string) {
    haptic.tap();
    setInvalid((list) => list.filter((k) => k !== key));
    if (form) setEdited({ ...form, rows: form.rows.filter((r) => r.key !== key) });
  }

  async function save() {
    if (!form || busy) return;
    const time = parseWorkoutTime(form, timeZone, Date.now());
    if ('problem' in time) {
      setProblem(t(`workoutEdit.problems.${time.problem}`));
      haptic.warning();
      return;
    }
    const parsed = parseEditRows(form.rows, unit);
    setInvalid(parsed.invalid);
    if (parsed.invalid.length || !parsed.sets.length) {
      setProblem(t(parsed.invalid.length ? 'workoutEdit.problems.sets' : 'workoutEdit.problems.empty'));
      haptic.warning();
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      const saved = await saveWorkout(db, { sessionId: isNew ? null : id, planDayId: form.planDayId, ...time, sets: parsed.sets });
      allowLeave();
      haptic.success();
      showToast(t('workoutEdit.saved'));
      // Nach dem Speichern „beschäftigt“ lassen, bis der Bildschirm weg ist: sonst schaltet sich die Sperre gegen
      // ungespeichertes Verlassen wieder ein (falsche Warnung) und ein zweites Speichern legte das Training doppelt an.
      if (isNew) router.replace(`/training/session/${saved}`);
      else router.back();
    } catch {
      showToast(t('common.saveFailed'));
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteWorkout(db, id);
      allowLeave();
      showToast(t('workoutEdit.deleted'));
      router.dismissTo('/training/history');
    } catch {
      showToast(t('common.saveFailed'));
      setBusy(false);
    }
  }

  const title = isNew ? t('workoutEdit.titleNew') : t('workoutEdit.titleEdit');

  if (!loaded) return <Screen withHeader>{null}</Screen>;

  if (data.missing)
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title }} />
        <Card>
          <ThemedText themeColor="textSecondary">{t('workoutEdit.notFound')}</ThemedText>
        </Card>
      </Screen>
    );

  if (picking && form)
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title: t('workoutEdit.addExercise') }} />
        <ExercisePicker
          exercises={data.exercises.filter((e) => e.kind === 'kraft')}
          onCancel={() => setPicking(false)}
          onPick={(exercise) => {
            setPicking(false);
            addSet(exercise.id);
          }}
        />
      </Screen>
    );

  // Nachtragen, Schritt 1: Plantag als Vorlage oder freies Training.
  if (!form)
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title }} />
        <Card title={t('workoutEdit.templateTitle')}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('workoutEdit.templateHint')}
          </ThemedText>
          {data.plans.flatMap((plan) =>
            plan.days.map((day) => (
              <ListRow
                key={day.id}
                icon="dumbbell"
                title={`${plan.name} – ${day.name}`}
                subtitle={t('workoutEdit.daySub', { count: day.itemCount })}
                accessory="›"
                onPress={() => chooseTemplate(day.id)}
              />
            ))
          )}
          <ListRow icon="plus" title={t('workoutEdit.free')} subtitle={t('workoutEdit.freeSub')} accessory="›" last onPress={() => chooseTemplate(null)} />
        </Card>
      </Screen>
    );

  const groups = groupRows(form.rows);
  const unitLabel = t(`units.${unit}`, { value: '' }).trim();

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title }} />
      <Card title={t('workoutEdit.when')}>
        <DaySwitcher day={form.day} onChange={(day) => update({ day })} maxDay={todayDay()} />
        <View style={styles.pair}>
          <Field
            label={t('workoutEdit.start')}
            value={form.time}
            onChangeText={(time) => update({ time })}
            keyboardType="numbers-and-punctuation"
            style={styles.flex}
          />
          <Field
            label={t('workoutEdit.minutes')}
            value={form.minutes}
            onChangeText={(minutes) => update({ minutes })}
            keyboardType="number-pad"
            style={styles.flex}
          />
        </View>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <ThemedText themeColor="textSecondary">{t('workoutEdit.noSets')}</ThemedText>
        </Card>
      ) : null}

      {groups.map((group) => {
        const name = exerciseName(byId.get(group.exerciseId));
        return (
          <Card key={group.exerciseId} title={name}>
            {group.rows.map((row, i) => {
              const bad = invalid.includes(row.key);
              return (
                <View key={row.key} style={styles.row}>
                  <ThemedText type="small" themeColor={bad ? undefined : 'textSecondary'} style={[styles.setLabel, bad && { color: theme.danger }]}>
                    {t('workoutEdit.setLabel', { n: i + 1 })}
                  </ThemedText>
                  <Field
                    label={t('workoutEdit.weight', { unit: unitLabel })}
                    value={row.weight}
                    onChangeText={(weight) => updateRow(row.key, { weight })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    style={styles.flex}
                  />
                  {row.timed ? (
                    <Field
                      label={t('workoutEdit.seconds')}
                      value={row.seconds}
                      onChangeText={(seconds) => updateRow(row.key, { seconds })}
                      keyboardType="number-pad"
                      placeholder={row.plannedSeconds != null ? String(row.plannedSeconds) : undefined}
                      style={styles.flex}
                    />
                  ) : (
                    <Field
                      label={t('workoutEdit.reps')}
                      value={row.reps}
                      onChangeText={(reps) => updateRow(row.key, { reps })}
                      keyboardType="number-pad"
                      placeholder={row.plannedRepsMax != null ? `${row.plannedRepsMin}–${row.plannedRepsMax}` : undefined}
                      style={styles.flex}
                    />
                  )}
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={t('workoutEdit.removeSet', { n: i + 1, name })}
                    hitSlop={6}
                    onPress={() => removeRow(row.key)}
                    style={styles.remove}>
                    <Icon name="close" color={theme.textSecondary} size={18} />
                  </PressableScale>
                </View>
              );
            })}
            <Button label={t('workoutEdit.addSet')} variant="quiet" size="compact" onPress={() => addSet(group.exerciseId)} />
          </Card>
        );
      })}

      <Button label={t('workoutEdit.addExercise')} variant="secondary" onPress={() => setPicking(true)} />
      {problem ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {problem}
        </ThemedText>
      ) : null}
      <Button label={t('workoutEdit.save')} onPress={save} loading={busy} disabled={busy} />
      {!isNew ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('workoutEdit.deleteHint')}
          </ThemedText>
          <ConfirmButton label={t('workoutEdit.delete')} confirmLabel={t('workoutEdit.deleteConfirm')} onConfirm={remove} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  setLabel: { width: 48, paddingBottom: Spacing.three, fontVariant: ['tabular-nums'] },
  remove: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
});
