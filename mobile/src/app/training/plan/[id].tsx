import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { ExercisePicker } from '@/components/exercise-picker';
import { Choice, ConfirmButton, Field, ListRow, Presets } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
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
import { loadSecondsPerSet } from '@/data/training-stats';
import { CARDIO_ACTIVITIES, type CardioActivity } from '@/domain/cardio';
import { supersetLetters } from '@/domain/logger';
import { todayDay } from '@/domain/time';
import { estimateDayMinutes, formatClock, MAX_DAYS, moveItem, parseWholeNumber, REST_PRESETS, validatePlan, type PlanDraft } from '@/domain/training';
import { exerciseName } from '@/format/exercise-name';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatDay, t } from '@/i18n';
import { useDb } from '@/providers/store-provider';
import { blockSeconds as blockSecondsOf } from '@/services/planner-helpers';

// Im Formular stehen Zahlen als Text, damit man sie frei tippen kann.
type ItemForm = {
  exerciseId: string;
  sets: string;
  repsMin: string;
  repsMax: string;
  rest: string;
  seconds: string;
  rir?: string;
  note?: string;
  label?: string;
  /** Supersatz mit der nächsten Übung (A1); daraus werden beim Speichern Gruppen-Nummern. */
  linkNext?: boolean;
};
type CardioForm = { activity: CardioActivity; minutes: string; atEnd: boolean };
type DayForm = { name: string; items: ItemForm[]; warmup: boolean; cooldown: boolean; cardio?: CardioForm[] };
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
      cardio: (day.cardio ?? []).map((c) => ({ activity: c.activity, minutes: String(c.minutes), atEnd: c.atEnd !== false })),
      items: day.items.map((i, index) => ({
        exerciseId: i.exerciseId,
        sets: String(i.sets),
        repsMin: String(i.repsMin),
        repsMax: String(i.repsMax),
        rest: String(i.restSeconds),
        seconds: i.targetSeconds == null ? '' : String(i.targetSeconds),
        rir: i.rir ?? '',
        note: i.note ?? '',
        label: i.label ?? '',
        linkNext: i.superset != null && day.items[index + 1]?.superset === i.superset,
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
      ...(day.cardio?.length ? { cardio: day.cardio.map((c) => ({ activity: c.activity, minutes: num(c.minutes), atEnd: c.atEnd })) } : {}),
      items: day.items.map((i, index) => ({
        exerciseId: i.exerciseId,
        sets: num(i.sets),
        // Zeit-Übungen (UX-011): Sekunden statt Wiederholungen.
        repsMin: timed(i.exerciseId) ? 1 : num(i.repsMin),
        repsMax: timed(i.exerciseId) ? 1 : num(i.repsMax),
        restSeconds: num(i.rest),
        targetSeconds: timed(i.exerciseId) ? num(i.seconds) : null,
        rir: i.rir?.trim() || null,
        note: i.note?.trim() || null,
        label: i.label?.trim() || null,
        superset: supersetGroups(day.items)[index],
      })),
    })),
  };
}

/** Gruppen-Nummern aus „mit nächster verbunden“: aufeinanderfolgende verbundene Übungen bilden einen Supersatz. */
function supersetGroups(items: ItemForm[]): (number | null)[] {
  const groups: (number | null)[] = items.map(() => null);
  let next = 1;
  for (let i = 0; i < items.length - 1; i++) {
    if (!items[i].linkNext) continue;
    const group = groups[i] ?? next++;
    groups[i] = group;
    groups[i + 1] = group;
  }
  return groups;
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
      const loaded = toForm(data.draft);
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
      if (!cancelled) apply(data);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id, isNew]);

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
  const draft = toDraft(form, isTimed);
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
    <Screen withHeader>
      <Stack.Screen options={{ title: isNew ? t('plan.titleNew') : t('plan.titleEdit') }} />
      {active?.validUntil && active.returnVersionId ? (
        <Card>
          <ThemedText type="small">{t('plan.temporary', { date: formatDay(active.validUntil) })}</ThemedText>
          <Button label={t('plan.temporaryEnd')} variant="secondary" onPress={() => activate(active.returnVersionId!)} />
        </Card>
      ) : null}
      {!isNew ? (
        <Button label={t('plan.assistant')} variant="secondary" onPress={() => router.push({ pathname: '/training/assistant', params: { plan: id } })} />
      ) : null}
      <Card>
        <Field label={t('plan.name')} placeholder={t('plan.namePlaceholder')} value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} />
      </Card>

      {form.days.map((day, dayIndex) => (
        <Card key={dayIndex} title={t('plan.day', { number: dayIndex + 1 })}>
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
                {/* Name über volle Breite, Knöpfe darunter – sonst bricht ein langer Name mitten im Wort. */}
                <View>
                  <ThemedText type="smallBold">{item.label?.trim() || exerciseName(byId.get(item.exerciseId))}</ThemedText>
                  {item.label?.trim() && item.label.trim() !== exerciseName(byId.get(item.exerciseId)) ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {exerciseName(byId.get(item.exerciseId))}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={styles.itemHeader}>
                  <View style={styles.flex} />
                  {itemIndex > 0 ? (
                    <Button
                      label="↑"
                      accessibilityLabel={`${t('common.moveUp')} ${exerciseName(byId.get(item.exerciseId))}`}
                      variant="secondary"
                      onPress={() => updateDay(dayIndex, { items: moveItem(day.items, itemIndex, itemIndex - 1) })}
                    />
                  ) : null}
                  {itemIndex < day.items.length - 1 ? (
                    <Button
                      label="↓"
                      accessibilityLabel={`${t('common.moveDown')} ${exerciseName(byId.get(item.exerciseId))}`}
                      variant="secondary"
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
                <Presets
                  label={t('plan.rest')}
                  options={REST_PRESETS}
                  value={parseWholeNumber(item.rest) ?? undefined}
                  format={(s) => formatClock(s * 1000)}
                  onChange={(s) => updateItem(dayIndex, itemIndex, { rest: String(s) })}
                />
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
                variant="danger"
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
  noteField: { flex: 3, minWidth: 160 },
  dayMoves: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});
