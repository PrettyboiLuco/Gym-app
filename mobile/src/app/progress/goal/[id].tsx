import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card } from '@/components/card';
import { exerciseName } from '@/components/exercise-name';
import { ExercisePicker } from '@/components/exercise-picker';
import { Choice, ConfirmButton, Field, ListRow, RadioList } from '@/components/fields';
import { goalProgressLines, goalTitle } from '@/components/goal-progress';
import { todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { endGoal, listActiveGoals, listGoalVersions, saveGoal, type GoalVersion } from '@/data/goals';
import { useProfile } from '@/data/profile-provider';
import { useDb } from '@/data/store-provider';
import { listExercises, type Exercise } from '@/data/training';
import { listWeights } from '@/data/weights';
import type { Goal } from '@/domain/energy';
import {
  DIRECTIONS,
  EMPTY_GOAL_FORM,
  GOAL_KINDS,
  HABITS,
  parseGoalForm,
  type GoalForm,
  type GoalKind,
  type GoalProblem,
} from '@/domain/goals';
import { lengthInputText, weightInputText, type Units } from '@/domain/units';
import { weightTrend } from '@/domain/weight';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { formatDay, t } from '@/i18n';

function toForm(v: GoalVersion, units: Units): GoalForm {
  return {
    ...EMPTY_GOAL_FORM,
    kind: v.kind,
    direction: v.direction ?? 'halten',
    targetWeight: v.kind === 'gewicht' && v.targetKg !== null ? weightInputText(v.targetKg, units.weight) : '',
    exerciseId: v.exerciseId,
    liftWeight: v.kind === 'kraft' && v.targetKg !== null ? weightInputText(v.targetKg, units.weight) : '',
    reps: v.targetReps === null ? '' : String(v.targetReps),
    habit: v.habit ?? 'training',
    perWeek: v.perWeek === null ? EMPTY_GOAL_FORM.perWeek : String(v.perWeek),
    targetCm: v.targetCm === null ? '' : lengthInputText(v.targetCm, units.length),
    targetSteps: v.targetSteps === null ? EMPTY_GOAL_FORM.targetSteps : String(v.targetSteps),
  };
}

type Loaded = {
  goalId: string | null;
  versions: GoalVersion[];
  activeWeight: GoalVersion | null;
  exercises: Exercise[];
  currentKg: number | null;
};

async function load(db: Db, id: string): Promise<Loaded> {
  const today = todayDay();
  const [versions, active, exercises, weights] = await Promise.all([
    id === 'new' ? Promise.resolve([]) : listGoalVersions(db, id),
    listActiveGoals(db),
    listExercises(db),
    listWeights(db),
  ]);
  return {
    goalId: id === 'new' ? null : id,
    versions,
    activeWeight: active.find((g) => g.kind === 'gewicht') ?? null,
    exercises,
    currentKg: weightTrend(weights, today) ?? weights[0]?.kg ?? null,
  };
}

/** Ziel anlegen oder ändern; jede Änderung wird eine neue Version (Register GOAL-001–007). */
export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const theme = useTheme();
  const { profile } = useProfile();
  const units = profile.units;
  const [data, setData] = useState<Loaded | null>(null);
  const [form, setForm] = useState<GoalForm>(EMPTY_GOAL_FORM);
  const [baseline, setBaseline] = useState('');
  const [problems, setProblems] = useState<GoalProblem[]>([]);
  const [picking, setPicking] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    load(db, id ?? 'new').then(async (loaded) => {
      if (cancelled) return;
      const latest = loaded.versions[0];
      const initial = latest ? toForm(latest, units) : EMPTY_GOAL_FORM;
      setData(loaded);
      setForm(initial);
      setBaseline(JSON.stringify(initial));
      if (latest && latest.status === 'aktiv') {
        const progress = await goalProgressLines(db, latest, units, todayDay(), profile.sensitive);
        if (!cancelled) setLines(progress.lines);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db, id, units, profile.sensitive]);

  const allowLeave = useUnsavedGuard(baseline !== '' && JSON.stringify(form) !== baseline);
  const latest = data?.versions[0] ?? null;
  const isNew = data?.goalId === null;
  const ended = latest?.status === 'beendet';
  const change = (c: Partial<GoalForm>) => setForm((f) => ({ ...f, ...c }));

  function changeKind(kind: GoalKind) {
    // Es gibt nur ein Gewichtsziel: Bei „Gewicht“ wird das vorhandene als Ausgangspunkt geladen.
    if (kind === 'gewicht' && data?.activeWeight) setForm(toForm(data.activeWeight, units));
    else change({ kind });
  }

  async function save() {
    if (!data) return;
    // Nichts geändert: keine neue Version anlegen.
    if (!isNew && JSON.stringify(form) === baseline) {
      router.back();
      return;
    }
    const { draft, problems: found } = parseGoalForm(
      form,
      units.weight,
      { currentKg: data.currentKg, heightCm: profile.heightCm, sensitive: profile.sensitive },
      units.length
    );
    if (!draft) {
      setProblems(found);
      return;
    }
    const targetId = data.goalId ?? (draft.kind === 'gewicht' ? data.activeWeight?.goalId ?? null : null);
    await saveGoal(db, targetId, draft, todayDay(), data.currentKg);
    allowLeave();
    router.back();
  }

  async function end() {
    if (!data?.goalId) return;
    await endGoal(db, data.goalId, todayDay());
    allowLeave();
    router.back();
  }

  if (!data) return <Screen withHeader>{null}</Screen>;

  if (picking) {
    return (
      <Screen withHeader>
        <ExercisePicker
          exercises={data.exercises.filter((e) => e.kind === 'kraft' && e.measure === 'wdh')}
          onPick={(e) => {
            change({ exerciseId: e.id });
            setPicking(false);
          }}
          onCancel={() => setPicking(false)}
        />
      </Screen>
    );
  }

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: isNew ? t('goals.titleNew') : t('goals.titleEdit') }} />
      {latest && !ended ? (
        <Card title={goalTitle(latest, units, data.exercises)}>
          {lines.map((line) => (
            <ThemedText key={line}>{line}</ThemedText>
          ))}
        </Card>
      ) : null}

      {!ended ? (
        <>
          <Card>
            {isNew ? (
              <Choice
                label={t('goals.kind')}
                options={GOAL_KINDS}
                value={form.kind}
                onChange={changeKind}
                format={(k) => t(`goals.kindOption.${k}`)}
              />
            ) : null}
            {form.kind === 'gewicht' ? (
              <>
                {isNew && data.activeWeight ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('goals.weightOnly')}
                  </ThemedText>
                ) : null}
                <Choice
                  label={t('goals.kindOption.gewicht')}
                  options={DIRECTIONS}
                  value={form.direction}
                  onChange={(direction: Goal) => change({ direction })}
                  format={(d) => t(`goals.direction.${d}`)}
                />
                {form.direction !== 'halten' ? (
                  <>
                    <Field
                      label={t('goals.targetWeight', { unit: units.weight })}
                      value={form.targetWeight}
                      onChangeText={(targetWeight) => change({ targetWeight })}
                      keyboardType="decimal-pad"
                    />
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('goals.targetWeightHint')}
                    </ThemedText>
                  </>
                ) : null}
              </>
            ) : null}
            {form.kind === 'kraft' ? (
              <>
                <ListRow
                  title={form.exerciseId ? exerciseName(data.exercises.find((e) => e.id === form.exerciseId)) : t('goals.exercisePick')}
                  subtitle={t('goals.exercise')}
                  accessory="›"
                  onPress={() => setPicking(true)}
                />
                <Field
                  label={t('goals.liftWeight', { unit: units.weight })}
                  value={form.liftWeight}
                  onChangeText={(liftWeight) => change({ liftWeight })}
                  keyboardType="decimal-pad"
                />
                <Field label={t('goals.reps')} value={form.reps} onChangeText={(reps) => change({ reps })} keyboardType="number-pad" />
              </>
            ) : null}
            {form.kind === 'beweglichkeit' ? (
              <>
                <Field
                  label={t('goals.targetCm', { unit: units.length })}
                  value={form.targetCm}
                  onChangeText={(targetCm) => change({ targetCm })}
                  keyboardType="decimal-pad"
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {t('goals.flexHint')}
                </ThemedText>
              </>
            ) : null}
            {form.kind === 'gewohnheit' ? (
              <>
                <RadioList
                  label={t('goals.kindOption.gewohnheit')}
                  options={HABITS}
                  value={form.habit}
                  onChange={(habit) => change({ habit })}
                  format={(h) => t(`goals.habit.${h}`)}
                />
                {form.habit === 'schritte' ? (
                  <Field
                    label={t('goals.targetSteps')}
                    value={form.targetSteps}
                    onChangeText={(targetSteps) => change({ targetSteps })}
                    keyboardType="number-pad"
                  />
                ) : null}
                <Field
                  label={t('goals.perWeek')}
                  value={form.perWeek}
                  onChangeText={(perWeek) => change({ perWeek })}
                  keyboardType="number-pad"
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {t('goals.later')}
                </ThemedText>
              </>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              {t('goals.noPromise')}
            </ThemedText>
          </Card>
          {problems.length > 0 ? (
            <Card>
              {problems.map((p) => (
                <ThemedText key={p} style={{ color: theme.danger }}>
                  {t(`goals.problems.${p}`)}
                </ThemedText>
              ))}
            </Card>
          ) : null}
          <Button label={t('goals.save')} onPress={save} />
        </>
      ) : null}

      {data.versions.length > 0 ? (
        <Card title={t('goals.versions')}>
          {data.versions.map((v) => (
            <ListRow
              key={v.id}
              title={`${t('goals.version', { version: v.version, date: formatDay(v.validFrom) })}${v.status === 'beendet' ? ` · ${t('goals.ended')}` : ''}`}
              subtitle={goalTitle(v, units, data.exercises)}
            />
          ))}
        </Card>
      ) : null}

      {data.goalId && !ended ? (
        <Card>
          <ConfirmButton label={t('goals.end')} confirmLabel={t('goals.end')} onConfirm={end} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('goals.endHint')}
          </ThemedText>
        </Card>
      ) : null}
    </Screen>
  );
}
