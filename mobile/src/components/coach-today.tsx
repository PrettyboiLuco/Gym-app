import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card } from '@/components/card';
import { ListRow } from '@/components/fields';
import { ThemedText } from '@/components/themed-text';
import { dailyTips, type DayTarget } from '@/domain/coach';
import type { NutrientTotals } from '@/domain/nutrition';
import { formatNumber, t } from '@/i18n';

export type CoachTodayData = {
  setUp: boolean;
  target: DayTarget | null;
  /** Nächster Trainingstag aus dem Plan, falls heute trainiert wird. */
  nextDay: string | null;
  sums: NutrientTotals;
  drinksMl: number;
  drinkGoalMl: number | null;
  sleepHours: number | null;
  hideNumbers: boolean;
};

const g = (v: number) => formatNumber(Math.round(v), 0);

/** Tägliche Begleitung auf „Heute“ (Coach C8): Tagesart, Kalorien und Makros, Tipps nur auf Klick. */
export function CoachToday({ data }: { data: CoachTodayData }) {
  const [showTips, setShowTips] = useState(false);
  if (!data.setUp) {
    return (
      <Card>
        <ListRow title={t('coach.open')} subtitle={t('coach.openSubtitle')} accessory="›" onPress={() => router.push('/progress/coach-setup')} />
      </Card>
    );
  }
  const { target, sums, hideNumbers } = data;
  const macros = target?.macros ?? null;
  const tips = dailyTips({
    target,
    eaten: { kcal: sums.values.kcal, protein: sums.values.protein, fiber: sums.values.fiber },
    drinksMl: data.drinksMl,
    drinkGoalMl: data.drinkGoalMl,
    hour: new Date().getHours(),
    sleepHours: data.sleepHours,
    hideNumbers,
  });
  const dayKind = target?.trainingDay === true ? t('coach.trainingDay') : target?.trainingDay === false ? t('coach.restDay') : null;
  return (
    <Card title={dayKind ? `${t('coach.todayTitle')} · ${dayKind}` : t('coach.overview')}>
      {target?.trainingDay && data.nextDay ? <ThemedText>{t('coach.trainingToday', { name: data.nextDay })}</ThemedText> : null}
      {!hideNumbers && target ? (
        <>
          <ThemedText>{t('coach.kcalToday', { eaten: g(sums.values.kcal), target: g(target.kcal) })}</ThemedText>
          {macros ? (
            <>
              <ThemedText type="small">
                {[
                  t('coach.macroLine', { name: t('nutrition.protein'), eaten: g(sums.values.protein), target: g(macros.protein) }),
                  t('coach.macroLine', { name: t('nutrition.fat'), eaten: g(sums.values.fat), target: g(macros.fat) }),
                  t('coach.macroLine', { name: t('nutrition.carbs'), eaten: g(sums.values.carbs), target: g(macros.carbs) }),
                ].join(' · ')}
              </ThemedText>
              <ThemedText type="small">{t('coach.fiberLine', { eaten: g(sums.values.fiber), target: g(macros.fiber) })}</ThemedText>
            </>
          ) : null}
        </>
      ) : null}
      <Button label={showTips ? t('coach.tipsClose') : t('coach.tipsOpen')} variant="danger" onPress={() => setShowTips((v) => !v)} />
      {showTips
        ? tips.map((tip) => (
            <ThemedText key={tip.key} type="small">
              • {t(`coach.tip.${tip.key}`, 'grams' in tip ? { grams: tip.grams } : undefined)}
            </ThemedText>
          ))
        : null}
      <ListRow title={t('coach.change')} accessory="›" onPress={() => router.push('/progress/coach-setup')} />
    </Card>
  );
}
