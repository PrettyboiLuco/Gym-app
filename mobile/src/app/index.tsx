import { router } from 'expo-router';
import { useEffect } from 'react';

import { Card } from '@/components/card';
import { MeterBar, ProgressRing } from '@/components/charts';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { HeroPanel, Sparkline, StatTile, TileGrid, WeekDots } from '@/components/today-widgets';
import { timeZone, todayDay } from '@/components/nutrition-format';
import type { Db } from '@/data/db';
import { calorieGoalOn } from '@/data/goals';
import { loadTimedRun } from '@/data/routines';
import { listDay, loadNutritionSettings } from '@/data/nutrition';
import { useUnits } from '@/data/profile-provider';
import { CoachToday, type CoachTodayData } from '@/components/coach-today';
import { lastCheckinWeekEnd, listSleep, loadCoachPending, loadCoachSetup, saveCoachPending } from '@/data/coach';
import { checkinDue } from '@/domain/checkin';
import { expireTemporaryPlans, getActiveSession, lastCompletedDayPosition, listActivePlans, listSessions, type SessionInfo } from '@/data/training';
import { listWeights } from '@/data/weights';
import { drinkTotals, sumNutrients } from '@/domain/nutrition';
import { nextDayIndex } from '@/domain/training';
import { weekStart } from '@/domain/goals';
import { localDay } from '@/domain/time';
import { weightTrend, type WeightEntry } from '@/domain/weight';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatLongDate, formatNumber, formatWeight, t } from '@/i18n';

async function loadToday(db: Db) {
  const today = todayDay();
  // Abgelaufene befristete Planfassungen beenden, damit „Nächstes Training“ stimmt (TRAIN-008).
  await expireTemporaryPlans(db, today);
  const [weights, active, plans, events, settings, goal] = await Promise.all([
    listWeights(db),
    getActiveSession(db),
    listActivePlans(db),
    listDay(db, today),
    loadNutritionSettings(db),
    calorieGoalOn(db, today),
  ]);
  const [timed, setup, pending, sleep, sessions] = await Promise.all([
    loadTimedRun(db),
    loadCoachSetup(db),
    loadCoachPending(db),
    listSleep(db, today),
    listSessions(db, 30),
  ]);
  // Woche Mo–So: an welchen Tagen wurde ein Training abgeschlossen?
  const monday = weekStart(today);
  const week = Array.from({ length: 7 }, () => false);
  for (const s of sessions) {
    if (s.status !== 'abgeschlossen') continue;
    const day = localDay(new Date(s.startedAt), timeZone);
    const index = Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${monday}T12:00:00Z`)) / 86_400_000);
    if (index >= 0 && index < 7) week[index] = true;
  }
  const weekCount = sessions.filter((s) => s.status === 'abgeschlossen' && localDay(new Date(s.startedAt), timeZone) >= monday).length;
  const todayIndex = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${monday}T12:00:00Z`)) / 86_400_000);
  // Wochen-Check-in fällig (COACH-008)? Frühestens eine Woche nach dem letzten Check-in, sonst nach der
  // Coach-Einrichtung bzw. der ersten Gewichtsmessung – vorher gäbe es keine Woche zum Zurückschauen.
  const since = (await lastCheckinWeekEnd(db)) ?? setup?.doneAt ?? weights.at(-1)?.day ?? null;
  const checkin = since !== null && checkinDue(since, today);
  const sums = sumNutrients(events);
  const food = {
    entries: events.length,
    sums,
    drinksMl: drinkTotals(events.filter((e) => e.kind === 'getraenk')).allMl,
    drinkGoalMl: settings.drinkGoalMl,
    goal: goal?.kcal ?? null,
    hide: settings.hideNumbers,
  };
  let next: { plan: string; day: string } | null = null;
  const plan = plans.find((p) => p.days.length > 0);
  if (plan) {
    const index = nextDayIndex(plan.days.length, await lastCompletedDayPosition(db, plan.planId));
    next = { plan: plan.name, day: plan.days[index].name };
  }
  const coach: CoachTodayData = {
    setUp: setup !== null,
    target: goal ? { kcal: goal.kcal ?? 0, trainingDay: goal.trainingDay, macros: goal.macros } : null,
    nextDay: next?.day ?? null,
    sums,
    drinksMl: food.drinksMl,
    drinkGoalMl: settings.drinkGoalMl,
    sleepHours: sleep.find((s) => s.day === today)?.hours ?? null,
    hideNumbers: settings.hideNumbers,
  };
  // Direkt nach dem Erststart einmal die Coach-Einrichtung öffnen (C1).
  const openSetup = pending && setup === null;
  // Letzte Messungen für die Mini-Kurve: ein Wert pro Tag (der neueste), älteste zuerst.
  const seen = new Set<string>();
  const recent = weights.filter((w) => !seen.has(w.day) && seen.add(w.day)).slice(0, 14).reverse().map((w) => w.kg);
  return {
    lastWeight: weights[0] ?? null,
    trend: weightTrend(weights, today),
    recent,
    active,
    next,
    food,
    timed: timed?.title ?? null,
    checkin,
    coach,
    openSetup,
    restDay: goal?.trainingDay === false,
    week: { done: week, count: weekCount, goal: setup?.gymDays ?? null, todayIndex },
  };
}

