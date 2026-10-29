import { router } from 'expo-router';

import { Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { getActiveSession, lastCompletedDayPosition, listActivePlans, type SessionInfo } from '@/data/training';
import { listWeights } from '@/data/weights';
import { nextDayIndex } from '@/domain/training';
import type { WeightEntry } from '@/domain/weight';
import { useLoad } from '@/hooks/use-load';
import { formatDay, formatLongDate, formatNumber, t } from '@/i18n';

async function loadToday(db: Db) {
  const [weights, active, plans] = await Promise.all([listWeights(db), getActiveSession(db), listActivePlans(db)]);
  let next: { plan: string; day: string } | null = null;
  const plan = plans.find((p) => p.days.length > 0);
  if (plan) {
    const index = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
    next = { plan: plan.name, day: plan.days[index].name };
  }
  return { lastWeight: weights[0] ?? null, active, next };
}

export default function TodayScreen() {
  const { data } = useLoad(loadToday, {
    lastWeight: null as WeightEntry | null,
    active: null as SessionInfo | null,
    next: null as { plan: string; day: string } | null,
  });
  const { lastWeight, active, next } = data;

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
        <ThemedText themeColor="textSecondary">{t('today.caloriesHint')}</ThemedText>
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
