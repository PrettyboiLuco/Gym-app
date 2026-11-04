// Lichtschein „Firmament“ (getlayers firmament-004, hell firmament-018) als SVG-Verlauf, der ruhig atmet.

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';
import { breathPeriodMs, FIRMAMENT_DARK, FIRMAMENT_LIGHT, firmamentStops, glowCenter } from '@/components/firmament';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Ellipse rx 0.9 · Breite, ry 0.75 · Höhe: Die Fläche wird ohne Seitenverhältnis gestreckt (viewBox 100 × 120, r = 90),
 * so ist der Kreis im Verlauf überall – auch im Web – eine Ellipse dieser Größe.
 */
const VIEW_W = 100;
const VIEW_H = 120;
const RADIUS = 90;

/**
 * Lichtschein hinter dem Ring der Tagesübersicht: Licht steigt von unten Mitte auf (Kern knapp unter der Kante), dunkel
 * mit Vignette an den Rändern. Füllt die umgebende Fläche (absolut). Die Deckkraft pendelt ±6 % in ≈ 19 s; bei
 * „Bewegung reduzieren“ steht sie still. Rein dekorativ – für Bildschirmleser unsichtbar.
 */
export function FirmamentGlow({ id }: { id: string }) {
  const dark = useColorScheme() === 'dark';
  const reduced = useReducedMotion();
  const p = dark ? FIRMAMENT_DARK : FIRMAMENT_LIGHT;
  const stops = firmamentStops(p);
  const center = glowCenter(p);
  const breath = useSharedValue(0.5);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(breath);
      breath.set(0.5);
      return;
    }
    // Sinusförmig: aus der Mitte eine Viertelperiode nach oben, dann je halbe Periode hin und her.
    const half = breathPeriodMs(p) / 2;
    breath.set(
      withSequence(
        withTiming(1, { duration: half / 2, easing: Easing.out(Easing.sin) }),
        withRepeat(withTiming(0, { duration: half, easing: Easing.inOut(Easing.sin) }), -1, true)
      )
    );
    return () => cancelAnimation(breath);
  }, [breath, p, reduced]);

  // Mitte 1 − breathe, Ausschlag ±breathe: der Schein wird nie heller als seine CONFIG-Werte.
  const amount = p.breathe;
  const style = useAnimatedStyle(() => ({ opacity: 1 - amount + amount * (2 * breath.value - 1) }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" {...HIDDEN}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none">
          <Defs>
            <RadialGradient id={`${id}-glow`} gradientUnits="userSpaceOnUse" cx={center.cx * VIEW_W} cy={center.cy * VIEW_H} r={RADIUS}>
              {stops.map((s) => (
                <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={`url(#${id}-glow)`} />
        </Svg>
      </Animated.View>
      {p.vignette > 0 ? (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none">
          <Defs>
            <RadialGradient id={`${id}-vignette`} cx="50%" cy="50%" r="72%">
              <Stop offset={0.55} stopColor={p.bgColor} stopOpacity={0} />
              <Stop offset={1} stopColor={p.bgColor} stopOpacity={p.vignette} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={`url(#${id}-vignette)`} />
        </Svg>
      ) : null}
    </View>
  );
}
