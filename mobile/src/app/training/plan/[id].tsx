import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { ExercisePicker } from '@/components/exercise-picker';
import { Choice, ConfirmButton, Field, ListRow, Presets } from '@/components/fields';
import { todayDay } from '@/components/nutrition-format';
import { blockSeconds as blockSecondsOf } from '@/components/planner-helpers';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { useDb } from '@/data/store-provider';
import {
  activatePlanVersion,
  activeVersion,
  archivePlan,
  listExercises,
  listPlanVersions,
  loadPlanDraft,
  savePlan,
  type Exercise,
  type PlanVersionInfo,
} from '@/data/training';
import {
  estimateDayMinutes,
  formatClock,
  MAX_DAYS,
  moveItem,
  parseWholeNumber,
  REST_PRESETS,
  validatePlan,
  type PlanDraft,
} from '@/domain/training';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatDay, t } from '@/i18n';

// Im Formular stehen Zahlen als Text, damit man sie frei tippen kann.
type ItemForm = { exerciseId: string; sets: string; repsMin: string; repsMax: string; rest: string; seconds: string };
type DayForm = { name: string; items: ItemForm[]; warmup: boolean; cooldown: boolean };
type PlanForm = { name: string; days: DayForm[] };

const NEW_ITEM = { sets: '3', repsMin: '8', repsMax: '12', rest: '90', seconds: '' };
const NEW_DAY: DayForm = { name: '', items: [], warmup: true, cooldown: true };
const EMPTY_FORM: PlanForm = { name: '', days: [NEW_DAY] };

function toForm(draft: PlanDraft): PlanForm {
  return {
    name: draft.name,
    days: draft.days.map((day) => ({
      name: day.name,
      warmup: day.warmup !== false,
      cooldown: day.cooldown !== false,
      items: day.items.map((i) => ({
        exerciseId: i.exerciseId,
        sets: String(i.sets),
        repsMin: String(i.repsMin),
        repsMax: String(i.repsMax),
        rest: String(i.restSeconds),
        seconds: i.targetSeconds == null ? '' : String(i.targetSeconds),
      })),
    })),
  };
}

function toDraft(form: PlanForm, timed: (exerciseId: string) => boolean): PlanDraft {
  // Ungültige Zahlen werden zu -1 und von validatePlan gemeldet.
  const num = (text: string) => parseWholeNumber(text) ?? -1;
  return {
    name: form.name,
    days: form.days.map((day) => ({
      name: day.name,
      warmup: day.warmup,
      cooldown: day.cooldown,
      items: day.items.map((i) => ({
        exerciseId: i.exerciseId,
        sets: num(i.sets),
        // Zeit-Übungen (UX-011): Sekunden statt Wiederholungen.
        repsMin: timed(i.exerciseId) ? 1 : num(i.repsMin),
        repsMax: timed(i.exerciseId) ? 1 : num(i.repsMax),
        restSeconds: num(i.rest),
        targetSeconds: timed(i.exerciseId) ? num(i.seconds) : null,
      })),
    })),
  };
}

async function fetchEditor(db: Db, id: string, isNew: boolean) {
  const exercises = await listExercises(db);
  if (isNew) return { exercises, draft: null, versions: [] as PlanVersionInfo[], active: null };
  return { exercises, draft: await loadPlanDraft(db, id), versions: await listPlanVersions(db, id), active: await activeVersion(db, id) };
}

