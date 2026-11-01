import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spring } from '@/constants/motion';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Kurze Rückmeldung nach einer Aktion („Gespeichert“): gleitet über der Tab-Leiste herein und nach
 * 1,8 Sekunden wieder hinaus. Wird von Bildschirmleser vorgelesen. Eine Meldung zur Zeit; eine neue ersetzt die alte.
 */
type ToastState = { id: number; text: string } | null;
let current: ToastState = null;
let counter = 0;
const listeners = new Set<() => void>();

export function showToast(text: string) {
  current = { id: ++counter, text };
  haptic.tap();
  listeners.forEach((l) => l());
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

  useEffect(() => {
    if (!toast) return;
    y.set(reduced ? 0 : withSpring(0, Spring));
    opacity.set(withTiming(1, { duration: 150 }));
    const hide = setTimeout(() => {
      y.set(reduced ? 80 : withDelay(0, withSpring(80, Spring)));
      opacity.set(withTiming(0, { duration: 200 }));
    }, 1800);
    return () => clearTimeout(hide);
  }, [toast, reduced, y, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
  // Nach dem Ausblenden bleibt die letzte Meldung unsichtbar stehen (Deckkraft 0), bis die nächste kommt.
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + BottomTabInset + Spacing.three }]}>
      <Animated.View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.toast, { backgroundColor: theme.primary }, style]}>
        <Icon name="check" color={theme.onPrimary} size={16} strokeWidth={2.4} />
        <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
          {toast.text}
        </ThemedText>
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
});
