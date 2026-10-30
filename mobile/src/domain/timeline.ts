// Gemeinsame Timer-Engine für Dehnroutinen, Aufwärmen/Cool-down und HIIT (Register STRETCH-004,
// HIIT-003, HEALTH-010/011). Gespeichert wird nur die Startzeit plus Pausen und Sprünge; die aktuelle
// Phase wird daraus berechnet. So geht nach einem App-Neustart keine Phase verloren oder doppelt.

export type Side = 'links' | 'rechts';

export type StepKind =
  | 'vorbereitung' // kurz vor dem Start: erste Übung wird angekündigt
  | 'halten' // Dehnung halten bzw. Mobilisation ausführen
  | 'belastung' // HIIT: Übung ausführen
  | 'seitenwechsel'
  | 'wechsel' // zur nächsten Dehnübung
  | 'pause' // HIIT: Pause zwischen Übungen
  | 'rundenpause';

export type Step = {
  kind: StepKind;
  seconds: number;
  /** Übung dieses Schritts; bei Pausen und Wechseln die nächste Übung (für die Ansage). */
  exerciseId: string;
  side?: Side;
  /** Position der Übung in der Folge (0-basiert) und Runde (1-basiert). */
  index: number;
  round: number;
};

export type TimedItem = { exerciseId: string; seconds: number; bothSides: boolean };

/** Ablauf einer Dehnroutine: einseitige Übungen links → Seitenwechsel → rechts (wie Referenzmodell). */
export function stretchSteps(items: TimedItem[], switchSeconds: number, transitionSeconds: number, prepSeconds = 5): Step[] {
  if (items.length === 0) throw new Error('routine needs items');
  const steps: Step[] = [];
  if (prepSeconds > 0) steps.push({ kind: 'vorbereitung', seconds: prepSeconds, exerciseId: items[0].exerciseId, index: 0, round: 1 });
  items.forEach((item, index) => {
    if (item.seconds <= 0) throw new Error('hold must be positive');
    const base = { exerciseId: item.exerciseId, index, round: 1 };
    if (index > 0 && transitionSeconds > 0) steps.push({ kind: 'wechsel', seconds: transitionSeconds, ...base });
    if (item.bothSides) {
      steps.push({ kind: 'halten', seconds: item.seconds, side: 'links', ...base });
      if (switchSeconds > 0) steps.push({ kind: 'seitenwechsel', seconds: switchSeconds, side: 'rechts', ...base });
      steps.push({ kind: 'halten', seconds: item.seconds, side: 'rechts', ...base });
    } else {
      steps.push({ kind: 'halten', seconds: item.seconds, ...base });
    }
  });
  return steps;
}

export type HiitConfig = {
  items: { exerciseId: string; bothSides: boolean }[];
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  roundRestSeconds: number;
  switchSeconds?: number;
  prepSeconds?: number;
};

/**
 * HIIT-Ablauf: je Runde alle Übungen mit Belastung und Pause; nach der letzten Übung einer Runde
 * die Rundenpause, nach der allerletzten nichts mehr.
 */
export function hiitSteps(config: HiitConfig): Step[] {
  const { items, workSeconds, restSeconds, rounds, roundRestSeconds } = config;
  const switchSeconds = config.switchSeconds ?? 5;
  const prepSeconds = config.prepSeconds ?? 10;
  if (items.length === 0 || workSeconds <= 0 || rounds < 1) throw new Error('invalid hiit config');
  const steps: Step[] = [];
  if (prepSeconds > 0) steps.push({ kind: 'vorbereitung', seconds: prepSeconds, exerciseId: items[0].exerciseId, index: 0, round: 1 });
  for (let round = 1; round <= rounds; round++) {
    items.forEach((item, index) => {
      const base = { exerciseId: item.exerciseId, index, round };
      if (item.bothSides) {
        steps.push({ kind: 'belastung', seconds: workSeconds, side: 'links', ...base });
        if (switchSeconds > 0) steps.push({ kind: 'seitenwechsel', seconds: switchSeconds, side: 'rechts', ...base });
        steps.push({ kind: 'belastung', seconds: workSeconds, side: 'rechts', ...base });
      } else {
        steps.push({ kind: 'belastung', seconds: workSeconds, ...base });
      }
      const lastItem = index === items.length - 1;
      if (!lastItem && restSeconds > 0) {
        steps.push({ kind: 'pause', seconds: restSeconds, exerciseId: items[index + 1].exerciseId, index: index + 1, round });
      } else if (lastItem && round < rounds && roundRestSeconds > 0) {
        steps.push({ kind: 'rundenpause', seconds: roundRestSeconds, exerciseId: items[0].exerciseId, index: 0, round: round + 1 });
      }
    });
  }
  return steps;
}

