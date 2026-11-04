import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
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
import { Icon } from '@/components/icon';
import { useAppLocked } from '@/components/lock-gate';
import { PressableScale } from '@/components/pressable-scale';
import { restPulseSecond } from '@/components/set-table-logic';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Press, RestBar, RestMorph } from '@/constants/motion';
import { DisplayFont, Radius, Spacing } from '@/constants/theme';
import { formatClock, isRestVisible, REST_PRESETS, restRemainingMs, restSecondsFor, type RestTimer } from '@/domain/training';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/** Was nach der Pause kommt (Übung und Satz mit Vorschlag). */
export type NextUp = { title: string; detail: string } | null;

/** Schritt für −/+ in Leiste und Vollbild. */
const NUDGE_SECONDS = 15;

/**
 * Kompakte Pausenleiste unten im Trainingsbildschirm (HEALTH-008/009/011, ~52 px) und Pause im Vollbild.
 * - Läuft eine Pause: große Restzeit in gleich breiten Ziffern, darüber ein feiner Fortschritt (Datenfarbe), −15 / +15 und
 *   Überspringen in derselben Zeile. Tippen auf die Zeit öffnet das Vollbild.
 * - Vollbild: großer Ring, Restzeit groß, was als Nächstes kommt; die letzten 3 Sekunden schlagen spürbar,
 *   am Ende ein Erfolgs-Signal (einmal pro Timer-Generation). Vorgelesen wird nur das Ende, nicht jede Sekunde.
 * - Sonst eine Zeile „Pause: Wie im Plan 4:00 ▾“ – Tippen klappt die Auswahl (wie im Plan oder 0:30 bis 5:00) auf; sie
 *   startet dann nach jedem abgehakten Satz von selbst. Daneben „Jetzt starten“ für eine Pause von Hand.
 * Die Tab-Leiste ist im laufenden Training ausgeblendet (app-tabs), deshalb nur der sichere Rand unten.
 */
