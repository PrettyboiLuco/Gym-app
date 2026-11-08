import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Card } from '@/components/card';
import { SetupSteps, type CoachTodayData } from '@/components/coach-today';
import { ListRow } from '@/components/fields';
import { MorningCheck, ReadinessCard } from '@/components/readiness';
import { Screen } from '@/components/screen';
import { SettingsButton } from '@/components/settings-button';
import { SkeletonBlocks } from '@/components/skeleton';
import { FigureStrip, TrainingBlock, weekDays } from '@/components/today-widgets';
import { loadLastBackup } from '@/data/backup';
import { lastCheckinWeekEnd, listSleep, loadCoachPending, loadCoachSetup, saveCoachPending } from '@/data/coach';
import type { Db } from '@/data/db';
import { calorieGoalOn } from '@/data/goals';
import { loadMotivation } from '@/data/motivation';
import { listDay, loadNutritionSettings } from '@/data/nutrition';
import { loadSetupHidden, saveSetupHidden } from '@/data/profile';
import { loadSpared, readinessToday, type ReadinessToday } from '@/data/readiness';
import { loadTimedRun } from '@/data/routines';
import { expireTemporaryPlans, getActiveSession, listActivePlans, oldestActivityDay, type SessionInfo } from '@/data/training';
import { loadMapPrefs, loadTodayPlan, loadTrainingWeek, plannedMuscles } from '@/data/training-week';
import { listWeights } from '@/data/weights';
import { backupDueDays } from '@/domain/backup';
import { checkinDue } from '@/domain/checkin';
import type { MuscleGroup } from '@/domain/exercises';
import type { Milestone } from '@/domain/motivation';
import { drinkTotals, sumNutrients } from '@/domain/nutrition';
import { todayDay } from '@/domain/time';
import { taggedWeekdays } from '@/domain/training';
import { mlToUnit, type VolumeUnit } from '@/domain/units';
import { DISPLAY_MIN_DAYS, weightTrend, type WeightEntry } from '@/domain/weight';
import { useForegroundReload } from '@/hooks/use-foreground-reload';
import { useLoad } from '@/hooks/use-load';
import { formatDay, formatLongDate, formatNumber, formatVolume, formatWeight, t } from '@/i18n';
import { useModules, useProfile, useUnits } from '@/providers/profile-provider';
import { diaryToday } from '@/services/nutrition-format';

