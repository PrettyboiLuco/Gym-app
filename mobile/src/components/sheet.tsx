// Fenster von unten „Platte federt auf“ (getlayers Section loader-lumora): Platte federt auf, Zeilen steigen gestaffelt herein.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/icon';
import { useAppLocked } from '@/components/lock-gate';
import { remainingDelay, shouldDismiss } from '@/components/sheet-motion';
import { ThemedText } from '@/components/themed-text';
import { SheetMotion } from '@/constants/motion';
import { DisplayFont, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

type Phase = 'closed' | 'open' | 'closing';

/** Zeitpunkt (ms), an dem die Öffnen-Bewegung startete; 0 = noch nicht. Zeilen richten ihre Verzögerung danach. */
type SheetState = { gate: SharedValue<number> | null; close: () => void };
const SheetContext = createContext<SheetState>({ gate: null, close: () => undefined });

/** Schließt das umgebende Fenster mit seiner Bewegung (Inhalt zuerst, dann die Platte); `onClose` folgt, wenn sie ruht. */
export function useSheetClose() {
  return useContext(SheetContext).close;
}

/**
 * Fenster von unten auf einem abgedunkelten Grund. Öffnen: die Platte federt von ihrer Höhe auf 0 (220/30), die Zeilen
 * (`SheetRow`) steigen nach der Leiter herein. Schließen per Hintergrund, Knopf, Zurück (Android) oder Wischen nach
 * unten: erst geht der Inhalt (260/26, 12 px nach unten), dann folgt die Platte; `onClose` erst, wenn sie ruht.
 * Gesperrte App: sofort zu. „Bewegung reduzieren“: alles ohne Federn.
 */
export function Sheet({
  visible,
  title,
  onClose,
  onClosed,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Nach jedem Schließen, sobald die Platte ruht (auch wenn die Eltern `visible` selbst ausgeschaltet haben). */
  onClosed?: () => void;
  children: ReactNode;
  /** Unten fest stehende Aktion (z. B. „Kopieren“). */
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const locked = useAppLocked();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const open = visible && !locked;

  // Ablauf: geöffnet → schließt (Bewegung läuft) → zu. Die Eltern schalten nur `visible`; die Bewegung regelt das Fenster.
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed');
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setPhase(open ? 'open' : locked ? 'closed' : phase === 'open' ? 'closing' : phase);
  }

  const y = useSharedValue(windowHeight);
  const height = useSharedValue(0);
  const content = useSharedValue(1);
  const gate = useSharedValue(0);
  const started = useRef(false);
  const latest = useRef({ phase, visible, onClose, onClosed, velocity: 0 });
  useEffect(() => {
    latest.current = { ...latest.current, phase, visible, onClose, onClosed };
  });

  const finish = useCallback(() => {
    if (latest.current.phase !== 'closing') return;
    setPhase('closed');
    // Selbst geschlossen (Hintergrund, Knopf, Wischen): jetzt die Eltern informieren.
    if (latest.current.visible) latest.current.onClose();
    latest.current.onClosed?.();
  }, []);

  useEffect(() => {
    if (phase === 'closed') {
      started.current = false;
      gate.set(0);
      return;
    }
    if (phase === 'open' && started.current) {
      // Während des Schließens wieder geöffnet: zurückfedern.
      content.set(reduced ? 1 : withSpring(1, SheetMotion.content));
      y.set(reduced ? 0 : withSpring(0, SheetMotion.slab));
      return;
    }
    if (phase !== 'closing') return;
    if (reduced) {
      content.set(0);
      y.set(withTiming(height.get(), { duration: 0 }, (done) => done && scheduleOnRN(finish)));
      return;
    }
    content.set(withSpring(0, SheetMotion.content));
    y.set(
      withDelay(
        SheetMotion.exitLagMs,
        withSpring(height.get(), { ...SheetMotion.slab, velocity: latest.current.velocity }, (done) => {
          if (done) scheduleOnRN(finish);
        })
      )
    );
    latest.current.velocity = 0;
  }, [content, finish, gate, height, phase, reduced, y]);

  const close = useCallback(() => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
  }, []);
  const dismiss = useCallback(
    (velocity: number) => {
      latest.current.velocity = velocity;
      close();
    },
    [close]
  );

  // Erst wenn die Platte ihre Höhe kennt, startet die Bewegung – und mit ihr die Zeilen (Gate beim START).
  const onSlabLayout = (h: number) => {
    height.set(h);
    if (started.current || phase !== 'open') return;
    started.current = true;
    content.set(1);
    if (reduced) y.set(0);
    else y.set(withSequence(withTiming(h, { duration: 0 }), withSpring(0, SheetMotion.slab)));
    gate.set(Date.now());
  };

  const pan = usePanGesture({
    activeOffsetY: 8,
    onUpdate: (e) => {
      'worklet';
      y.set(Math.max(0, e.translationY));
    },
    onDeactivate: (e) => {
      'worklet';
      if (shouldDismiss(e.translationY, e.velocityY)) scheduleOnRN(dismiss, e.velocityY);
      else y.set(withSpring(0, SheetMotion.slab));
    },
  });

  const slabStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => {
    const h = height.value;
    return { opacity: h > 0 ? Math.min(Math.max(1 - y.value / h, 0), 1) : 0 };
  });
  const contentStyle = useAnimatedStyle(() => ({
    opacity: content.value,
    transform: [{ translateY: (1 - content.value) * SheetMotion.contentDrift }],
  }));

  return (
    <Modal visible={phase !== 'closed' && !locked} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <SheetContext value={{ gate, close }}>
        <GestureHandlerRootView style={styles.fill}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} style={styles.fill} />
            </Animated.View>
            <Animated.View
              accessibilityViewIsModal
              onLayout={(e) => onSlabLayout(e.nativeEvent.layout.height)}
              style={[
                styles.slab,
                { backgroundColor: theme.backgroundElement, maxHeight: windowHeight * 0.88, paddingBottom: Math.max(insets.bottom, Spacing.three) },
                slabStyle,
              ]}>
              <GestureDetector gesture={pan}>
                <View style={styles.top}>
                  <View style={[styles.grip, { backgroundColor: theme.backgroundSelected }]} />
                  <View style={styles.head}>
                    <ThemedText style={styles.title} accessibilityRole="header" numberOfLines={2}>
                      {title}
                    </ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('common.close')}
                      onPress={close}
                      hitSlop={8}
                      style={[styles.close, { backgroundColor: theme.backgroundSelected }]}>
                      <Icon name="close" color={theme.text} size={18} strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>
              </GestureDetector>
              <Animated.View style={[styles.content, contentStyle]}>
                <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                  {children}
                </ScrollView>
                {footer ? <View style={styles.footer}>{footer}</View> : null}
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
        </GestureHandlerRootView>
      </SheetContext>
    </Modal>
  );
}

