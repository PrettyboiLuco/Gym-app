import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';
import { approxLength, axisTicks, monotonePath, nearestIndex, type XY } from '@/components/chart-path';
import { haptic } from '@/components/haptics';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SVG_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, sans-serif' : undefined;

export type ChartPoint = { x: number; value: number; label: string };

const LANE = 40; // rechts: Achsenwerte
const TOP = 10;
const BOTTOM = 10;
const DRAW_MS = 900;

/**
 * Verlaufsdiagramm mit weicher Kurve (ohne Überschwingen), heller Fläche darunter und Messpunkten:
 * - Beim Öffnen und bei jedem Wechsel des Zeitraums zeichnet sich die Kurve von links nach rechts ein (0,9 s), die
 *   Fläche blendet nach, der letzte Wert erscheint als Ring.
 * - Finger aufs Diagramm (oder Maus ziehen): senkrechte Linie, Punkt und Schild mit Wert und Datum; spürbarer Tick
 *   bei jedem neuen Tag.
 * - `reference`: gestrichelte Linie (z. B. Zielgewicht). Achsenwerte rechts, Datum unten (Anfang, Mitte, Ende).
 * Bei „Bewegung reduzieren“ steht alles sofort.
 */
export function SmoothChart({
  line,
  dots = [],
  domain,
  reference,
  color,
  height = 180,
  format,
  xLabels,
  accessibilityLabel,
  animationKey,
}: {
  /** Kurve (z. B. 7-Tage-Durchschnitt), nach x aufsteigend. */
  line: ChartPoint[];
  /** Einzelne Messungen als kleine Punkte. */
  dots?: ChartPoint[];
  /** Bereich der x-Achse [Anfang, Ende]. */
  domain: [number, number];
  reference?: { value: number; label: string };
  color: string;
  height?: number;
  format: (value: number) => string;
  xLabels: string[];
  accessibilityLabel: string;
  /** Ändert sich der Schlüssel (anderer Zeitraum), zeichnet sich die Kurve neu ein. */
  animationKey?: string;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );
  const draw = useSharedValue(reduced ? 1 : 0);

  const values = [...line, ...dots].map((p) => p.value).concat(reference ? [reference.value] : []);
  const ticks = values.length ? axisTicks(Math.min(...values), Math.max(...values)) : [];
  const lo = ticks[0] ?? 0;
  const hi = ticks[ticks.length - 1] ?? 1;
  const plotW = Math.max(width - LANE, 1);
  const x = (v: number) => ((v - domain[0]) / Math.max(domain[1] - domain[0], 1)) * plotW;
  const y = (v: number) => TOP + (1 - (v - lo) / Math.max(hi - lo, 1e-9)) * (height - TOP - BOTTOM);

  const pts: XY[] = line.map((p) => [x(p.x), y(p.value)]);
  const path = monotonePath(pts);
  const length = approxLength(pts);
  const area = pts.length > 1 ? `${path} L${pts[pts.length - 1][0]} ${height - BOTTOM} L${pts[0][0]} ${height - BOTTOM} Z` : '';
  const last = pts[pts.length - 1];

  useEffect(() => {
    if (reduced || width === 0) {
      draw.set(1);
      return;
    }
    draw.set(0);
    draw.set(withDelay(80, withTiming(1, { duration: DRAW_MS, easing: Easing.out(Easing.cubic) })));
  }, [animationKey, draw, reduced, width]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));
  const areaProps = useAnimatedProps(() => ({ opacity: Math.max(0, (draw.value - 0.35) / 0.65) }));
  const endProps = useAnimatedProps(() => ({ r: draw.value > 0.92 ? 5 * Math.min(1, (draw.value - 0.92) / 0.08) : 0 }));

  // Finger: nächster Punkt der Kurve (oder der Messpunkte, wenn es keine Kurve gibt).
  const pickFrom = line.length ? line : dots;
  const pickXs = pickFrom.map((p) => x(p.x));
  const pick = (e: GestureResponderEvent) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const native = e.nativeEvent as unknown as { locationX?: number; clientX?: number };
    let px = native.locationX ?? 0;
    const target = e.currentTarget as unknown as { getBoundingClientRect?: () => { left: number } };
    if (Platform.OS === 'web' && native.clientX !== undefined && target.getBoundingClientRect) px = native.clientX - target.getBoundingClientRect().left;
    const i = nearestIndex(pickXs, px);
    if (i !== active && i >= 0) {
      haptic.tick();
      setActive(i);
    }
  };
  const sel = active !== null ? pickFrom[active] : null;
  const selX = sel ? x(sel.x) : 0;
  const selY = sel ? y(sel.value) : 0;
  const tipW = 132;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={styles.wrap}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderRelease={() => {
          // Kurzer Tipp: Schild noch kurz stehen lassen, damit man es lesen kann.
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setActive(null), 1500);
        }}
        onResponderTerminate={() => setActive(null)}>
        {width > 0 ? (
          <Svg width={width} height={height} {...HIDDEN}>
            {ticks.map((tv) => (
              <Line key={`g${tv}`} x1={0} x2={plotW} y1={y(tv)} y2={y(tv)} stroke={theme.backgroundSelected} strokeWidth={1} />
            ))}
            {ticks.map((tv) => (
              <SvgText key={`t${tv}`} x={width - 2} y={y(tv) + 4} fontSize={11} fontFamily={SVG_FONT} fill={theme.textSecondary} textAnchor="end">
                {format(tv)}
              </SvgText>
            ))}
            {reference ? (
              <>
                <Line
                  x1={0}
                  x2={plotW}
                  y1={y(reference.value)}
                  y2={y(reference.value)}
                  stroke={theme.text}
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText x={4} y={y(reference.value) - 6} fontSize={11} fontFamily={SVG_FONT} fill={theme.textSecondary}>
                  {reference.label}
                </SvgText>
              </>
            ) : null}
            {area ? <AnimatedPath d={area} fill={color} fillOpacity={0.14} animatedProps={areaProps} /> : null}
            {dots.map((p) => (
              <Circle key={`d${p.x}`} cx={x(p.x)} cy={y(p.value)} r={2.6} fill={theme.textSecondary} />
            ))}
            {path ? (
              <AnimatedPath
                d={path}
                stroke={color}
                strokeWidth={3}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={`${length} ${length}`}
                animatedProps={lineProps}
              />
            ) : null}
            {last && !sel ? (
              <AnimatedCircle cx={last[0]} cy={last[1]} fill={theme.backgroundElement} stroke={color} strokeWidth={3} animatedProps={endProps} />
            ) : null}
            {sel ? (
              <>
                <Line x1={selX} x2={selX} y1={TOP - 6} y2={height - BOTTOM} stroke={theme.textSecondary} strokeWidth={1} strokeDasharray="3 3" />
                <Circle cx={selX} cy={selY} r={9} fill={color} fillOpacity={0.25} />
                <Circle cx={selX} cy={selY} r={5} fill={color} stroke={theme.backgroundElement} strokeWidth={2} />
              </>
            ) : null}
          </Svg>
        ) : null}
        {sel ? (
          <View
            pointerEvents="none"
            style={[
              styles.tip,
              {
                backgroundColor: theme.backgroundSelected,
                left: Math.min(Math.max(selX - tipW / 2, 0), Math.max(plotW - tipW, 0)),
                top: selY < 56 ? selY + 14 : selY - 54,
                width: tipW,
              },
            ]}>
            <ThemedText style={styles.tipValue}>{format(sel.value)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {sel.label}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={[styles.days, { paddingRight: LANE }]}>
        {xLabels.map((l, i) => (
          <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.dayText}>
            {l}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayText: { fontSize: 12, lineHeight: 16 },
  tip: { position: 'absolute', borderRadius: Radius.field, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2, alignItems: 'center' },
  tipValue: { fontWeight: 700, fontVariant: ['tabular-nums'] },
});
