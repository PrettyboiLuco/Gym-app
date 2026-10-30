import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { ExercisePicker } from '@/components/exercise-picker';
import { ConfirmButton, Field, ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { routineMinutes, startRoutineRun, templateName } from '@/components/timed';
import { Spacing } from '@/constants/theme';
import {
  activateRoutineVersion,
  archiveRoutine,
  listRoutineVersions,
  loadRoutineDraft,
  saveRoutine,
  type RoutineVersionInfo,
} from '@/data/routines';
import { useDb } from '@/data/store-provider';
import { listExercises, type Exercise } from '@/data/training';
import {
  findTemplate,
  formNumber,
  ROUTINE_DEFAULTS,
  validateRoutine,
  type RoutineDraft,
  type RoutineKind,
  type Template,
} from '@/domain/routines';
import { moveItem } from '@/domain/training';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatDay, t, tOptional } from '@/i18n';

type Form = {
  name: string;
  items: { exerciseId: string; seconds: string }[];
  switch: string;
  transition: string;
  work: string;
  rest: string;
  rounds: string;
  roundRest: string;
};

function toForm(d: RoutineDraft): Form {
  return {
    name: d.name,
    items: d.items.map((i) => ({ exerciseId: i.exerciseId, seconds: String(i.seconds) })),
    switch: String(d.switchSeconds),
    transition: String(d.transitionSeconds),
    work: String(d.workSeconds),
    rest: String(d.restSeconds),
    rounds: String(d.rounds),
    roundRest: String(d.roundRestSeconds),
  };
}

function toDraft(kind: RoutineKind, f: Form): RoutineDraft {
  return {
    kind,
    name: f.name,
    items: f.items.map((i) => ({ exerciseId: i.exerciseId, seconds: kind === 'hiit' ? formNumber(f.work) : formNumber(i.seconds) })),
    switchSeconds: formNumber(f.switch),
    transitionSeconds: formNumber(f.transition),
    workSeconds: formNumber(f.work),
    restSeconds: formNumber(f.rest),
    rounds: formNumber(f.rounds),
    roundRestSeconds: formNumber(f.roundRest),
  };
}

const EMPTY = (kind: RoutineKind): RoutineDraft => ({ kind, name: '', items: [], ...ROUTINE_DEFAULTS });

/**
 * Routine ansehen, anpassen und starten (Register STRETCH-003, HIIT-001–004). Fertige Vorlagen
 * erscheinen als Vorschau; „anpassen“ macht daraus eine eigene, versionierte Routine.
 */
