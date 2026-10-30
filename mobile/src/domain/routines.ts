// Dehnroutinen und HIIT-Abläufe (Register STRETCH-001–003, HIIT-001–004). Fertige Vorlagen und
// Programme sind Kandidaten bis zur fachlichen Abnahme (Fahrplan 10.1); Zeiten sind Voreinstellungen.

import type { MuscleGroup, Sides } from './exercises';
import { parseWholeNumber } from './training';
import { hiitSteps, stretchSteps, type Step } from './timeline';

export type RoutineKind = 'dehnen' | 'hiit';

export type RoutineItemDraft = { exerciseId: string; seconds: number };

export type RoutineDraft = {
  kind: RoutineKind;
  name: string;
  items: RoutineItemDraft[];
  /** Dehnen: Pause beim Seitenwechsel und zwischen Übungen. */
  switchSeconds: number;
  transitionSeconds: number;
  /** HIIT: Belastung, Pause, Runden, Rundenpause. */
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  roundRestSeconds: number;
};

export const ROUTINE_DEFAULTS = {
  switchSeconds: 5,
  transitionSeconds: 10,
  workSeconds: 30,
  restSeconds: 30,
  rounds: 2,
  roundRestSeconds: 60,
} as const;

/** Gültigkeitsbereiche (Tippfehler-Schutz, keine Empfehlung). */
export const ROUTINE_LIMITS = {
  seconds: { min: 5, max: 300 },
  switchSeconds: { min: 0, max: 30 },
  transitionSeconds: { min: 0, max: 60 },
  workSeconds: { min: 5, max: 300 },
  restSeconds: { min: 0, max: 300 },
  rounds: { min: 1, max: 20 },
  roundRestSeconds: { min: 0, max: 600 },
  items: 30,
} as const;

export type RoutineProblem = 'name' | 'items' | 'tooMany' | 'seconds' | 'switch' | 'transition' | 'work' | 'rest' | 'rounds' | 'roundRest';

export function validateRoutine(d: RoutineDraft): RoutineProblem[] {
  const problems: RoutineProblem[] = [];
  const within = (v: number, r: { min: number; max: number }) => Number.isInteger(v) && v >= r.min && v <= r.max;
  if (!d.name.trim()) problems.push('name');
  if (d.items.length === 0) problems.push('items');
  if (d.items.length > ROUTINE_LIMITS.items) problems.push('tooMany');
  if (d.kind === 'dehnen') {
    if (d.items.some((i) => !within(i.seconds, ROUTINE_LIMITS.seconds))) problems.push('seconds');
    if (!within(d.switchSeconds, ROUTINE_LIMITS.switchSeconds)) problems.push('switch');
    if (!within(d.transitionSeconds, ROUTINE_LIMITS.transitionSeconds)) problems.push('transition');
  } else {
    if (!within(d.workSeconds, ROUTINE_LIMITS.workSeconds)) problems.push('work');
    if (!within(d.restSeconds, ROUTINE_LIMITS.restSeconds)) problems.push('rest');
    if (!within(d.rounds, ROUTINE_LIMITS.rounds)) problems.push('rounds');
    if (!within(d.roundRestSeconds, ROUTINE_LIMITS.roundRestSeconds)) problems.push('roundRest');
  }
  return problems;
}

/** Zahlenfeld aus dem Formular; ungültig wird -1 und von validateRoutine gemeldet. */
export function formNumber(text: string): number {
  return parseWholeNumber(text) ?? -1;
}

/** Zeitablauf einer Routine. `sides` liefert, ob eine Übung einseitig ist. */
export function routineSteps(d: RoutineDraft, sides: (exerciseId: string) => Sides): Step[] {
  if (d.kind === 'dehnen') {
    return stretchSteps(
      d.items.map((i) => ({ exerciseId: i.exerciseId, seconds: i.seconds, bothSides: sides(i.exerciseId) === 'einseitig' })),
      d.switchSeconds,
      d.transitionSeconds
    );
  }
  return hiitSteps({
    items: d.items.map((i) => ({ exerciseId: i.exerciseId, bothSides: sides(i.exerciseId) === 'einseitig' })),
    workSeconds: d.workSeconds,
    restSeconds: d.restSeconds,
    rounds: d.rounds,
    roundRestSeconds: d.roundRestSeconds,
  });
}