export function stepsTotalSeconds(steps: Step[]): number {
  return steps.reduce((sum, s) => sum + s.seconds, 0);
}

export type TimelineState =
  | { done: false; index: number; step: Step; remainingMs: number; next: Step | null }
  | { done: true; index: number };

/** Aktueller Schritt aus der verstrichenen Zeit. */
export function timelineState(steps: Step[], elapsedMs: number): TimelineState {
  let start = 0;
  const elapsed = Math.max(0, elapsedMs);
  for (let i = 0; i < steps.length; i++) {
    const end = start + steps[i].seconds * 1000;
    if (elapsed < end) return { done: false, index: i, step: steps[i], remainingMs: end - elapsed, next: steps[i + 1] ?? null };
    start = end;
  }
  return { done: true, index: steps.length };
}

// ------------------------------------------------------------------------------- Laufender Ablauf

export type RunKind = 'dehnen' | 'hiit' | 'aufwaermen' | 'cooldown';

export type TimedRun = {
  kind: RunKind;
  title: string;
  steps: Step[];
  sessionId: string;
  startedAtMs: number;
  /** Gesetzt, solange pausiert. */
  pausedAtMs: number | null;
  pausedMs: number;
  /** Übersprungene Zeit (Überspringen springt ans Ende des aktuellen Schritts). */
  skippedMs: number;
  /** Zugehöriges Krafttraining bei Aufwärmen/Cool-down. */
  workoutSessionId: string | null;
};

export function newRun(fields: Pick<TimedRun, 'kind' | 'title' | 'steps' | 'sessionId' | 'workoutSessionId'>, nowMs: number): TimedRun {
  return { ...fields, startedAtMs: nowMs, pausedAtMs: null, pausedMs: 0, skippedMs: 0 };
}

export function runElapsedMs(run: TimedRun, nowMs: number): number {
  return (run.pausedAtMs ?? nowMs) - run.startedAtMs - run.pausedMs + run.skippedMs;
}

export function pauseRun(run: TimedRun, nowMs: number): TimedRun {
  return run.pausedAtMs === null ? { ...run, pausedAtMs: nowMs } : run;
}

export function resumeRun(run: TimedRun, nowMs: number): TimedRun {
  return run.pausedAtMs === null ? run : { ...run, pausedAtMs: null, pausedMs: run.pausedMs + (nowMs - run.pausedAtMs) };
}

/** Springt zum Beginn des nächsten Schritts. */
export function skipStep(run: TimedRun, nowMs: number): TimedRun {
  const state = timelineState(run.steps, runElapsedMs(run, nowMs));
  return state.done ? run : { ...run, skippedMs: run.skippedMs + state.remainingMs };
}

/** Tatsächlich absolvierte Sekunden (ohne übersprungene Zeit), höchstens die Gesamtdauer. */
export function runDoneSeconds(run: TimedRun, nowMs: number): number {
  const active = (run.pausedAtMs ?? nowMs) - run.startedAtMs - run.pausedMs;
  return Math.max(0, Math.min(stepsTotalSeconds(run.steps), Math.round(active / 1000)));
}

/** Vollständig absolvierte Runden (für das Protokoll). Rundenpausen gehören schon zur nächsten Runde. */
export function runRoundsDone(run: TimedRun, nowMs: number): number {
  const state = timelineState(run.steps, runElapsedMs(run, nowMs));
  if (state.done) return Math.max(...run.steps.map((s) => s.round));
  return state.step.round - 1;
}
