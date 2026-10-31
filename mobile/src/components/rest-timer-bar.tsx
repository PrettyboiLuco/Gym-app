import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/card';
import { ProgressRing } from '@/components/charts';
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
      <ThemedView type="backgroundElement" style={styles.bar}>
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
              style={({ pressed }) => [styles.preset, { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 }]}>
              <ThemedText type="smallBold">{formatClock(seconds * 1000)}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>
    );
  }

  const done = remaining === 0;
  return (
    <ThemedView type="backgroundElement" style={[styles.bar, styles.row]} accessibilityLiveRegion="polite">
      {done ? (
        <>
          <View style={[styles.doneDot, { backgroundColor: theme.accent }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <ThemedText type="smallBold" style={styles.text}>
            {t('session.restDone')}
          </ThemedText>
        </>
      ) : (
        <>
          {/* Restzeit mitten im Ring; der Ring läuft gleichmäßig leer. */}
          <View accessible accessibilityLabel={`${t('session.restTitle')} ${formatClock(remaining)}`}>
            <ProgressRing
              progress={timer && timer.durationMs > 0 ? remaining / timer.durationMs : 0}
              size={64}
              stroke={5}
              color={theme.tint}
              trackColor={theme.backgroundSelected}
              follow="tick">
              <ThemedText type="subtitle" style={styles.clock}>
                {formatClock(remaining)}
              </ThemedText>
            </ProgressRing>
          </View>
          <View style={styles.text} />
        </>
      )}
      {!done ? <Button label={t('session.restPlus')} variant="secondary" onPress={onExtend} /> : null}
      <Button label={done ? t('common.ok') : t('session.restSkip')} variant={done ? 'primary' : 'secondary'} onPress={onSkip} />
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
  doneDot: { width: 44, height: 44, borderRadius: 22 },
  text: { flex: 1 },
  clock: { fontSize: 17, lineHeight: 22, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  presets: { gap: Spacing.two },
  preset: { minHeight: 40, minWidth: 56, paddingHorizontal: Spacing.three, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
