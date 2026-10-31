import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Durations } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import type { WeightUnit } from '@/domain/units';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatWeight, t } from '@/i18n';

const HEIGHT = 140;
const PAD = 8;

/**
 * Gewichtsverlauf: Punkte = Messungen, Linie mit Fläche = 7-Tage-Durchschnitt, letzter Wert hervorgehoben.
 * Beim Öffnen wird der Verlauf von links nach rechts aufgedeckt (bei „Bewegung reduzieren“ sofort sichtbar).
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
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const reveal = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced || width === 0) return;
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: Durations.slow + 200, easing: Easing.out(Easing.cubic) });
  }, [reduced, reveal, width, points.length]);

  const mask = useAnimatedStyle(() => ({ width: reveal.value * width }));

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
  const line = smoothPath(trendXY);
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
        <Animated.View style={[styles.mask, mask]}>
          {width > 0 ? (
            <Svg width={width} height={HEIGHT}>
              <Defs>
                <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.accent} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {grid.map((gy) => (
                <Line key={gy} x1={0} x2={width} y1={gy} y2={gy} stroke={theme.border} strokeWidth={1} strokeDasharray="3 5" />
              ))}
              {area ? <Path d={area} fill="url(#weightArea)" /> : null}
              {line ? <Path d={line} stroke={theme.tint} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
              {points.map((p) => (
                <Circle key={p.day} cx={x(p.day)} cy={y(p.kg)} r={2.5} fill={theme.textSecondary} />
              ))}
              <Circle cx={x(last.day)} cy={y(last.kg)} r={6} fill={theme.backgroundElement} stroke={theme.tint} strokeWidth={2.5} />
            </Svg>
          ) : null}
        </Animated.View>
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

/** Weiche Linie durch die Punkte (Catmull-Rom als Bézier), ohne über die Punkte hinauszuschießen. */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const k = 1 / 6;
    const c1y = clampBetween(p1[1] + (p2[1] - p0[1]) * k, p1[1], p2[1]);
    const c2y = clampBetween(p2[1] - (p3[1] - p1[1]) * k, p1[1], p2[1]);
    d += ` C${p1[0] + (p2[0] - p0[0]) * k} ${c1y} ${p2[0] - (p3[0] - p1[0]) * k} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function clampBetween(v: number, a: number, b: number) {
  return Math.min(Math.max(v, Math.min(a, b)), Math.max(a, b));
}

const styles = StyleSheet.create({
  plot: { height: HEIGHT, width: '100%' },
  mask: { height: HEIGHT, overflow: 'hidden' },
  labels: { paddingVertical: Spacing.half, flexDirection: 'row', justifyContent: 'space-between' },
});
