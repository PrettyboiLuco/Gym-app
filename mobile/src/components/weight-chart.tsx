import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { WeightUnit } from '@/domain/units';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatWeight, t } from '@/i18n';

const HEIGHT = 140;
const PAD = 8;

/**
 * Gewichtsverlauf: Punkte = Messungen, Linie = 7-Tage-Durchschnitt (gerade Abschnitte – eine geglättete
 * Kurve würde Werte zwischen den Tagen erfinden), schwache Fläche darunter, letzter Wert hervorgehoben.
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
  const [width, setWidth] = useState(0);

  if (points.length < 2) return null;
  const values = [...points, ...trend].map((p) => p.kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.5);
  const index = new Map(days.map((d, i) => [d, i]));
  const step = days.length > 1 ? (width - PAD * 2) / (days.length - 1) : 0;
  const x = (day: string) => PAD + (index.get(day) ?? 0) * step;
  const y = (kg: number) => PAD + (1 - (kg - min) / span) * (HEIGHT - PAD * 2);

  const trendXY = trend.filter((p) => index.has(p.day)).map((p) => [x(p.day), y(p.kg)] as const);
  const line = trendXY.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px} ${py}`).join(' ');
  const area = trendXY.length > 1 ? `${line} L${trendXY.at(-1)![0]} ${HEIGHT} L${trendXY[0][0]} ${HEIGHT} Z` : '';
  const last = points.at(-1)!;
  const grid = [0.25, 0.5, 0.75].map((f) => PAD + f * (HEIGHT - PAD * 2));

  return (
    <View
      accessible
      accessibilityLabel={t('progress.chartLabel', { min: formatWeight(min, unit), max: formatWeight(max, unit) })}>
      <View style={styles.labels}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatWeight(max, unit)}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.tint }}>
          {formatWeight(last.kg, unit)}
        </ThemedText>
      </View>
      <View style={styles.plot} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={styles.mask}>
          {width > 0 ? (
            <Svg width={width} height={HEIGHT}>
              <Defs>
                <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.accent} stopOpacity={0.14} />
                  <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {grid.map((gy) => (
                <Line key={gy} x1={0} x2={width} y1={gy} y2={gy} stroke={theme.backgroundSelected} strokeWidth={1} strokeDasharray="3 3" />
              ))}
              {area ? <Path d={area} fill="url(#weightArea)" /> : null}
              {line ? <Path d={line} stroke={theme.tint} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
              {points.map((p) => (
                <Circle key={p.day} cx={x(p.day)} cy={y(p.kg)} r={2.5} fill={theme.textSecondary} />
              ))}
              <Circle cx={x(last.day)} cy={y(last.kg)} r={6} fill={theme.backgroundElement} stroke={theme.tint} strokeWidth={2.5} />
            </Svg>
          ) : null}
        </View>
      </View>
      <View style={styles.labels}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatWeight(min, unit)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDay(days[0])} – {formatDay(days.at(-1)!)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { height: HEIGHT, width: '100%' },
  mask: { height: HEIGHT, overflow: 'hidden' },
  labels: { paddingVertical: Spacing.half, flexDirection: 'row', justifyContent: 'space-between' },
});
