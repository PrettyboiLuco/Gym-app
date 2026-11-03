import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { CountUp } from '@/constants/motion';

/**
 * Zahl zählt von 0 zum Ziel hoch (ease-out cubic, CountUp) – für den Abschluss-Bildschirm. Ohne `enabled` oder bei
 * „Bewegung reduzieren“ steht sofort der Zielwert.
 */
export function useCountUp(target: number, enabled: boolean): number {
  const reduced = useReducedMotion();
  const animate = enabled && !reduced;
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const start = Date.now() + CountUp.delayMs;
    const tick = () => {
      const p = Math.min(Math.max((Date.now() - start) / CountUp.durationMs, 0), 1);
      setValue(target * (1 - (1 - p) ** 3));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, target]);
  return animate ? value : target;
}
