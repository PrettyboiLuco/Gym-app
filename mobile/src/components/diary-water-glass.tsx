// Wasserglas (Ausbauplan B1, N10): füllt sich mit dem Trinkfortschritt; bei „+ ml“ schwappt eine kurze Welle.
// Steht beim Öffnen still (keine Eingangs-Animation); bei „Bewegung reduzieren“ springt der Pegel ohne Welle.
// Aufbau wie ein echtes Trinkglas: leicht getönter Körper, dicker Boden, Lichtreflex links, Markierungen bei ¼ ½ ¾,
// Wasser mit Verlauf, einer zweiten, gegenläufigen Welle dahinter und heller Oberkante.

import { useEffect, useId, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';
import { Spring } from '@/constants/motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const W = 64;
const H = 88;
/** Innenraum: oben 6 px Rand, unten dicker Glasboden. */
const TOP = 6;
const FLOOR = H - 10;
/** Glas als Trapez (oben breiter) mit abgerundetem Fuß. */
const GLASS = `M 4 3 L ${W - 4} 3 L ${W - 11} ${H - 6} Q ${W - 12} ${H - 2} ${W - 16} ${H - 2} L 16 ${H - 2} Q 12 ${H - 2} 11 ${H - 6} Z`;
/** Dicker Boden: die untersten Pixel im Glas. */
const BASE = `M 10.4 ${FLOOR} L ${W - 10.4} ${FLOOR} L ${W - 11} ${H - 6} Q ${W - 12} ${H - 2} ${W - 16} ${H - 2} L 16 ${H - 2} Q 12 ${H - 2} 11 ${H - 6} Z`;
/** Lichtreflex: schmaler Streifen parallel zur linken Wand. */
const SHINE = `M 9 9 L 13 9 L 17 ${H - 18} L 14.5 ${H - 18} Z`;
/** Welle: Höhe am Anfang, Dauer bis sie sich beruhigt hat. */
const WAVE = { amp: 5, settleMs: 1400, turns: 2 } as const;

/** Rechte Glaswand bei Höhe y (für die Markierungen). */
const rightWall = (y: number) => W - 4 - ((y - 3) / (H - 9)) * 7;
const levelY = (p: number) => FLOOR - p * (FLOOR - TOP);

function wavePath(level: number, amp: number, phase: number, flip: number) {
  'worklet';
  const clamped = Math.min(Math.max(level, 0), 1);
  const top = FLOOR - clamped * (FLOOR - TOP);
  // Ganz leer: kein Wasser (auch keine Linie am Boden).
  if (clamped <= 0) return `M 0 ${H} L ${W} ${H} Z`;
  let d = `M 0 ${top}`;
  for (let x = 0; x <= W; x += 4) d += ` L ${x} ${top + Math.sin((x / W) * Math.PI * 3 * flip + phase) * amp}`;
  return `${d} L ${W} ${H} L 0 ${H} Z`;
}

function surfacePath(level: number, amp: number, phase: number) {
  'worklet';
  const clamped = Math.min(Math.max(level, 0), 1);
  if (clamped <= 0) return 'M 0 0';
  const top = FLOOR - clamped * (FLOOR - TOP);
  let d = `M 0 ${top + Math.sin(phase) * amp}`;
  for (let x = 4; x <= W; x += 4) d += ` L ${x} ${top + Math.sin((x / W) * Math.PI * 3 + phase) * amp}`;
  return d;
}

export function DiaryWaterGlass({ progress, color, outline }: { progress: number; color: string; outline: string }) {
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, '');
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

  const water = useAnimatedProps(() => ({ d: wavePath(level.value, amp.value, phase.value, 1) }));
  // Zweite Welle dahinter, gegenläufig und etwas höher: das Wasser wirkt tief statt flach.
  const back = useAnimatedProps(() => ({ d: wavePath(level.value > 0.001 ? level.value + 0.015 : 0, amp.value * 0.8, -phase.value + 1.2, -1) }));
  const surface = useAnimatedProps(() => ({ d: surfacePath(level.value, amp.value, phase.value) }));

  return (
    <View style={{ width: W, height: H }} {...HIDDEN}>
      <Svg width={W} height={H}>
        <Defs>
          <ClipPath id={`glass-${id}`}>
            <Path d={GLASS} />
          </ClipPath>
          <LinearGradient id={`water-${id}`} x1="0" y1={TOP} x2="0" y2={FLOOR} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={0.72} />
          </LinearGradient>
          <LinearGradient id={`body-${id}`} x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={outline} stopOpacity={0.16} />
            <Stop offset="0.5" stopColor={outline} stopOpacity={0.05} />
            <Stop offset="1" stopColor={outline} stopOpacity={0.14} />
          </LinearGradient>
        </Defs>
        {/* Glaskörper: leicht getönt, an den Wänden etwas dichter (wie Licht im Glas). */}
        <Path d={GLASS} fill={`url(#body-${id})`} />
        <G clipPath={`url(#glass-${id})`}>
          <AnimatedPath animatedProps={back} fill={color} fillOpacity={0.35} />
          <AnimatedPath animatedProps={water} fill={`url(#water-${id})`} />
          <AnimatedPath animatedProps={surface} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.2} fill="none" />
          {/* Dicker Glasboden über dem Wasser. */}
          <Path d={BASE} fill={outline} fillOpacity={0.18} />
        </G>
        {/* Markierungen bei ¼, ½, ¾ an der rechten Wand – die Hälfte etwas länger. */}
        {[0.25, 0.5, 0.75].map((p) => {
          const y = levelY(p);
          const x = rightWall(y);
          return <Line key={p} x1={x - (p === 0.5 ? 9 : 6)} x2={x - 1.5} y1={y} y2={y} stroke={outline} strokeWidth={1.5} strokeLinecap="round" />;
        })}
        <Path d={SHINE} fill="#FFFFFF" fillOpacity={0.14} />
        <Path d={GLASS} stroke={outline} strokeWidth={2} fill="none" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
