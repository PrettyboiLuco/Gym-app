import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { formatClock, isRestVisible, REST_PRESETS, restRemainingMs, type RestTimer } from '@/domain/training';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Pausenleiste unten im Trainingsbildschirm (HEALTH-008/009/011).
 * - Läuft eine Pause: Restzeit aus der gespeicherten Endzeit, +30 s, Überspringen.
 * - Sonst: Pause von Hand starten, Schnellwahl 0:30 bis 5:00.
 * Das Signal am Ende kommt nur einmal pro Timer-Generation.
 * Hinweis: Im Hintergrund oder bei gesperrtem Handy gibt es noch kein Signal (folgt in Phase 6).
 */
export function RestTimerBar({
  timer,
  onStart,
  onExtend,
  onSkip,
}: {
  timer: RestTimer;
  onStart: (seconds: number) => void;
  onExtend: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const visible = isRestVisible(timer);
  const now = useNow(visible);
  const remaining = restRemainingMs(timer, now);
  const signalled = useRef<number | null>(null);

  useEffect(() => {
    if (timer && visible && remaining === 0 && signalled.current !== timer.generation) {
      signalled.current = timer.generation;
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [timer, visible, remaining]);

  if (!visible) {
    return (
      <ThemedView type="backgroundSelected" style={styles.bar}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('session.restManual')}
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
          {REST_PRESETS.map((seconds) => (
            <Pressable
              key={seconds}
              accessibilityRole="button"
              accessibilityLabel={`${t('session.restManual')} ${formatClock(seconds * 1000)}`}
              onPress={() => onStart(seconds)}
              style={({ pressed }) => [styles.preset, { backgroundColor: theme.background, opacity: pressed ? 0.6 : 1 }]}>
              <ThemedText type="smallBold">{formatClock(seconds * 1000)}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>
    );
  }

  const done = remaining === 0;
  return (
    <ThemedView type="backgroundSelected" style={[styles.bar, styles.row]} accessibilityLiveRegion="polite">
      <View style={styles.text}>
        <ThemedText type="smallBold">{done ? t('session.restDone') : t('session.restTitle')}</ThemedText>
        {!done ? (
          <ThemedText type="subtitle" accessibilityLabel={`${t('session.restTitle')} ${formatClock(remaining)}`}>
            {formatClock(remaining)}
          </ThemedText>
        ) : null}
      </View>
      {!done ? <Button label={t('session.restPlus')} onPress={onExtend} /> : null}
      <Button label={done ? t('common.ok') : t('session.restSkip')} variant="danger" onPress={onSkip} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  presets: { gap: Spacing.two },
  preset: { minHeight: 40, minWidth: 56, paddingHorizontal: Spacing.three, borderRadius: Spacing.four, alignItems: 'center', justifyContent: 'center' },
});
