import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Button, Card } from '@/components/card';
import { ExercisePicker } from '@/components/exercise-picker';
import { Choice, ConfirmButton, Field, ItemTools, ListRow, Toggle } from '@/components/fields';
import {
  EMPTY_FORM,
  NEW_DAY,
  NEW_ITEM,
  planDraftToForm,
  planFormToDraft,
  supersetGroups,
  type CardioForm,
  type DayForm,
  type ItemForm,
  type PlanForm,
} from '@/components/plan-form-logic';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import {
  activatePlanVersion,
  activeVersion,
  archivePlan,
  listActivePlans,
  listExercises,
  listPlanVersions,
  loadPlanDraft,
  savePlan,
  type Exercise,
  type PlanVersionInfo,
} from '@/data/training';
import { loadSecondsPerSet } from '@/data/training-stats';
import { CARDIO_ACTIVITIES } from '@/domain/cardio';
import { supersetLetters } from '@/domain/logger';
import { localDay, timeZone, todayDay } from '@/domain/time';
import { estimateDayMinutes, MAX_DAYS, moveItem, validatePlan } from '@/domain/training';
import { exerciseName } from '@/format/exercise-name';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatDay, t } from '@/i18n';
import { useDb } from '@/providers/store-provider';
import { blockSeconds as blockSecondsOf } from '@/services/planner-helpers';

async function fetchEditor(db: Db, id: string, isNew: boolean) {
  const exercises = await listExercises(db);
  if (isNew) return { exercises, draft: null, versions: [] as PlanVersionInfo[], active: null, dayIds: [] as string[] };
  // Kennungen der Plantage in Reihenfolge – für „Tag in der Satz-Woche angetippt“ (?day=…) gleich dorthin scrollen.
  const dayIds = (await listActivePlans(db)).find((p) => p.planId === id)?.days.map((d) => d.id) ?? [];
  return { exercises, draft: await loadPlanDraft(db, id), versions: await listPlanVersions(db, id), active: await activeVersion(db, id), dayIds };
}

