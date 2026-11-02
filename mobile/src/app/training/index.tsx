import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { CardioRow } from '@/components/cardio-row';
import { MeterBar } from '@/components/charts';
import { ListRow } from '@/components/fields';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SkeletonBlocks } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { TrainingBlock, type WeekDay } from '@/components/today-widgets';
import { Spacing } from '@/constants/theme';
import { listCardio, listOpenCardio, type CardioEntry } from '@/data/cardio';
import type { Db } from '@/data/db';
import { loadProfile } from '@/data/profile';
import { loadTimedRun } from '@/data/routines';
import {
  expireTemporaryPlans,
  getActiveSession,
  lastCompletedDayPosition,
  lastFinishedAt,
  listActivePlans,
  startSession,
  type PlanSummary,
} from '@/data/training';
import { activeEquipment, deloadOffer, saveDeloadState, startDeload, type DeloadState } from '@/data/training-stats';
import { loadTrainingWeek, loadWeekSetsByMuscle, type TrainingWeek } from '@/data/training-week';
import { shiftDay, weekStart } from '@/domain/dates';
import type { MuscleGroup } from '@/domain/exercises';
import { EQUIPMENT } from '@/domain/exercises';
import { COMEBACK_DAYS, daysSince } from '@/domain/progression';
import { todayDay } from '@/domain/time';
import type { TimedRun } from '@/domain/timeline';
import { nextDayIndex } from '@/domain/training';
import { DELOAD_RULES_VERSION, deloadEnd, type EquipmentProfile } from '@/domain/training-stats';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t, tOptional } from '@/i18n';
import { useModules } from '@/providers/profile-provider';

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
  const muscles = await loadWeekSetsByMuscle(db, todayDay());
  const deload = await deloadOffer(db, todayDay());
  const equipment = await activeEquipment(db, (await loadProfile(db)).equipment ?? [...EQUIPMENT]);
  // Cardio dieser Woche (A2): Minuten und die letzten Einträge.
  const monday = weekStart(todayDay());
  const cardioWeek = await listCardio(db, monday, todayDay());
  const cardioRecent = await listCardio(db, shiftDay(todayDay(), -30), todayDay());
  const cardioOpen = await listOpenCardio(db);
  const suggestions: Record<string, number> = {};
  for (const plan of plans) {
    if (plan.days.length > 0) {
      suggestions[plan.planId] = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
    }
  }
  // Wiedereinstieg nach längerer Pause (TRAIN-015); Zeitpunkt beim Laden, nicht beim Rendern.
  const pauseDays = finished ? daysSince(finished, Date.now()) : 0;
  return {
    active,
    plans,
    suggestions,
    timed,
    expired,
    pauseDays,
    week,
    hasFinished: finished !== null,
    muscles,
    cardioMinutes: cardioWeek.reduce((sum, c) => sum + (c.minutes ?? 0), 0),
    cardioRecent: cardioRecent.slice(0, 3),
    cardioOpen,
    deload,
    equipmentProfile: equipment.profile,
  };
}

