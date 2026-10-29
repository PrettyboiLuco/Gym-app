import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { ExercisePicker } from '@/components/exercise-picker';
import { ConfirmButton, Field, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { useDb } from '@/data/store-provider';
import {
  activatePlanVersion,
  archivePlan,
  listExercises,
  listPlanVersions,
  loadPlanDraft,
  savePlan,
  type Exercise,
  type PlanVersionInfo,
} from '@/data/training';
import { estimateDayMinutes, MAX_DAYS, parseWholeNumber, validatePlan, type PlanDraft } from '@/domain/training';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, t } from '@/i18n';

// Im Formular stehen Zahlen als Text, damit man sie frei tippen kann.
type ItemForm = { exerciseId: string; sets: string; repsMin: string; repsMax: string; rest: string };
type DayForm = { name: string; items: ItemForm[] };
type PlanForm = { name: string; days: DayForm[] };

const NEW_ITEM = { sets: '3', repsMin: '8', repsMax: '12', rest: '90' };

function toForm(draft: PlanDraft): PlanForm {
  return {
    name: draft.name,
    days: draft.days.map((day) => ({
      name: day.name,
      items: day.items.map((i) => ({
        exerciseId: i.exerciseId,
        sets: String(i.sets),
        repsMin: String(i.repsMin),
        repsMax: String(i.repsMax),
        rest: String(i.restSeconds),
      })),
    })),
  };
}

function toDraft(form: PlanForm): PlanDraft {
  // Ungültige Zahlen werden zu -1 und von validatePlan gemeldet.
  const num = (text: string) => parseWholeNumber(text) ?? -1;
  return {
    name: form.name,
    days: form.days.map((day) => ({
      name: day.name,
      items: day.items.map((i) => ({
        exerciseId: i.exerciseId,
        sets: num(i.sets),
        repsMin: num(i.repsMin),
        repsMax: num(i.repsMax),
        restSeconds: num(i.rest),
      })),
    })),
  };
}

async function fetchEditor(db: Db, id: string, isNew: boolean) {
  const exercises = await listExercises(db);
  if (isNew) return { exercises, draft: null, versions: [] as PlanVersionInfo[] };
  return { exercises, draft: await loadPlanDraft(db, id), versions: await listPlanVersions(db, id) };
}

