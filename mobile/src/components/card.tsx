import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {title ? <ThemedText type="smallBold">{title}</ThemedText> : null}
      {children}
    </ThemedView>
  );
}

/** Liste geplanter Funktionen mit Hinweis „Kommt bald“. */
export function ComingSoonList({ items, label }: { items: string[]; label: string }) {
  return (
    <Card title={label}>
      {items.map((item) => (
        <ThemedText key={item} themeColor="textSecondary">
          • {item}
        </ThemedText>
      ))}
    </Card>
  );
}

export function Button({
  label,
  variant = 'primary',
  ...props
}: PressableProps & { label: string; variant?: 'primary' | 'danger' }) {
  const theme = useTheme();
  const background = variant === 'primary' ? theme.tint : 'transparent';
  const color = variant === 'primary' ? theme.onTint : theme.danger;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, { backgroundColor: background, opacity: pressed ? 0.7 : 1 }]}
      {...props}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
