import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {title ? <ThemedText type="smallBold">{title}</ThemedText> : null}
      {children}
    </ThemedView>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: look.background, borderColor: look.border, opacity: pressed ? 0.7 : props.disabled ? 0.4 : 1 },
      ]}
      {...props}>
      <ThemedText type="smallBold" style={{ color: look.color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three + Spacing.one,
    borderRadius: Radius.card,
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
