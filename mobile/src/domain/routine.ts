// Ablauf für Dehnroutinen und HIIT (Register STRETCH-004, HIIT-003, HEALTH-010).
// Erzeugt die Timerphasen; einseitige Übungen werden automatisch links und rechts ausgeführt.

export type RoutineItem = { name: string; holdSeconds: number; bothSides: boolean };

export type Phase =
  | { kind: 'hold'; label: string; seconds: number }
  | { kind: 'switchSide'; seconds: number }
  | { kind: 'transition'; seconds: number };

export function routinePhases(
  items: RoutineItem[],
  switchSeconds: number,
  transitionSeconds: number
): Phase[] {
  const phases: Phase[] = [];
  items.forEach((item, index) => {
    if (item.holdSeconds <= 0) throw new Error('hold must be positive');
    if (index > 0) phases.push({ kind: 'transition', seconds: transitionSeconds });
    if (item.bothSides) {
      phases.push(
        { kind: 'hold', label: `${item.name}:links`, seconds: item.holdSeconds },
        { kind: 'switchSide', seconds: switchSeconds },
        { kind: 'hold', label: `${item.name}:rechts`, seconds: item.holdSeconds }
      );
    } else {
      phases.push({ kind: 'hold', label: item.name, seconds: item.holdSeconds });
    }
  });
  return phases;
}

export function totalSeconds(phases: Phase[]): number {
  return phases.reduce((sum, p) => sum + p.seconds, 0);
}
