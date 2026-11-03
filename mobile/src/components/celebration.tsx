// Bestleistungs-Feier (N6): Medaille, die sich einmal dreht, und ein kurzer Partikel-Burst – nur Reanimated, ohne Zusatzpakete.
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';

import { HIDDEN } from '@/components/a11y';
import { Icon } from '@/components/icon';
import { burstParticles, type Particle } from '@/components/set-table-logic';
import { RecordBurst } from '@/constants/motion';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

const PARTICLES = burstParticles(RecordBurst.particles, RecordBurst.distance);

/**
 * Medaille neben „Neue Bestleistungen“: Lime-Kreis mit Stern (Lime = Erfolg/Daten). Erscheint die Karte, dreht sich die
 * Medaille einmal um ihre Hochachse und ein Kranz kleiner Punkte stiebt auseinander und verblasst (unter einer Sekunde,
 * passend zum Bestleistungs-Signal haptic.record). Einmalig – kein Dauerglitzern. Bei „Bewegung reduzieren“ nur die Medaille.
 */
export function RecordMedal({ delayMs = 0, size = 36 }: { delayMs?: number; size?: number }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);
  const burst = useSharedValue(0);
  const fill = dark ? theme.accent : theme.tint;
  const mark = dark ? theme.onAccent : theme.onTint;

  useEffect(() => {
    if (reduced) return;
    const delay = delayMs + RecordBurst.delayMs;
    spin.set(withDelay(delay, withTiming(1, { duration: RecordBurst.spinMs, easing: Easing.out(Easing.cubic) })));
    burst.set(withDelay(delay, withTiming(1, { duration: RecordBurst.durationMs, easing: Easing.out(Easing.quad) })));
  }, [reduced, delayMs, spin, burst]);

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 400 }, { rotateY: `${spin.value * 360}deg` }, { scale: 1 + 0.18 * Math.sin(spin.value * Math.PI) }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]} {...HIDDEN}>
      {reduced ? null : PARTICLES.map((p, i) => <Spark key={i} particle={p} progress={burst} color={p.lime ? fill : theme.text} />)}
      <Animated.View style={[styles.medal, { width: size, height: size, borderRadius: size / 2, backgroundColor: fill }, medalStyle]}>
        <Icon name="star" color={mark} size={size * 0.55} strokeWidth={2.2} />
      </Animated.View>
    </View>
  );
}

/** Ein Punkt des Bursts: fliegt vom Mittelpunkt nach außen, wird kleiner und verblasst; leicht versetzt gestartet. */
function Spark({ particle, progress, color }: { particle: Particle; progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const start = particle.delayMs / RecordBurst.durationMs;
    const t = Math.min(1, Math.max(0, (progress.value - start) / (1 - start)));
    return {
      opacity: t > 0 && t < 1 ? 1 - t * t : 0,
      transform: [{ translateX: particle.dx * t }, { translateY: particle.dy * t }, { scale: 1 - 0.5 * t }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.spark,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: color,
          marginLeft: -particle.size / 2,
          marginTop: -particle.size / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  medal: { alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', left: '50%', top: '50%' },
});
