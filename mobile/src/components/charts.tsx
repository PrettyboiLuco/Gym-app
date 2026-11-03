import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { HIDDEN_FROM_A11Y } from '@/components/a11y-hidden';
import { Spring } from '@/constants/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Wert auf 0…1 begrenzen; über dem Ziel bleibt der Ring voll (die Zahl daneben sagt, wie viel darüber). */
const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0);

/**
 * Fortschrittsring (Pause). Steht beim Öffnen sofort auf seinem Wert (keine Eingangs-Animation,
 * taste-skill: Bewegung ist auf App-Bildschirmen nur Rückmeldung) und federt, wenn sich der Wert ändert.
 */
export function ProgressRing({
  progress,
  size = 112,
  stroke = 10,
  color,
  trackColor,
  follow = 'spring',
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  trackColor: string;
  /** spring = federt auf neue Werte · tick = Wert ändert sich jede Sekunde (Pausen-Timer), Ring läuft gleichmäßig weiter. */
  follow?: 'spring' | 'tick';
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = clamp01(progress);
  const value = useSharedValue(target);

  useEffect(() => {
    if (reduced) value.value = target;
    else if (follow === 'tick') value.value = withTiming(target, { duration: 1000, easing: Easing.linear });
    else value.value = withSpring(target, Spring);
  }, [follow, reduced, target, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - Math.min(Math.max(value.value, 0), 1)),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} {...HIDDEN_FROM_A11Y}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

/** Waagrechter Balken (Kalorien, Makros, Trinken): Füllung = echter Anteil, über 100 % voll. Federt nur bei Änderungen. */
export function MeterBar({ progress, color, trackColor, height = 8 }: { progress: number; color: string; trackColor: string; height?: number }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const target = clamp01(progress);
  const value = useSharedValue(target);

  useEffect(() => {
    value.value = reduced ? target : withSpring(target, Spring);
  }, [reduced, target, value]);

  const fill = useAnimatedStyle(() => ({ width: Math.max(Math.min(value.value, 1), 0) * width }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}
      {...HIDDEN_FROM_A11Y}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  track: { width: '100%', overflow: 'hidden' },
});