// ------------------------------------------------------------------------------------ Vorlagen

export type Template = RoutineDraft & { id: string; level?: 'anfaenger' | 'fortgeschritten'; focus?: string };

const stretch = (id: string, items: [string, number][]): Template => ({
  id,
  kind: 'dehnen',
  name: '',
  items: items.map(([exerciseId, seconds]) => ({ exerciseId, seconds })),
  ...ROUTINE_DEFAULTS,
});

/** Fertige Dehnroutinen (STRETCH-003, Vorlagen Morgens/Büro/Hüfte). */
export const STRETCH_TEMPLATES: Template[] = [
  stretch('morgens', [
    ['mob_katze_kuh', 40],
    ['mob_armkreisen', 30],
    ['mob_rumpfrotation', 30],
    ['mob_hueftkreisen', 30],
    ['dehn_hueftbeuger', 30],
    ['dehn_oberschenkel_hinten', 30],
    ['dehn_brust_tuer', 30],
    ['dehn_kindhaltung', 45],
  ]),
  stretch('buero_nacken', [
    ['mob_nacken_halbkreise', 30],
    ['dehn_nacken_seitlich', 30],
    ['mob_schulterkreisen', 30],
    ['dehn_schulter_quer', 30],
    ['dehn_brust_tuer', 30],
    ['dehn_oberer_ruecken', 30],
  ]),
  stretch('huefte_sitzen', [
    ['mob_hueftkreisen', 30],
    ['dehn_hueftbeuger', 45],
    ['dehn_gesaess_figur4', 45],
    ['dehn_schmetterling', 45],
    ['mob_ausfallschritt_rotation', 30],
    ['mob_tiefe_hocke', 30],
  ]),
];

const hiit = (
  id: string,
  focus: 'bauch' | 'ganzkoerper',
  level: 'anfaenger' | 'fortgeschritten',
  items: string[],
  timing: { work: number; rest: number; rounds: number; roundRest: number }
): Template => ({
  id,
  kind: 'hiit',
  name: '',
  focus,
  level,
  items: items.map((exerciseId) => ({ exerciseId, seconds: timing.work })),
  switchSeconds: ROUTINE_DEFAULTS.switchSeconds,
  transitionSeconds: ROUTINE_DEFAULTS.transitionSeconds,
  workSeconds: timing.work,
  restSeconds: timing.rest,
  rounds: timing.rounds,
  roundRestSeconds: timing.roundRest,
});

/**
 * Fertige HIIT-Programme (HIIT-001/002): gleiche Schwerpunkte, Stufen über Dauer, Pausen, Runden
 * und schwerere Varianten. Bauchübungen trainieren die Bauchmuskeln, sie bauen kein gezieltes
 * Bauchfett ab (HIIT-006).
 */
export const HIIT_PROGRAMS: Template[] = [
  hiit('bauch_anfaenger', 'bauch', 'anfaenger', ['crunches', 'beinheben', 'plank', 'fahrradcrunch'], {
    work: 20,
    rest: 40,
    rounds: 2,
    roundRest: 60,
  }),
  hiit('bauch_fortgeschritten', 'bauch', 'fortgeschritten', ['crunches', 'mountain_climbers', 'beinheben', 'russian_twist', 'seitstuetz', 'plank'], {
    work: 40,
    rest: 20,
    rounds: 3,
    roundRest: 60,
  }),
  hiit('ganzkoerper_anfaenger', 'ganzkoerper', 'anfaenger', ['hampelmann', 'kniebeuge_koerpergewicht', 'liegestuetze_knie', 'beckenheben', 'kniehebelauf'], {
    work: 20,
    rest: 40,
    rounds: 2,
    roundRest: 60,
  }),
  hiit('ganzkoerper_fortgeschritten', 'ganzkoerper', 'fortgeschritten', ['burpees', 'sprungkniebeuge', 'liegestuetze', 'mountain_climbers', 'ausfallschritte_wechsel', 'kniehebelauf'], {
    work: 40,
    rest: 20,
    rounds: 3,
    roundRest: 60,
  }),
];