export function RestTimerBar({
  timer,
  onStart,
  onAdjust,
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
  /** Laufende Pause um so viele Sekunden ändern (negativ = kürzer). */
  onAdjust: (seconds: number) => void;
  onSkip: () => void;
  next?: NextUp;
  focus?: boolean;
  onFocusChange?: (focus: boolean) => void;
  /** Frage zum gerade erledigten Satz (z. B. RIR), im Vollbild über „Als Nächstes“ (A1). */
  ask?: ReactNode;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const bottom = useSafeAreaInsets().bottom + Spacing.one;
  const visible = isRestVisible(timer);
  const now = useNow(visible, 250, timer && !timer.stopped ? timer.endAtMs : null);
  const remaining = restRemainingMs(timer, now);
  const signalled = useRef<number | null>(null);
  const lastTick = useRef<string | null>(null);
  // N5: Puls der Zeit in den letzten Sekunden (Leiste und Vollbild teilen ihn) und Ausgangspunkt des Morphs.
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  const pulseSecond = restPulseSecond(remaining, RestMorph.pulseSeconds);
  const clockRef = useRef<ComponentRef<typeof View>>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  // Auswahl der Pausenlänge aufgeklappt?
  const [choosing, setChoosing] = useState(false);
  useEffect(() => {
    if (pulseSecond === null || reduced) return;
    pulse.set(withSequence(withTiming(RestMorph.pulseScale, { duration: RestMorph.pulseUpMs, easing: Easing.out(Easing.quad) }), withSpring(1, Press.out)));
  }, [pulseSecond, reduced, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  /** Zeit der Leiste vermessen, dann Vollbild öffnen – der Ring wächst aus genau dieser Stelle. */
  function expand() {
    const clock = clockRef.current;
    if (!clock) return onFocusChange?.(true);
    clock.measureInWindow((x, y, width, height) => {
      setOrigin(width > 0 ? { x: x + width / 2, y: y + height / 2, size: Math.max(width, height) } : null);
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
    const labelOf = (seconds: number | null) =>
      seconds === null ? `${t('session.restPlan')} ${formatClock((planned ?? 0) * 1000)}` : formatClock(seconds * 1000);
    const value = !auto ? t('session.restOff') : choice === null && !planned ? t('session.restNone') : labelOf(choice);
    return (
      <ThemedView type="backgroundElement" style={[styles.bar, { paddingBottom: bottom }]}>
        {choosing ? (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(RestBar.chooserMs)} style={styles.chooser}>
            <View style={styles.presets} accessibilityRole="radiogroup">
              {options.map((seconds) => {
                const selected = auto && (seconds === null ? choice === null : choice === seconds);
                const label = labelOf(seconds);
                return (
                  <PressableScale
                    key={seconds ?? 'plan'}
                    scaleTo={Press.button}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t('session.restValue', { value: label })}
                    onPress={() => {
                      haptic.tap();
                      onChoose(seconds);
                      setChoosing(false);
                    }}
                    style={[styles.preset, { backgroundColor: selected ? theme.primary : theme.backgroundSelected }]}>
                    <ThemedText type="smallBold" numeric style={{ color: selected ? theme.onPrimary : theme.text }}>
                      {label}
                    </ThemedText>
                  </PressableScale>
                );
              })}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {auto ? t('session.restAutoHint') : t('session.restAutoOff')}
            </ThemedText>
          </Animated.View>
        ) : null}
        <View style={styles.row}>
          <PressableScale
            scaleTo={Press.row}
            accessibilityRole="button"
            accessibilityState={{ expanded: choosing }}
            accessibilityLabel={t('session.restValue', { value })}
            accessibilityHint={t('session.restChange')}
            onPress={() => setChoosing((c) => !c)}
            style={styles.choose}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('session.restTitle')}
            </ThemedText>
            <ThemedText type="smallBold" numeric numberOfLines={1} style={styles.shrink}>
              {value}
            </ThemedText>
            <View style={choosing ? styles.chevronUp : styles.chevronDown}>
              <Icon name="chevron" color={theme.textSecondary} size={16} strokeWidth={2.2} />
            </View>
          </PressableScale>
          {current > 0 ? <Button label={t('session.restNow')} variant="secondary" size="compact" onPress={() => onStart(current)} /> : null}
        </View>
      </ThemedView>
    );
  }

  const done = remaining === 0;
  const progress = timer && timer.durationMs > 0 ? remaining / timer.durationMs : 0;
  return (
    <>
      <ThemedView type="backgroundElement" style={[styles.bar, { paddingBottom: bottom }]}>
        {/* Fortschritt der Pause als feine Linie oben an der Leiste (Datenfarbe). */}
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]} {...HIDDEN}>
          <View style={[styles.trackFill, { width: `${progress * 100}%`, backgroundColor: dark ? theme.accent : theme.tint }]} />
        </View>
        <View style={styles.row}>
          {done ? (
            <>
              <View style={[styles.doneDot, { backgroundColor: dark ? theme.accent : theme.tint }]} {...HIDDEN} />
              <ThemedText type="smallBold" style={styles.text}>
                {t('session.restDone')}
              </ThemedText>
              <Button label={t('common.ok')} size="compact" onPress={onSkip} />
            </>
          ) : (
            <>
              {/* Restzeit groß; Tippen öffnet die Pause im Vollbild. */}
              <Pressable
                ref={clockRef}
                accessibilityRole="button"
                accessibilityLabel={`${t('session.restTitle')} ${formatClock(remaining)}`}
                accessibilityHint={t('session.restExpand')}
                onPress={expand}
                hitSlop={8}
                style={styles.text}>
                <Animated.View style={[styles.clockBox, pulseStyle]}>
                  <ThemedText numeric style={styles.clock}>
                    {formatClock(remaining)}
                  </ThemedText>
                </Animated.View>
              </Pressable>
              <NudgeButton seconds={-NUDGE_SECONDS} onPress={() => onAdjust(-NUDGE_SECONDS)} />
              <NudgeButton seconds={NUDGE_SECONDS} onPress={() => onAdjust(NUDGE_SECONDS)} />
              <Button label={t('session.restSkip')} variant="secondary" size="compact" onPress={onSkip} />
            </>
          )}
        </View>
      </ThemedView>
      <RestFocus
        visible={focus}
        origin={origin}
        pulse={pulse}
        remaining={remaining}
        progress={progress}
        next={next}
        ask={ask}
        onAdjust={onAdjust}
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

/** Kleine graue Pille „−15“ / „+15“; vorgelesen als ganze Aussage („15 Sekunden kürzer“). */
function NudgeButton({ seconds, onPress, wide = false }: { seconds: number; onPress: () => void; wide?: boolean }) {
  const theme = useTheme();
  const less = seconds < 0;
  const amount = Math.abs(seconds);
  const label = wide
    ? t(less ? 'session.restMinus' : 'session.restPlus', { seconds: amount })
    : t(less ? 'session.restMinusShort' : 'session.restPlusShort', { seconds: amount });
  return (
    <PressableScale
      scaleTo={Press.button}
      accessibilityRole="button"
      accessibilityLabel={t(less ? 'session.restMinusLabel' : 'session.restPlusLabel', { seconds: amount })}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={[styles.nudge, wide && styles.nudgeWide, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="smallBold" numeric>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

/** Mitte und Größe des kleinen Rings in Fensterkoordinaten. */
type Origin = { x: number; y: number; size: number };
const FOCUS_RING = 264;

/**
 * Pause im Vollbild: ein großer Ring, die Zeit, was als Nächstes kommt. Lime nur auf dem Ring (Daten).
 * N5: Statt von unten hereinzuschieben, wächst der Ring aus der Restzeit der Leiste an seinen Platz (Feder), Grund,
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
  onAdjust,
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
  onAdjust: (seconds: number) => void;
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
          {!done ? (
            <View style={styles.focusActions}>
              <View style={styles.flex}>
                <NudgeButton wide seconds={-NUDGE_SECONDS} onPress={() => onAdjust(-NUDGE_SECONDS)} />
              </View>
              <View style={styles.flex}>
                <NudgeButton wide seconds={NUDGE_SECONDS} onPress={() => onAdjust(NUDGE_SECONDS)} />
              </View>
            </View>
          ) : null}
          <Button label={done ? t('session.restGo') : t('session.restSkip')} onPress={onSkip} />
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 48 },
  doneDot: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1 },
  shrink: { flexShrink: 1 },
  track: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  trackFill: { height: 3 },
  clockBox: { alignSelf: 'flex-start' },
  clock: { fontFamily: DisplayFont.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  choose: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  chevronDown: { transform: [{ rotate: '90deg' }] },
  chevronUp: { transform: [{ rotate: '-90deg' }] },
  chooser: { gap: Spacing.two, paddingTop: Spacing.two },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  preset: { minHeight: 40, minWidth: 64, paddingHorizontal: Spacing.three, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  nudge: { minHeight: 40, minWidth: 48, paddingHorizontal: Spacing.two + 2, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  nudgeWide: { minHeight: 48 },
  focus: { flex: 1, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.four },
  focusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.three, minHeight: 44 },
  focusCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  focusClock: { fontFamily: DisplayFont.bold, fontSize: 64, lineHeight: 72, letterSpacing: -2 },
  focusBottom: { gap: Spacing.four },
  next: { borderRadius: 20, borderWidth: 1, padding: Spacing.four - 4, gap: Spacing.one },
  nextTitle: { fontFamily: DisplayFont.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  focusActions: { flexDirection: 'row', gap: Spacing.three, marginBottom: -Spacing.two },
  flex: { flex: 1 },
});
