import { router } from 'expo-router';

import { Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { formatKcal, formatKcalSum, todayDay } from '@/components/nutrition-format';
import type { Db } from '@/data/db';
import { calorieGoalOn } from '@/data/goals';
import { loadTimedRun } from '@/data/routines';
import { listDay, loadNutritionSettings } from '@/data/nutrition';
import { useUnits } from '@/data/profile-provider';
import { getActiveSession, lastCompletedDayPosition, listActivePlans, type SessionInfo } from '@/data/training';
import { listWeights } from '@/data/weights';
import { drinkTotals, sumNutrients } from '@/domain/nutrition';
import { nextDayIndex } from '@/domain/training';
import { weightTrend, type WeightEntry } from '@/domain/weight';
import { useLoad } from '@/hooks/use-load';
import { formatDay, formatLongDate, formatNumber, formatWeight, t } from '@/i18n';

async function loadToday(db: Db) {
  const today = todayDay();
  const [weights, active, plans, events, settings, goal] = await Promise.all([
    listWeights(db),
    getActiveSession(db),
    listActivePlans(db),
    listDay(db, today),
    loadNutritionSettings(db),
    calorieGoalOn(db, today),
  ]);
  const timed = await loadTimedRun(db);
  const sums = sumNutrients(events);
  const food = {
    entries: events.length,
    sums,
    drinksMl: drinkTotals(events.filter((e) => e.kind === 'getraenk')).allMl,
    goal: goal?.kcal ?? null,
    hide: settings.hideNumbers,
  };
  let next: { plan: string; day: string } | null = null;
  const plan = plans.find((p) => p.days.length > 0);
  if (plan) {
    const index = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
    next = { plan: plan.name, day: plan.days[index].name };
  }
  return { lastWeight: weights[0] ?? null, trend: weightTrend(weights, today), active, next, food, timed: timed?.title ?? null };
}

export default function TodayScreen() {
  const { data } = useLoad(loadToday, {
    lastWeight: null as WeightEntry | null,
    trend: null as number | null,
    timed: null as string | null,
    active: null as SessionInfo | null,
    next: null as { plan: string; day: string } | null,
    food: { entries: 0, sums: sumNutrients([]), drinksMl: 0, goal: null as number | null, hide: false },
  });
  const { lastWeight, trend, active, next, food, timed } = data;
  const units = useUnits();
  const eaten = formatKcalSum(food.sums);
  const left = food.goal === null ? 0 : food.goal - food.sums.values.kcal;
  const unsure = food.sums.unknown.kcal > 0 ? '≤ ' : '';
  const calorieText =
    food.entries === 0
      ? t('today.caloriesEmpty')
      : food.hide
        ? t('today.caloriesHidden', { count: food.entries })
        : food.goal === null
          ? t('today.caloriesNoGoal', { eaten })
          : left >= 0
            ? t('today.caloriesSummary', { eaten, goal: formatKcal(food.goal), left: `${unsure}${formatKcal(left)}` })
            : t('today.caloriesOver', { eaten, goal: formatKcal(food.goal), over: formatKcal(-left) });

  return (
    <Screen title={t('today.title')} subtitle={formatLongDate(new Date())}>
      <Card title={t('today.training')}>
        {timed ? (
          <ListRow title={t('training.timedActive', { name: timed })} accessory="›" onPress={() => router.push('/training/run')} />
        ) : null}
        {active ? (
          <ListRow
            title={t('today.trainingActive', { name: active.dayName ?? t('session.free') })}
            accessory="›"
            onPress={() => router.push(`/training/session/${active.id}`)}
          />
        ) : next ? (
          <ListRow
            title={t('today.trainingNext', next)}
            accessory="›"
            onPress={() => router.push('/training')}
          />
        ) : (
          <ThemedText themeColor="textSecondary">{t('today.trainingNone')}</ThemedText>
        )}
      </Card>
      <Card title={t('today.calories')}>
        <ListRow
          title={calorieText}
          subtitle={t('today.drinksSummary', { all: formatNumber(food.drinksMl, 0) })}
          accessory="›"
          onPress={() => router.push('/nutrition')}
        />
      </Card>
      <Card title={t('today.weight')}>
        <ListRow
          title={
            lastWeight
              ? t('today.weightLast', { kg: formatWeight(lastWeight.kg, units.weight), date: formatDay(lastWeight.day) })
              : t('today.weightNone')
          }
          subtitle={trend === null ? undefined : t('progress.trend', { kg: formatWeight(trend, units.weight) })}
          accessory="›"
          onPress={() => router.push('/progress')}
        />
      </Card>
    </Screen>
  );
}
