import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { HIDDEN_FROM_A11Y } from '@/components/a11y-hidden';
import { useColorScheme } from '@/hooks/use-color-scheme';

const FRAMES = 36;
const COLS = 6;
const FPS = 18;
/** Etwas Luft, bis der Takt nach dem letzten Schwung abgeschaltet wird (das letzte Bild soll noch kommen). */
const STOP_MARGIN_MS = 200;
const sprites = {
  dark: require('@/assets/images/heart-sprite-dark.jpg'),
  light: require('@/assets/images/heart-sprite-light.jpg'),
};

/**
 * Das 3D-Herz (getlayers.ai „SVG to 3D“, vorgerendert in design/logo/sprite.js) pendelt sanft – Bild für Bild
 * aus einem Raster. Nur im Erststart (einmaliger Auftritt). Bei „Bewegung reduzieren“ steht das erste Bild.
 */
export function HeartLoop({ size = 140, loops }: { size?: number; /** Nach so vielen Schwüngen still stehen (Abschluss-Bildschirm). */ loops?: number }) {
  const scheme = useColorScheme();
  const reduced = useReducedMotion();
  const frame = useSharedValue(0);
  const elapsed = useSharedValue(0);

  const loop = useFrameCallback((info) => {
    if (loops !== undefined && elapsed.value >= (loops * FRAMES * 1000) / FPS) {
      frame.value = 0;
      return;
    }
    elapsed.value += info.timeSincePreviousFrame ?? 0;
    const next = Math.floor((elapsed.value / 1000) * FPS) % FRAMES;
    if (next !== frame.value) frame.value = next;
  }, false);

  // Der Bild-für-Bild-Takt läuft nur, solange sich etwas bewegt: bei „Bewegung reduzieren“ gar nicht,
  // mit `loops` nur bis zum Ende der Schwünge (danach steht das erste Bild) – sonst kostet er Akku.
  useEffect(() => {
    if (reduced) {
      loop.setActive(false);
      frame.set(0);
      return;
    }
    loop.setActive(true);
    if (loops === undefined) return;
    const left = Math.max(0, (loops * FRAMES * 1000) / FPS - elapsed.get()) + STOP_MARGIN_MS;
    const stop = setTimeout(() => {
      loop.setActive(false);
      frame.set(0);
    }, left);
    return () => clearTimeout(stop);
  }, [reduced, loops, loop, frame, elapsed]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -(frame.value % COLS) * size }, { translateY: -Math.floor(frame.value / COLS) * size }],
  }));

  return (
    <View style={[styles.clip, { width: size, height: size }]} {...HIDDEN_FROM_A11Y}>
      <Animated.View style={style}>
        <Image source={sprites[scheme]} style={{ width: size * COLS, height: size * COLS }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
