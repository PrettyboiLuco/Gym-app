import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Mask, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';
import { approxLength, axisTicks, monotonePath, nearestIndex, type XY } from '@/components/chart-path';
import { haptic } from '@/components/haptics';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const SVG_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, sans-serif' : undefined;

export type ChartPoint = { x: number; value: number; label: string };

const LANE = 34; // rechts: Achsenwerte
const TOP = 14;
const EDGE = 8;
const FADE_IN = 64;
const BOTTOM = 10;
// Choreografie nach getlayers.ai Vorlage „Relay“ (Sparkline im Abschnitt Proof): Linie zeichnet sich in 720 ms
// (ease-in-out cubic), die Fläche blendet ab einem Drittel davon in 480 ms ein (ease-out), dann landet der „Jetzt“-Punkt
// (96 ms) samt senkrechter Leuchtlinie, und ein Ring pulsiert um ihn (560 ms, hier ruhig wiederholt alle 2,4 s).
// Die Web-Bibliothek dort (react-spring) läuft nicht in React Native – Zeiten und Kurven sind 1:1 auf Reanimated übertragen.
const DRAW_MS = 720;
const AREA_AT = DRAW_MS / 3;
const AREA_MS = 480;
const DOT_MS = 96;
const PULSE_MS = 560;
const PULSE_EVERY = 2400;

