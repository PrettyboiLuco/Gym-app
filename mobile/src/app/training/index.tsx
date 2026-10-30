import { router } from 'expo-router';

import { Button, Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { Db } from '@/data/db';
import { todayDay } from '@/components/nutrition-format';
import {
  expireTemporaryPlans,
  getActiveSession,
  lastCompletedDayPosition,
  lastFinishedAt,
  listActivePlans,
  startSession,
  type PlanSummary,
} from '@/data/training';
import { COMEBACK_DAYS, daysBetween } from '@/domain/progression';
import { loadTimedRun } from '@/data/routines';
import type { TimedRun } from '@/domain/timeline';
import { nextDayIndex } from '@/domain/training';
import { useLoad } from '@/hooks/use-load';
import { t } from '@/i18n';

async function loadOverview(db: Db) {
  // Abgelaufene befristete Fassungen zuerst beenden (TRAIN-008), damit die Liste stimmt.
  const expired = await expireTemporaryPlans(db, todayDay());
  const [active, plans, timed, finished] = await Promise.all([
    getActiveSession(db),
    listActivePlans(db),
    loadTimedRun(db),
    lastFinishedAt(db),
  ]);
  const suggestions: Record<string, number> = {};
  for (const plan of plans) {
    if (plan.days.length > 0) {
      suggestions[plan.planId] = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
    }
  }
  // Wiedereinstieg nach längerer Pause (TRAIN-015); Zeitpunkt beim Laden, nicht beim Rendern.
  const pauseDays = finished ? daysBetween(finished, Date.now()) : 0;
  return { active, plans, suggestions, timed, expired, pauseDays };
}

export default function TrainingScreen() {
  const { data, db } = useLoad(loadOverview, {
    active: null,
    plans: [] as PlanSummary[],
    suggestions: {} as Record<string, number>,
    timed: null as TimedRun | null,
    expired: [] as string[],
    pauseDays: 0,
  });
  const { active, plans, suggestions, timed, expired, pauseDays } = data;

  async function start(planDayId: string | null) {
    const id = await startSession(db, planDayId);
    router.push(`/training/session/${id}`);
  }

  return (
    <Screen title={t('training.title')}>
      {expired.length > 0 ? (
        <Card>
          <ThemedText>{t('training.expired', { names: expired.join(', ') })}</ThemedText>
        </Card>
      ) : null}
      {!active && pauseDays >= COMEBACK_DAYS ? (
        <Card title={t('training.comebackTitle')}>
          <ThemedText type="small">{t('training.comeback', { days: pauseDays })}</ThemedText>
        </Card>
      ) : null}
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
          {plans.length > 0 ? (
            <ListRow
              title={t('training.rescheduleTitle')}
              subtitle={t('training.rescheduleSubtitle')}
              accessory="›"
              onPress={() => router.push({ pathname: '/training/assistant', params: { plan: plans[0].planId, dauer: 'woche' } })}
            />
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
        <ListRow
          title={t('training.assistantTitle')}
          subtitle={t('training.assistantSubtitle')}
          accessory="›"
          onPress={() => router.push('/training/assistant')}
        />
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

    </Screen>
  );
}
