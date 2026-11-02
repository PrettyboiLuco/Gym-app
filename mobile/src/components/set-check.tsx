import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
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
}: {
  done: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const press = useOnce(onPress);
  const fill = dark ? theme.accent : theme.tint;
  const mark = dark ? theme.onAccent : theme.onTint;

  useEffect(() => {
    if (done && !reduced) scale.set(withSequence(withSpring(1.18, { ...Spring, stiffness: 420 }), withSpring(1, Spring)));
  }, [done, reduced, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: done, disabled }}
      disabled={disabled}
      hitSlop={6}
      onPressIn={() => {
        if (!done) scale.set(withSpring(0.9, Spring));
      }}
      onPressOut={() => {
        if (!done) scale.set(withSpring(1, Spring));
      }}
      onPress={() => {
        if (done) haptic.tap();
        else haptic.press();
        press();
      }}>
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
});