/**
 * Verlaufsdiagramm mit weicher Kurve (ohne Überschwingen), heller Fläche darunter und Messpunkten:
 * - Beim Öffnen und bei jedem Wechsel des Zeitraums zeichnet sich die Kurve von links nach rechts ein; die Linie läuft
 *   von gedämpft (früher) zu voller Datenfarbe (jetzt), darunter blendet eine auslaufende Fläche ein, am Ende landet der
 *   „Jetzt“-Punkt mit Leuchtlinie und einem ruhig pulsierenden Ring (getlayers „Relay“, Sparkline).
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
  const fill = useSharedValue(reduced ? 1 : 0);
  const dot = useSharedValue(reduced ? 1 : 0);
  const pulse = useSharedValue(0);

  const values = [...line, ...dots].map((p) => p.value).concat(reference ? [reference.value] : []);
  const ticks = values.length ? axisTicks(Math.min(...values), Math.max(...values)) : [];
  const lo = ticks[0] ?? 0;
  const hi = ticks[ticks.length - 1] ?? 1;
  const plotW = Math.max(width - LANE, 1);
  // Links und rechts je 8 px Luft, damit Punkte und der „Jetzt“-Ring am Rand nicht abgeschnitten werden.
  const x = (v: number) => EDGE + ((v - domain[0]) / Math.max(domain[1] - domain[0], 1)) * (plotW - 2 * EDGE);
  const y = (v: number) => TOP + (1 - (v - lo) / Math.max(hi - lo, 1e-9)) * (height - TOP - BOTTOM);

  const pts: XY[] = line.map((p) => [x(p.x), y(p.value)]);
  const path = monotonePath(pts);
  const length = approxLength(pts);
  const area = pts.length > 1 ? `${path} L${pts[pts.length - 1][0]} ${height - BOTTOM} L${pts[0][0]} ${height - BOTTOM} Z` : '';
  const last = pts[pts.length - 1];
  const rawPath = dots.length > 1 ? dots.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ') : '';
  const areaStart = pts[0]?.[0] ?? 0;

  useEffect(() => {
    if (reduced || width === 0) {
      draw.set(1);
      fill.set(1);
      dot.set(1);
      return;
    }
    const jump = { duration: 0 };
    const start = 80;
    // Startwert jeweils als eigener Schritt (direktes Setzen kurz vor einer Animation geht im Web verloren).
    draw.set(withTimingFrom(0, withDelay(start, withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.cubic) })), jump));
    fill.set(withTimingFrom(0, withDelay(start + AREA_AT, withTiming(1, { duration: AREA_MS, easing: Easing.out(Easing.cubic) })), jump));
    dot.set(withTimingFrom(0, withDelay(start + DRAW_MS, withTiming(1, { duration: DOT_MS })), jump));
    pulse.set(
      withTimingFrom(
        0,
        withDelay(
          start + DRAW_MS,
          withRepeat(
            withSequence(
              withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.cubic) }),
              withTiming(1, { duration: PULSE_EVERY - PULSE_MS }),
              withTiming(0, jump)
            ),
            -1
          )
        ),
        jump
      )
    );
    return () => cancelAnimation(pulse);
  }, [animationKey, draw, fill, dot, pulse, reduced, width]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));
  const glowProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));
  const glowWideProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));
  const areaProps = useAnimatedProps(() => ({ opacity: fill.value }));
  const dotsProps = useAnimatedProps(() => ({ opacity: fill.value }));
  const nowProps = useAnimatedProps(() => ({ opacity: dot.value }));
  const nowDotProps = useAnimatedProps(() => ({ r: 4.5 * dot.value }));
  const haloProps = useAnimatedProps(() => ({ r: 4.5 + 10 * pulse.value, opacity: dot.value * 0.8 * (1 - pulse.value) }));

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
            <Defs>
              {/* Fläche: Datenfarbe oben kräftig, nach unten auslaufend; links blendet sie über eine Maske weich ein. */}
              <LinearGradient id="chartArea" x1="0" y1={TOP} x2="0" y2={height - BOTTOM} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={color} stopOpacity={0.34} />
                <Stop offset="0.55" stopColor={color} stopOpacity={0.1} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id="chartFadeIn" x1={areaStart} y1="0" x2={areaStart + FADE_IN} y2="0" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={1} />
              </LinearGradient>
              <Mask id="chartMask" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
                <Rect x="0" y="0" width={width} height={height} fill="url(#chartFadeIn)" />
              </Mask>
              {/* Linie: früher gedämpft, zur Gegenwart volle Farbe. */}
              <LinearGradient id="chartLine" x1={areaStart} y1="0" x2={plotW} y2="0" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={color} stopOpacity={0.3} />
                <Stop offset="0.5" stopColor={color} stopOpacity={1} />
              </LinearGradient>
              <LinearGradient id="chartNow" x1="0" y1={TOP} x2="0" y2={height - BOTTOM} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={color} stopOpacity={0.8} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {ticks.map((tv) => (
              <Line key={`g${tv}`} x1={0} x2={plotW} y1={y(tv)} y2={y(tv)} stroke={theme.text} strokeOpacity={0.07} strokeWidth={1} />
            ))}
            {ticks.map((tv) => (
              <SvgText key={`t${tv}`} x={width - 2} y={y(tv) + 3.5} fontSize={10} fontFamily={SVG_FONT} fill={theme.textSecondary} textAnchor="end">
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
                  strokeOpacity={0.45}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                />
                <SvgText x={4} y={y(reference.value) - 6} fontSize={10} fontFamily={SVG_FONT} fill={theme.textSecondary}>
                  {reference.label}
                </SvgText>
              </>
            ) : null}
            {area ? <AnimatedPath d={area} fill="url(#chartArea)" mask="url(#chartMask)" animatedProps={areaProps} /> : null}
            {/* Tageswerte: feine, gedämpfte Zickzack-Linie mit hohlen Punkten – die Schwankung, über der der Trend liegt. */}
            <AnimatedG animatedProps={dotsProps}>
              {rawPath ? <Path d={rawPath} stroke={theme.textSecondary} strokeOpacity={0.22} strokeWidth={1} fill="none" strokeLinejoin="round" /> : null}
              {dots.map((p) => (
                <Circle
                  key={`d${p.x}`}
                  cx={x(p.x)}
                  cy={y(p.value)}
                  r={2.3}
                  fill={theme.backgroundElement}
                  stroke={theme.textSecondary}
                  strokeOpacity={0.7}
                  strokeWidth={1.2}
                />
              ))}
            </AnimatedG>
            {last && !sel ? (
              <AnimatedLine x1={last[0]} x2={last[0]} y1={last[1]} y2={height - BOTTOM} stroke="url(#chartNow)" strokeWidth={1.5} animatedProps={nowProps} />
            ) : null}
            {path ? (
              <>
                {/* Weicher Lichtschein unter der Trendlinie: zwei breite, sehr transparente Lagen statt eines Streifens. */}
                <AnimatedPath
                  d={path}
                  stroke={color}
                  strokeOpacity={0.05}
                  strokeWidth={14}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={`${length} ${length}`}
                  animatedProps={glowWideProps}
                />
                <AnimatedPath
                  d={path}
                  stroke={color}
                  strokeOpacity={0.1}
                  strokeWidth={7}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={`${length} ${length}`}
                  animatedProps={glowProps}
                />
                <AnimatedPath
                  d={path}
                  stroke="url(#chartLine)"
                  strokeWidth={3.5}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={`${length} ${length}`}
                  animatedProps={lineProps}
                />
              </>
            ) : null}
            {last && !sel ? (
              <>
                <AnimatedCircle cx={last[0]} cy={last[1]} fill="none" stroke={color} strokeWidth={1.5} animatedProps={haloProps} />
                <AnimatedCircle cx={last[0]} cy={last[1]} fill={color} stroke={theme.backgroundElement} strokeWidth={2.5} animatedProps={nowDotProps} />
              </>
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

/** Erst sofort auf `from` springen, dann die eigentliche Animation – als eine Folge, damit es auch im Web greift. */
function withTimingFrom(from: number, then: number, jump: { duration: number }): number {
  'worklet';
  return withSequence(withTiming(from, jump), then);
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayText: { fontSize: 12, lineHeight: 16 },
  tip: { position: 'absolute', borderRadius: Radius.field, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2, alignItems: 'center' },
  tipValue: { fontWeight: 700, fontVariant: ['tabular-nums'] },
});