export default function RoutineScreen() {
  const params = useLocalSearchParams<{ id: string; template?: string; kind?: string }>();
  const db = useDb();
  const theme = useTheme();
  const template: Template | undefined = params.template ? findTemplate(params.template) : undefined;
  const routineId = params.id === 'neu' ? null : params.id;
  const kind: RoutineKind = template?.kind ?? (params.kind === 'hiit' ? 'hiit' : 'dehnen');

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadedKind, setLoadedKind] = useState<RoutineKind>(kind);
  const [form, setForm] = useState<Form>(() => toForm(template ? { ...template, name: templateName(template) } : EMPTY(kind)));
  const [baseline, setBaseline] = useState(() => JSON.stringify(form));
  const [editing, setEditing] = useState(!template);
  const [versions, setVersions] = useState<RoutineVersionInfo[]>([]);
  const [picking, setPicking] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await listExercises(db);
      if (cancelled) return;
      setExercises(all);
      if (!routineId) return;
      const loaded = await loadRoutineDraft(db, routineId);
      const list = await listRoutineVersions(db, routineId);
      if (cancelled || !loaded) return;
      const f = toForm(loaded.draft);
      setLoadedKind(loaded.draft.kind);
      setForm(f);
      setBaseline(JSON.stringify(f));
      setVersions(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [db, routineId]);

  const currentKind = routineId ? loadedKind : kind;
  const draft = toDraft(currentKind, form);
  const problems = validateRoutine(draft);
  const dirty = JSON.stringify(form) !== baseline;
  const allowLeave = useUnsavedGuard(editing && dirty);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const minutes = problems.length === 0 ? routineMinutes(draft, exercises) : null;
  const change = (c: Partial<Form>) => setForm((f) => ({ ...f, ...c }));

  async function save() {
    if (problems.length > 0) {
      setShowProblems(true);
      return;
    }
    const id = await saveRoutine(db, routineId, draft);
    allowLeave();
    if (!routineId) {
      router.replace({ pathname: '/training/routine/[id]', params: { id } });
      return;
    }
    const list = await listRoutineVersions(db, id);
    setVersions(list);
    setBaseline(JSON.stringify(form));
    setMessage(t('routine.saved', { version: list[0]?.version ?? 1 }));
  }

  async function start() {
    if (problems.length > 0) {
      setShowProblems(true);
      return;
    }
    const activeVersion = versions.find((v) => v.active === 1);
    const result = await startRoutineRun(db, {
      kind: currentKind,
      name: draft.name.trim(),
      source: template && !editing ? `vorlage:${template.id}` : 'eigen',
      draft,
      exercises,
      routineVersionId: routineId && !dirty ? (activeVersion?.id ?? null) : null,
    });
    if (result === 'running') {
      setMessage(t('routine.alreadyRunning'));
      return;
    }
    allowLeave();
    router.push('/training/run');
  }

  async function activate(versionId: string) {
    if (!routineId) return;
    await activateRoutineVersion(db, routineId, versionId);
    const loaded = await loadRoutineDraft(db, routineId);
    if (loaded) {
      const f = toForm(loaded.draft);
      setForm(f);
      setBaseline(JSON.stringify(f));
    }
    setVersions(await listRoutineVersions(db, routineId));
  }

  if (picking) {
    const choices = exercises.filter((e) => (currentKind === 'hiit' ? e.kind === 'kraft' : e.kind !== 'kraft' || e.equipment === 'koerpergewicht'));
    return (
      <Screen withHeader>
        <Stack.Screen options={{ title: t('routine.pickTitle') }} />
        <ExercisePicker
          exercises={choices}
          onCancel={() => setPicking(false)}
          onPick={(e) => {
            change({ items: [...form.items, { exerciseId: e.id, seconds: String(e.holdSeconds ?? 30) }] });
            setPicking(false);
          }}
        />
      </Screen>
    );
  }

  const title = !editing ? t('routine.titleTemplate') : routineId ? t('routine.titleEdit') : currentKind === 'hiit' ? t('routine.titleNewHiit') : t('routine.titleNew');

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title }} />
      {!editing && template ? (
        <Card title={templateName(template)}>
          <ThemedText type="small" themeColor="textSecondary">
            {t(`templates.${template.id}.text`)}
          </ThemedText>
          {template.kind === 'hiit' ? (
            <ThemedText>
              {t('hiit.summary', {
                count: template.items.length,
                work: template.workSeconds,
                rest: template.restSeconds,
                rounds: template.rounds,
                minutes: minutes ?? '–',
              })}
            </ThemedText>
          ) : (
            <ThemedText>{t('routine.total', { minutes: minutes ?? '–' })}</ThemedText>
          )}
        </Card>
      ) : (
        <Card>
          <Field label={t('routine.name')} placeholder={t('routine.namePlaceholder')} value={form.name} onChangeText={(name) => change({ name })} />
        </Card>
      )}

      <Card title={t('routine.items')}>
        {form.items.map((item, index) => {
          const exercise = byId.get(item.exerciseId);
          const how = exercise?.nameKey ? tOptional(`exerciseHow.${exercise.id}`) : null;
          const sideNote = exercise?.sides === 'einseitig' ? ` · ${t('routine.oneSided')}` : '';
          return (
            <View key={`${item.exerciseId}-${index}`} style={[styles.item, { borderColor: theme.backgroundSelected }]}>
              {!editing ? (
                <ListRow
                  title={exerciseName(exercise)}
                  subtitle={`${currentKind === 'hiit' ? `${form.work} s` : `${item.seconds} s`}${sideNote}${how ? `\n${how}` : ''}`}
                />
              ) : (
                <>
                  <View style={styles.itemHeader}>
                    <ThemedText type="smallBold" style={styles.flex}>
                      {exerciseName(exercise)}
                      {sideNote}
                    </ThemedText>
                    {index > 0 ? (
                      <Button label="↑" accessibilityLabel={`${t('common.moveUp')} ${exerciseName(exercise)}`} variant="danger" onPress={() => change({ items: moveItem(form.items, index, index - 1) })} />
                    ) : null}
                    {index < form.items.length - 1 ? (
                      <Button label="↓" accessibilityLabel={`${t('common.moveDown')} ${exerciseName(exercise)}`} variant="danger" onPress={() => change({ items: moveItem(form.items, index, index + 1) })} />
                    ) : null}
                    <Button label={t('common.remove')} variant="danger" onPress={() => change({ items: form.items.filter((_, i) => i !== index) })} />
                  </View>
                  {currentKind === 'dehnen' ? (
                    <Field
                      label={`${t('routine.seconds')} ${index + 1}`}
                      value={item.seconds}
                      keyboardType="number-pad"
                      onChangeText={(seconds) => change({ items: form.items.map((it, i) => (i === index ? { ...it, seconds } : it)) })}
                    />
                  ) : null}
                  {how ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {how}
                    </ThemedText>
                  ) : null}
                </>
              )}
            </View>
          );
        })}
        {editing ? <Button label={t('routine.addExercise')} onPress={() => setPicking(true)} /> : null}
      </Card>

      {editing ? (
        <Card>
          {currentKind === 'dehnen' ? (
            <View style={styles.numbers}>
              <Field label={t('routine.switch')} value={form.switch} keyboardType="number-pad" style={styles.numberField} onChangeText={(v) => change({ switch: v })} />
              <Field label={t('routine.transition')} value={form.transition} keyboardType="number-pad" style={styles.numberField} onChangeText={(v) => change({ transition: v })} />
            </View>
          ) : (
            <>
              <View style={styles.numbers}>
                <Field label={t('routine.work')} value={form.work} keyboardType="number-pad" style={styles.numberField} onChangeText={(v) => change({ work: v })} />
                <Field label={t('routine.rest')} value={form.rest} keyboardType="number-pad" style={styles.numberField} onChangeText={(v) => change({ rest: v })} />
              </View>
              <View style={styles.numbers}>
                <Field label={t('routine.rounds')} value={form.rounds} keyboardType="number-pad" style={styles.numberField} onChangeText={(v) => change({ rounds: v })} />
                <Field label={t('routine.roundRest')} value={form.roundRest} keyboardType="number-pad" style={styles.numberField} onChangeText={(v) => change({ roundRest: v })} />
              </View>
            </>
          )}
          {minutes !== null ? <ThemedText themeColor="textSecondary">{t('routine.total', { minutes })}</ThemedText> : null}
        </Card>
      ) : null}

      {showProblems && problems.length > 0 ? (
        <Card>
          {problems.map((p) => (
            <ThemedText key={p} style={{ color: theme.danger }}>
              {t(`routine.problems.${p}`)}
            </ThemedText>
          ))}
        </Card>
      ) : null}
      {message ? <ThemedText>{message}</ThemedText> : null}

      <View style={styles.row}>
        <Button label={`▶ ${t('routine.start')}`} onPress={start} />
        {editing ? <Button label={t('routine.save')} variant="danger" onPress={save} /> : null}
        {!editing && template ? (
          <Button
            label={t('routine.customize')}
            variant="danger"
            onPress={() => {
              setEditing(true);
              setBaseline('');
            }}
          />
        ) : null}
      </View>
      {currentKind === 'hiit' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('hiit.safety')}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {t('stretch.intro')}
        </ThemedText>
      )}

      {routineId && versions.length > 0 ? (
        <Card title={t('routine.versions')}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('routine.versionsHint')}
          </ThemedText>
          {versions.map((v) => (
            <ListRow
              key={v.id}
              title={v.name}
              subtitle={t('routine.version', { version: v.version, date: formatDay(v.createdAt.slice(0, 10)) })}
              accessory={v.active ? t('routine.active') : t('routine.activate')}
              onPress={v.active ? undefined : () => activate(v.id)}
            />
          ))}
        </Card>
      ) : null}

      {routineId ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('routine.archiveHint')}
          </ThemedText>
          <ConfirmButton
            label={t('routine.archive')}
            onConfirm={async () => {
              await archiveRoutine(db, routineId);
              allowLeave();
              router.back();
            }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two, gap: Spacing.two },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  numbers: { flexDirection: 'row', gap: Spacing.two },
  numberField: { flex: 1, minWidth: 0 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});
