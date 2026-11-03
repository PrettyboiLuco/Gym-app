import { useEffect, useRef } from 'react';
import { Keyboard, Pressable, StyleSheet, type PressableProps } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { haptic } from '@/components/haptics';
import { Spring } from '@/constants/motion';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnce } from '@/hooks/use-once';
import { useTheme } from '@/hooks/use-theme';

/**
 * Runder Haken für einen Satz. Offen: Ring mit blassem Haken. Erledigt: gefüllt (Lime, hell dunkles Grün),
 * der Haken federt auf (kurz über 1, dann 1) – Rückmeldung, kein Auftritt. Erneut tippen = rückgängig.
 */
export function SetCheck({
  done,
  onPress,
  accessibilityLabel,
  disabled,
  accessibilityActions,
  onAccessibilityAction,
}: {
  done: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  /** Weitere Aktionen für VoiceOver (z. B. „Satz entfernen“, das sonst nur per Wischen geht). */
  accessibilityActions?: PressableProps['accessibilityActions'];
  onAccessibilityAction?: PressableProps['onAccessibilityAction'];
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const press = useOnce(onPress);
  const fill = dark ? theme.accent : theme.tint;
  const mark = dark ? theme.onAccent : theme.onTint;

  // U5: Beim Abhaken ein Lime-Ring, der sich einmal ausdehnt und verblasst – Rückmeldung, kein Glühen.
  // Nur beim Wechsel offen → erledigt; schon erledigte Sätze (Training wieder öffnen, Übung aufklappen) bleiben ruhig.
  const ring = useSharedValue(0);
  const wasDone = useRef(done);
  useEffect(() => {
    const justDone = done && !wasDone.current;
    wasDone.current = done;
    if (justDone && !reduced) {
      scale.set(withSequence(withSpring(1.18, { ...Spring, stiffness: 420 }), withSpring(1, Spring)));
      ring.set(0);
      ring.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    }
  }, [done, reduced, scale, ring]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value > 0 && ring.value < 1 ? 0.6 * (1 - ring.value) : 0,
    transform: [{ scale: 1 + ring.value * 0.6 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: done, disabled }}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      disabled={disabled}
      hitSlop={6}
      onPressIn={() => {
        if (!done) scale.set(withSpring(0.9, Spring));
      }}
      onPressOut={() => {
        if (!done) scale.set(withSpring(1, Spring));
      }}
      onPress={() => {
        // Satz abgehakt: Zahlenfeld schließen, die Pause erscheint im Vollbild.
        Keyboard.dismiss();
        if (done) haptic.tap();
        else haptic.press();
        press();
      }}>
      <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: fill }, ringStyle]} />
      <Animated.View
        style={[
          styles.circle,
          done ? { backgroundColor: fill, borderColor: fill } : { borderColor: theme.border, backgroundColor: 'transparent' },
          disabled && styles.disabled,
          style,
        ]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path
            d="M5 12.5 10 17.5 19 7"
            stroke={done ? mark : theme.textSecondary}
            strokeOpacity={done ? 1 : 0.45}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  ring: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, opacity: 0 },
});
