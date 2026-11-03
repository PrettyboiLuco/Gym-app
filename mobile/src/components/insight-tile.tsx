// Kacheln der Einblicke (W9): Kennzahl mit kleinem Verlauf (Linie, Säulen oder Ampel-Punkte) und die Datenfarbe.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';
import { approxLength, monotonePath, type XY } from '@/components/chart-path';
import { PressableScale } from '@/components/pressable-scale';
import { levelColor } from '@/components/readiness';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/constants/motion';
import { DisplayFont, Radius, Spacing } from '@/constants/theme';
import type { Level } from '@/domain/readiness';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCountUp } from '@/hooks/use-count-up';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Datenfarbe (Review O2): Lime auf Fortschritt, Verläufen und erreichten Zielen – dunkel theme.accent, hell das dunklere
 * Grün (Lime auf Weiß hätte unter 3:1 Kontrast). Knöpfe bleiben weiß bzw. schwarz.
 */
export function useDataColor() {
  const theme = useTheme();
  return useColorScheme() === 'dark' ? theme.accent : theme.tint;
}

const SPARK_HEIGHT = 34;
const DRAW_MS = 600;

/**
 * Kleiner Verlauf ohne Achsen: Linie durch die Tage mit Wert (Lücken werden überbrückt), der letzte Wert als Punkt.
 * `bars`: Säulen je Abschnitt (z. B. Trainingstage je Woche). Zeichnet sich beim Erscheinen einmal ein (600 ms) –
 * bei „Bewegung reduzieren“ steht er sofort.
 */
export function InsightSparkline({ values, bars = false, color }: { values: (number | null)[]; bars?: boolean; color: string }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const draw = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (width > 0) draw.set(reduced ? 1 : withDelay(120, withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.cubic) })));
  }, [draw, reduced, width]);

  const present = values.map((v, i) => (v === null ? null : ([i, v] as const))).filter((p): p is readonly [number, number] => p !== null);
  const nums = present.map((p) => p[1]);
  const lo = bars ? 0 : Math.min(...nums);
  const hi = Math.max(...nums, bars ? 1 : -Infinity);
  const span = hi - lo || 1;
  const pad = 4;
  const x = (i: number) => (values.length <= 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (values.length - 1));
  const y = (v: number) => (hi === lo && !bars ? SPARK_HEIGHT / 2 : pad + (1 - (v - lo) / span) * (SPARK_HEIGHT - 2 * pad));
  const points: XY[] = present.map(([i, v]) => [x(i), y(v)]);
  const length = approxLength(points);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));

  return (
    <View style={styles.spark} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...HIDDEN}>
      {width > 0 && present.length > 0 ? (
        <Svg width={width} height={SPARK_HEIGHT}>
          {bars
            ? values.map((v, i) => {
                const slot = (width - 2 * pad) / values.length;
                const h = v ? Math.max(3, ((SPARK_HEIGHT - 2 * pad) * v) / hi) : 2;
                return (
                  <Rect
                    key={i}
                    x={pad + i * slot + slot * 0.18}
                    y={SPARK_HEIGHT - pad - h}
                    width={slot * 0.64}
                    height={h}
                    rx={2}
                    fill={v ? color : theme.backgroundSelected}
                    opacity={i === values.length - 1 ? 1 : 0.55}
                  />
                );
              })
            : null}
          {!bars && points.length > 1 ? (
            <AnimatedPath
              d={monotonePath(points)}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${length} ${length}`}
              animatedProps={lineProps}
            />
          ) : null}
          {!bars ? <Circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={3} fill={color} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}

/** Ampel je Tag als Punktreihe (Bereitschaft); ohne Ampel ein grauer Punkt. Farben wie im Raster der Bereitschaft. */
export function InsightLevels({ levels }: { levels: (Level | null)[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.spark, styles.levels]} {...HIDDEN}>
      {levels.map((l, i) => (
        <View key={i} style={[styles.level, { backgroundColor: l ? levelColor(l, theme) : theme.backgroundSelected }]} />
      ))}
    </View>
  );
}

export type InsightTileData = {
  key: string;
  label: string;
  /** Angezeigter Wert; null = Strich (noch zu wenig Daten). */
  value: string | null;
  unit?: string;
  sub?: string | null;
  accessibilityLabel: string;
  /** Zahl zählt beim Öffnen hoch (N1); `format` macht daraus den angezeigten Wert. */
  count?: { to: number; format: (value: number) => string };
  spark?: { values: (number | null)[]; bars?: boolean };
  levels?: (Level | null)[];
  onPress?: () => void;
};

/** Raster der gewählten Kacheln, zwei Spalten. */
export function InsightGrid({ tiles }: { tiles: InsightTileData[] }) {
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <InsightTileCard key={tile.key} tile={tile} />
      ))}
    </View>
  );
}

function InsightTileCard({ tile }: { tile: InsightTileData }) {
  const theme = useTheme();
  const color = useDataColor();
  const counted = useCountUp(tile.count?.to ?? 0, !!tile.count);
  const shown = tile.count ? tile.count.format(counted) : tile.value;
  const body = (
    <>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {tile.label}
      </ThemedText>
      <View style={styles.valueRow}>
        {tile.value === null ? (
          <ThemedText themeColor="textSecondary" style={styles.value}>
            –
          </ThemedText>
        ) : (
          <>
            <ThemedText style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
              {shown}
            </ThemedText>
            {tile.unit ? (
              <ThemedText type="small" themeColor="textSecondary">
                {tile.unit}
              </ThemedText>
            ) : null}
          </>
        )}
      </View>
      {tile.sub ? (
        <ThemedText themeColor="textSecondary" style={styles.sub} numberOfLines={2}>
          {tile.sub}
        </ThemedText>
      ) : null}
      {tile.levels ? <InsightLevels levels={tile.levels} /> : tile.spark ? <InsightSparkline values={tile.spark.values} bars={tile.spark.bars} color={color} /> : null}
    </>
  );
  const surface = { backgroundColor: theme.backgroundSelected };
  return tile.onPress ? (
    <PressableScale
      scaleTo={Press.button}
      wrapStyle={styles.cell}
      accessibilityRole="button"
      accessibilityLabel={tile.accessibilityLabel}
      onPress={tile.onPress}
      style={({ pressed }) => [styles.tile, surface, pressed && { backgroundColor: theme.border }]}>
      {body}
    </PressableScale>
  ) : (
    <View style={[styles.cell, styles.tile, surface]} accessible accessibilityLabel={tile.accessibilityLabel}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cell: { width: '48.5%', flexGrow: 1 },
  tile: { borderRadius: Radius.field + 4, padding: Spacing.three - 2, gap: Spacing.half, minHeight: 132 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  value: { fontFamily: DisplayFont.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontVariant: ['tabular-nums'], flexShrink: 1 },
  sub: { fontSize: 12, lineHeight: 16 },
  spark: { height: SPARK_HEIGHT, marginTop: 'auto', paddingTop: Spacing.one },
  levels: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingBottom: 6 },
  level: { flex: 1, height: 8, borderRadius: 4 },
});
