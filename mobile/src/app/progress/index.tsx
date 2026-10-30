import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { ConfirmButton, Field, ListRow } from '@/components/fields';
import { goalProgressLines, goalTitle } from '@/components/goal-progress';
import { formatKcal, todayDay } from '@/components/nutrition-format';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { WeightChart } from '@/components/weight-chart';
import { Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { calorieGoalOn, listActiveGoals, listMeasurements, type CalorieGoal, type GoalVersion } from '@/data/goals';
import { useProfile } from '@/data/profile-provider';
import { listPhotos } from '@/data/photos';
import { listSteps } from '@/data/steps';
import { listExercises } from '@/data/training';
import { addWeight, deleteWeight, listWeights } from '@/data/weights';
import { latestBySite, MEASURE_SITES, type Measurement } from '@/domain/body';
import { shiftDay } from '@/domain/nutrition';
import { BODY_WEIGHT_RANGE, parseWeightIn, type Units } from '@/domain/units';
import { stepsForDay } from '@/domain/steps';
import { dailyMeans, weeklyChange, weightTrend, type WeightEntry } from '@/domain/weight';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatLength, formatNumber, formatWeight, t } from '@/i18n';

type GoalCard = { goal: GoalVersion; title: string; lines: string[] };

async function loadProgress(db: Db, units: Units, sensitive: boolean) {
  const today = todayDay();
  const [weights, goals, calorie, measurements, exercises, photos] = await Promise.all([
    listWeights(db),
    listActiveGoals(db),
    calorieGoalOn(db, today),
    listMeasurements(db),
    listExercises(db),
    listPhotos(db),
  ]);
  const steps = stepsForDay(await listSteps(db, shiftDay(today, -1)), today);
  const cards: GoalCard[] = [];
  for (const goal of goals) {
    const { lines } = await goalProgressLines(db, goal, units, today, sensitive);
    cards.push({ goal, title: goalTitle(goal, units, exercises), lines });
  }
  return { weights, cards, calorie, measurements, photoCount: photos.length, steps: steps?.steps ?? null };
}

const SHOWN = 10;

