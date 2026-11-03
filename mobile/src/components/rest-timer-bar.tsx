import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { HIDDEN } from '@/components/a11y';
import { Button } from '@/components/card';
import { ProgressRing } from '@/components/charts';
import { haptic } from '@/components/haptics';
import { useAppLocked } from '@/components/lock-gate';
import { PressableScale } from '@/components/pressable-scale';
import { restPulseSecond } from '@/components/set-table-logic';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Press, RestMorph } from '@/constants/motion';
import { BottomTabInset, DisplayFont, Spacing } from '@/constants/theme';
import { formatClock, isRestVisible, REST_PRESETS, restRemainingMs, restSecondsFor, type RestTimer } from '@/domain/training';
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
 * - Sonst: Pausenlänge einmal wählen (wie im Plan oder 0:30 bis 5:00) – sie startet dann nach jedem abgehakten Satz
 *   von selbst; „Jetzt starten“ für eine Pause von Hand.
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
  choice,
  planned,
  auto,
  onChoose,
}: {
  timer: RestTimer;
  /** Einmal gewählte Pausenlänge (null = wie im Plan). */
  choice: number | null;
  /** Pause laut Plan für den nächsten offenen Satz (null = keine). */
  planned: number | null;
  /** Startet die Pause nach dem Abhaken von selbst? */
  auto: boolean;
  onChoose: (seconds: number | null) => void;
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
  // Über der Tab-Leiste bleiben: Home-Leiste des iPhones (Safe Area) + Tab-Leiste + Luft. Ohne die Safe Area rutschte
  // die Leiste auf dem iPhone halb unter die schwebende Tab-Leiste (iOS 26).
  const bottom = useSafeAreaInsets().bottom + BottomTabInset + Spacing.two;
  const visible = isRestVisible(timer);
  const now = useNow(visible, 250, timer && !timer.stopped ? timer.endAtMs : null);
  const remaining = restRemainingMs(timer, now);
  const signalled = useRef<number | null>(null);
  const lastTick = useRef<string | null>(null);
  // N5: Puls des Rings in den letzten Sekunden (Leiste und Vollbild teilen ihn) und Ausgangspunkt des Morphs.
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  const pulseSecond = restPulseSecond(remaining, RestMorph.pulseSeconds);
  const ringRef = useRef<ComponentRef<typeof View>>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  useEffect(() => {
    if (pulseSecond === null || reduced) return;
    pulse.set(withSequence(withTiming(RestMorph.pulseScale, { duration: RestMorph.pulseUpMs, easing: Easing.out(Easing.quad) }), withSpring(1, Press.out)));
  }, [pulseSecond, reduced, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  /** Ring der Leiste vermessen, dann Vollbild öffnen – es wächst aus genau dieser Stelle. */
  function expand() {
    const ring = ringRef.current;
    if (!ring) return onFocusChange?.(true);
    ring.measureInWindow((x, y, width, height) => {
      setOrigin(width > 0 ? { x: x + width / 2, y: y + height / 2, size: width } : null);
      onFocusChange?.(true);
    });
  }

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
    // Einmal wählen, dann läuft die Pause nach jedem abgehakten Satz von selbst (gilt auch fürs nächste Training).
    const options: (number | null)[] = planned ? [null, ...REST_PRESETS] : [...REST_PRESETS];
    const current = restSecondsFor(choice, planned ?? 0);
    return (
      <ThemedView type="backgroundElement" style={[styles.bar, { paddingBottom: bottom }]}>
        <View style={styles.chooseHead}>
          <ThemedText type="smallBold" style={styles.text}>
            {t('session.restChoose')}
          </ThemedText>
          {current > 0 ? <Button label={t('session.restNow')} variant="quiet" size="compact" onPress={() => onStart(current)} /> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
          {options.map((seconds) => {
            const selected = seconds === null ? choice === null : choice === seconds;
            const label = seconds === null ? `${t('session.restPlan')} ${formatClock((planned ?? 0) * 1000)}` : formatClock(seconds * 1000);
            return (
              <PressableScale
                key={seconds ?? 'plan'}
                scaleTo={Press.button}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${t('session.restChoose')}: ${label}`}
                onPress={() => {
                  haptic.tap();
                  onChoose(seconds);
                }}
                style={[styles.preset, { backgroundColor: selected ? theme.primary : theme.backgroundSelected }]}>
                <ThemedText type="smallBold" style={{ color: selected ? theme.onPrimary : theme.text }}>
                  {label}
                </ThemedText>
              </PressableScale>
            );
          })}
        </ScrollView>
        <ThemedText type="small" themeColor="textSecondary">
          {auto ? t('session.restAutoHint') : t('session.restAutoOff')}
        </ThemedText>
      </ThemedView>
    );
  }

  const done = remaining === 0;
  const progress = timer && timer.durationMs > 0 ? remaining / timer.durationMs : 0;
  return (
    <>
      <ThemedView type="backgroundElement" style={[styles.bar, styles.row, { paddingBottom: bottom }]}>
        {done ? (
          <>
            <View style={[styles.doneDot, { backgroundColor: theme.accent }]} {...HIDDEN} />
            <ThemedText type="smallBold" style={styles.text}>
              {t('session.restDone')}
            </ThemedText>
          </>
        ) : (
          <>
            {/* Restzeit mitten im Ring; Tippen öffnet die Pause im Vollbild. */}
            <Pressable
              ref={ringRef}
              accessibilityRole="button"
              accessibilityLabel={`${t('session.restTitle')} ${formatClock(remaining)}. ${t('session.restExpand')}`}
              onPress={expand}>
              <Animated.View style={pulseStyle}>
                <ProgressRing progress={progress} size={BAR_RING} stroke={5} color={theme.tint} trackColor={theme.backgroundSelected} follow="tick">
                  <ThemedText type="subtitle" numeric style={styles.clock}>
                    {formatClock(remaining)}
                  </ThemedText>
                </ProgressRing>
              </Animated.View>
            </Pressable>
            <View style={styles.text} />
          </>
        )}
        {!done ? <Button label={t('session.restPlus')} variant="secondary" onPress={onExtend} /> : null}
        <Button label={done ? t('common.ok') : t('session.restSkip')} variant={done ? 'primary' : 'secondary'} onPress={onSkip} />
      </ThemedView>
      <RestFocus
        visible={focus}
        origin={origin}
        pulse={pulse}
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
        onClosed={() => setOrigin(null)}
      />
    </>
  );
}

/** Mitte und Größe des kleinen Rings in Fensterkoordinaten. */
type Origin = { x: number; y: number; size: number };
const BAR_RING = 64;
const FOCUS_RING = 264;

/**
 * Pause im Vollbild: ein großer Ring, die Zeit, was als Nächstes kommt. Lime nur auf dem Ring (Daten).
 * N5: Statt von unten hereinzuschieben, wächst der Ring aus dem kleinen Ring der Leiste an seinen Platz (Feder), Grund,
 * Text und Knöpfe blenden mit; Verkleinern läuft den Weg zurück. Öffnet sich das Vollbild nach einem Satz von selbst
 * (kein Ausgangspunkt), steigt es verkleinert von unten auf. Bei „Bewegung reduzieren“ steht es sofort da.
 * Weiter ein natives Modal (über Kopf- und Tab-Leiste) – aber durchsichtig und ohne eigene Animation.
 */
function RestFocus({
  visible,
  origin,
  pulse,
  remaining,
  progress,
  next,
  ask,
  onExtend,
  onSkip,
  onClose,
  onClosed,
}: {
  visible: boolean;
  origin: Origin | null;
  pulse: SharedValue<number>;
  remaining: number;
  progress: number;
  next: NextUp;
  ask: ReactNode;
  onExtend: () => void;
  onSkip: () => void;
  onClose: () => void;
  onClosed: () => void;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const reduced = useReducedMotion();
  // Ein natives Modal läge über der App-Sperre: gesperrt bleibt es zu (sofort, ohne Animation), nach dem Entsperren
  // erscheint es wieder.
  const locked = useAppLocked();
  const want = visible && !locked;
  // Nach dem Zuklappen bleibt das Modal offen, bis der Ring zurück in der Leiste ist.
  const [closing, setClosing] = useState(false);
  const [wasWanted, setWasWanted] = useState(want);
  if (wasWanted !== want) {
    setWasWanted(want);
    setClosing(!want && !locked && !reduced);
  }
  if (locked && closing) setClosing(false);

  const open = useSharedValue(0);
  const dx = useSharedValue(0);
  const dy = useSharedValue<number>(RestMorph.fallbackRise);
  const from = useSharedValue<number>(RestMorph.fallbackScale);
  const ringBox = useRef<ComponentRef<typeof View>>(null);
  const placed = useRef(false);
  // Fertig zugeklappt: Modal schließen und den Ausgangspunkt vergessen (stabil, damit der Effekt nicht bei jedem Tick neu startet).
  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  });
  const finishClose = useCallback(() => {
    setClosing(false);
    onClosedRef.current();
  }, []);

  useEffect(() => {
    if (want) {
      // Wieder geöffnet, während es noch zuklappte: von der jetzigen Stelle zurück aufgehen.
      // Sonst startet das Öffnen erst, wenn der Ring vermessen ist (onLayout unten).
      if (open.get() > 0 && !placed.current) {
        placed.current = true;
        open.set(reduced ? 1 : withSpring(1, RestMorph.spring));
      }
      return;
    }
    placed.current = false;
    if (!closing) {
      open.set(0);
      return;
    }
    open.set(
      withTiming(0, { duration: RestMorph.closeMs, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(finishClose);
      })
    );
  }, [want, closing, open, finishClose, reduced]);

  /** Großen Ring vermessen: Weg und Größe vom kleinen Ring hierher bestimmen, dann aufgehen. */
  function place() {
    if (!want || placed.current) return;
    placed.current = true;
    const go = () => open.set(reduced ? 1 : withSpring(1, RestMorph.spring));
    const box = ringBox.current;
    if (!origin || !box) {
      dx.set(0);
      dy.set(RestMorph.fallbackRise);
      from.set(RestMorph.fallbackScale);
      return go();
    }
    box.measureInWindow((x, y, width, height) => {
      dx.set(origin.x - (x + width / 2));
      dy.set(origin.y - (y + height / 2));
      from.set(origin.size / FOCUS_RING);
      go();
    });
  }

  const backdrop = useAnimatedStyle(() => ({ opacity: open.value }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - open.value) * dx.value },
      { translateY: (1 - open.value) * dy.value },
      { scale: interpolate(open.value, [0, 1], [from.value, 1]) * pulse.value },
    ],
  }));
  const rest = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0.35, 1], [0, 1], 'clamp'),
    transform: [{ translateY: (1 - open.value) * 24 }],
  }));

  const done = remaining === 0;
  return (
    <Modal visible={(want || closing) && !locked} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }, backdrop]} />
      <SafeAreaView style={styles.focus}>
        <Animated.View style={[styles.focusTop, rest]}>
          <ThemedText themeColor="textSecondary">{done ? t('session.restDone') : t('session.restTitle')}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('session.restCollapse')} onPress={onClose} hitSlop={12}>
            <ThemedText style={{ color: theme.textSecondary }}>{t('session.restCollapse')}</ThemedText>
          </Pressable>
        </Animated.View>
        <View style={styles.focusCenter} accessible accessibilityLabel={`${t('session.restTitle')} ${formatClock(remaining)}`}>
          <Animated.View ref={ringBox} onLayout={place} style={ringStyle}>
            <ProgressRing
              progress={progress}
              size={FOCUS_RING}
              stroke={12}
              color={dark ? theme.accent : theme.tint}
              trackColor={theme.backgroundSelected}
              follow="tick">
              <ThemedText numeric style={styles.focusClock}>
                {formatClock(remaining)}
              </ThemedText>
            </ProgressRing>
          </Animated.View>
        </View>
        <Animated.View style={[styles.focusBottom, rest]}>
          {ask}
          {next ? (
            <View style={[styles.next, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('session.nextUp')}
              </ThemedText>
              <ThemedText style={styles.nextTitle} numberOfLines={2}>
                {next.title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" numeric>
                {next.detail}
              </ThemedText>
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
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  doneDot: { width: 44, height: 44, borderRadius: 22 },
  text: { flex: 1 },
  clock: { fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  presets: { gap: Spacing.two },
  chooseHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  preset: { minHeight: 40, minWidth: 56, paddingHorizontal: Spacing.three, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  focus: { flex: 1, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.four },
  focusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.three, minHeight: 44 },
  focusCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  focusClock: { fontFamily: DisplayFont.bold, fontSize: 64, lineHeight: 72, letterSpacing: -2 },
  focusBottom: { gap: Spacing.four },
  next: { borderRadius: 20, borderWidth: 1, padding: Spacing.four - 4, gap: Spacing.one },
  nextTitle: { fontFamily: DisplayFont.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  focusActions: { flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },
});
