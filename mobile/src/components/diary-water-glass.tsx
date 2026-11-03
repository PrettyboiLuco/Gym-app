// Wasserglas (Ausbauplan B1, N10): füllt sich mit dem Trinkfortschritt; bei „+ ml“ schwappt eine kurze Welle.
// Steht beim Öffnen still (keine Eingangs-Animation); bei „Bewegung reduzieren“ springt der Pegel ohne Welle.

import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';
import { Spring } from '@/constants/motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const W = 56;
const H = 76;
/** Glas als Trapez (oben breiter), innen 3 px Rand. */
const GLASS = `M 4 4 L ${W - 4} 4 L ${W - 10} ${H - 4} Q ${W - 11} ${H - 2} ${W - 13} ${H - 2} L 13 ${H - 2} Q 11 ${H - 2} 10 ${H - 4} Z`;
/** Welle: Höhe am Anfang, Dauer bis sie sich beruhigt hat. */
const WAVE = { amp: 5, settleMs: 1400, turns: 2 } as const;

function wavePath(level: number, amp: number, phase: number) {
  'worklet';
  const clamped = Math.min(Math.max(level, 0), 1);
  const top = H - 2 - clamped * (H - 8);
  let d = `M 0 ${top}`;
  for (let x = 0; x <= W; x += 4) d += ` L ${x} ${top + Math.sin((x / W) * Math.PI * 3 + phase) * amp * (clamped > 0 ? 1 : 0)}`;
  return `${d} L ${W} ${H} L 0 ${H} Z`;
}

export function DiaryWaterGlass({ progress, color, outline }: { progress: number; color: string; outline: string }) {
  const reduced = useReducedMotion();
  const target = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;
  const level = useSharedValue(target);
  const amp = useSharedValue(0);
  const phase = useSharedValue(0);
  const previous = useRef(target);

  useEffect(() => {
    const rising = target > previous.current;
    previous.current = target;
    if (reduced) {
      level.set(target);
      amp.set(0);
      return;
    }
    level.set(withSpring(target, Spring));
    if (rising) {
      amp.set(withSequence(withTiming(WAVE.amp, { duration: 120 }), withTiming(0, { duration: WAVE.settleMs, easing: Easing.out(Easing.quad) })));
      phase.set(withTiming(phase.get() + WAVE.turns * 2 * Math.PI, { duration: WAVE.settleMs + 120, easing: Easing.out(Easing.quad) }));
    }
  }, [amp, level, phase, reduced, target]);

  const water = useAnimatedProps(() => ({ d: wavePath(level.value, amp.value, phase.value) }));

  return (
    <View style={{ width: W, height: H }} {...HIDDEN}>
      <Svg width={W} height={H}>
        <Defs>
          <ClipPath id="diary-glass">
            <Path d={GLASS} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#diary-glass)">
          <AnimatedPath animatedProps={water} fill={color} />
        </G>
        <Path d={GLASS} stroke={outline} strokeWidth={2} fill="none" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