export default function PlanEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'neu';
  const db = useDb();
  const theme = useTheme();
  const [form, setForm] = useState<PlanForm>({ name: '', days: [{ name: '', items: [] }] });
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [versions, setVersions] = useState<PlanVersionInfo[]>([]);
  const [pickingFor, setPickingFor] = useState<number | null>(null);
  const [showProblems, setShowProblems] = useState(false);

  function apply(data: Awaited<ReturnType<typeof fetchEditor>>) {
    setExercises(data.exercises);
    if (data.draft) setForm(toForm(data.draft));
    setVersions(data.versions);
  }

  // Nur beim Öffnen laden; danach gilt der Formularzustand.
  useEffect(() => {
    let cancelled = false;
    fetchEditor(db, id, isNew).then((data) => {
      if (!cancelled) apply(data);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id, isNew]);

  const draft = toDraft(form);
  const problems = validatePlan(draft);
  const byId = new Map(exercises.map((e) => [e.id, e]));

  function updateDay(index: number, change: Partial<DayForm>) {
    setForm((f) => ({ ...f, days: f.days.map((d, i) => (i === index ? { ...d, ...change } : d)) }));
  }

  function updateItem(dayIndex: number, itemIndex: number, change: Partial<ItemForm>) {
    updateDay(dayIndex, {
      items: form.days[dayIndex].items.map((item, i) => (i === itemIndex ? { ...item, ...change } : item)),
    });
  }

  async function save() {
    if (problems.length > 0) {
      setShowProblems(true);
      return;
    }
    await savePlan(db, isNew ? null : id, draft);
    router.back();
  }

  async function activate(versionId: string) {
    await activatePlanVersion(db, id, versionId);
    apply(await fetchEditor(db, id, isNew));
  }

  async function archive() {
    await archivePlan(db, id);
    router.back();
  }

  if (pickingFor !== null) {
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title: t('plan.pickTitle') }} />
        <ExercisePicker
          exercises={exercises}
          onCancel={() => setPickingFor(null)}
          onPick={(exercise) => {
            updateDay(pickingFor, {
              items: [...form.days[pickingFor].items, { exerciseId: exercise.id, ...NEW_ITEM }],
            });
            setPickingFor(null);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: isNew ? t('plan.titleNew') : t('plan.titleEdit') }} />
      <Card>
        <Field
          label={t('plan.name')}
          placeholder={t('plan.namePlaceholder')}
          value={form.name}
          onChangeText={(name) => setForm((f) => ({ ...f, name }))}
        />
      </Card>

      {form.days.map((day, dayIndex) => (
        <Card key={dayIndex} title={t('plan.day', { number: dayIndex + 1 })}>
          <Field
            label={t('plan.dayName')}
            placeholder={t('plan.dayPlaceholder')}
            value={day.name}
            onChangeText={(name) => updateDay(dayIndex, { name })}
          />
          {day.items.map((item, itemIndex) => (
            <View key={itemIndex} style={[styles.item, { borderColor: theme.backgroundSelected }]}>
              <View style={styles.itemHeader}>
                <ThemedText type="smallBold" style={styles.flex}>
                  {exerciseName(byId.get(item.exerciseId))}
                </ThemedText>
                <Button
                  label={t('common.remove')}
                  variant="danger"
                  onPress={() => updateDay(dayIndex, { items: day.items.filter((_, i) => i !== itemIndex) })}
                />
              </View>
              <View style={styles.numbers}>
                {(['sets', 'repsMin', 'repsMax', 'rest'] as const).map((key) => (
                  <Field
                    key={key}
                    label={t(`plan.${key}`)}
                    value={item[key]}
                    keyboardType="number-pad"
                    style={styles.numberField}
                    onChangeText={(value) => updateItem(dayIndex, itemIndex, { [key]: value })}
                  />
                ))}
              </View>
            </View>
          ))}
          {day.items.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('plan.duration', {
                value: t('common.minutes', { value: estimateDayMinutes(draft.days[dayIndex].items.filter((i) => i.sets > 0 && i.restSeconds >= 0)) }),
              })}
            </ThemedText>
          ) : null}
          <Button label={t('plan.addExercise')} onPress={() => setPickingFor(dayIndex)} />
          {form.days.length > 1 ? (
            <ConfirmButton
              label={t('plan.removeDay')}
              onConfirm={() => setForm((f) => ({ ...f, days: f.days.filter((_, i) => i !== dayIndex) }))}
            />
          ) : null}
        </Card>
      ))}

      {form.days.length < MAX_DAYS ? (
        <Button
          label={t('plan.addDay')}
          onPress={() => setForm((f) => ({ ...f, days: [...f.days, { name: '', items: [] }] }))}
        />
      ) : null}

      {showProblems && problems.length > 0 ? (
        <Card>
          {problems.map((p) => (
            <ThemedText key={p} style={{ color: theme.danger }}>
              {t(`plan.problems.${p}`)}
            </ThemedText>
          ))}
        </Card>
      ) : null}
      <Button label={t('plan.save')} onPress={save} />

      {!isNew && versions.length > 0 ? (
        <Card title={t('plan.versionsTitle')}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('plan.versionsHint')}
          </ThemedText>
          {versions.map((v) => (
            <ListRow
              key={v.id}
              title={`${v.name}`}
              subtitle={t('plan.version', { version: v.version, date: formatDay(v.createdAt.slice(0, 10)) })}
              accessory={v.active ? t('plan.activeVersion') : t('plan.activate')}
              onPress={v.active ? undefined : () => activate(v.id)}
            />
          ))}
        </Card>
      ) : null}

      {!isNew ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('plan.archiveHint')}
          </ThemedText>
          <ConfirmButton label={t('plan.archive')} onConfirm={archive} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two, gap: Spacing.two },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  numbers: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  numberField: { flex: 1, minWidth: 0 },
});