export default function PlanEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'neu';
  const db = useDb();
  const theme = useTheme();
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  // Stand beim Öffnen bzw. letzten Laden; Abweichung heißt „ungespeichert“.
  const [baseline, setBaseline] = useState(() => JSON.stringify(EMPTY_FORM));
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [versions, setVersions] = useState<PlanVersionInfo[]>([]);
  // Aktive Fassung; ist sie befristet, bleibt sie es auch nach dem Bearbeiten (TRAIN-008).
  const [active, setActive] = useState<PlanVersionInfo | null>(null);
  const [pickingFor, setPickingFor] = useState<number | null>(null);
  const [showProblems, setShowProblems] = useState(false);

  function apply(data: Awaited<ReturnType<typeof fetchEditor>>) {
    setExercises(data.exercises);
    if (data.draft) {
      const loaded = toForm(data.draft);
      setForm(loaded);
      setBaseline(JSON.stringify(loaded));
    }
    setVersions(data.versions);
    setActive(data.active);
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

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const isTimed = (exerciseId: string) => byId.get(exerciseId)?.measure === 'zeit';
  const draft = toDraft(form, isTimed);
  const problems = validatePlan(draft);
  /** Dauer des vorgeschlagenen Aufwärmens/Cool-downs in Sekunden (STRETCH-001: in der Zeitschätzung). */
  const blockSeconds = (day: DayForm, kind: 'aufwaermen' | 'cooldown') => blockSecondsOf(day.items, exercises, kind);
  const allowLeave = useUnsavedGuard(JSON.stringify(form) !== baseline);

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
    await savePlan(
      db,
      isNew ? null : id,
      draft,
      active?.validUntil ? { validUntil: active.validUntil, returnVersionId: active.returnVersionId, note: active.note } : {}
    );
    allowLeave();
    router.back();
  }

  async function activate(versionId: string) {
    await activatePlanVersion(db, id, versionId, todayDay());
    apply(await fetchEditor(db, id, isNew));
  }

  async function archive() {
    await archivePlan(db, id);
    allowLeave();
    router.back();
  }

  if (pickingFor !== null) {
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title: t('plan.pickTitle') }} />
        <ExercisePicker
          exercises={exercises.filter((e) => e.kind === 'kraft')}
          onCancel={() => setPickingFor(null)}
          onPick={(exercise) => {
            const item = exercise.measure === 'zeit' ? { ...NEW_ITEM, repsMin: '1', repsMax: '1', seconds: '30' } : NEW_ITEM;
            updateDay(pickingFor, {
              items: [...form.days[pickingFor].items, { exerciseId: exercise.id, ...item }],
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
      {active?.validUntil && active.returnVersionId ? (
        <Card>
          <ThemedText type="small">{t('plan.temporary', { date: formatDay(active.validUntil) })}</ThemedText>
          <Button label={t('plan.temporaryEnd')} variant="danger" onPress={() => activate(active.returnVersionId!)} />
        </Card>
      ) : null}
      {!isNew ? (
        <Button label={t('plan.assistant')} variant="danger" onPress={() => router.push({ pathname: '/training/assistant', params: { plan: id } })} />
      ) : null}
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
                {itemIndex > 0 ? (
                  <Button
                    label="↑"
                    accessibilityLabel={`${t('common.moveUp')} ${exerciseName(byId.get(item.exerciseId))}`}
                    variant="danger"
                    onPress={() => updateDay(dayIndex, { items: moveItem(day.items, itemIndex, itemIndex - 1) })}
                  />
                ) : null}
                {itemIndex < day.items.length - 1 ? (
                  <Button
                    label="↓"
                    accessibilityLabel={`${t('common.moveDown')} ${exerciseName(byId.get(item.exerciseId))}`}
                    variant="danger"
                    onPress={() => updateDay(dayIndex, { items: moveItem(day.items, itemIndex, itemIndex + 1) })}
                  />
                ) : null}
                <Button
                  label={t('common.remove')}
                  variant="danger"
                  onPress={() => updateDay(dayIndex, { items: day.items.filter((_, i) => i !== itemIndex) })}
                />
              </View>
              <View style={styles.numbers}>
                {(isTimed(item.exerciseId) ? (['sets', 'seconds', 'rest'] as const) : (['sets', 'repsMin', 'repsMax', 'rest'] as const)).map((key) => (
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
              {isTimed(item.exerciseId) ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('plan.timedHint')}
                </ThemedText>
              ) : null}
              <Presets
                label={t('plan.rest')}
                options={REST_PRESETS}
                value={parseWholeNumber(item.rest) ?? undefined}
                format={(s) => formatClock(s * 1000)}
                onChange={(s) => updateItem(dayIndex, itemIndex, { rest: String(s) })}
              />
            </View>
          ))}
          <Choice
            label={t('plan.warmup')}
            options={['an', 'aus'] as const}
            value={day.warmup ? 'an' : 'aus'}
            onChange={(v) => updateDay(dayIndex, { warmup: v === 'an' })}
            format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
          />
          <Choice
            label={t('plan.cooldown')}
            options={['an', 'aus'] as const}
            value={day.cooldown ? 'an' : 'aus'}
            onChange={(v) => updateDay(dayIndex, { cooldown: v === 'an' })}
            format={(v) => (v === 'an' ? t('common.on') : t('common.off'))}
          />
          {day.items.length > 0 && day.warmup ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('plan.warmupHint', { minutes: Math.round(blockSeconds(day, 'aufwaermen') / 60) })}
            </ThemedText>
          ) : null}
          {day.items.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('plan.duration', {
                value: t('common.minutes', {
                  value: estimateDayMinutes(
                    draft.days[dayIndex].items.filter((i) => i.sets > 0 && i.restSeconds >= 0 && (i.targetSeconds ?? 0) >= 0),
                    45,
                    60,
                    (day.warmup ? blockSeconds(day, 'aufwaermen') : 0) + (day.cooldown ? blockSeconds(day, 'cooldown') : 0)
                  ),
                }),
              })}
            </ThemedText>
          ) : null}
          <Button label={t('plan.addExercise')} onPress={() => setPickingFor(dayIndex)} />
          {form.days.length > 1 ? (
            <View style={styles.dayMoves}>
              {dayIndex > 0 ? (
                <Button
                  label={`↑ ${t('common.moveUp')}`}
                  variant="danger"
                  onPress={() => setForm((f) => ({ ...f, days: moveItem(f.days, dayIndex, dayIndex - 1) }))}
                />
              ) : null}
              {dayIndex < form.days.length - 1 ? (
                <Button
                  label={`↓ ${t('common.moveDown')}`}
                  variant="danger"
                  onPress={() => setForm((f) => ({ ...f, days: moveItem(f.days, dayIndex, dayIndex + 1) }))}
                />
              ) : null}
            </View>
          ) : null}
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
          onPress={() => setForm((f) => ({ ...f, days: [...f.days, NEW_DAY] }))}
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
              subtitle={[
                t('plan.version', { version: v.version, date: formatDay(v.createdAt.slice(0, 10)) }),
                v.note,
                v.validUntil ? t('plan.temporaryUntil', { date: formatDay(v.validUntil) }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
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
  dayMoves: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});
