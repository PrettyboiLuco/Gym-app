import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { Press } from '@/constants/motion';

/**
 * Antippbare Fläche, die beim Drücken einfedert und beim Loslassen mit leichtem Überschwingen zurückspringt (Press).
 * `scaleTo`: Knöpfe 0.95, Zeilen 0.98. `wrapStyle` gilt für die äußere, bewegte Hülle (z. B. flex: 1 in einer Reihe).
 * Bei „Bewegung reduzieren“ bleibt nur die Farbe der gedrückten Fläche.
 */
export function PressableScale({
  scaleTo = Press.row,
  wrapStyle,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps & { scaleTo?: number; wrapStyle?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[wrapStyle, style]}>
      <Pressable
        {...props}
        onPressIn={(e: GestureResponderEvent) => {
          if (!reduced && !props.disabled) scale.set(withSpring(scaleTo, Press.in));
          onPressIn?.(e);
        }}
        onPressOut={(e: GestureResponderEvent) => {
          if (!reduced) scale.set(withSpring(1, Press.out));
          onPressOut?.(e);
        }}
      />
    </Animated.View>
  );
}
