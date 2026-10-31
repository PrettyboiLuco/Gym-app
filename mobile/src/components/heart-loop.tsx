import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

const FRAMES = 36;
const COLS = 6;
const FPS = 18;
const sprites = {
  dark: require('@/assets/images/heart-sprite-dark.jpg'),
  light: require('@/assets/images/heart-sprite-light.jpg'),
};

/**
 * Das 3D-Herz (getlayers.ai „SVG to 3D“, vorgerendert in design/logo/sprite.js) pendelt sanft – Bild für Bild
 * aus einem Raster. Nur im Erststart (einmaliger Auftritt). Bei „Bewegung reduzieren“ steht das erste Bild.
 */
export function HeartLoop({ size = 140 }: { size?: number }) {
  const scheme = useColorScheme();
  const reduced = useReducedMotion();
  const frame = useSharedValue(0);
  const elapsed = useSharedValue(0);

  useFrameCallback((info) => {
    if (reduced) return;
    elapsed.value += info.timeSincePreviousFrame ?? 0;
    const next = Math.floor((elapsed.value / 1000) * FPS) % FRAMES;
    if (next !== frame.value) frame.value = next;
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -(frame.value % COLS) * size }, { translateY: -Math.floor(frame.value / COLS) * size }],
  }));

  return (
    <View style={[styles.clip, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={style}>
        <Image source={sprites[scheme]} style={{ width: size * COLS, height: size * COLS }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