export default function ProgressScreen() {
  const theme = useTheme();
  const { profile } = useProfile();
  const units = profile.units;
  const { data, reload, db } = useLoad((d) => loadProgress(d, units, profile.sensitive), {
    weights: [] as WeightEntry[],
    cards: [] as GoalCard[],
    calorie: null as CalorieGoal | null,
    measurements: [] as Measurement[],
    photoCount: 0,
    steps: null as number | null,
  }, `${units.weight}-${units.length}-${profile.sensitive}`);
  const { weights, cards, calorie, measurements, photoCount, steps } = data;
  const [day, setDay] = useState(todayDay);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const today = todayDay();
  const trend = weightTrend(weights, today);
  const change = weeklyChange(weights, today);
  const chartDays = Array.from({ length: 30 }, (_, i) => shiftDay(today, i - 29));
  const points = dailyMeans(weights, today, 30);
  const trendPoints = chartDays
    .map((d) => ({ day: d, kg: weightTrend(weights, d) }))
    .filter((p): p is { day: string; kg: number } => p.kg !== null);
  const latest = latestBySite(measurements);

  async function save() {
    const kg = parseWeightIn(input, units.weight, BODY_WEIGHT_RANGE);
    if (kg === null) {
      setError(true);
      return;
    }
    setError(false);
    await addWeight(db, day, kg);
    setInput('');
    await reload();
  }

  async function remove(id: string) {
    await deleteWeight(db, id);
    await reload();
  }

  const signed = (kg: number) => {
    const text = formatWeight(Math.abs(kg), units.weight);
    return kg > 0.05 ? `+${text}` : kg < -0.05 ? `−${text}` : text;
  };

  return (
    <Screen title={t('progress.title')}>
      <Card title={t('progress.weightTitle')}>
        <DaySwitcher day={day} onChange={setDay} />
        <View style={styles.row}>
          <Field
            label={t('progress.weightLabel', { unit: units.weight })}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={save}
            placeholder={t('progress.weightPlaceholder')}
            keyboardType="decimal-pad"
            returnKeyType="done"
            style={styles.flex}
          />
          <Button label={t('common.save')} onPress={save} />
        </View>
        {error ? (
          <ThemedText style={{ color: theme.danger }}>
            {t('progress.weightInvalid', {
              min: formatWeight(BODY_WEIGHT_RANGE.min, units.weight, 0),
              max: formatWeight(BODY_WEIGHT_RANGE.max, units.weight, 0),
            })}
          </ThemedText>
        ) : null}
        <ThemedText>
          {trend === null ? t('progress.trendMissing') : t('progress.trend', { kg: formatWeight(trend, units.weight) })}
        </ThemedText>
        {change !== null ? <ThemedText>{t('progress.change', { change: signed(change) })}</ThemedText> : null}
        <WeightChart days={chartDays} points={points} trend={trendPoints} unit={units.weight} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('progress.trendHint')}
        </ThemedText>
      </Card>

      <Card>
        <ListRow
          title={t('checkin.open')}
          subtitle={t('checkin.dueSubtitle')}
          accessory="›"
          onPress={() => router.push('/progress/checkin')}
        />
      </Card>

      <Card title={t('progress.goalsTitle')}>
        {cards.length === 0 ? <ThemedText themeColor="textSecondary">{t('progress.goalsEmpty')}</ThemedText> : null}
        {cards.map((c) => (
          <ListRow
            key={c.goal.goalId}
            title={c.title}
            subtitle={c.lines.join('\n')}
            accessory="›"
            onPress={() => router.push(`/progress/goal/${c.goal.goalId}`)}
          />
        ))}
        <Button label={t('progress.goalAdd')} onPress={() => router.push('/progress/goal/new')} />
      </Card>

      <Card title={t('progress.calorieTitle')}>
        <ListRow
          title={calorie ? t('progress.calorieCurrent', { kcal: formatKcal(calorie.baseKcal) }) : t('progress.calorieNone')}
          subtitle={
            calorie
              ? calorie.source === 'coach'
                ? t('progress.calorieFromCoach')
                : calorie.source === 'rechner'
                  ? t('progress.calorieFromCalc')
                  : t('progress.calorieOwn')
              : undefined
          }
          accessory="›"
          onPress={() => router.push('/progress/calculator')}
        />
        <Button label={t('progress.calculatorOpen')} variant="danger" onPress={() => router.push('/progress/calculator')} />
      </Card>

      <Card title={t('progress.measureTitle')}>
        {measurements.length === 0 ? <ThemedText themeColor="textSecondary">{t('progress.measureEmpty')}</ThemedText> : null}
        {MEASURE_SITES.filter((s) => latest[s]).map((s) => (
          <ThemedText key={s}>
            {t(`measure.sites.${s}`)}: {t('measure.latest', { value: formatLength(latest[s]!.latest.cm, units.length), date: formatDay(latest[s]!.latest.day) })}
          </ThemedText>
        ))}
        <Button label={t('progress.measureOpen')} variant="danger" onPress={() => router.push('/progress/measurements')} />
      </Card>

      <Card title={t('steps.title')}>
        <ListRow
          title={steps === null ? t('steps.todayNone') : t('steps.today', { steps: formatNumber(steps, 0) })}
          accessory="›"
          onPress={() => router.push('/progress/steps')}
        />
      </Card>

      <Card title={t('progress.photosTitle')}>
        {/* Keine Vorschaubilder in der Übersicht: Fotos erst auf eigener Seite und verdeckt. */}
        <ListRow
          title={profile.photos ? t('progress.photosCount', { count: photoCount }) : t('progress.photosOff')}
          accessory="›"
          onPress={() => router.push('/progress/photos')}
        />
      </Card>

      <Card title={t('progress.profileTitle')}>
        <ListRow
          title={t('progress.profileOpen')}
          subtitle={t('progress.profileSummary', {
            weight: t(`units.weightLabel.${units.weight}`),
            length: t(`units.lengthLabel.${units.length}`),
          })}
          accessory="›"
          onPress={() => router.push('/progress/profile')}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('progress.notIncluded')}
        </ThemedText>
      </Card>

      <Card title={t('progress.history')}>
        {weights.length === 0 ? (
          <ThemedText themeColor="textSecondary">{t('progress.empty')}</ThemedText>
        ) : (
          (showAll ? weights : weights.slice(0, SHOWN)).map((entry) => (
            <View key={entry.id} style={styles.entry}>
              <ThemedText>
                {formatDay(entry.day)} · {formatWeight(entry.kg, units.weight)}
              </ThemedText>
              <ConfirmButton label={t('common.delete')} onConfirm={() => remove(entry.id)} />
            </View>
          ))
        )}
        {weights.length > SHOWN ? (
          <Button
            label={showAll ? t('progress.showLess') : t('progress.showAll', { count: weights.length })}
            variant="danger"
            onPress={() => setShowAll((v) => !v)}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' },
  flex: { flex: 1, minWidth: 0 },
  entry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
