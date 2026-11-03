import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { localDay, timeZone } from '@/domain/time';
import { formatClock, isRestVisible, isStaleSession, restRemainingMs } from '@/domain/training';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNow } from '@/hooks/use-now';
import { useOnce } from '@/hooks/use-once';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, t } from '@/i18n';
import type { LiveTraining } from '@/providers/live-training';

/**
 * Mini-Player über der Tab-Leiste, solange ein Training oder Ablauf läuft (wie der Musik-Player in Apple Music):
 * Name, rechts Pause-Countdown oder Trainingsdauer. Tippen führt zurück ins Training.
 * Auf dem Trainingsbildschirm selbst ausgeblendet. `compact` = eingeklappte Tab-Leiste (iOS 26).
 */
export function MiniPlayer({ live, compact = false }: { live: LiveTraining; compact?: boolean }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const pathname = usePathname();
  const resting = isRestVisible(live.timer);
  const now = useNow(!!live.session || !!live.timedTitle, 1000);
  // Doppeltipp öffnet das Training nur einmal.
  const go = useOnce(() => (live.timedTitle ? router.push('/training/run') : router.push(`/training/session/${live.session!.id}`)));
  if (!live.session && !live.timedTitle) return null;
  if (pathname.startsWith('/training/session') || pathname.startsWith('/training/run') || pathname.startsWith('/training/summary')) return null;

  const title = live.timedTitle ?? live.session?.dayName ?? t('session.free');
  // Länger als 6 Stunden offen: vermutlich vergessen – Datum statt Minutenzähler.
  const stale = !!live.session && !live.timedTitle && isStaleSession(live.session.startedAt, now);
  const right = live.timedTitle
    ? null
    : stale
      ? t('mini.since', { date: formatDay(localDay(new Date(live.session!.startedAt), timeZone)) })
      : resting
        ? `${t('session.restTitle')} ${formatClock(restRemainingMs(live.timer, now))}`
        : live.session
          ? t('mini.elapsed', { minutes: Math.max(0, Math.floor((now - Date.parse(live.session.startedAt)) / 60_000)) })
          : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[stale ? t('mini.stale') : t('mini.running'), title, right, t('mini.open')].filter(Boolean).join('. ')}
      onPress={go}
      style={({ pressed }) => [styles.row, compact && styles.compact, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.dot, { backgroundColor: dark ? theme.accent : theme.tint }]} />
      <View style={styles.text}>
        {!compact ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {stale ? t('mini.stale') : t('mini.running')}
          </ThemedText>
        ) : null}
        <ThemedText type="smallBold" numberOfLines={1}>
          {title}
        </ThemedText>
      </View>
      {right ? (
        <ThemedText type="smallBold" style={styles.right}>
          {right}
        </ThemedText>
      ) : null}
      <Icon name="chevron" color={theme.textSecondary} size={16} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2, paddingHorizontal: Spacing.three, minHeight: 48, flex: 1 },
  compact: { minHeight: 36 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1 },
  right: { fontVariant: ['tabular-nums'] },
});