async function loadToday(db: Db) {
  const today = todayDay();
  // Abgelaufene befristete Planfassungen beenden, damit „Nächstes Training“ stimmt (TRAIN-008).
  await expireTemporaryPlans(db, today);
  // Ernährung nach dem Ernährungstag (A3: Tag kann z. B. erst um 4 Uhr enden) – wie im Tab „Ernährung“.
  const settings = await loadNutritionSettings(db);
  const diaryDay = diaryToday();
  const [weights, active, plans, events, goal] = await Promise.all([
    listWeights(db),
    getActiveSession(db),
    listActivePlans(db),
    listDay(db, diaryDay),
    calorieGoalOn(db, diaryDay),
  ]);
  const [timed, setup, pending, sleep, trainingWeek, ready] = await Promise.all([
    loadTimedRun(db),
    loadCoachSetup(db),
    loadCoachPending(db),
    listSleep(db, today),
    loadTrainingWeek(db, today),
    readinessToday(db, today),
  ]);
  const [motivation, setupHidden, lastBackup, firstActivity] = await Promise.all([
    loadMotivation(db, today),
    loadSetupHidden(db),
    loadLastBackup(db),
    oldestActivityDay(db),
  ]);
  // Geschonte Bereiche beim Status „verletzt“ (Muskelkarte Punkt 6.4)
  const spared = (await loadSpared(db, today))?.areas ?? [];
  const { body } = await loadMapPrefs(db);
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
  // Plantag je Wochentag (Mo = 0) zum Antippen in der Satz-Woche – nur bei Plantagen mit Wochentag im Namen eindeutig.
  let weekPlan: { planId: string; dayIds: (string | null)[] } | null = null;
  let muscles: Partial<Record<MuscleGroup, number>> | null = null;
  // Training oder Ruhetag nach Wochentagen im Plan bzw. den gespeicherten Trainingstagen (nicht einfach „nächster Plantag“).
  const planToday = plans.some((p) => p.days.length > 0) ? await loadTodayPlan(db, today) : null;
  if (planToday) {
    const { plan, dayIndex } = planToday;
    next = { plan: plan.name, day: plan.days[dayIndex].name };
    // Muskeln des heutigen (bzw. nächsten) Plantags für die kleine Karte (U4).
    muscles = await plannedMuscles(db, plan.days[dayIndex].id);
    const tags = taggedWeekdays(plan.days.map((d) => d.name));
    weekPlan = { planId: plan.planId, dayIds: [1, 2, 3, 4, 5, 6, 7].map((wd) => (tags ? (plan.days[tags.indexOf(wd)]?.id ?? null) : null)) };
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
  return {
    lastWeight: weights[0] ?? null,
    trend: weightTrend(weights, today, 7, DISPLAY_MIN_DAYS),
    active,
    next,
    food,
    timed: timed?.title ?? null,
    checkin,
    coach,
    openSetup,
    // Ruhetag aus dem Plan (Wochentag) gilt immer; der aus dem Coach-Ziel nur mit eingeschaltetem Coach (siehe unten).
    planRest: planToday?.today.kind === 'rest',
    coachRest: goal?.trainingDay === false,
    week: trainingWeek,
    ready,
    spared,
    body,
    today,
    // Nur der neueste noch nicht angesehene Meilenstein (A10.5); ältere stehen in der Liste.
    milestone: motivation.fresh.at(-1) ?? null,
    backupDays: backupDueDays(lastBackup, firstActivity, today),
    muscles,
    weekPlan,
    // Einrichten in 3 Schritten (Coach): Gewicht, Ziel, erster Plan.
    setup: { weight: weights.length > 0, goal: goal !== null, plan: plans.some((p) => p.days.length > 0), hidden: setupHidden },
  };
}

const EMPTY_WEEK = Array.from({ length: 7 }, () => false);

/**
 * Zahl und Einheit für die Kachel „Trinken“: in derselben Einheit wie das Ziel darunter („0,95 von 2,5 l“), ohne Ziel
 * ml unter 1 l, sonst l; oder fl oz. `format` zeigt Zwischenwerte beim Hochzählen in derselben Einheit wie der Endwert (N1).
 */
function volumeFigure(ml: number, unit: VolumeUnit, goalMl: number | null) {
  const liters = unit !== 'oz' && Math.max(ml, goalMl ?? 0) >= 1000;
  const format =
    unit === 'oz'
      ? (v: number) => formatNumber(mlToUnit(v, 'oz'), 0)
      : liters
        ? (v: number) => formatNumber(v / 1000, 2)
        : (v: number) => formatNumber(Math.round(v), 0);
  return { value: format(ml), unit: unit === 'oz' ? 'fl oz' : liters ? 'l' : 'ml', count: { to: ml, format } };
}

export default function TodayScreen() {
  const { data, db, loaded, reload } = useLoad(loadToday, {
    lastWeight: null as WeightEntry | null,
    trend: null as number | null,
    planRest: false,
    coachRest: false,
    week: { done: EMPTY_WEEK, planned: EMPTY_WEEK, goal: null as number | null, todayIndex: 0, doneSets: [] as number[], plannedSets: [] as number[] },
    timed: null as string | null,
    checkin: false,
    active: null as SessionInfo | null,
    next: null as { plan: string; day: string } | null,
    food: { entries: 0, sums: sumNutrients([]), drinksMl: 0, drinkGoalMl: null as number | null, goal: null as number | null, hide: false },
    coach: null as CoachTodayData | null,
    openSetup: false,
    ready: null as ReadinessToday | null,
    spared: [] as MuscleGroup[],
    body: 'm' as 'm' | 'w',
    today: '',
    milestone: null as Milestone | null,
    backupDays: null as number | null,
    muscles: null as Partial<Record<MuscleGroup, number>> | null,
    weekPlan: null as { planId: string; dayIds: (string | null)[] } | null,
    setup: { weight: true, goal: true, plan: true, hidden: true },
  });
  useForegroundReload(reload);
  const { lastWeight, trend, active, next, food, timed, checkin, coach, openSetup, week, ready, today, milestone, muscles, spared, body, weekPlan, setup } =
    data;
  const units = useUnits();
  const modules = useModules();
  const { profile } = useProfile();
  // Sensible Situation bzw. „Zahlen ausblenden“: keine kcal- und Gewichtszahlen auf „Heute“.
  const hideNumbers = food.hide || profile.sensitive;
  // Einrichten in 3 Schritten: nur mit Coach, solange Ziel oder Gewicht fehlen, und nicht auf „Später“ gestellt.
  const showSetup = modules.coach && !setup.hidden && (!setup.goal || !setup.weight);
  // Ruhetag aus dem Coach-Ziel und die Einrichtung gelten nur mit Coach; der Ruhetag laut Plan immer.
  const restDay = data.planRest || (data.coachRest && modules.coach);
  const setupDue = openSetup && modules.coach;
  useEffect(() => {
    if (!setupDue) return;
    saveCoachPending(db, false).then(() => router.push('/coach/coach-setup'));
  }, [setupDue, db]);
  const [checkOpen, setCheckOpen] = useState(false);
  const hour = new Date().getHours();
  const greeting = hour < 11 ? t('today.greetingMorning') : hour < 18 ? t('today.greetingDay') : t('today.greetingEvening');

  // Die Frage des Bildschirms: Was steht heute an? Der Trainingsblock beantwortet sie, sein Knopf führt direkt hin.
  const training = timed
    ? { label: null, title: timed, meta: null, action: t('today.heroContinue'), go: () => router.push('/training/run') }
    : active
      ? {
          label: null,
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
            // Dehnen nur anbieten, wenn der Bereich Routinen an ist (Phase 1 Scan).
            action: modules.routinen ? t('today.heroStretch') : t('today.heroRestPlan'),
            go: () => router.push(modules.routinen ? '/training/stretch' : '/training'),
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

  // Die Zeile unter der Begrüßung: nur das Datum. Laufendes Training und Ruhetag stehen in der Karte (und in der
  // Leiste unten) – nicht ein drittes Mal hier.
  const subtitle = formatLongDate(new Date());

  // Trainingswoche: eine Variable für Punkte und Zusammenfassung (gezählt werden Tage mit Training).
  const days = weekDays(week);
  const doneDays = week.done.filter(Boolean).length;
  // Status krank/verletzt/Pause (A6.7): kein Wochenziel, keine Lücke – nur was war.
  const paused = ready?.readiness.kind === 'status';
  const c = ready?.check;
  const checkComplete = !!c && c.sleepHours !== null && c.sleepQuality !== null && c.energy !== null && c.soreness !== null;
  const weekSummary = paused
    ? t('today.weekSummaryPaused', { count: doneDays })
    : week.goal
      ? t('today.weekSummaryGoal', { count: doneDays, goal: week.goal })
      : t('today.weekSummary', { count: doneDays });

  // Kennzahlen
  const sleepHours = ready?.check?.sleepHours ?? coach?.sleepHours ?? null;
  const kcal = food.sums.values.kcal;
  const volume = (ml: number) => formatVolume(ml, units.volume);
  const kcalFigure = hideNumbers
    ? { value: String(food.entries), unit: undefined, sub: t('today.tileEntries', { count: food.entries }) }
    : {
        value: formatNumber(kcal, 0),
        unit: 'kcal',
        // N1: kcal zählen beim Öffnen hoch; O2: dünner Balken zum Tagesziel in der Datenfarbe.
        count: { to: kcal, format: (v: number) => formatNumber(Math.round(v), 0) },
        progress: food.goal ? kcal / food.goal : null,
        sub:
          food.entries === 0
            ? t('today.tileKcalEmpty')
            : food.goal === null
              ? null
              : kcal <= food.goal
                ? t('today.tileKcalLeft', { left: formatNumber(food.goal - kcal, 0) })
                : t('today.tileKcalOver', { over: formatNumber(kcal - food.goal, 0) }),
      };
  const weightValue = lastWeight && !hideNumbers ? formatWeight(lastWeight.kg, units.weight).replace(/\s*\S+$/, '') : null;
  const weightSub =
    trend !== null && !hideNumbers
      ? t('today.tileWeightTrend', { kg: formatWeight(trend, units.weight) })
      : lastWeight
        ? lastWeight.day === todayDay()
          ? t('today.tileWeightToday')
          : t('today.tileWeightLast', { date: formatDay(lastWeight.day) })
        : t('today.tileWeightNone');

  if (!loaded) {
    return (
      <Screen title={greeting} subtitle={formatLongDate(new Date())} trailing={<SettingsButton />}>
        <SkeletonBlocks blocks={[300, 104, 160]} />
      </Screen>
    );
  }
  return (
    <Screen title={greeting} subtitle={subtitle} trailing={<SettingsButton />}>
      {showSetup ? (
        <SetupSteps
          steps={[
            { key: 'weight', label: t('today.setupWeight'), done: setup.weight, onPress: () => router.push('/progress') },
            { key: 'goal', label: t('today.setupGoal'), done: setup.goal, onPress: () => router.push('/coach/coach-setup') },
            { key: 'plan', label: t('today.setupPlan'), done: setup.plan, onPress: () => router.push('/training') },
          ]}
          onLater={() => saveSetupHidden(db, true).then(reload)}
        />
      ) : null}
      {/* Sanfte Erinnerung an eine Sicherung (keine App-Daten in der Cloud: gelöschte App = alles weg). */}
      {data.backupDays !== null ? (
        <Card>
          <ListRow
            icon="database"
            title={t('backupReminder.title')}
            subtitle={t('backupReminder.subtitle', { days: data.backupDays })}
            accessory="›"
            last
            onPress={() => router.push('/more/data')}
          />
        </Card>
      ) : null}
      {checkin && modules.coach ? (
        <Card>
          <ListRow title={t('checkin.due')} subtitle={t('checkin.dueSubtitle')} accessory="›" onPress={() => router.push('/coach/checkin')} />
        </Card>
      ) : null}
      {milestone ? (
        <Card>
          <ListRow
            icon="target"
            title={t('milestones.newTitle', { name: t(`milestones.name.${milestone.id}`) })}
            subtitle={t('milestones.newSubtitle')}
            accessory="›"
            last
            onPress={() => router.push('/progress/milestones')}
          />
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
        muscles={!timed && !active && next && !restDay ? muscles : null}
        spared={spared}
        body={body}
        growIn
        countUp
        onDayPress={
          weekPlan
            ? (i) => {
                const dayId = weekPlan.dayIds[i];
                router.push(dayId ? { pathname: '/training/plan/[id]', params: { id: weekPlan.planId, day: dayId } } : `/training/plan/${weekPlan.planId}`);
              }
            : undefined
        }
      />
      {!modules.bereitschaft ? null : ready && ready.readiness.kind !== 'status' && !checkComplete ? (
        // T3: auf „Heute“ eine Zeile; der Check klappt beim Antippen hier auf (vier Antippen, kein Bildschirmwechsel).
        checkOpen ? (
          <MorningCheck key={today} db={db} day={today} check={ready.check} onSaved={reload} />
        ) : (
          <Card>
            <ListRow title={t('readiness.checkTitle')} subtitle={t('today.checkShort')} accessory="›" last onPress={() => setCheckOpen(true)} />
          </Card>
        )
      ) : ready ? (
        <ReadinessCard db={db} readiness={ready.readiness} check={ready.check} today={today} onChanged={reload} />
      ) : null}
      <FigureStrip
        figures={[
          ...(modules.ernaehrung
            ? [
                {
                  label: t('today.tileKcal'),
                  ...kcalFigure,
                  accessibilityLabel: [t('today.tileKcal'), kcalFigure.value, kcalFigure.unit, kcalFigure.sub].filter(Boolean).join(' '),
                  onPress: () => router.push('/nutrition'),
                },
                {
                  label: t('today.tileDrinks'),
                  ...volumeFigure(food.drinksMl, units.volume, food.drinkGoalMl),
                  progress: food.drinkGoalMl ? food.drinksMl / food.drinkGoalMl : null,
                  sub: food.drinkGoalMl ? t('today.tileDrinksOf', { goal: volume(food.drinkGoalMl) }) : null,
                  accessibilityLabel: `${t('today.tileDrinks')} ${volume(food.drinksMl)}`,
                  onPress: () => router.push('/nutrition'),
                },
              ]
            : []),
          {
            label: t('today.tileWeight'),
            value: weightValue,
            unit: weightValue ? units.weight : undefined,
            sub: weightSub,
            accessibilityLabel: weightValue
              ? `${t('today.tileWeight')} ${formatWeight(lastWeight!.kg, units.weight)}, ${weightSub}`
              : `${t('today.tileWeight')}: ${weightSub}`,
            onPress: () => router.push('/progress'),
          },
          ...(modules.bereitschaft
            ? [
                {
                  label: t('today.tileSleep'),
                  value: sleepHours === null ? null : formatNumber(sleepHours, 1),
                  unit: sleepHours === null ? undefined : 'h',
                  sub: sleepHours === null ? t('today.tileSleepNone') : t('today.tileSleepLast'),
                  accessibilityLabel:
                    sleepHours === null ? `${t('today.tileSleep')}: ${t('today.tileSleepNone')}` : `${t('today.tileSleep')} ${formatNumber(sleepHours, 1)} h`,
                  onPress: () => router.push('/progress/readiness'),
                },
              ]
            : []),
        ]}
      />
      {/* Kalorien, Makros und Tipps des Coachs stehen im Tab „Coach“ (Mitte der Leiste). */}
    </Screen>
  );
}
