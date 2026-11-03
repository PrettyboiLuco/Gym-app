import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HIDDEN_FROM_A11Y } from '@/components/a11y-hidden';
import { Button } from '@/components/card';
import { ProgressRing } from '@/components/charts';
import { haptic } from '@/components/haptics';
import { useAppLocked } from '@/components/lock-gate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, DisplayFont, Spacing } from '@/constants/theme';
import { formatClock, isRestVisible, REST_PRESETS, restRemainingMs, type RestTimer } from '@/domain/training';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/** Was nach der Pause kommt (Übung und Satz mit Vorschlag). */
export type NextUp = { title: string; detail: string } | null;

/**
 * Pausenleiste unten im Trainingsbildschirm (HEALTH-008/009/011) und Pause im Vollbild.
 * - Läuft eine Pause: Restzeit aus der gespeicherten Endzeit, +30 s, Überspringen; Tippen auf den Ring = Vollbild.
 * - Vollbild: großer Ring, Restzeit groß, was als Nächstes kommt; die letzten 3 Sekunden schlagen spürbar,
 *   am Ende ein Erfolgs-Signal (einmal pro Timer-Generation). Vorgelesen wird nur das Ende, nicht jede Sekunde.
 * - Sonst: Pause von Hand starten, Schnellwahl 0:30 bis 5:00.
 */
export function RestTimerBar({
  timer,
  onStart,
  onExtend,
  onSkip,
  next = null,
  focus = false,
  onFocusChange,
  ask = null,
}: {
  timer: RestTimer;
  onStart: (seconds: number) => void;
  onExtend: () => void;
  onSkip: () => void;
  next?: NextUp;
  focus?: boolean;
  onFocusChange?: (focus: boolean) => void;
  /** Frage zum gerade erledigten Satz (z. B. RIR), im Vollbild über „Als Nächstes“ (A1). */
  ask?: ReactNode;
}) {
  const theme = useTheme();
  const visible = isRestVisible(timer);
  const now = useNow(visible, 250, timer && !timer.stopped ? timer.endAtMs : null);
  const remaining = restRemainingMs(timer, now);
  const signalled = useRef<number | null>(null);
  const lastTick = useRef<string | null>(null);

  useEffect(() => {
    if (!timer || !visible) return;
    const secondsLeft = Math.ceil(remaining / 1000);
    // Countdown-Schläge bei 3, 2, 1 – je Sekunde genau einmal.
    if (secondsLeft >= 1 && secondsLeft <= 3) {
      const key = `${timer.generation}:${secondsLeft}`;
      if (lastTick.current !== key) {
        lastTick.current = key;
        haptic.tick();
      }
    }
    if (remaining === 0 && signalled.current !== timer.generation) {
      signalled.current = timer.generation;
      haptic.success();
      AccessibilityInfo.announceForAccessibility(t('session.restDone'));
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
              onPress={() => {
                haptic.tap();
                onStart(seconds);
              }}
              style={({ pressed }) => [styles.preset, { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 }]}>
              <ThemedText type="smallBold">{formatClock(seconds * 1000)}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>
    );
  }

  const done = remaining === 0;
  const progress = timer && timer.durationMs > 0 ? remaining / timer.durationMs : 0;
  return (
    <>
      <ThemedView type="backgroundElement" style={[styles.bar, styles.row]}>
        {done ? (
          <>
            <View style={[styles.doneDot, { backgroundColor: theme.accent }]} {...HIDDEN_FROM_A11Y} />
            <ThemedText type="smallBold" style={styles.text}>
              {t('session.restDone')}
            </ThemedText>
          </>
        ) : (
          <>
            {/* Restzeit mitten im Ring; Tippen öffnet die Pause im Vollbild. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('session.restTitle')} ${formatClock(remaining)}. ${t('session.restExpand')}`}
              onPress={() => onFocusChange?.(true)}>
              <ProgressRing progress={progress} size={64} stroke={5} color={theme.tint} trackColor={theme.backgroundSelected} follow="tick">
                <ThemedText type="subtitle" style={styles.clock}>
                  {formatClock(remaining)}
                </ThemedText>
              </ProgressRing>
            </Pressable>
            <View style={styles.text} />
          </>
        )}
        {!done ? <Button label={t('session.restPlus')} variant="secondary" onPress={onExtend} /> : null}
        <Button label={done ? t('common.ok') : t('session.restSkip')} variant={done ? 'primary' : 'secondary'} onPress={onSkip} />
      </ThemedView>
      <RestFocus
        visible={focus}
        remaining={remaining}
        progress={progress}
        next={next}
        ask={ask}
        onExtend={onExtend}
        onSkip={() => {
          onFocusChange?.(false);
          onSkip();
        }}
        onClose={() => onFocusChange?.(false)}
      />
    </>
  );
}

/** Pause im Vollbild: ein großer Ring, die Zeit, was als Nächstes kommt. Lime nur auf dem Ring (Daten). */
function RestFocus({
  visible,
  remaining,
  progress,
  next,
  ask,
  onExtend,
  onSkip,
  onClose,
}: {
  visible: boolean;
  remaining: number;
  progress: number;
  next: NextUp;
  ask: ReactNode;
  onExtend: () => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  // Ein natives Modal läge über der App-Sperre: gesperrt bleibt es zu, nach dem Entsperren erscheint es wieder.
  const locked = useAppLocked();
  const done = remaining === 0;
  return (
    <Modal visible={visible && !locked} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.focus, { backgroundColor: theme.background }]}>
        <View style={styles.focusTop}>
          <ThemedText themeColor="textSecondary">{done ? t('session.restDone') : t('session.restTitle')}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('session.restCollapse')} onPress={onClose} hitSlop={12}>
            <ThemedText style={{ color: theme.textSecondary }}>{t('session.restCollapse')}</ThemedText>
          </Pressable>
        </View>
        <View style={styles.focusCenter} accessible accessibilityLabel={`${t('session.restTitle')} ${formatClock(remaining)}`}>
          <ProgressRing progress={progress} size={264} stroke={12} color={dark ? theme.accent : theme.tint} trackColor={theme.backgroundSelected} follow="tick">
            <ThemedText style={styles.focusClock}>{formatClock(remaining)}</ThemedText>
          </ProgressRing>
        </View>
        {ask}
        {next ? (
          <View style={[styles.next, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('session.nextUp')}
            </ThemedText>
            <ThemedText style={styles.nextTitle} numberOfLines={2}>
              {next.title}
            </ThemedText>
            <ThemedText themeColor="textSecondary">{next.detail}</ThemedText>
          </View>
        ) : null}
        <View style={styles.focusActions}>
          {!done ? (
            <View style={styles.flex}>
              <Button label={t('session.restPlus')} variant="secondary" onPress={onExtend} />
            </View>
          ) : null}
          <View style={styles.flex}>
            <Button label={done ? t('session.restGo') : t('session.restSkip')} onPress={onSkip} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
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
  focus: { flex: 1, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.four },
  focusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.three, minHeight: 44 },
  focusCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  focusClock: { fontFamily: DisplayFont.bold, fontSize: 64, lineHeight: 72, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  next: { borderRadius: 20, borderWidth: 1, padding: Spacing.four - 4, gap: Spacing.one },
  nextTitle: { fontFamily: DisplayFont.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  focusActions: { flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },
});
