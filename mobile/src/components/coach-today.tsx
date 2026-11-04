import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/card';
import { MeterBar } from '@/components/charts';
import { ListRow } from '@/components/fields';
import { Icon } from '@/components/icon';
import { useDataColor } from '@/components/insight-tile';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { dailyTips, type DayTarget } from '@/domain/coach';
import type { NutrientTotals } from '@/domain/nutrition';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
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
      {!hideNumbers && target ? (
        <>
          <View
            style={styles.overview}
            accessible
            accessibilityLabel={[
              t('coach.kcalToday', { eaten: g(sums.values.kcal), target: g(target.kcal) }),
              ...(macros
                ? [
                    t('coach.macroLine', { name: t('nutrition.protein'), eaten: g(sums.values.protein), target: g(macros.protein) }),
                    t('coach.macroLine', { name: t('nutrition.fat'), eaten: g(sums.values.fat), target: g(macros.fat) }),
                    t('coach.macroLine', { name: t('nutrition.carbs'), eaten: g(sums.values.carbs), target: g(macros.carbs) }),
                  ]
                : []),
            ].join('. ')}>
            {/* Fortschritt zum Ziel: Balken mit echtem Anteil, beide Enden beschriftet (gegessen / Ziel). */}
            <View style={styles.macros}>
              {[
                // Kalorien stehen auf „Heute“ in der Kennzahlenzeile – eine Zahl, ein Ort (taste-skill).
                ...(macros
                  ? [
                      { key: 'protein', label: t('nutrition.protein'), eaten: sums.values.protein, goal: macros.protein, text: 'coach.macroShort' },
                      { key: 'fat', label: t('nutrition.fat'), eaten: sums.values.fat, goal: macros.fat, text: 'coach.macroShort' },
                      { key: 'carbs', label: t('nutrition.carbs'), eaten: sums.values.carbs, goal: macros.carbs, text: 'coach.macroShort' },
                    ]
                  : []),
              ].map((row) => (
                <View key={row.key} style={styles.macro}>
                  <View style={styles.macroHead}>
                    <ThemedText type="small">{row.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.num}>
                      {t(row.text, { eaten: g(row.eaten), target: g(row.goal) })}
                    </ThemedText>
                  </View>
                  <MeterBar progress={row.goal > 0 ? row.eaten / row.goal : 0} color={theme.tint} trackColor={theme.backgroundSelected} height={6} />
                </View>
              ))}
            </View>
          </View>
          {macros ? <ThemedText type="small">{t('coach.fiberLine', { eaten: g(sums.values.fiber), target: g(macros.fiber) })}</ThemedText> : null}
        </>
      ) : null}
      <Button label={showTips ? t('coach.tipsClose') : t('coach.tipsOpen')} variant="secondary" onPress={() => setShowTips((v) => !v)} />
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

export type SetupStep = { key: string; label: string; done: boolean; onPress: () => void };

/**
 * „Einrichten in 3 Schritten“ oben auf „Heute“ (Coach): Fortschritt als Balken in der Datenfarbe, jeder Schritt mit
 * Haken bzw. leerem Kreis und antippbar. „Später“ blendet die Karte aus (gespeichert).
 */
export function SetupSteps({ steps, onLater }: { steps: SetupStep[]; onLater: () => void }) {
  const theme = useTheme();
  const dataColor = useDataColor();
  const done = steps.filter((s) => s.done).length;
  return (
    <Card
      title={t('today.setupTitle', { count: steps.length })}
      trailing={<Button label={t('today.setupLater')} variant="quiet" size="compact" onPress={onLater} />}>
      <View style={styles.progress} accessible accessibilityLabel={t('today.setupProgress', { done, count: steps.length })}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.num}>
          {t('today.setupProgress', { done, count: steps.length })}
        </ThemedText>
        <MeterBar progress={done / steps.length} color={dataColor} trackColor={theme.backgroundSelected} height={4} growIn />
      </View>
      <View>
        {steps.map((step, i) => (
          <PressableScale
            key={step.key}
            accessibilityRole="button"
            accessibilityLabel={`${step.label}, ${step.done ? t('today.setupStepDone') : t('today.setupStepOpen')}`}
            onPress={step.onPress}
            style={({ pressed }) => [
              styles.step,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected },
              pressed && { backgroundColor: theme.backgroundSelected },
            ]}>
            <View style={[styles.mark, step.done ? { backgroundColor: dataColor } : { borderWidth: 1.5, borderColor: theme.border }]}>
              {step.done ? <Icon name="check" color={theme.background} size={14} strokeWidth={2.6} /> : null}
            </View>
            <ThemedText themeColor={step.done ? 'textSecondary' : 'text'} style={styles.stepText}>
              {step.label}
            </ThemedText>
            <Icon name="chevron" color={theme.textSecondary} size={18} strokeWidth={2} />
          </PressableScale>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  overview: { paddingVertical: Spacing.one },
  macros: { gap: Spacing.three },
  num: { fontVariant: ['tabular-nums'] },
  macro: { gap: Spacing.one },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  progress: { gap: Spacing.two },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 52 },
  mark: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1 },
});
