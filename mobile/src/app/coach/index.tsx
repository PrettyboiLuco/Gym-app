import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { CoachToday, type CoachTodayData } from '@/components/coach-today';
import { ListRow } from '@/components/fields';
import { Screen } from '@/components/screen';
import { SettingsButton } from '@/components/settings-button';
import { SkeletonBlocks } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { DisplayFont, Radius, Spacing } from '@/constants/theme';
import { lastCheckinWeekEnd, listSleep, loadCoachSetup, type CoachSetup } from '@/data/coach';
import type { Db } from '@/data/db';
import { calorieGoalOn } from '@/data/goals';
import { listDay, loadNutritionSettings } from '@/data/nutrition';
import { loadTodayPlan } from '@/data/training-week';
import { listWeights } from '@/data/weights';
import { checkinDue } from '@/domain/checkin';
import { drinkTotals, sumNutrients } from '@/domain/nutrition';
import { todayDay } from '@/domain/time';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';
import { useModules } from '@/providers/profile-provider';
import { diaryToday } from '@/services/nutrition-format';

async function load(db: Db) {
  const today = todayDay();
  const settings = await loadNutritionSettings(db);
  const diaryDay = diaryToday();
  const [setup, goal, events, sleep, weights, plan] = await Promise.all([
    loadCoachSetup(db),
    calorieGoalOn(db, diaryDay),
    listDay(db, diaryDay),
    listSleep(db, today),
    listWeights(db),
    loadTodayPlan(db, today),
  ]);
  // Wochen-Check fällig? Gleiche Regel wie auf „Heute“ (COACH-008).
  const since = (await lastCheckinWeekEnd(db)) ?? setup?.doneAt ?? weights.at(-1)?.day ?? null;
  const sums = sumNutrients(events);
  const coach: CoachTodayData = {
    setUp: setup !== null,
    target: goal ? { kcal: goal.kcal ?? 0, trainingDay: goal.trainingDay, macros: goal.macros } : null,
    nextDay: plan ? plan.plan.days[plan.dayIndex].name : null,
    sums,
    drinksMl: drinkTotals(events.filter((e) => e.kind === 'getraenk')).allMl,
    drinkGoalMl: settings.drinkGoalMl,
    sleepHours: sleep.find((s) => s.day === today)?.hours ?? null,
    hideNumbers: settings.hideNumbers,
  };
  return { setup, coach, kcal: goal?.kcal ?? null, checkin: since !== null && checkinDue(since, today), hide: settings.hideNumbers };
}

/**
 * Tab „Coach“ (Mitte der Leiste): alles, was der Coach macht, an einem Ort – Ziel oben als Panel, darunter der Tag
 * (Kalorien, Makros, Tipps), der Wochen-Check und die Werkzeuge. Vorher lag das verteilt auf „Heute“ und Fortschritt.
 */
export default function CoachScreen() {
  const theme = useTheme();
  const modules = useModules();
  const { data, loaded } = useLoad(load, {
    setup: null as CoachSetup | null,
    coach: null as CoachTodayData | null,
    kcal: null as number | null,
    checkin: false,
    hide: false,
  });

  if (!loaded || !data.coach) {
    return (
      <Screen title={t('tabs.coach')} trailing={<SettingsButton />}>
        <SkeletonBlocks blocks={[180, 260, 160]} />
      </Screen>
    );
  }
  const { setup, coach } = data;
  return (
    <Screen title={t('tabs.coach')} subtitle={t('coachTab.subtitle')} trailing={<SettingsButton />}>
      {/* Ziel als Panel (getlayers „lumora-stats“ wie bei den Meilensteinen): Aussage oben, große Zahl darunter. */}
      {setup ? (
        <View style={[styles.hero, { backgroundColor: theme.text }]} accessible accessibilityRole="summary">
          <View style={styles.eyebrowRow}>
            <View style={[styles.dot, { backgroundColor: theme.accent }]} />
            <ThemedText type="small" style={{ color: theme.background, opacity: 0.7 }}>
              {t('coachTab.goalEyebrow')}
            </ThemedText>
          </View>
          <ThemedText style={[styles.heroTitle, { color: theme.background }]}>{t(`coach.goal.${setup.goal}`)}</ThemedText>
          <View style={styles.heroStats}>
            {data.kcal !== null && !data.hide ? (
              <HeroStat value={formatNumber(data.kcal, 0)} label={t('coachTab.kcalToday')} color={theme.background} />
            ) : null}
            <HeroStat value={String(setup.gymDays)} label={t('coachTab.gymDays')} color={theme.background} />
            <HeroStat value={formatNumber(setup.steps, 0)} label={t('coachTab.steps')} color={theme.background} />
          </View>
        </View>
      ) : null}

      {/* Wochen-Check fällig: ganz nach oben, damit er nicht untergeht. */}
      {data.checkin && setup ? (
        <Card>
          <ListRow icon="calendar" title={t('checkin.due')} subtitle={t('checkin.dueSubtitle')} accessory="›" last onPress={() => router.push('/coach/checkin')} />
        </Card>
      ) : null}

      {/* Der Tag: Kalorien, Makros, Tipps (bzw. „Coach einrichten“, solange es keine Einrichtung gibt). */}
      {modules.coach ? <CoachToday data={coach} /> : null}

      {setup ? (
        <Card title={t('coachTab.toolsTitle')}>
          {!data.checkin ? (
            <ListRow icon="calendar" title={t('checkin.title')} subtitle={t('coachTab.checkinSubtitle')} accessory="›" onPress={() => router.push('/coach/checkin')} />
          ) : null}
          <ListRow icon="target" title={t('coach.change')} subtitle={t('coachTab.changeSubtitle')} accessory="›" onPress={() => router.push('/coach/coach-setup')} />
          <ListRow
            icon="calculator"
            title={t('calculator.title')}
            subtitle={t('coachTab.calculatorSubtitle')}
            accessory="›"
            last
            onPress={() => router.push('/progress/calculator')}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

function HeroStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.heroStat} accessible accessibilityLabel={`${value} ${label}`}>
      <ThemedText style={[styles.heroValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="small" style={{ color, opacity: 0.7 }} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: Radius.card + 8, padding: Spacing.four, gap: Spacing.three },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  heroTitle: { fontFamily: DisplayFont.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  heroStats: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.one },
  heroStat: { flex: 1, minWidth: 0, gap: Spacing.half },
  heroValue: { fontFamily: DisplayFont.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
});
