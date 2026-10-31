import { router } from 'expo-router';

import { Button, Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TrainingBlock, type WeekDay } from '@/components/today-widgets';
import { loadTrainingWeek, type TrainingWeek } from '@/data/training-week';
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
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

async function loadOverview(db: Db) {
  // Abgelaufene befristete Fassungen zuerst beenden (TRAIN-008), damit die Liste stimmt.
  const expired = await expireTemporaryPlans(db, todayDay());
  const [active, plans, timed, finished, week] = await Promise.all([
    getActiveSession(db),
    listActivePlans(db),
    loadTimedRun(db),
    lastFinishedAt(db),
    loadTrainingWeek(db, todayDay()),
  ]);
  const suggestions: Record<string, number> = {};
  for (const plan of plans) {
    if (plan.days.length > 0) {
      suggestions[plan.planId] = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
    }
  }
  // Wiedereinstieg nach längerer Pause (TRAIN-015); Zeitpunkt beim Laden, nicht beim Rendern.
  const pauseDays = finished ? daysBetween(finished, Date.now()) : 0;
  return { active, plans, suggestions, timed, expired, pauseDays, week, hasFinished: finished !== null };
}

export default function TrainingScreen() {
  const theme = useTheme();
  const { data, db } = useLoad(loadOverview, {
    active: null,
    plans: [] as PlanSummary[],
    suggestions: {} as Record<string, number>,
    timed: null as TimedRun | null,
    expired: [] as string[],
    pauseDays: 0,
    week: { done: [], planned: [], goal: null, todayIndex: 0 } as TrainingWeek,
    hasFinished: false,
  });
  const { active, plans, suggestions, timed, expired, pauseDays, week, hasFinished } = data;

  async function start(planDayId: string | null) {
    const id = await startSession(db, planDayId);
    router.push(`/training/session/${id}`);
  }

  // Leitfrage: „Was trainiere ich jetzt?“ – der Vorschlag ist der größte Block, ein Tipp startet ihn.
  const plan = plans.find((p) => p.days.length > 0);
  const suggestedDay = plan ? plan.days[suggestions[plan.planId] ?? 0] : null;
  const dayLabels = [1, 2, 3, 4, 5, 6, 7].map((d) => t(`reminders.dayShort.${d}`));
  const days: WeekDay[] = dayLabels.map((label, i) => ({ label, done: !!week.done[i], planned: !!week.planned[i], today: i === week.todayIndex }));
  const doneDays = week.done.filter(Boolean).length;
  const weekSummary = week.goal ? t('today.weekSummaryGoal', { count: doneDays, goal: week.goal }) : t('today.weekSummary', { count: doneDays });
  const hero = timed
    ? { label: t('today.heroRunning'), title: timed.title, meta: null, action: t('training.timedContinue'), go: () => router.push('/training/run') }
    : active
      ? {
          label: t('training.activeTitle'),
          title: active.dayName ?? t('session.free'),
          meta: active.planName,
          action: t('training.continue'),
          go: () => router.push(`/training/session/${active.id}`),
        }
      : plan && suggestedDay
        ? { label: t('training.suggested'), title: suggestedDay.name, meta: plan.name, action: t('training.startTitle'), go: () => start(suggestedDay.id) }
        : {
            label: t('today.heroNoPlanEyebrow'),
            title: t('today.heroNoPlanTitle'),
            meta: t('today.heroNoPlanText'),
            action: t('training.newPlan'),
            go: () => router.push('/training/plan/neu'),
          };
  const subtitle = active || timed ? undefined : hasFinished ? (pauseDays === 0 ? t('training.lastToday') : t('training.lastDays', { count: pauseDays })) : undefined;

  return (
    <Screen title={t('training.title')} subtitle={subtitle}>
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

      <TrainingBlock label={hero.label} title={hero.title} meta={hero.meta} week={days} weekSummary={weekSummary} action={hero.action} onPress={hero.go} />

      {!active && !timed ? (
        <Card title={t('training.otherDay')}>
          {plans.map((p) =>
            p.days.map((day) => (
              <ListRow
                key={day.id}
                icon="play"
                title={day.name}
                subtitle={p.name}
                value={suggestedDay?.id === day.id ? t('training.suggested') : undefined}
                accessory="›"
                onPress={() => start(day.id)}
              />
            ))
          )}
          <ListRow icon="plus" title={t('training.freeWorkout')} accessory="›" onPress={() => start(null)} last={plans.length === 0} />
          {plans.length > 0 ? (
            <ListRow
              icon="calendar"
              title={t('training.rescheduleTitle')}
              subtitle={t('training.rescheduleSubtitle')}
              accessory="›"
              last
              onPress={() => router.push({ pathname: '/training/assistant', params: { plan: plans[0].planId, dauer: 'woche' } })}
            />
          ) : null}
          {plans.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('training.dayChoiceHint')}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      <Card
        title={t('training.plansTitle')}
        trailing={
          <Button
            label={t('training.newPlanShort')}
            variant="secondary"
            size="compact"
            icon={<Icon name="plus" color={theme.text} size={16} strokeWidth={2.2} />}
            onPress={() => router.push('/training/plan/neu')}
          />
        }>
        {plans.length === 0 ? <ThemedText themeColor="textSecondary">{t('training.noPlans')}</ThemedText> : null}
        {plans.map((p) => (
          <ListRow
            key={p.planId}
            icon="list"
            title={p.name}
            value={t('training.dayCount', { count: p.days.length })}
            accessory="›"
            onPress={() => router.push(`/training/plan/${p.planId}`)}
          />
        ))}
        <ListRow
          icon="sparkle"
          title={t('training.assistantTitle')}
          subtitle={t('training.assistantSubtitle')}
          accessory="›"
          last
          onPress={() => router.push('/training/assistant')}
        />
      </Card>

      <Card title={t('training.routinesTitle')}>
        <ListRow icon="stretch" title={t('training.stretchTitle')} subtitle={t('training.stretchSubtitle')} accessory="›" onPress={() => router.push('/training/stretch')} />
        <ListRow icon="bolt" title={t('training.hiitTitle')} subtitle={t('training.hiitSubtitle')} accessory="›" onPress={() => router.push('/training/hiit')} last />
      </Card>

      <Card>
        <ListRow icon="clock" title={t('training.historyTitle')} accessory="›" onPress={() => router.push('/training/history')} />
        <ListRow icon="dumbbell" title={t('training.exercisesTitle')} accessory="›" onPress={() => router.push('/training/exercises')} last />
      </Card>
    </Screen>
  );
}