/**
 * Inhalt, der gestaffelt aufsteigt (10 px, Deckkraft 0 → 1, Feder 170/26), sobald `gate` einen Startzeitpunkt hat –
 * Verzögerung nach der Leiter 150 … 900 ms. Für Fenster-Zeilen und die Mahlzeiten-Blöcke beim Öffnen des Bildschirms.
 */
export function Rise({ index, gate, style, children }: { index: number; gate: SharedValue<number>; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(reduced ? 1 : 0);
  const start = useCallback(
    (at: number) => {
      shown.set(withDelay(remainingDelay(index, at, Date.now()), withSpring(1, SheetMotion.row)));
    },
    [index, shown]
  );
  useEffect(() => {
    if (reduced) shown.set(1);
  }, [reduced, shown]);
  useAnimatedReaction(
    () => gate.value,
    (at, previous) => {
      if (!reduced && at > 0 && at !== previous) scheduleOnRN(start, at);
    },
    [reduced, start]
  );
  const rise = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * SheetMotion.rowFromY }] }));
  return <Animated.View style={[style, rise]}>{children}</Animated.View>;
}

/** Eine Zeile im Fenster (getlayers vesper-faq): volle Breite, optional mit Haarlinie oben, steigt nach `index` herein. */
export function SheetRow({ index, divider = false, style, children }: { index: number; divider?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const theme = useTheme();
  const { gate } = useContext(SheetContext);
  const fallback = useSharedValue(1);
  const lined = divider ? [styles.divider, { borderColor: theme.backgroundSelected }] : null;
  return (
    <Rise index={index} gate={gate ?? fallback} style={[lined, style]}>
      {children}
    </Rise>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
  slab: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  top: { paddingTop: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  grip: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: Spacing.three },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { flex: 1, fontFamily: DisplayFont.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  content: { flexShrink: 1 },
  scroll: { flexGrow: 0 },
  body: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.three, gap: Spacing.three },
  footer: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, gap: Spacing.two },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.three },
});