export default function PlanEditorScreen() {
  const { id, day: focusDayId } = useLocalSearchParams<{ id: string; day?: string }>();
  const isNew = id === 'neu';
  // Aus der Satz-Woche geöffnet: einmal zum angetippten Plantag scrollen.
  const [focusDay, setFocusDay] = useState<number | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrolledTo = useRef(false);
  const reduced = useReducedMotion();
  const db = useDb();
  const theme = useTheme();
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  // Stand beim Öffnen bzw. letzten Laden; Abweichung heißt „ungespeichert“.
  const [baseline, setBaseline] = useState(() => JSON.stringify(EMPTY_FORM));
  const [exercises, setExercises] = useState<Exercise[]>([]);
  // Eigene Satzzeit (A8.3) für die Dauer je Tag, sonst 45 s.
  const [secondsPerSet, setSecondsPerSet] = useState(45);
  const [versions, setVersions] = useState<PlanVersionInfo[]>([]);
  // Aktive Fassung; ist sie befristet, bleibt sie es auch nach dem Bearbeiten (TRAIN-008).
  const [active, setActive] = useState<PlanVersionInfo | null>(null);
  const [pickingFor, setPickingFor] = useState<number | null>(null);
  const [cardioPickFor, setCardioPickFor] = useState<number | null>(null);
  const [showProblems, setShowProblems] = useState(false);

  function apply(data: Awaited<ReturnType<typeof fetchEditor>>) {
    setExercises(data.exercises);
    if (data.draft) {
      const loaded = planDraftToForm(data.draft);
      setForm(loaded);
      setBaseline(JSON.stringify(loaded));
    }
    setVersions(data.versions);
    setActive(data.active);
  }

  // Nur beim Öffnen laden; danach gilt der Formularzustand.
  useEffect(() => {
    loadSecondsPerSet(db).then((v) => v && setSecondsPerSet(v));
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    fetchEditor(db, id, isNew).then((data) => {
      if (cancelled) return;
      apply(data);
      const index = focusDayId ? data.dayIds.indexOf(focusDayId) : -1;
      if (index >= 0) setFocusDay(index);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id, isNew, focusDayId]);

  // Zurück vom Planassistenten (oder einem anderen Bildschirm): ohne ungespeicherte Änderungen neu laden,
  // sonst würde Speichern die neue Fassung still überschreiben (Phase 1 Scan, F10).
  const dirty = JSON.stringify(form) !== baseline;
  const dirtyRef = useRef(false);
  const applyRef = useRef(apply);
  useEffect(() => {
    dirtyRef.current = dirty;
    applyRef.current = apply;
  });
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      if (isNew || dirtyRef.current) return;
      fetchEditor(db, id, isNew).then((data) => applyRef.current(data));
    }, [db, id, isNew])
  );

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const isTimed = (exerciseId: string) => byId.get(exerciseId)?.measure === 'zeit';
  const draft = planFormToDraft(form, isTimed);
  const problems = validatePlan(draft);
  /** Dauer des vorgeschlagenen Aufwärmens/Cool-downs in Sekunden (STRETCH-001: in der Zeitschätzung). */
  const blockSeconds = (day: DayForm, kind: 'aufwaermen' | 'cooldown') => blockSecondsOf(day.items, exercises, kind);
  const allowLeave = useUnsavedGuard(dirty);

  function updateDay(index: number, change: Partial<DayForm>) {
    setForm((f) => ({ ...f, days: f.days.map((d, i) => (i === index ? { ...d, ...change } : d)) }));
  }

  function updateItem(dayIndex: number, itemIndex: number, change: Partial<ItemForm>) {
    updateDay(dayIndex, {
      items: form.days[dayIndex].items.map((item, i) => (i === itemIndex ? { ...item, ...change } : item)),
    });
  }

  function updateCardio(dayIndex: number, cardioIndex: number, change: Partial<CardioForm>) {
    updateDay(dayIndex, {
      cardio: (form.days[dayIndex].cardio ?? []).map((c, i) => (i === cardioIndex ? { ...c, ...change } : c)),
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
    <Screen withHeader scrollRef={scrollRef}>
      <Stack.Screen options={{ title: isNew ? t('plan.titleNew') : t('plan.titleEdit') }} />
      {active?.validUntil && active.returnVersionId ? (
        <Card>
          <ThemedText type="small">{t('plan.temporary', { date: formatDay(active.validUntil) })}</ThemedText>
          <Button label={t('plan.temporaryEnd')} variant="secondary" onPress={() => activate(active.returnVersionId!)} />
        </Card>
      ) : null}
      {!isNew ? (
        <Button
          label={t('plan.assistant')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/training/assistant', params: { plan: id, from: 'editor' } })}
        />
      ) : null}
      <Card>
        <Field label={t('plan.name')} placeholder={t('plan.namePlaceholder')} value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} />
      </Card>

      {form.days.map((day, dayIndex) => (
        <View
          key={dayIndex}
          onLayout={(e) => {
            if (dayIndex !== focusDay || scrolledTo.current) return;
            scrolledTo.current = true;
            scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - Spacing.three), animated: !reduced });
          }}>
          <Card title={t('plan.day', { number: dayIndex + 1 })}>
            <Field label={t('plan.dayName')} placeholder={t('plan.dayPlaceholder')} value={day.name} onChangeText={(name) => updateDay(dayIndex, { name })} />
            {day.items.map((item, itemIndex) => (
              <Fragment key={itemIndex}>
                <View style={[styles.item, { borderColor: theme.backgroundSelected }]}>
                  {supersetGroups(day.items)[itemIndex] != null ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('plan.supersetBadge', {
                        letter: supersetLetters(supersetGroups(day.items)).get(supersetGroups(day.items)[itemIndex]!),
                      })}
                    </ThemedText>
                  ) : null}
                  <View style={styles.itemHeader}>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{item.label?.trim() || exerciseName(byId.get(item.exerciseId))}</ThemedText>
                      {item.label?.trim() && item.label.trim() !== exerciseName(byId.get(item.exerciseId)) ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {exerciseName(byId.get(item.exerciseId))}
                        </ThemedText>
                      ) : null}
                    </View>
                    <ItemTools
                      name={exerciseName(byId.get(item.exerciseId))}
                      onUp={itemIndex > 0 ? () => updateDay(dayIndex, { items: moveItem(day.items, itemIndex, itemIndex - 1) }) : undefined}
                      onDown={
                        itemIndex < day.items.length - 1 ? () => updateDay(dayIndex, { items: moveItem(day.items, itemIndex, itemIndex + 1) }) : undefined
                      }
                      onRemove={() => updateDay(dayIndex, { items: day.items.filter((_, i) => i !== itemIndex) })}
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
                  <Field
                    label={t('plan.label')}
                    value={item.label ?? ''}
                    placeholder={exerciseName(byId.get(item.exerciseId))}
                    onChangeText={(label) => updateItem(dayIndex, itemIndex, { label })}
                  />
                  <View style={styles.numbers}>
                    <Field
                      label={t('plan.rir')}
                      value={item.rir ?? ''}
                      placeholder="1–2"
                      style={styles.numberField}
                      onChangeText={(rir) => updateItem(dayIndex, itemIndex, { rir })}
                    />
                    <Field
                      label={t('plan.note')}
                      value={item.note ?? ''}
                      placeholder={t('plan.notePlaceholder')}
                      style={styles.noteField}
                      onChangeText={(note) => updateItem(dayIndex, itemIndex, { note })}
                    />
                  </View>
                  {/* Pausen-Schnellwahl (0:30 … 5:00) nur im Training; hier reicht das Feld „Pause (s)“. */}
                </View>
                {itemIndex < day.items.length - 1 ? (
                  <Button
                    label={item.linkNext ? t('plan.supersetUnlink') : t('plan.supersetLink')}
                    variant="secondary"
                    size="compact"
                    onPress={() => updateItem(dayIndex, itemIndex, { linkNext: !item.linkNext })}
                  />
                ) : null}
              </Fragment>
            ))}
            <Toggle label={t('plan.warmup')} value={day.warmup} onChange={(on) => updateDay(dayIndex, { warmup: on })} />
            <Toggle label={t('plan.cooldown')} value={day.cooldown} onChange={(on) => updateDay(dayIndex, { cooldown: on })} />
            {day.items.length > 0 && day.warmup ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('plan.warmupHint', { minutes: Math.round(blockSeconds(day, 'aufwaermen') / 60) })}
              </ThemedText>
            ) : null}
            {(day.cardio ?? []).map((c, cardioIndex) => (
              <View key={`cardio-${cardioIndex}`} style={[styles.item, { borderColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">{t(`cardio.activities.${c.activity}`)}</ThemedText>
                <View style={styles.numbers}>
                  <Field
                    label={t('cardio.minutes')}
                    value={c.minutes}
                    keyboardType="number-pad"
                    style={styles.numberField}
                    onChangeText={(minutes) => updateCardio(dayIndex, cardioIndex, { minutes })}
                  />
                  <Field
                    label={t('plan.note')}
                    value={c.note ?? ''}
                    placeholder={t('cardio.notePlaceholder')}
                    style={styles.noteField}
                    onChangeText={(note) => updateCardio(dayIndex, cardioIndex, { note })}
                  />
                </View>
                <Choice
                  label={t('plan.cardioWhen')}
                  options={['start', 'end'] as const}
                  value={c.atEnd ? 'end' : 'start'}
                  onChange={(v) => updateCardio(dayIndex, cardioIndex, { atEnd: v === 'end' })}
                  format={(v) => t(`plan.cardioAt.${v}`)}
                />
                <Button
                  label={t('common.remove')}
                  variant="quiet"
                  size="compact"
                  onPress={() => updateDay(dayIndex, { cardio: (day.cardio ?? []).filter((_, i) => i !== cardioIndex) })}
                />
              </View>
            ))}
            {cardioPickFor === dayIndex ? (
              <View style={styles.item}>
                <Choice
                  chips
                  label={t('cardio.pick')}
                  options={CARDIO_ACTIVITIES}
                  value={null}
                  onChange={(activity) => {
                    updateDay(dayIndex, { cardio: [...(day.cardio ?? []), { activity, minutes: '15', atEnd: true }] });
                    setCardioPickFor(null);
                  }}
                  format={(a) => t(`cardio.activities.${a}`)}
                />
                <Button label={t('common.cancel')} variant="secondary" size="compact" onPress={() => setCardioPickFor(null)} />
              </View>
            ) : null}
            {day.items.length > 0 || (day.cardio?.length ?? 0) > 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('plan.duration', {
                  value: t('common.minutes', {
                    value:
                      estimateDayMinutes(
                        draft.days[dayIndex].items.filter((i) => i.sets > 0 && i.restSeconds >= 0 && (i.targetSeconds ?? 0) >= 0),
                        secondsPerSet,
                        60,
                        (day.warmup ? blockSeconds(day, 'aufwaermen') : 0) + (day.cooldown ? blockSeconds(day, 'cooldown') : 0)
                      ) + (draft.days[dayIndex].cardio ?? []).reduce((sum, c) => sum + Math.max(0, c.minutes), 0),
                  }),
                })}
              </ThemedText>
            ) : null}
            <Button label={t('plan.addExercise')} onPress={() => setPickingFor(dayIndex)} />
            <Button label={t('plan.addCardio')} variant="secondary" onPress={() => setCardioPickFor(dayIndex)} />
            {form.days.length > 1 ? (
              <View style={styles.dayMoves}>
                {dayIndex > 0 ? (
                  <Button
                    label={`↑ ${t('common.moveUp')}`}
                    variant="secondary"
                    onPress={() => setForm((f) => ({ ...f, days: moveItem(f.days, dayIndex, dayIndex - 1) }))}
                  />
                ) : null}
                {dayIndex < form.days.length - 1 ? (
                  <Button
                    label={`↓ ${t('common.moveDown')}`}
                    variant="secondary"
                    onPress={() => setForm((f) => ({ ...f, days: moveItem(f.days, dayIndex, dayIndex + 1) }))}
                  />
                ) : null}
              </View>
            ) : null}
            {form.days.length > 1 ? (
              <ConfirmButton label={t('plan.removeDay')} onConfirm={() => setForm((f) => ({ ...f, days: f.days.filter((_, i) => i !== dayIndex) }))} />
            ) : null}
          </Card>
        </View>
      ))}

      {form.days.length < MAX_DAYS ? <Button label={t('plan.addDay')} onPress={() => setForm((f) => ({ ...f, days: [...f.days, NEW_DAY] }))} /> : null}

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
                t('plan.version', { version: v.version, date: formatDay(localDay(new Date(v.createdAt), timeZone)) }),
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
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  numbers: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  numberField: { flex: 1, minWidth: 0 },
  // Kein Mindestmaß: sonst drückt der Hinweis das RIR-Feld so schmal, dass „0–1“ nicht mehr hineinpasst.
  noteField: { flex: 3, minWidth: 0 },
  dayMoves: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});