export default function TrainingScreen() {
  const theme = useTheme();
  const modules = useModules();
  const { data, db, loaded, reload } = useLoad(loadOverview, {
    active: null,
    plans: [] as PlanSummary[],
    suggestions: {} as Record<string, number>,
    timed: null as TimedRun | null,
    expired: [] as string[],
    pauseDays: 0,
    week: { done: [], planned: [], goal: null, todayIndex: 0 } as TrainingWeek,
    hasFinished: false,
    muscles: [] as { group: MuscleGroup; sets: number }[],
    cardioMinutes: 0,
    cardioRecent: [] as CardioEntry[],
    cardioOpen: [] as CardioEntry[],
    deload: { due: false, weeks: 0, state: { intervalWeeks: 8, lastEnd: null, snoozedUntil: null } as DeloadState },
    equipmentProfile: { id: 'studio', name: 'Studio', equipment: [] as EquipmentProfile['equipment'] },
  });
  const { active, plans, suggestions, timed, expired, pauseDays, week, hasFinished, muscles } = data;
  const dark = useColorScheme() === 'dark';
  const maxSets = Math.max(1, ...muscles.map((m) => m.sets));

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
  const subtitle =
    active || timed ? undefined : hasFinished ? (pauseDays === 0 ? t('training.lastToday') : t('training.lastDays', { count: pauseDays })) : undefined;

  if (!loaded) {
    return (
      <Screen title={t('training.title')}>
        <SkeletonBlocks blocks={[320, 140, 220]} />
      </Screen>
    );
  }
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

      {data.deload.due && !active ? (
        <Card title={t('deload.title')}>
          <ThemedText type="small">{t('deload.text', { weeks: data.deload.weeks })}</ThemedText>
          <Button
            label={t('deload.start')}
            onPress={async () => {
              const ok = await startDeload(db, todayDay(), deloadEnd(todayDay()), t('deload.note'));
              showToast(ok ? t('deload.started') : t('readiness.offerNoPlan'));
              await reload();
            }}
          />
          <Button
            label={t('deload.later')}
            variant="secondary"
            onPress={async () => {
              await saveDeloadState(db, { ...data.deload.state, snoozedUntil: shiftDay(todayDay(), 6) });
              await reload();
            }}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t('deload.hint', { version: DELOAD_RULES_VERSION })}
          </ThemedText>
        </Card>
      ) : null}

      <TrainingBlock label={hero.label} title={hero.title} meta={hero.meta} week={days} weekSummary={weekSummary} action={hero.action} onPress={hero.go} />

      {/* Wochenvolumen: sortierte Balkenliste (taste-skill „Who ranks?“), eine Farbe, Zahl rechts. */}
      {muscles.length > 0 ? (
        <Card
          title={t('training.muscleTitle')}
          trailing={
            <ThemedText type="small" themeColor="textSecondary">
              {t('training.muscleUnit')}
            </ThemedText>
          }>
          {muscles.map((m) => (
            <View
              key={m.group}
              style={styles.barRow}
              accessible
              accessibilityLabel={`${t(`muscle.${m.group}`)}: ${t('training.muscleSets', { count: m.sets })}`}>
              <View style={styles.barHead}>
                <ThemedText type="small">{t(`muscle.${m.group}`)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.num}>
                  {m.sets}
                </ThemedText>
              </View>
              <MeterBar progress={m.sets / maxSets} color={dark ? theme.accent : theme.tint} trackColor={theme.backgroundSelected} height={6} />
            </View>
          ))}
        </Card>
      ) : null}

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
        <ListRow icon="list" title={t('programs.title')} subtitle={t('programs.subtitle')} accessory="›" onPress={() => router.push('/training/programs')} />
        <ListRow icon="book" title={t('planImport.open')} subtitle={t('planImport.openSub')} accessory="›" onPress={() => router.push('/training/import')} />
        <ListRow
          icon="sparkle"
          title={t('training.assistantTitle')}
          subtitle={t('training.assistantSubtitle')}
          accessory="›"
          last
          onPress={() => router.push('/training/assistant')}
        />
      </Card>

      <Card
        title={t('cardio.weekTitle')}
        trailing={
          <ThemedText type="small" themeColor="textSecondary">
            {t('cardio.week', { minutes: formatNumber(data.cardioMinutes, 0) })}
          </ThemedText>
        }>
        {[...data.cardioOpen, ...data.cardioRecent].map((c) => (
          <CardioRow key={c.id} entry={c} onPress={() => router.push({ pathname: '/training/cardio', params: { id: c.id } })} />
        ))}
        <ListRow icon="plus" title={t('cardio.add')} accessory="›" onPress={() => router.push('/training/cardio')} last />
        <ThemedText type="small" themeColor="textSecondary">
          {t('cardio.whoHint')}
        </ThemedText>
      </Card>

      {modules.routinen ? (
        <Card title={t('training.routinesTitle')}>
          <ListRow
            icon="stretch"
            title={t('training.stretchTitle')}
            subtitle={t('training.stretchSubtitle')}
            accessory="›"
            onPress={() => router.push('/training/stretch')}
          />
          <ListRow
            icon="bolt"
            title={t('training.hiitTitle')}
            subtitle={t('training.hiitSubtitle')}
            accessory="›"
            onPress={() => router.push('/training/hiit')}
            last
          />
        </Card>
      ) : null}

      <Card>
        <ListRow icon="clock" title={t('training.historyTitle')} accessory="›" onPress={() => router.push('/training/history')} />
        <ListRow icon="target" title={t('stats.title')} subtitle={t('stats.subtitle')} accessory="›" onPress={() => router.push('/training/stats')} />
        <ListRow
          icon="dumbbell"
          title={t('equipmentProfiles.title')}
          value={tOptional(`equipmentProfiles.names.${data.equipmentProfile.id}`) ?? data.equipmentProfile.name}
          accessory="›"
          onPress={() => router.push('/training/equipment')}
        />
        <ListRow icon="dumbbell" title={t('training.exercisesTitle')} accessory="›" onPress={() => router.push('/training/exercises')} last />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  barRow: { gap: Spacing.one },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  num: { fontVariant: ['tabular-nums'] },
});