export default function TodayScreen() {
  const { data, db } = useLoad(loadToday, {
    lastWeight: null as WeightEntry | null,
    trend: null as number | null,
    recent: [] as number[],
    restDay: false,
    week: { done: Array.from({ length: 7 }, () => false), count: 0, goal: null as number | null, todayIndex: 0 },
    timed: null as string | null,
    checkin: false,
    active: null as SessionInfo | null,
    next: null as { plan: string; day: string } | null,
    food: { entries: 0, sums: sumNutrients([]), drinksMl: 0, drinkGoalMl: null as number | null, goal: null as number | null, hide: false },
    coach: null as CoachTodayData | null,
    openSetup: false,
  });
  const { lastWeight, trend, recent, active, next, food, timed, checkin, coach, openSetup, restDay, week } = data;
  const theme = useTheme();
  useEffect(() => {
    if (!openSetup) return;
    saveCoachPending(db, false).then(() => router.push('/progress/coach-setup'));
  }, [openSetup, db]);
  const units = useUnits();
  const hour = new Date().getHours();
  const greeting = hour < 11 ? t('today.greetingMorning') : hour < 18 ? t('today.greetingDay') : t('today.greetingEvening');

  // Trainings-Panel: läuft etwas? Sonst nächster Tag, Ruhetag oder erster Plan.
  const hero = timed
    ? { eyebrow: t('today.heroRunning'), title: timed, text: null, action: t('today.heroContinue'), go: () => router.push('/training/run') }
    : active
      ? {
          eyebrow: t('today.heroRunning'),
          title: active.dayName ?? t('today.heroFree'),
          text: active.planName,
          action: t('today.heroContinue'),
          go: () => router.push(`/training/session/${active.id}`),
        }
      : next && restDay
        ? {
            eyebrow: t('today.title'),
            title: t('today.heroRest'),
            text: `${t('today.heroRestText')} ${t('today.heroRestNext', { day: next.day })}`,
            action: t('today.heroStretch'),
            go: () => router.push('/training/stretch'),
          }
        : next
          ? { eyebrow: t('today.heroToday'), title: next.day, text: next.plan, action: t('today.heroStart'), go: () => router.push('/training') }
          : {
              eyebrow: t('today.heroNoPlanEyebrow'),
              title: t('today.heroNoPlanTitle'),
              text: t('today.heroNoPlanText'),
              action: t('today.heroNoPlan'),
              go: () => router.push('/training'),
            };

  // Kalorien-Kachel
  const kcal = food.sums.values.kcal;
  const kcalValue = food.hide ? String(food.entries) : food.entries === 0 ? '0' : formatNumber(kcal, 0);
  const kcalUnit = food.hide ? undefined : 'kcal';
  const kcalCaption = food.hide
    ? t('today.tileEntries', { count: food.entries })
    : food.entries === 0
      ? t('today.tileKcalEmpty')
      : food.goal === null
        ? null
        : kcal <= food.goal
          ? t('today.tileKcalLeft', { left: formatNumber(food.goal - kcal, 0) })
          : t('today.tileKcalOver', { over: formatNumber(kcal - food.goal, 0) });
  const liters = (ml: number) => formatNumber(ml / 1000, 1);

  return (
    <Screen title={greeting} eyebrow={formatLongDate(new Date())}>
      {checkin ? (
        <Card>
          <ListRow title={t('checkin.due')} subtitle={t('checkin.dueSubtitle')} accessory="›" onPress={() => router.push('/progress/checkin')} />
        </Card>
      ) : null}
      <HeroPanel eyebrow={hero.eyebrow} title={hero.title} text={hero.text} action={hero.action} onPress={hero.go} />
      <TileGrid>
        <StatTile
          index={1}
          icon="flame"
          label={t('today.tileKcal')}
          value={kcalValue}
          unit={kcalUnit}
          caption={kcalCaption ?? (food.goal !== null && !food.hide ? t('today.tileKcalOf', { goal: formatNumber(food.goal, 0) }) : null)}
          corner={
            !food.hide && food.goal ? (
              <ProgressRing progress={kcal / food.goal} size={30} stroke={4} color={theme.tint} trackColor={theme.backgroundSelected} />
            ) : null
          }
          accessibilityLabel={[t('today.tileKcal'), kcalValue, kcalUnit, kcalCaption].filter(Boolean).join(' ')}
          onPress={() => router.push('/nutrition')}
        />
        <StatTile
          index={2}
          icon="drop"
          label={t('today.tileDrinks')}
          value={liters(food.drinksMl)}
          unit="l"
          caption={food.drinkGoalMl ? t('today.tileDrinksOf', { goal: liters(food.drinkGoalMl) }) : null}
          footer={
            food.drinkGoalMl ? (
              <MeterBar progress={food.drinksMl / food.drinkGoalMl} color={theme.tint} trackColor={theme.backgroundSelected} height={6} />
            ) : null
          }
          accessibilityLabel={`${t('today.tileDrinks')} ${liters(food.drinksMl)} l`}
          onPress={() => router.push('/nutrition')}
        />
        <StatTile
          index={3}
          icon="scale"
          label={t('today.tileWeight')}
          value={lastWeight ? formatWeight(lastWeight.kg, units.weight).replace(/\s*\S+$/, '') : '–'}
          unit={lastWeight ? units.weight : undefined}
          caption={
            trend !== null
              ? t('today.tileWeightTrend', { kg: formatWeight(trend, units.weight) })
              : lastWeight
                ? lastWeight.day === todayDay()
                  ? t('today.tileWeightToday')
                  : t('today.tileWeightLast', { date: formatDay(lastWeight.day) })
                : t('today.tileWeightNone')
          }
          footer={<Sparkline values={recent} color={theme.tint} />}
          accessibilityLabel={`${t('today.tileWeight')} ${lastWeight ? formatWeight(lastWeight.kg, units.weight) : t('today.tileWeightNone')}`}
          onPress={() => router.push('/progress')}
        />
        <StatTile
          index={4}
          icon="calendar"
          label={t('today.tileWeek')}
          value={String(week.count)}
          unit={week.goal ? undefined : t('today.tileWeekUnit', { count: week.count })}
          caption={week.goal ? t('today.tileWeekOf', { goal: week.goal }) : null}
          footer={<WeekDots done={week.done} todayIndex={week.todayIndex} labels={[1, 2, 3, 4, 5, 6, 7].map((d) => t(`reminders.dayShort.${d}`))} />}
          accessibilityLabel={`${t('today.tileWeek')}: ${week.count} ${t('today.tileWeekUnit', { count: week.count })}`}
          onPress={() => router.push('/training/history')}
        />
      </TileGrid>
      {coach ? <CoachToday data={coach} /> : null}
    </Screen>
  );
}
