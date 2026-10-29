// Trainingslogik ohne Oberfläche (Register TRAIN-002, -004, -007, -013, -015, HEALTH-008–011).

export type PlanItemDraft = {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
};
export type PlanDayDraft = { name: string; items: PlanItemDraft[] };
export type PlanDraft = { name: string; days: PlanDayDraft[] };

export type PlanProblem =
  | 'nameMissing'
  | 'noDays'
  | 'tooManyDays'
  | 'dayNameMissing'
  | 'dayEmpty'
  | 'invalidSets'
  | 'invalidReps'
  | 'invalidRest';

export const MAX_DAYS = 7;

/** Liste aller Probleme eines Plan-Entwurfs; leer bedeutet speicherbar. */
export function validatePlan(plan: PlanDraft): PlanProblem[] {
  const problems = new Set<PlanProblem>();
  if (!plan.name.trim()) problems.add('nameMissing');
  if (plan.days.length === 0) problems.add('noDays');
  if (plan.days.length > MAX_DAYS) problems.add('tooManyDays');
  for (const day of plan.days) {
    if (!day.name.trim()) problems.add('dayNameMissing');
    if (day.items.length === 0) problems.add('dayEmpty');
    for (const item of day.items) {
      if (!Number.isInteger(item.sets) || item.sets < 1 || item.sets > 20) problems.add('invalidSets');
      if (
        !Number.isInteger(item.repsMin) ||
        !Number.isInteger(item.repsMax) ||
        item.repsMin < 1 ||
        item.repsMax < item.repsMin ||
        item.repsMax > 100
      ) {
        problems.add('invalidReps');
      }
      if (!Number.isInteger(item.restSeconds) || item.restSeconds < 0 || item.restSeconds > 1800) {
        problems.add('invalidRest');
      }
    }
  }
  return [...problems];
}

/** Verschiebt ein Element (Reihenfolge von Tagen und Übungen, TRAIN-002). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return [...list];
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Liest eine ganze Zahl aus einem Eingabefeld; ungültig ergibt null. */
export function parseWholeNumber(input: string): number | null {
  const trimmed = input.trim();
  return /^\d{1,4}$/.test(trimmed) ? Number(trimmed) : null;
}

/** Liest Gewicht (0–1000 kg, Komma erlaubt) und Wiederholungen (1–100) eines Satzes. */
export function parseSetInput(weightText: string, repsText: string): { weightKg: number; reps: number } | null {
  const weight = weightText.trim().replace(',', '.');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(weight)) return null;
  const weightKg = Number(weight);
  const reps = parseWholeNumber(repsText);
  if (weightKg > 1000 || reps === null || reps < 1 || reps > 100) return null;
  return { weightKg, reps };
}

/**
 * Grobe Dauer eines Trainingstags in Minuten: Sätze × (Satzdauer + Pause). Die letzte Pause
 * je Übung fällt weg, dafür kommt ein Wechsel dazu. Nur Schätzung (TRAIN-007).
 */
export function estimateDayMinutes(
  items: Pick<PlanItemDraft, 'sets' | 'restSeconds'>[],
  secondsPerSet = 45,
  changeSeconds = 60
): number {
  const seconds = items.reduce(
    (sum, item) => sum + item.sets * secondsPerSet + (item.sets - 1) * item.restSeconds + changeSeconds,
    0
  );
  return Math.round(seconds / 60);
}

/** Vorschlag für den nächsten Trainingstag: der Tag nach dem zuletzt absolvierten. */
export function nextDayIndex(dayCount: number, lastCompletedIndex: number | null): number {
  if (dayCount <= 0) throw new Error('plan has no days');
  if (lastCompletedIndex === null || lastCompletedIndex < 0) return 0;
  return (lastCompletedIndex + 1) % dayCount;
}

// ---------------------------------------------------------------------------------------------
// Pausentimer: Der Zustand ist die Endzeit, nicht ein laufender Zähler. So bleibt er nach dem
// Schließen der App rekonstruierbar (HEALTH-011). Jede Änderung erhöht die Generation, damit
// alte Signale ignoriert werden.

export const REST_PRESETS = [30, 60, 90, 120, 180, 240, 300] as const;

/**
 * `stopped` statt null nach „Überspringen“: so bleibt die Generation erhalten und der nächste
 * Timer bekommt eine neue Nummer. Sonst würde das Endsignal für ihn als „schon gemeldet“ gelten.
 */
export type RestTimer = { endAtMs: number; durationMs: number; generation: number; stopped?: boolean } | null;

export function startRest(previous: RestTimer, seconds: number, nowMs: number): RestTimer {
  const generation = (previous?.generation ?? 0) + 1;
  if (seconds <= 0) return { endAtMs: nowMs, durationMs: 0, generation, stopped: true };
  return { endAtMs: nowMs + seconds * 1000, durationMs: seconds * 1000, generation };
}

export function extendRest(timer: RestTimer, seconds: number, nowMs: number): RestTimer {
  if (!timer || timer.stopped) return startRest(timer, seconds, nowMs);
  const base = Math.max(timer.endAtMs, nowMs);
  return {
    endAtMs: base + seconds * 1000,
    durationMs: timer.durationMs + seconds * 1000,
    generation: timer.generation + 1,
  };
}

export function stopRest(timer: RestTimer): RestTimer {
  return timer ? { ...timer, stopped: true } : null;
}

export function isRestVisible(timer: RestTimer): boolean {
  return timer !== null && !timer.stopped;
}

export function restRemainingMs(timer: RestTimer, nowMs: number): number {
  return timer && !timer.stopped ? Math.max(0, timer.endAtMs - nowMs) : 0;
}

// ---------------------------------------------------------------------------------------------
// Intervall-Timer (HIIT, HEALTH-010): Phase und Runde werden aus der verstrichenen Zeit
// berechnet, damit keine Phase doppelt gezählt oder verloren wird.

export type IntervalConfig = { workSeconds: number; restSeconds: number; rounds: number };
export type IntervalState =
  | { phase: 'arbeit' | 'pause'; round: number; remainingMs: number }
  | { phase: 'fertig'; round: number; remainingMs: 0 };

export function intervalTotalSeconds({ workSeconds, restSeconds, rounds }: IntervalConfig): number {
  // Nach der letzten Runde gibt es keine Pause mehr.
  return rounds * workSeconds + (rounds - 1) * restSeconds;
}

export function intervalState(config: IntervalConfig, elapsedMs: number): IntervalState {
  const { workSeconds, restSeconds, rounds } = config;
  if (workSeconds <= 0 || restSeconds < 0 || rounds < 1) throw new Error('invalid interval config');
  const cycleMs = (workSeconds + restSeconds) * 1000;
  if (elapsedMs >= intervalTotalSeconds(config) * 1000) return { phase: 'fertig', round: rounds, remainingMs: 0 };
  const round = Math.floor(Math.max(0, elapsedMs) / cycleMs) + 1;
  const inCycle = Math.max(0, elapsedMs) - (round - 1) * cycleMs;
  if (inCycle < workSeconds * 1000) {
    return { phase: 'arbeit', round, remainingMs: workSeconds * 1000 - inCycle };
  }
  return { phase: 'pause', round, remainingMs: cycleMs - inCycle };
}

/** Restzeit als „m:ss“. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