export function findTemplate(id: string): Template | undefined {
  return [...STRETCH_TEMPLATES, ...HIIT_PROGRAMS].find((t) => t.id === id);
}

// ------------------------------------------------------------------- Aufwärmen und Cool-down

/** Dynamische Mobilisation je Muskelgruppe vor dem Training (STRETCH-001). */
const WARMUP_BY_GROUP: Record<MuscleGroup, string[]> = {
  brust: ['mob_arme_oeffnen', 'mob_armkreisen'],
  schultern: ['mob_armkreisen', 'mob_schulterkreisen'],
  arme: ['mob_armkreisen'],
  ruecken: ['mob_katze_kuh', 'mob_rumpfrotation'],
  beine: ['mob_beinpendel', 'mob_hueftkreisen', 'kniebeuge_koerpergewicht'],
  gesaess: ['mob_hueftkreisen', 'mob_ausfallschritt_rotation'],
  waden: ['mob_sprunggelenk'],
  bauch: ['mob_katze_kuh', 'mob_rumpfrotation'],
  huefte: ['mob_hueftkreisen'],
  nacken: ['mob_nacken_halbkreise'],
  ganzkoerper: ['mob_armkreisen', 'mob_hueftkreisen'],
};

/** Statische Dehnung je Muskelgruppe nach dem Training (STRETCH-002). */
const COOLDOWN_BY_GROUP: Record<MuscleGroup, string[]> = {
  brust: ['dehn_brust_tuer'],
  schultern: ['dehn_schulter_quer'],
  arme: ['dehn_trizeps'],
  ruecken: ['dehn_kindhaltung'],
  beine: ['dehn_oberschenkel_vorn', 'dehn_oberschenkel_hinten'],
  gesaess: ['dehn_gesaess_figur4'],
  waden: ['dehn_wade_wand'],
  bauch: ['dehn_kobra'],
  huefte: ['dehn_hueftbeuger'],
  nacken: ['dehn_nacken_seitlich'],
  ganzkoerper: ['dehn_kindhaltung', 'dehn_oberschenkel_hinten'],
};

const MAX_BLOCK_ITEMS = 6;

function block(groups: MuscleGroup[], map: Record<MuscleGroup, string[]>, start: string[], fallback: MuscleGroup[]): string[] {
  const order = groups.length > 0 ? groups : fallback;
  const ids = [...start];
  for (const group of order) for (const id of map[group]) if (!ids.includes(id)) ids.push(id);
  return ids.slice(0, MAX_BLOCK_ITEMS);
}

/**
 * Aufwärmen passend zu den Muskelgruppen des Tages: erst allgemein (Hampelmann), dann
 * Mobilisation, höchstens 6 Übungen. Ohne Plan (freies Training) eine allgemeine Folge.
 */
export function warmupItems(groups: MuscleGroup[], holdOf: (id: string) => number): RoutineItemDraft[] {
  return block(groups, WARMUP_BY_GROUP, ['hampelmann'], ['ganzkoerper', 'ruecken', 'beine']).map((exerciseId) => ({
    exerciseId,
    seconds: exerciseId === 'hampelmann' ? 60 : exerciseId === 'kniebeuge_koerpergewicht' ? 30 : holdOf(exerciseId),
  }));
}

/** Kurzes Cool-down mit statischen Dehnungen für die trainierten Muskelgruppen. */
export function cooldownItems(groups: MuscleGroup[], holdOf: (id: string) => number): RoutineItemDraft[] {
  return block(groups, COOLDOWN_BY_GROUP, [], ['ganzkoerper', 'brust', 'beine']).map((exerciseId) => ({
    exerciseId,
    seconds: holdOf(exerciseId),
  }));
}

/** Aufwärmen/Cool-down als Dehn-Ablauf mit kurzen Wechseln. */
export function blockDraft(items: RoutineItemDraft[]): RoutineDraft {
  return { kind: 'dehnen', name: '', items, ...ROUTINE_DEFAULTS, transitionSeconds: 5 };
}
