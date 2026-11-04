// Zahl zählt weich zum Zielwert hoch (Abschluss-Bildschirm, Kacheln, Tagesübersicht der Ernährung).
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { CountUp } from '@/constants/motion';

/**
 * Zahl zählt von 0 zum Ziel hoch (ease-out cubic, CountUp). Mit `fromPrevious` zählt sie bei einem neuen Ziel vom
 * zuletzt gezeigten Wert aus weiter (z. B. anderer Tag) statt wieder bei 0 zu beginnen. Ohne `enabled` oder bei
 * „Bewegung reduzieren“ steht sofort der Zielwert.
 */
export function useCountUp(target: number, enabled: boolean, fromPrevious = false): number {
  const reduced = useReducedMotion();
  const animate = enabled && !reduced;
  const [value, setValue] = useState(0);
  const shown = useRef(0);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const from = fromPrevious ? shown.current : 0;
    const start = Date.now() + CountUp.delayMs;
    const tick = () => {
      const p = Math.min(Math.max((Date.now() - start) / CountUp.durationMs, 0), 1);
      const next = from + (target - from) * (1 - (1 - p) ** 3);
      shown.current = next;
      setValue(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, fromPrevious, target]);
  return animate ? value : target;
}
