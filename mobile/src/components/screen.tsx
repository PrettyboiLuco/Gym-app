import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Grundgerüst jedes Bereichs: sicherer Rand, Titel, scrollbarer Inhalt.
 * Unterseiten mit Navigationsleiste (withHeader) zeigen den Titel oben in der Leiste.
 */
export function Screen({
  title,
  subtitle,
  withHeader = false,
  footer,
  scrollRef,
  children,
}: {
  title?: string;
  subtitle?: string;
  withHeader?: boolean;
  footer?: ReactNode;
  /** Für Bildschirme, die selbst nach oben scrollen müssen (z. B. Formular oben, Liste darunter). */
  scrollRef?: Ref<ScrollViewInstance>;
  children: ReactNode;
}) {
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={withHeader ? ['left', 'right'] : ['top', 'left', 'right']}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          {title && !withHeader ? (
            <ThemedText type="subtitle" accessibilityRole="header">
              {title}
            </ThemedText>
          ) : null}
          {subtitle ? <ThemedText themeColor="textSecondary">{subtitle}</ThemedText> : null}
          {children}
        </ScrollView>
        {footer}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
