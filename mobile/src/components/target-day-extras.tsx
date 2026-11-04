// Zusätze der Tagesübersicht (Ausbauplan B2): Wochenbudget, Netto-Kohlenhydrate bei Low-Carb/Keto und bis zu drei
// angeheftete Vitamine/Mineralstoffe. Ohne Zahlen bei sensibler Situation oder „Zahlen ausblenden“.

import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MeterBar } from '@/components/charts';
import { TargetMicroBar } from '@/components/target-micro-bar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DayTargets } from '@/data/targets-settings';
import { MICRO_UNITS, type Micros } from '@/domain/basis-foods';
import { netCarbs } from '@/domain/diet-profile';
import type { NutrientTotals } from '@/domain/nutrition';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, t } from '@/i18n';

export function TargetDayExtras({ targets, totals, micros, day }: { targets: DayTargets; totals: NutrientTotals; micros: Micros; day: string }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const data = dark ? theme.accent : theme.tint;
  if (targets.hidden) return null;
  const { budget } = targets;
  const net = targets.netCarbs ? netCarbs(totals.values.carbs, totals.values.fiber) : null;
  const netLimit = targets.netCarbs?.limit ?? null;
  if (!budget && net === null && targets.pinned.length === 0) return null;

  return (
    <View style={[styles.box, { borderColor: dark ? 'rgba(255,255,255,0.12)' : theme.backgroundSelected }]}>
      {budget ? (
        <View style={styles.block} accessible>
          <ThemedText type="smallBold" style={styles.num}>
            {t(budget.unknown ? 'targets.budget.lineAtLeast' : 'targets.budget.line', {
              eaten: formatNumber(budget.eaten, 0),
              total: formatNumber(budget.total, 0),
            })}
          </ThemedText>
          <MeterBar progress={budget.total > 0 ? budget.eaten / budget.total : 0} color={data} trackColor={theme.backgroundSelected} height={6} />
          {budget.carriedToday !== 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t(budget.carriedToday > 0 ? 'targets.budget.carriedPlus' : 'targets.budget.carriedMinus', {
                kcal: formatNumber(Math.abs(budget.carriedToday), 0),
              })}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {net !== null ? (
        <View style={styles.block} accessible>
          <View style={styles.head}>
            <ThemedText type="smallBold" style={styles.flex}>
              {t('targets.diet.netCarbs')}
            </ThemedText>
            <ThemedText type="small" style={styles.num}>
              {totals.unknown.carbs > 0 ? '≥ ' : ''}
              {netLimit !== null
                ? t('targets.diet.netCarbsLimit', { value: formatNumber(net, 0), limit: formatNumber(netLimit, 0) })
                : t('targets.diet.netCarbsValue', { value: formatNumber(net, 0) })}
            </ThemedText>
          </View>
          {netLimit !== null ? <MeterBar progress={netLimit > 0 ? net / netLimit : 0} color={data} trackColor={theme.backgroundSelected} height={6} /> : null}
          <ThemedText type="small" themeColor="textSecondary" style={styles.small}>
            {t('targets.diet.netCarbsShort')}
          </ThemedText>
        </View>
      ) : null}

      {targets.pinned.map((key) => (
        <TargetMicroBar
          key={key}
          name={t(`micros.${key}`)}
          value={micros[key] ?? null}
          unit={MICRO_UNITS[key]}
          limits={targets.refs[key]}
          onPress={() => router.push({ pathname: '/nutrition/nutrient', params: { key, day } })}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Unter der Makro-Leiste der Lichtbühne: durch eine Haarlinie abgesetzt, ohne eigenen Kasten.
  box: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two, gap: Spacing.two },
  block: { gap: Spacing.one + 2, paddingVertical: Spacing.one },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
  num: { fontVariant: ['tabular-nums'] },
  small: { fontSize: 12, lineHeight: 16 },
});
