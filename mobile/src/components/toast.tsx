// Kurze Rückmeldung nach einer Aktion über der Tab-Leiste, optional mit einer Aktion wie „Rückgängig“.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HIDDEN } from '@/components/a11y';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { useAppLocked } from '@/components/lock-gate';
import { ThemedText } from '@/components/themed-text';
import { Spring } from '@/constants/motion';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Kurze Rückmeldung nach einer Aktion („Gespeichert“): gleitet über der Tab-Leiste herein und nach
 * 1,8 Sekunden wieder hinaus. Wird von Bildschirmleser vorgelesen. Eine Meldung zur Zeit; eine neue ersetzt die alte.
 * Mit `action` (z. B. „Rückgängig“) bleibt sie 4 Sekunden stehen, mit eingeschaltetem Bildschirmleser 10 Sekunden,
 * damit die Aktion auch per Wischen erreichbar ist. Danach ist die Aktion weg (nicht mehr antippbar oder vorlesbar).
 */
export type ToastAction = { label: string; /** Vorlesehinweis, was die Aktion tut. */ hint?: string; onPress: () => void };
type ToastState = { id: number; text: string; action?: ToastAction } | null;
let current: ToastState = null;
let counter = 0;
const listeners = new Set<() => void>();

const SHOW_MS = 1800;
const ACTION_MS = 4000;
const ACTION_READER_MS = 10_000;

export function showToast(text: string, action?: ToastAction) {
  current = { id: ++counter, text, action };
  haptic.tap();
  listeners.forEach((l) => l());
}

/** Bildschirmleser an? (für längere Anzeige von Meldungen mit Aktion) */
function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => live && setOn(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function ToastHost() {
  const toast = useSyncExternalStore(
    subscribe,
    () => current,
    () => current
  );
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const y = useSharedValue(80);
  const opacity = useSharedValue(0);
  const locked = useAppLocked();
  const reader = useScreenReader();
  // Ausgeblendete Meldung: ihre Aktion gilt nicht mehr.
  const [hiddenId, setHiddenId] = useState<number | null>(null);
  const hasAction = !!toast?.action;

  useEffect(() => {
    if (!toast) return;
    y.set(reduced ? 0 : withSpring(0, Spring));
    opacity.set(withTiming(1, { duration: 150 }));
    const hide = setTimeout(
      () => {
        y.set(reduced ? 80 : withDelay(0, withSpring(80, Spring)));
        opacity.set(withTiming(0, { duration: 200 }));
        setHiddenId(toast.id);
      },
      hasAction ? (reader ? ACTION_READER_MS : ACTION_MS) : SHOW_MS
    );
    return () => clearTimeout(hide);
  }, [toast, hasAction, reader, reduced, y, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
  // Nach dem Ausblenden bleibt die letzte Meldung unsichtbar stehen (Deckkraft 0), bis die nächste kommt.
  // Bei gesperrter App nichts zeigen oder vorlesen (Inhalte bleiben hinter der Sperre).
  if (!toast || locked) return null;
  const action = toast.action && hiddenId !== toast.id ? toast.action : null;
  return (
    <View
      pointerEvents={action ? 'box-none' : 'none'}
      style={[styles.wrap, { bottom: insets.bottom + BottomTabInset + Spacing.three }]}
      {...(hiddenId === toast.id ? HIDDEN : null)}>
      <Animated.View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.toast, { backgroundColor: theme.primary }, style]}>
        <Icon name="check" color={theme.onPrimary} size={16} strokeWidth={2.4} />
        <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
          {toast.text}
        </ThemedText>
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityHint={action.hint}
            hitSlop={8}
            onPress={() => {
              setHiddenId(toast.id);
              y.set(reduced ? 80 : withSpring(80, Spring));
              opacity.set(withTiming(0, { duration: 200 }));
              action.onPress();
            }}
            style={[styles.action, { borderColor: theme.onPrimary }]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {action.label}
            </ThemedText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 900 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    minHeight: 44,
    borderRadius: Radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  // Aktion als eigene, umrandete Fläche (mind. 44 pt hoch über hitSlop), deutlich vom Meldungstext getrennt.
  action: { minHeight: 32, justifyContent: 'center', paddingHorizontal: Spacing.three, marginLeft: Spacing.one, borderWidth: 1, borderRadius: Radius.pill },
});
