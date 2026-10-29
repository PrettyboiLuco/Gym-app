import { router } from 'expo-router';

import { Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { formatKcal, formatKcalSum, todayDay } from '@/components/nutrition-format';
import type { Db } from '@/data/db';
import { DEFAULT_SETTINGS, listDay, loadNutritionSettings } from '@/data/nutrition';
import { getActiveSession, lastCompletedDayPosition, listActivePlans, type SessionInfo } from '@/data/training';
import { listWeights } from '@/data/weights';
import { drinkTotals, sumNutrients } from '@/domain/nutrition';
import { nextDayIndex } from '@/domain/training';
import type { WeightEntry } from '@/domain/weight';
import { useLoad } from '@/hooks/use-load';
import { formatDay, formatLongDate, formatNumber, t } from '@/i18n';

async function loadToday(db: Db) {
  const [weights, active, plans, events, settings] = await Promise.all([
    listWeights(db),
    getActiveSession(db),
    listActivePlans(db),
    listDay(db, todayDay()),
    loadNutritionSettings(db),
  ]);
  const sums = sumNutrients(events);
  const food = {
    entries: events.length,
    sums,
    drinksMl: drinkTotals(events.filter((e) => e.kind === 'getraenk')).allMl,
    goal: settings.kcalGoal,
    hide: settings.hideNumbers,
  };
  let next: { plan: string; day: string } | null = null;
  const plan = plans.find((p) => p.days.length > 0);
  if (plan) {
    const index = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
    next = { plan: plan.name, day: plan.days[index].name };
  }
  return { lastWeight: weights[0] ?? null, active, next, food };
}

export default function TodayScreen() {
  const { data } = useLoad(loadToday, {
    lastWeight: null as WeightEntry | null,
    active: null as SessionInfo | null,
    next: null as { plan: string; day: string } | null,
    food: { entries: 0, sums: sumNutrients([]), drinksMl: 0, goal: DEFAULT_SETTINGS.kcalGoal, hide: false },
  });
  const { lastWeight, active, next, food } = data;
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
        <ThemedText themeColor={lastWeight ? 'text' : 'textSecondary'}>
          {lastWeight
            ? t('today.weightLast', {
                kg: t('common.kg', { value: formatNumber(lastWeight.kg) }),
                date: formatDay(lastWeight.day),
              })
            : t('today.weightNone')}
        </ThemedText>
      </Card>
    </Screen>
  );
}
