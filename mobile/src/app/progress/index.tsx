import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { DaySwitcher } from '@/components/day-switcher';
import { ConfirmButton, EntryRow, Field, ListRow } from '@/components/fields';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SkeletonBlocks } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { WeightChart } from '@/components/weight-chart';
import { DisplayFont, Spacing } from '@/constants/theme';
import type { Db } from '@/data/db';
import { calorieGoalOn, listActiveGoals, listMeasurements, type CalorieGoal, type GoalVersion } from '@/data/goals';
import { listPhotos } from '@/data/photos';
import { listSteps } from '@/data/steps';
import { listExercises } from '@/data/training';
import { addWeight, deleteWeight, listWeights } from '@/data/weights';
import { latestBySite, MEASURE_SITES, type Measurement } from '@/domain/body';
import { shiftDay } from '@/domain/dates';
import { effectiveModules } from '@/domain/modules';
import { stepsForDay } from '@/domain/steps';
import { todayDay } from '@/domain/time';
import { BODY_WEIGHT_RANGE, parseWeightIn, type Units } from '@/domain/units';
import { dailyMeans, weeklyChange, weightTrend, type WeightEntry } from '@/domain/weight';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, formatWeight, t } from '@/i18n';
import { useProfile } from '@/providers/profile-provider';
import { goalProgressLines, goalTitle } from '@/services/goal-progress';
import { formatKcal } from '@/services/nutrition-format';

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
  const modules = effectiveModules(profile.modules);
  const units = profile.units;
  const { data, reload, db, loaded } = useLoad(
    (d) => loadProgress(d, units, profile.sensitive),
    {
      weights: [] as WeightEntry[],
      cards: [] as GoalCard[],
      calorie: null as CalorieGoal | null,
      measurements: [] as Measurement[],
      photoCount: 0,
      steps: null as number | null,
    },
    `${units.weight}-${units.length}-${profile.sensitive}`
  );
  const { weights, cards, calorie, measurements, photoCount, steps } = data;
  const [day, setDay] = useState(todayDay);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  // Läuft gerade ein Speichern? Verhindert doppelte Einträge, wenn „Fertig“ und „Speichern“ kurz nacheinander kommen.
  const saving = useRef(false);
  const [showAll, setShowAll] = useState(false);

  const today = todayDay();
  const trend = weightTrend(weights, today);
  const change = weeklyChange(weights, today);
  const chartDays = Array.from({ length: 30 }, (_, i) => shiftDay(today, i - 29));
  const points = dailyMeans(weights, today, 30);
  const trendPoints = chartDays.map((d) => ({ day: d, kg: weightTrend(weights, d) })).filter((p): p is { day: string; kg: number } => p.kg !== null);
  const latest = latestBySite(measurements);

  async function save() {
    // Leeres Feld = nichts zu tun (z. B. „Fertig“ auf der Tastatur hat schon gespeichert und das Feld geleert) – keine Fehlermeldung.
    if (!input.trim() || saving.current) return;
    const kg = parseWeightIn(input, units.weight, BODY_WEIGHT_RANGE);
    if (kg === null) {
      setError(true);
      return;
    }
    setError(false);
    saving.current = true;
    try {
      await addWeight(db, day, kg);
      setInput('');
      showToast(t('common.saved'));
      await reload();
    } finally {
      saving.current = false;
    }
  }

  async function remove(id: string) {
    await deleteWeight(db, id);
    showToast(t('common.deleted'));
    await reload();
  }

  const signed = (kg: number) => {
    const text = formatWeight(Math.abs(kg), units.weight);
    return kg > 0.05 ? `+${text}` : kg < -0.05 ? `−${text}` : text;
  };

  const measuredSites = MEASURE_SITES.filter((s) => latest[s]).length;
  if (!loaded) {
    return (
      <Screen title={t('progress.title')}>
        <SkeletonBlocks blocks={[420, 140, 300]} />
      </Screen>
    );
  }
  return (
    <Screen title={t('progress.title')} subtitle={change !== null ? t('progress.change', { change: signed(change) }) : undefined}>
      {/* Leitfrage „Bewege ich mich Richtung Ziel?“: der Trend groß, darunter der Verlauf, dann das Eintragen. */}
      <Card title={t('progress.weightTitle')}>
        <View
          style={styles.big}
          accessible
          accessibilityLabel={trend === null ? t('progress.trendMissing') : t('progress.trend', { kg: formatWeight(trend, units.weight) })}>
          {trend !== null ? (
            <>
              <ThemedText style={styles.bigValue}>{formatWeight(trend, units.weight).replace(/\s*\S+$/, '')}</ThemedText>
              <ThemedText themeColor="textSecondary">{t('progress.trendUnit', { unit: units.weight })}</ThemedText>
            </>
          ) : (
            <ThemedText themeColor="textSecondary">{t('progress.trendMissing')}</ThemedText>
          )}
        </View>
        <WeightChart
          days={chartDays}
          points={points}
          trend={trendPoints}
          unit={units.weight}
          targetKg={cards.find((c) => c.goal.kind === 'gewicht')?.goal.targetKg ?? null}
          weeklyChangeKg={change}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {t('progress.trendHint')}
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
        <DaySwitcher day={day} onChange={setDay} />
        <View style={styles.row}>
          <Field
            label={t('progress.weightLabel', { unit: units.weight })}
            value={input}
            onChangeText={(v) => {
              setInput(v);
              setError(false);
            }}
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
      </Card>

      <Card
        title={t('progress.goalsTitle')}
        trailing={
          <Button
            label={t('training.newPlanShort')}
            variant="secondary"
            size="compact"
            icon={<Icon name="plus" color={theme.text} size={16} strokeWidth={2.2} />}
            onPress={() => router.push('/progress/goal/new')}
          />
        }>
        {cards.length === 0 ? <ThemedText themeColor="textSecondary">{t('progress.goalsEmpty')}</ThemedText> : null}
        {cards.map((c, i) => (
          <ListRow
            key={c.goal.goalId}
            icon="target"
            title={c.title}
            subtitle={c.lines.join('\n')}
            accessory="›"
            last={i === cards.length - 1}
            onPress={() => router.push(`/progress/goal/${c.goal.goalId}`)}
          />
        ))}
      </Card>

      {/* Alles Weitere zum Körper als eine ruhige Liste statt sechs kleiner Karten; Werte stehen rechts. */}
      <Card title={t('progress.bodyTitle')}>
        <ListRow
          icon="target"
          title={t('milestones.screenTitle')}
          subtitle={t('milestones.listSubtitle')}
          accessory="›"
          onPress={() => router.push('/progress/milestones')}
        />
        {modules.bereitschaft ? (
          <ListRow
            icon="heart"
            title={t('readiness.title')}
            subtitle={t('readiness.listSubtitle')}
            accessory="›"
            onPress={() => router.push('/progress/readiness')}
          />
        ) : null}
        {modules.coach ? (
          <ListRow
            icon="calendar"
            title={t('checkin.open')}
            subtitle={t('checkin.dueSubtitle')}
            accessory="›"
            onPress={() => router.push('/progress/checkin')}
          />
        ) : null}
        <ListRow
          icon="flame"
          title={t('progress.calorieTitle')}
          subtitle={
            calorie
              ? calorie.source === 'coach'
                ? t('progress.calorieFromCoach')
                : calorie.source === 'rechner'
                  ? t('progress.calorieFromCalc')
                  : t('progress.calorieOwn')
              : t('progress.calorieNone')
          }
          value={calorie ? formatKcal(calorie.baseKcal) : undefined}
          accessory="›"
          onPress={() => router.push('/progress/calculator')}
        />
        <ListRow
          icon="ruler"
          title={t('progress.measureTitle')}
          subtitle={measuredSites === 0 ? t('progress.measureEmpty') : undefined}
          value={measuredSites > 0 ? t('progress.measureCount', { count: measuredSites }) : undefined}
          accessory="›"
          onPress={() => router.push('/progress/measurements')}
        />
        <ListRow
          icon="heart"
          title={t('bloodPressure.title')}
          subtitle={t('bloodPressure.listSubtitle')}
          accessory="›"
          onPress={() => router.push('/progress/blood-pressure')}
        />
        <ListRow
          icon="steps"
          title={t('steps.title')}
          value={steps === null ? '–' : formatNumber(steps, 0)}
          accessory="›"
          onPress={() => router.push('/progress/steps')}
        />
        {/* Keine Vorschaubilder in der Übersicht: Fotos erst auf eigener Seite und verdeckt. */}
        <ListRow
          icon="camera"
          title={t('progress.photosTitle')}
          value={profile.photos ? String(photoCount) : t('common.off')}
          accessory="›"
          onPress={() => router.push('/progress/photos')}
        />
        <ListRow
          icon="person"
          title={t('progress.profileOpen')}
          subtitle={t('progress.profileSummary', {
            weight: t(`units.weightLabel.${units.weight}`),
            length: t(`units.lengthLabel.${units.length}`),
          })}
          accessory="›"
          last
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
            <EntryRow
              key={entry.id}
              title={formatDay(entry.day)}
              value={formatWeight(entry.kg, units.weight)}
              action={<ConfirmButton label={t('common.delete')} size="compact" onConfirm={() => remove(entry.id)} />}
            />
          ))
        )}
        {weights.length > SHOWN ? (
          <Button
            label={showAll ? t('progress.showLess') : t('progress.showAll', { count: weights.length })}
            variant="secondary"
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
  entry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  num: { fontVariant: ['tabular-nums'] },
  big: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, flexWrap: 'wrap' },
  bigValue: { fontFamily: DisplayFont.bold, fontSize: 36, lineHeight: 42, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  divider: { height: 1, marginVertical: Spacing.two },
});
