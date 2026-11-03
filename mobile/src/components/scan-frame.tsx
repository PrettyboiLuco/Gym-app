// Scanner-Rahmen (N9): vier Ecken über dem Kamerabild; bei Erkennung ziehen sie sich auf den Code zusammen und werden zum Haken.
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';
import { scanTargetRect, type Rect } from '@/components/set-table-logic';
import { ScanLock } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CORNER = 28;
const STROKE = 3;
const CHECK = 64;
/** Länge des Hakens (Pfad unten), damit er sich von links nach rechts zeichnen kann. */
const CHECK_LENGTH = 22;

/** Ruhestellung: breites Feld in der Mitte, wie ein Strichcode auf der Packung. */
function idleRect(box: { width: number; height: number }): Rect {
  const width = box.width * 0.8;
  const height = Math.min(120, box.height * 0.45);
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
}

/**
 * Ecken-Rahmen über der Kamera. `lock`: Code erkannt (mit seiner Lage im Bild, falls die Kamera sie kennt) – die Ecken
 * federn auf den Code, werden Lime, und der Rahmen wird zum Haken im Lime-Kreis. Nach `ScanLock.holdMs` meldet `onDone`,
 * dass das Kamerabild weichen kann. Bei „Bewegung reduzieren“ steht der Haken sofort da.
 */
export function ScanFrame({ lock, onDone }: { lock: { bounds: Rect | null } | null; onDone: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const done = useSharedValue(0);

  // Ruhestellung, sobald die Größe des Kamerafelds bekannt ist.
  useEffect(() => {
    if (!box || lock) return;
    const r = idleRect(box);
    x.set(r.x);
    y.set(r.y);
    w.set(r.width);
    h.set(r.height);
    done.set(0);
  }, [box, lock, x, y, w, h, done]);

  // Erkannt: auf den Code ziehen, dann zum Haken; danach Bescheid geben.
  useEffect(() => {
    if (!lock || !box) return;
    const r = scanTargetRect(lock.bounds, box);
    const to = (v: typeof x, value: number) => v.set(reduced ? value : withSpring(value, ScanLock.spring));
    to(x, r.x);
    to(y, r.y);
    to(w, r.width);
    to(h, r.height);
    done.set(reduced ? 1 : withDelay(ScanLock.checkDelayMs, withTiming(1, { duration: ScanLock.checkMs, easing: Easing.out(Easing.cubic) })));
    const timer = setTimeout(onDone, ScanLock.holdMs);
    return () => clearTimeout(timer);
  }, [lock, box, reduced, onDone, x, y, w, h, done]);

  const frame = useAnimatedStyle(() => ({ left: x.value, top: y.value, width: w.value, height: h.value }));
  const corners = useAnimatedStyle(() => ({ opacity: 1 - done.value, transform: [{ scale: 1 - 0.25 * done.value }] }));
  const circle = useAnimatedStyle(() => ({ opacity: Math.min(1, done.value * 2), transform: [{ scale: 0.4 + 0.6 * done.value }] }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - done.value) }));

  const color = lock ? theme.accent : '#FFFFFF';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e: LayoutChangeEvent) => setBox(e.nativeEvent.layout)} {...HIDDEN}>
      {box ? (
        <Animated.View style={[styles.frame, frame]}>
          <Animated.View style={[StyleSheet.absoluteFill, corners]}>
            <View style={[styles.corner, styles.tl, { borderColor: color }]} />
            <View style={[styles.corner, styles.tr, { borderColor: color }]} />
            <View style={[styles.corner, styles.bl, { borderColor: color }]} />
            <View style={[styles.corner, styles.br, { borderColor: color }]} />
          </Animated.View>
          {lock ? (
            <Animated.View style={[styles.check, { backgroundColor: theme.accent }, circle]}>
              <Svg width={32} height={32} viewBox="0 0 24 24">
                <AnimatedPath
                  d="M5 12.5 10 17.5 19 7"
                  stroke={theme.onAccent}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={`${CHECK_LENGTH} ${CHECK_LENGTH}`}
                  animatedProps={checkProps}
                />
              </Svg>
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  tl: { left: 0, top: 0, borderLeftWidth: STROKE, borderTopWidth: STROKE, borderTopLeftRadius: 10 },
  tr: { right: 0, top: 0, borderRightWidth: STROKE, borderTopWidth: STROKE, borderTopRightRadius: 10 },
  bl: { left: 0, bottom: 0, borderLeftWidth: STROKE, borderBottomWidth: STROKE, borderBottomLeftRadius: 10 },
  br: { right: 0, bottom: 0, borderRightWidth: STROKE, borderBottomWidth: STROKE, borderBottomRightRadius: 10 },
  check: { width: CHECK, height: CHECK, borderRadius: CHECK / 2, alignItems: 'center', justifyContent: 'center' },
});
