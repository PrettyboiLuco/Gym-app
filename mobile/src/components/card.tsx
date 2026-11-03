import type { ReactNode } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View, type GestureResponderEvent, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '@/components/haptics';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { useOnce } from '@/hooks/use-once';
import { useTheme } from '@/hooks/use-theme';

/**
 * Karte: hebt sich nur durch Helligkeit vom Grund ab (hell mit 1-px-Kante). Optional ein Titel und rechts
 * daneben eine kleine Aktion oder Angabe (`trailing`, z. B. „Alle anzeigen“ oder der Zeitraum).
 */
export function Card({ title, trailing, children }: { title?: string; trailing?: ReactNode; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      {title ? (
        <View style={styles.head}>
          <ThemedText style={styles.title} accessibilityRole="header">
            {title}
          </ThemedText>
          {trailing}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/**
 * Knopf als Pille.
 * - variant: primary = gefüllt (dunkel weiß, hell schwarz) · secondary = Rahmen · quiet = nur Schrift · danger = roter Rahmen ·
 *   destructive = rot gefüllt
 * - disabled: ruhige graue Fläche mit lesbarer grauer Schrift (statt eines blassen, unlesbaren Knopfs)
 * - size: regular (48 px) · compact (40 px, für Zeilen)
 * - icon: kleines Symbol vor der Beschriftung · loading: Drehkreis statt Beschriftung, nicht drückbar
 * Beim Drücken federt die Pille fest ein und springt beim Loslassen mit leichtem Überschwingen zurück (Press) – dazu
 * eine leichte spürbare Rückmeldung.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'regular',
  icon,
  loading = false,
  ...props
}: PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'destructive';
  size?: 'regular' | 'compact';
  icon?: ReactNode;
  loading?: boolean;
}) {
  const theme = useTheme();
  const off = props.disabled === true && !loading;
  const looks = {
    primary: { background: theme.primary, border: theme.primary, color: theme.onPrimary },
    secondary: { background: 'transparent', border: theme.border, color: theme.text },
    quiet: { background: 'transparent', border: 'transparent', color: theme.textSecondary },
    danger: { background: 'transparent', border: theme.danger, color: theme.danger },
    destructive: { background: theme.danger, border: theme.danger, color: theme.onDanger },
  };
  const look =
    off && variant !== 'quiet' ? { background: theme.backgroundSelected, border: theme.backgroundSelected, color: theme.textSecondary } : looks[variant];
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const disabled = props.disabled || loading;
  const press = useOnce(props.onPress ?? undefined);
  const pressIn = (e: GestureResponderEvent) => {
    if (!reduced) scale.set(withSpring(Press.button, Press.in));
    props.onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    if (!reduced) scale.set(withSpring(1, Press.out));
    props.onPressOut?.(e);
  };
  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, busy: loading }}
        style={({ pressed }) => [
          styles.button,
          size === 'compact' && styles.compact,
          variant === 'quiet' && styles.quiet,
          { backgroundColor: look.background, borderColor: look.border, opacity: pressed ? 0.85 : off && variant === 'quiet' ? 0.5 : 1 },
        ]}
        {...props}
        disabled={disabled}
        onPress={(e) => {
          // Ein Knopf schließt die Eingabe ab (z. B. „Speichern“ nach dem Gewicht): Tastatur zu.
          Keyboard.dismiss();
          if (variant === 'destructive') haptic.warning();
          else haptic.tap();
          press(e);
        }}
        onPressIn={pressIn}
        onPressOut={pressOut}>
        {loading ? (
          <ActivityIndicator color={look.color} />
        ) : (
          <View style={styles.content}>
            {icon}
            <ThemedText type="smallBold" style={{ color: look.color }}>
              {label}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  title: { fontSize: 16, lineHeight: 22, fontWeight: 600, flexShrink: 1 },
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
  compact: { minHeight: 40, minWidth: 40, paddingHorizontal: Spacing.three },
  /** Nur Schrift: bündig mit dem Text darüber, die Fläche zum Antippen bleibt 40–48 px hoch. */
  quiet: { paddingHorizontal: 0, alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
