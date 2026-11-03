// Zeile eines Tagebucheintrags (Ausbauplan B1): Uhrzeit sichtbar, neuer Eintrag blendet sich ein und leuchtet kurz in
// Lime auf (N2), Löschen per Wisch-Geste nach links mit Ausblenden (N3). Bei „Bewegung reduzieren“ ohne Bewegung.

import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ListRow } from '@/components/fields';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { Spring } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/** Breite der aufgedeckten Löschfläche; weiter als FULL_SWIPE der Zeilenbreite gewischt = sofort löschen. */
const ACTION_WIDTH = 84;
const FULL_SWIPE = 0.6;
/** Nach rechts gibt die Zeile nur gedämpft nach (Gummiband). */
const RUBBER = 0.25;
/** Lime-Puls nach dem Eintragen: kurz an, dann in 900 ms aus. */
const PULSE = { inMs: 140, holdMs: 260, outMs: 900, opacity: 0.32 } as const;

// Layout-Animationen nur nativ (im Web wie beim Training ohne).
const NATIVE = Platform.OS !== 'web';
// Im Browser: senkrecht scrollt die Seite, waagrecht gehört die Bewegung der Zeile (sonst bricht der Browser sie ab).
const WEB_PAN_Y = NATIVE ? null : ({ touchAction: 'pan-y' } as object);

export function DiaryEntryRow({
  title,
  subtitle,
  fresh = false,
  onPress,
  onDelete,
}: {
  title: string;
  subtitle: string;
  /** Gerade eingetragen: einblenden und kurz aufleuchten. */
  fresh?: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const pulse = useSharedValue(0);
  const open = useRef(false);
  const removing = useRef(false);

  useEffect(() => {
    if (!fresh || reduced) return;
    pulse.set(withSequence(withTiming(1, { duration: PULSE.inMs }), withDelay(PULSE.holdMs, withTiming(0, { duration: PULSE.outMs }))));
  }, [fresh, pulse, reduced]);

  const remove = () => {
    if (removing.current) return;
    removing.current = true;
    haptic.warning();
    onDelete();
  };

  const settle = (to: number) => {
    open.current = to !== 0;
    x.set(reduced ? to : withSpring(to, Spring));
  };

  const swipeAway = () => {
    const w = width || 400;
    if (reduced) {
      x.set(-w);
      remove();
      return;
    }
    x.set(
      withTiming(-w, { duration: 180 }, (done) => {
        if (done) scheduleOnRN(remove);
      })
    );
  };

  // Wisch-Geste über das Antwort-System von React Native (läuft auch in Expo Go und im Web): erst bei deutlich
  // waagrechter Bewegung übernimmt die Zeile, senkrechtes Scrollen bleibt bei der Liste.
  const touch = useRef({ x: 0, y: 0, base: 0 });
  const delta = (e: GestureResponderEvent) => ({ dx: e.nativeEvent.pageX - touch.current.x, dy: e.nativeEvent.pageY - touch.current.y });
  const gesture = {
    onTouchStart: (e: GestureResponderEvent) => {
      touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, base: open.current ? -ACTION_WIDTH : 0 };
    },
    onMoveShouldSetResponderCapture: (e: GestureResponderEvent) => {
      const { dx, dy } = delta(e);
      return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
    },
    onResponderTerminationRequest: () => false,
    onResponderMove: (e: GestureResponderEvent) => {
      const next = touch.current.base + delta(e).dx;
      x.set(next > 0 ? next * RUBBER : next);
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      const next = touch.current.base + delta(e).dx;
      if (next < -(width || 400) * FULL_SWIPE) swipeAway();
      else if (next < -ACTION_WIDTH / 2) settle(-ACTION_WIDTH);
      else settle(0);
    },
    onResponderTerminate: () => settle(open.current ? -ACTION_WIDTH : 0),
  };

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const glow = useAnimatedStyle(() => ({ opacity: pulse.value * PULSE.opacity }));
  // Löschfläche nur beim Wischen zeigen (sonst schimmert das Rot an den Kanten durch).
  const reveal = useAnimatedStyle(() => ({ opacity: x.value < -1 ? 1 : 0 }));
  const animate = NATIVE && !reduced;

  return (
    <Animated.View
      entering={animate && fresh ? FadeInUp.springify().stiffness(Spring.stiffness).damping(Spring.damping) : undefined}
      exiting={animate ? FadeOut.duration(200) : undefined}
      layout={animate ? LinearTransition.springify().stiffness(Spring.stiffness).damping(Spring.damping) : undefined}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={styles.clip}
      accessible={false}>
      <Animated.View style={[styles.action, { backgroundColor: theme.danger }, reveal]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t('common.delete')} ${title}`} onPress={swipeAway} style={styles.actionButton}>
          <Icon name="trash" color={theme.onDanger} size={20} />
        </Pressable>
      </Animated.View>
      <Animated.View
        {...gesture}
        style={[{ backgroundColor: theme.backgroundElement }, WEB_PAN_Y, slide]}
        accessibilityActions={[{ name: 'delete', label: t('common.delete') }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'delete') remove();
        }}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, { backgroundColor: theme.accent }, glow]} />
        <ListRow
          title={title}
          subtitle={subtitle}
          accessory="›"
          onPress={() => {
            if (open.current) settle(0);
            else onPress();
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  action: { ...StyleSheet.absoluteFill, flexDirection: 'row', justifyContent: 'flex-end' },
  actionButton: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center' },
  glow: { borderRadius: 12 },
});
