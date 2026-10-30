import { router } from 'expo-router';

import { Button, Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import {
  getActiveSession,
  lastCompletedDayPosition,
  listActivePlans,
  startSession,
  type PlanSummary,
} from '@/data/training';
import { loadTimedRun } from '@/data/routines';
import type { TimedRun } from '@/domain/timeline';
import { nextDayIndex } from '@/domain/training';
import { useLoad } from '@/hooks/use-load';
import { t } from '@/i18n';

async function loadOverview(db: Db) {
  const [active, plans, timed] = await Promise.all([getActiveSession(db), listActivePlans(db), loadTimedRun(db)]);
  const suggestions: Record<string, number> = {};
  for (const plan of plans) {
    if (plan.days.length > 0) {
      suggestions[plan.planId] = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
    }
  }
  return { active, plans, suggestions, timed };
}

export default function TrainingScreen() {
  const { data, db } = useLoad(loadOverview, {
    active: null,
    plans: [] as PlanSummary[],
    suggestions: {} as Record<string, number>,
    timed: null as TimedRun | null,
  });
  const { active, plans, suggestions, timed } = data;

  async function start(planDayId: string | null) {
    const id = await startSession(db, planDayId);
    router.push(`/training/session/${id}`);
  }

  return (
    <Screen title={t('training.title')}>
      {timed ? (
        <Card title={t('training.timedActive', { name: timed.title })}>
          <Button label={t('training.timedContinue')} onPress={() => router.push('/training/run')} />
        </Card>
      ) : null}
      {active ? (
        <Card title={t('training.activeTitle')}>
          <ThemedText>{active.dayName ? `${active.planName} – ${active.dayName}` : t('session.free')}</ThemedText>
          <Button label={t('training.continue')} onPress={() => router.push(`/training/session/${active.id}`)} />
        </Card>
      ) : (
        <Card title={t('training.startTitle')}>
          {plans.map((plan) =>
            plan.days.map((day, index) => (
              <ListRow
                key={day.id}
                title={`${plan.name} – ${day.name}`}
                subtitle={suggestions[plan.planId] === index ? t('training.suggested') : undefined}
                accessory="▶"
                onPress={() => start(day.id)}
              />
            ))
          )}
          <ListRow title={t('training.freeWorkout')} accessory="▶" onPress={() => start(null)} />
          {plans.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('training.dayChoiceHint')}
            </ThemedText>
          ) : null}
        </Card>
      )}

      <Card title={t('training.plansTitle')}>
        {plans.length === 0 ? <ThemedText themeColor="textSecondary">{t('training.noPlans')}</ThemedText> : null}
        {plans.map((plan) => (
          <ListRow
            key={plan.planId}
            title={plan.name}
            subtitle={t('training.dayCount', { count: plan.days.length })}
            accessory={t('training.edit')}
            onPress={() => router.push(`/training/plan/${plan.planId}`)}
          />
        ))}
        <Button label={t('training.newPlan')} onPress={() => router.push('/training/plan/neu')} />
      </Card>

      <Card>
        <ListRow
          title={t('training.stretchTitle')}
          subtitle={t('training.stretchSubtitle')}
          accessory="›"
          onPress={() => router.push('/training/stretch')}
        />
        <ListRow title={t('training.hiitTitle')} subtitle={t('training.hiitSubtitle')} accessory="›" onPress={() => router.push('/training/hiit')} />
      </Card>

      <Card>
        <ListRow title={t('training.historyTitle')} accessory="›" onPress={() => router.push('/training/history')} />
        <ListRow title={t('training.exercisesTitle')} accessory="›" onPress={() => router.push('/training/exercises')} />
      </Card>

      <ThemedText type="small" themeColor="textSecondary">
        {t('training.comingLater')}
      </ThemedText>
    </Screen>
  );
}
