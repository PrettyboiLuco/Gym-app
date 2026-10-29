import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { formatClock, restRemainingMs, type RestTimer } from '@/domain/training';
import { useNow } from '@/hooks/use-now';
import { t } from '@/i18n';

/**
 * Pausenanzeige unten im Trainingsbildschirm. Die Restzeit wird aus der gespeicherten Endzeit
 * berechnet; das Signal am Ende kommt nur einmal pro Timer-Generation (HEALTH-009/011).
 * Hinweis: Im Hintergrund oder bei gesperrtem Handy gibt es noch kein Signal (folgt in Phase 6).
 */
export function RestTimerBar({
  timer,
  onExtend,
  onSkip,
}: {
  timer: RestTimer;
  onExtend: () => void;
  onSkip: () => void;
}) {
  const now = useNow(timer !== null);
  const remaining = restRemainingMs(timer, now);
  const signalled = useRef<number | null>(null);

  useEffect(() => {
    if (timer && remaining === 0 && signalled.current !== timer.generation) {
      signalled.current = timer.generation;
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [timer, remaining]);

  if (!timer) return null;
  const done = remaining === 0;

  return (
    <ThemedView type="backgroundSelected" style={styles.bar} accessibilityLiveRegion="polite">
      <View style={styles.text}>
        <ThemedText type="smallBold">{done ? t('session.restDone') : t('session.restTitle')}</ThemedText>
        {!done ? (
          <ThemedText type="subtitle" accessibilityLabel={`${t('session.restTitle')} ${formatClock(remaining)}`}>
            {formatClock(remaining)}
          </ThemedText>
        ) : null}
      </View>
      {!done ? <Button label={t('session.restPlus')} onPress={onExtend} /> : null}
      <Button label={done ? 'OK' : t('session.restSkip')} variant="danger" onPress={onSkip} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  text: { flex: 1 },
});
