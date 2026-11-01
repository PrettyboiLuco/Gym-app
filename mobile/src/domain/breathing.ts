// Atemübung (Ausbauplan A6.11). Zwei feste Muster, Takt in Sekunden; keine Wirkversprechen.

export const BREATH_PATTERNS = ['ruhig', '478'] as const;
export type BreathPattern = (typeof BREATH_PATTERNS)[number];
export type BreathPhaseKind = 'ein' | 'halten' | 'aus' | 'haltenLeer';

/** Ruhig: 4 s ein, 6 s aus. 4-7-8: 4 s ein, 7 s halten, 8 s aus. */
export const BREATH_STEPS: Record<BreathPattern, { kind: BreathPhaseKind; seconds: number }[]> = {
  ruhig: [
    { kind: 'ein', seconds: 4 },
    { kind: 'aus', seconds: 6 },
  ],
  '478': [
    { kind: 'ein', seconds: 4 },
    { kind: 'halten', seconds: 7 },
    { kind: 'aus', seconds: 8 },
  ],
};

export function cycleSeconds(pattern: BreathPattern): number {
  return BREATH_STEPS[pattern].reduce((s, p) => s + p.seconds, 0);
}

/** Phase zum Zeitpunkt `elapsedMs` seit Start. */
export function breathPhaseAt(pattern: BreathPattern, elapsedMs: number): { kind: BreathPhaseKind; remainingMs: number; cycle: number } {
  const cycleMs = cycleSeconds(pattern) * 1000;
  const cycle = Math.floor(elapsedMs / cycleMs);
  let inCycle = elapsedMs - cycle * cycleMs;
  for (const step of BREATH_STEPS[pattern]) {
    const ms = step.seconds * 1000;
    if (inCycle < ms) return { kind: step.kind, remainingMs: ms - inCycle, cycle };
    inCycle -= ms;
  }
  return { kind: 'ein', remainingMs: BREATH_STEPS[pattern][0].seconds * 1000, cycle: cycle + 1 };
}
