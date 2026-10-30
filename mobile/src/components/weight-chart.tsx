import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { WeightUnit } from '@/domain/units';
import { useTheme } from '@/hooks/use-theme';
import { formatWeight, t } from '@/i18n';

const HEIGHT = 96;

/**
 * Einfacher Verlauf: ein Punkt pro Tag mit Messung, die Linie zeigt den 7-Tage-Durchschnitt.
 * Ohne Bibliothek, damit nichts Neues installiert werden muss.
 */
export function WeightChart({
  days,
  points,
  trend,
  unit,
}: {
  /** Alle Tage im Zeitraum, aufsteigend (YYYY-MM-DD). */
  days: string[];
  points: { day: string; kg: number }[];
  trend: { day: string; kg: number }[];
  unit: WeightUnit;
}) {
  const theme = useTheme();
  if (points.length < 2) return null;
  const values = [...points, ...trend].map((p) => p.kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.5);
  const y = (kg: number) => HEIGHT - ((kg - min) / span) * HEIGHT;
  const byDay = new Map(points.map((p) => [p.day, p.kg]));
  const trendByDay = new Map(trend.map((p) => [p.day, p.kg]));

  return (
    <View
      accessible
      accessibilityLabel={t('progress.chartLabel', { min: formatWeight(min, unit), max: formatWeight(max, unit) })}>
      <View style={styles.labels}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatWeight(max, unit)}
        </ThemedText>
      </View>
      <View style={[styles.plot, { borderColor: theme.backgroundSelected }]}>
        {days.map((day) => {
          const kg = byDay.get(day);
          const avg = trendByDay.get(day);
          return (
            <View key={day} style={styles.column}>
              {avg !== undefined ? (
                <View style={[styles.trend, { top: y(avg) - 1, backgroundColor: theme.textSecondary }]} />
              ) : null}
              {kg !== undefined ? <View style={[styles.dot, { top: y(kg) - 3, backgroundColor: theme.tint }]} /> : null}
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatWeight(min, unit)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { height: HEIGHT + 6, flexDirection: 'row', borderBottomWidth: 1, paddingTop: 3 },
  column: { flex: 1, position: 'relative' },
  dot: { position: 'absolute', left: '50%', marginLeft: -3, width: 6, height: 6, borderRadius: 3 },
  trend: { position: 'absolute', left: 0, right: 0, height: 2 },
  labels: { paddingVertical: Spacing.half },
});
