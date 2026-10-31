import { router } from 'expo-router';
import { useEffect } from 'react';

import { Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { FigureStrip, TrainingBlock, type WeekDay } from '@/components/today-widgets';
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
  // Geplante Trainingstage aus dem Coach (ISO: 1 = Montag … 7 = Sonntag).
  const planned = Array.from({ length: 7 }, (_, i) => (setup?.trainingWeekdays ?? []).includes(i + 1));
  return {
    lastWeight: weights[0] ?? null,
    trend: weightTrend(weights, today),
    active,
    next,
    food,
    timed: timed?.title ?? null,
    checkin,
    coach,
    openSetup,
    restDay: goal?.trainingDay === false,
    week: { done: week, planned, goal: setup?.gymDays ?? null, todayIndex },
  };
}

const EMPTY_WEEK = Array.from({ length: 7 }, () => false);

export default function TodayScreen() {
  const { data, db } = useLoad(loadToday, {
    lastWeight: null as WeightEntry | null,
    trend: null as number | null,
    restDay: false,
    week: { done: EMPTY_WEEK, planned: EMPTY_WEEK, goal: null as number | null, todayIndex: 0 },
    timed: null as string | null,
    checkin: false,
    active: null as SessionInfo | null,
    next: null as { plan: string; day: string } | null,
    food: { entries: 0, sums: sumNutrients([]), drinksMl: 0, drinkGoalMl: null as number | null, goal: null as number | null, hide: false },
    coach: null as CoachTodayData | null,
    openSetup: false,
  });
  const { lastWeight, trend, active, next, food, timed, checkin, coach, openSetup, restDay, week } = data;
  useEffect(() => {
    if (!openSetup) return;
    saveCoachPending(db, false).then(() => router.push('/progress/coach-setup'));
  }, [openSetup, db]);
  const units = useUnits();
  const hour = new Date().getHours();
  const greeting = hour < 11 ? t('today.greetingMorning') : hour < 18 ? t('today.greetingDay') : t('today.greetingEvening');

  // Die Frage des Bildschirms: Was steht heute an? Der Trainingsblock beantwortet sie, sein Knopf führt direkt hin.
  const training = timed
    ? { label: t('today.heroRunning'), title: timed, meta: null, action: t('today.heroContinue'), go: () => router.push('/training/run') }
    : active
      ? {
          label: t('today.heroRunning'),
          title: active.dayName ?? t('today.heroFree'),
          meta: active.planName,
          action: t('today.heroContinue'),
          go: () => router.push(`/training/session/${active.id}`),
        }
      : next && restDay
        ? {
            label: t('today.heroRest'),
            title: t('today.heroRestTitle'),
            meta: t('today.heroRestNext', { day: next.day }),
            action: t('today.heroStretch'),
            go: () => router.push('/training/stretch'),
          }
        : next
          ? { label: t('today.heroToday'), title: next.day, meta: next.plan, action: t('today.heroStart'), go: () => router.push('/training') }
          : {
              label: t('today.heroNoPlanEyebrow'),
              title: t('today.heroNoPlanTitle'),
              meta: t('today.heroNoPlanText'),
              action: t('today.heroNoPlan'),
              go: () => router.push('/training'),
            };

  // Die Zeile unter der Begrüßung: Datum und das Wichtigste von heute.
  const finding = timed || active ? t('today.findingRunning') : next && restDay ? t('today.heroRest') : next ? t('today.findingNext', { day: next.day }) : null;
  const subtitle = [formatLongDate(new Date()), finding].filter(Boolean).join(' · ');

  // Trainingswoche: eine Variable für Punkte und Zusammenfassung (gezählt werden Tage mit Training).
  const dayLabels = [1, 2, 3, 4, 5, 6, 7].map((d) => t(`reminders.dayShort.${d}`));
  const days: WeekDay[] = dayLabels.map((label, i) => ({ label, done: week.done[i], planned: week.planned[i], today: i === week.todayIndex }));
  const doneDays = week.done.filter(Boolean).length;
  const weekSummary = week.goal
    ? t('today.weekSummaryGoal', { count: doneDays, goal: week.goal })
    : t('today.weekSummary', { count: doneDays });

  // Kennzahlen
  const kcal = food.sums.values.kcal;
  const liters = (ml: number) => formatNumber(ml / 1000, 1);
  const kcalFigure = food.hide
    ? { value: String(food.entries), unit: undefined, sub: t('today.tileEntries', { count: food.entries }) }
    : {
        value: formatNumber(kcal, 0),
        unit: 'kcal',
        sub:
          food.entries === 0
            ? t('today.tileKcalEmpty')
            : food.goal === null
              ? null
              : kcal <= food.goal
                ? t('today.tileKcalLeft', { left: formatNumber(food.goal - kcal, 0) })
                : t('today.tileKcalOver', { over: formatNumber(kcal - food.goal, 0) }),
      };
  const weightValue = lastWeight ? formatWeight(lastWeight.kg, units.weight).replace(/\s*\S+$/, '') : null;
  const weightSub =
    trend !== null
      ? t('today.tileWeightTrend', { kg: formatWeight(trend, units.weight) })
      : lastWeight
        ? lastWeight.day === todayDay()
          ? t('today.tileWeightToday')
          : t('today.tileWeightLast', { date: formatDay(lastWeight.day) })
        : t('today.tileWeightNone');

  return (
    <Screen title={greeting} subtitle={subtitle}>
      {checkin ? (
        <Card>
          <ListRow title={t('checkin.due')} subtitle={t('checkin.dueSubtitle')} accessory="›" onPress={() => router.push('/progress/checkin')} />
        </Card>
      ) : null}
      <TrainingBlock
        label={training.label}
        title={training.title}
        meta={training.meta}
        week={days}
        weekSummary={weekSummary}
        action={training.action}
        onPress={training.go}
      />
      <FigureStrip
        figures={[
          {
            label: t('today.tileKcal'),
            ...kcalFigure,
            accessibilityLabel: [t('today.tileKcal'), kcalFigure.value, kcalFigure.unit, kcalFigure.sub].filter(Boolean).join(' '),
            onPress: () => router.push('/nutrition'),
          },
          {
            label: t('today.tileDrinks'),
            value: liters(food.drinksMl),
            unit: 'l',
            sub: food.drinkGoalMl ? t('today.tileDrinksOf', { goal: liters(food.drinkGoalMl) }) : null,
            accessibilityLabel: `${t('today.tileDrinks')} ${liters(food.drinksMl)} l`,
            onPress: () => router.push('/nutrition'),
          },
          {
            label: t('today.tileWeight'),
            value: weightValue,
            unit: lastWeight ? units.weight : undefined,
            sub: weightSub,
            accessibilityLabel: `${t('today.tileWeight')} ${lastWeight ? formatWeight(lastWeight.kg, units.weight) : t('today.tileWeightNone')}, ${weightSub}`,
            onPress: () => router.push('/progress'),
          },
        ]}
      />
      {coach ? <CoachToday data={coach} /> : null}
    </Screen>
  );
}
