import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';

/**
 * Freundliche Fehleranzeige statt leerer Seite (Pilot, BUS-016). Deine Daten sind gespeichert; der
 * Fehlertext hilft beim Melden über „Feedback geben“ bzw. TestFlight.
 */
export function ErrorView({ error, retry }: ErrorBoundaryProps) {
  return (
    <ThemedView style={styles.root}>
      <View style={styles.box}>
        <ThemedText type="subtitle">{t('errors.title')}</ThemedText>
        <ThemedText>{t('errors.text')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" selectable>
          {error.message}
        </ThemedText>
        <Button label={t('errors.retry')} onPress={retry} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  box: { gap: Spacing.three },
});
