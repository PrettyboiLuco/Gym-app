import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spring } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      {title ? <ThemedText style={styles.title}>{title}</ThemedText> : null}
      {children}
    </View>
  );
}

export function Button({
  label,
  variant = 'primary',
  ...props
}: PressableProps & {
  label: string;
  /** primary = gefüllte Pille · secondary = Rahmen · danger = Rahmen in Rot · destructive = rot gefüllt (Löschen bestätigen) */
  variant?: 'primary' | 'secondary' | 'danger' | 'destructive';
}) {
  const theme = useTheme();
  const look = {
    primary: { background: theme.primary, border: theme.primary, color: theme.onPrimary },
    secondary: { background: 'transparent', border: theme.border, color: theme.text },
    danger: { background: 'transparent', border: theme.danger, color: theme.danger },
    destructive: { background: theme.danger, border: theme.danger, color: theme.onDanger },
  }[variant];
  // Beim Drücken federt die Pille leicht ein (0,96) – fühlt sich an wie ein echter Knopf.
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pressIn = (e: GestureResponderEvent) => {
    scale.set(withSpring(0.96, Spring));
    props.onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    scale.set(withSpring(1, Spring));
    props.onPressOut?.(e);
  };
  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: look.background, borderColor: look.border, opacity: pressed ? 0.85 : props.disabled ? 0.4 : 1 },
        ]}
        {...props}
        onPressIn={pressIn}
        onPressOut={pressOut}>
        <ThemedText type="smallBold" style={{ color: look.color }}>
          {label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, lineHeight: 22, fontWeight: 600 },
  card: {
    padding: Spacing.three + Spacing.one,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.two,
  },
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
