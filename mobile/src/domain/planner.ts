// Planassistent: Regelkern ohne KI und ohne Netz (Phase 8, Register TRAIN-001, -005–011, -016, -019, -021).
// Ablauf nach Kap. 10 der Arbeitsgrundlage: Eingabe prüfen → Pflichtübungen und Geräte übernehmen →
// verteilen → Dauer schätzen → harte Grenzen prüfen → mit Begründung kürzen → Vorschau. Was nicht
// lösbar ist, wird als Konflikt gemeldet und nie stillschweigend „passend gemacht“.
// Regeln und Vorlagen sind Vorschläge ohne Fachprüfung (Phase 10.1).

import {
  EXERCISE_META,
  isCompound,
  levelOf,
  PATTERN_GROUP,
  patternOf,
  type Equipment,
  type ExerciseKind,
  type Level,
  type Measure,
  type MovementPattern,
  type MuscleGroup,
} from './exercises';
import { estimateDayMinutes, type PlanDraft, type PlanItemDraft } from './training';

export type PlannerExercise = {
  id: string;
  equipment: Equipment;
  muscleGroup: MuscleGroup;
  measure: Measure;
  kind: ExerciseKind;
  pattern?: MovementPattern | null;
};

export const SPLITS = ['ganzkoerper', 'ober_unter', 'ppl', 'arnold', 'ou_ppl'] as const;
export type SplitId = (typeof SPLITS)[number];
export type SplitChoice = SplitId | 'auto';

export const DAY_TYPES = [
  'ganzkoerper',
  'oberkoerper',
  'unterkoerper',
  'push',
  'pull',
  'beine',
  'brust_ruecken',
  'schultern_arme',
] as const;
export type DayType = (typeof DAY_TYPES)[number];

/** 2 bis 6 Trainingstage (TRAIN-004), 20 bis 180 Minuten je Einheit. */
export const PLANNER_DAYS = [2, 3, 4, 5, 6] as const;
export const MINUTES_RANGE = { min: 20, max: 180 };
export const MINUTE_PRESETS = [30, 45, 60, 75, 90] as const;

export const GOALS = ['muskelaufbau', 'kraft', 'fitness'] as const;
export type TrainingGoal = (typeof GOALS)[number];
export const LEVELS: readonly Level[] = ['einsteiger', 'fortgeschritten'];

/** Für welche Tageszahl eine Aufteilung gedacht ist (TRAIN-005: nicht blind erzwingen). */
export const SPLIT_FITS: Record<SplitId, readonly number[]> = {
  ganzkoerper: [2, 3, 4],
  ober_unter: [2, 4],
  ppl: [3, 6],
  arnold: [3, 6],
  ou_ppl: [5],
};

export function autoSplit(days: number): SplitId {
  if (days <= 3) return 'ganzkoerper';
  if (days === 4) return 'ober_unter';
  if (days === 5) return 'ou_ppl';
  return 'ppl';
}

/** Gewünschte Aufteilung prüfen; passt sie nicht zur Tageszahl, kommt ein begründeter Gegenvorschlag. */
export type SplitDecision = { split: SplitId; requested: SplitChoice; fits: boolean };

export function chooseSplit(requested: SplitChoice, days: number): SplitDecision {
  if (requested === 'auto') return { split: autoSplit(days), requested, fits: true };
  if (SPLIT_FITS[requested].includes(days)) return { split: requested, requested, fits: true };
  return { split: autoSplit(days), requested, fits: false };
}

/** Tagesarten in einer Reihenfolge, in der gleiche Tage nicht direkt aufeinander folgen. */
export function splitDays(split: SplitId, days: number): DayType[] {
  const cycle: Record<SplitId, DayType[]> = {
    ganzkoerper: ['ganzkoerper'],
    ober_unter: ['oberkoerper', 'unterkoerper'],
    ppl: ['push', 'pull', 'beine'],
    arnold: ['brust_ruecken', 'schultern_arme', 'beine'],
    ou_ppl: ['oberkoerper', 'unterkoerper', 'push', 'pull', 'beine'],
  };
  return Array.from({ length: days }, (_, i) => cycle[split][i % cycle[split].length]);
}

const ACCEPTS: Record<DayType, (p: MovementPattern) => boolean> = {
  ganzkoerper: () => true,
  oberkoerper: (p) => PATTERN_GROUP[p] === 'push' || PATTERN_GROUP[p] === 'pull',
  unterkoerper: (p) => ['beine', 'rumpf', 'ganzkoerper'].includes(PATTERN_GROUP[p]),
  push: (p) => PATTERN_GROUP[p] === 'push',
  pull: (p) => PATTERN_GROUP[p] === 'pull',
  beine: (p) => ['beine', 'rumpf', 'ganzkoerper'].includes(PATTERN_GROUP[p]),
  brust_ruecken: (p) => ['druecken_horizontal', 'brust_isolation', 'ziehen_horizontal', 'ziehen_vertikal'].includes(p),
  schultern_arme: (p) => ['druecken_vertikal', 'schulter_isolation', 'hintere_schulter', 'trizeps', 'bizeps'].includes(p),
};

export function dayAccepts(type: DayType, pattern: MovementPattern): boolean {
  return ACCEPTS[type](pattern);
}

/** Namen der Tage; kommt eine Tagesart mehrfach vor, bekommt sie A, B, C … */
export function dayNames(types: DayType[], name: (type: DayType, letter: string | null) => string): string[] {
  const seen: Partial<Record<DayType, number>> = {};
  return types.map((type) => {
    const count = types.filter((t) => t === type).length;
    const index = seen[type] ?? 0;
    seen[type] = index + 1;
    return name(type, count > 1 ? String.fromCharCode(65 + index) : null);
  });
}

// ------------------------------------------------------------------------------------- Ergebnis

export type ChangeKind = 'behalten' | 'verschoben' | 'reduziert' | 'ersetzt' | 'entfernt';
export type Reason =
  | 'zeitbudget'
  | 'redundant'
  | 'seltener'
  | 'geraet'
  | 'ausgeschlossen'
  | 'keinErsatz'
  | 'aufteilung'
  | 'gesperrt';

/** Was mit einer Übung des bisherigen Plans passiert (TRAIN-009: jeweils mit Grund). */
export type ExerciseChange = {
  exerciseId: string;
  kind: ChangeKind;
  fromDays: string[];
  toDays: string[];
  fromSets: number;
  toSets: number;
  replacedBy: string | null;
  reasons: Reason[];
};

export type Addition = { exerciseId: string; day: string; reason: 'leererTag' | 'vorlage' };

export type Conflict =
  | { kind: 'zeit'; day: string; minutes: number; budget: number; lockedMinutes: number }
  | { kind: 'gesperrtNichtVerfuegbar'; exerciseId: string }
  | { kind: 'leererTag'; day: string }
  | { kind: 'tage'; days: number }
  | { kind: 'minuten'; minutes: number }
  | { kind: 'leererPlan' };

export type PlanProposal = {
  decision: SplitDecision;
  dayTypes: DayType[];
  draft: PlanDraft;
  dayMinutes: number[];
  changes: ExerciseChange[];
  additions: Addition[];
  conflicts: Conflict[];
};

type Params = Omit<PlanItemDraft, 'exerciseId'>;
type Slot = { exerciseId: string; origin: string | null; params: Params; locked: boolean; order: number };
type WorkDay = { type: DayType; name: string; items: Slot[] };

type Shared = {
  exercises: PlannerExercise[];
  days: number;
  minutes: number;
  /** Sekunden für Aufwärmen/Cool-down eines Tages, in der Dauer eingerechnet (TRAIN-007, STRETCH-001). */
  extraSeconds?: (items: PlanItemDraft[]) => number;
  dayName: (type: DayType, letter: string | null) => string;
  blockedEquipment: Equipment[];
  blockedExercises: string[];
};

export type RebuildInput = Shared & {
  current: PlanDraft;
  split: SplitChoice;
  /** Lieblingsübungen: harte Bedingung, werden nie entfernt oder gekürzt (TRAIN-006). */
  locked: string[];
};

export type TemplateInput = Shared & {
  split: SplitChoice;
  goal: TrainingGoal;
  experience: Level;
  /** Vorhandene Geräte; Körpergewicht geht immer. */
  available: Equipment[];
  planName: string;
};

function inputConflicts(days: number, minutes: number): Conflict[] {
  const conflicts: Conflict[] = [];
  if (!Number.isInteger(days) || days < 2 || days > 6) conflicts.push({ kind: 'tage', days });
  if (!Number.isInteger(minutes) || minutes < MINUTES_RANGE.min || minutes > MINUTES_RANGE.max) {
    conflicts.push({ kind: 'minuten', minutes });
  }
  return conflicts;
}

function emptyProposal(draft: PlanDraft, conflicts: Conflict[]): PlanProposal {
  return {
    decision: { split: 'ganzkoerper', requested: 'auto', fits: true },
    dayTypes: [],
    draft,
    dayMinutes: [],
    changes: [],
    additions: [],
    conflicts,
  };
}

/** Reihenfolge im Tag: Grundübungen zuerst, Rumpf und Ganzkörper (z. B. Burpees) am Ende. */
function rank(pattern: MovementPattern): number {
  if (isCompound(pattern)) return ['kniebeuge', 'hueftstreckung', 'druecken_horizontal', 'ziehen_vertikal', 'druecken_vertikal', 'ziehen_horizontal', 'ausfallschritt'].indexOf(pattern);
  if (pattern === 'rumpf') return 20;
  if (pattern === 'ganzkoerper') return 30;
  return 10;
}

function toItem(slot: Slot): PlanItemDraft {
  return { exerciseId: slot.exerciseId, ...slot.params };
}

function minutesOf(day: WorkDay, extra: (items: PlanItemDraft[]) => number): number {
  const items = day.items.map(toItem);
  return items.length === 0 ? 0 : estimateDayMinutes(items, 45, 60, extra(items));
}

/**
 * Ersatz für eine nicht verfügbare Übung: erst die kuratierten Alternativen, dann gleiche Bewegung mit
 * anderem Gerät. Gleiche Messart (Wdh./Zeit), nicht schon im Plan (TRAIN-016).
 */
export function findReplacement(
  exercise: PlannerExercise,
  all: PlannerExercise[],
  available: (e: PlannerExercise) => boolean,
  exclude: ReadonlySet<string> = new Set()
): PlannerExercise | null {
  const byId = new Map(all.map((e) => [e.id, e]));
  const pattern = patternOf(exercise);
  const curated = (EXERCISE_META[exercise.id]?.alternatives ?? []).map((id) => byId.get(id)).filter((e): e is PlannerExercise => !!e);
  const samePattern = all.filter((e) => e.kind === 'kraft' && patternOf(e) === pattern);
  for (const candidate of [...curated, ...samePattern]) {
    if (candidate.id === exercise.id || exclude.has(candidate.id)) continue;
    if (candidate.measure !== exercise.measure || !available(candidate)) continue;
    return candidate;
  }
  return null;
}

/** Ersatzübungen für ein belegtes Gerät im laufenden Training, in Vorschlagsreihenfolge. */
export function replacementOptions(exercise: PlannerExercise, all: PlannerExercise[], max = 5): PlannerExercise[] {
  const result: PlannerExercise[] = [];
  const taken = new Set<string>();
  for (let i = 0; i < max; i++) {
    // Ein belegtes Gerät betrifft nur diese Station; jede passende andere Übung ist möglich.
    const next = findReplacement(exercise, all, () => true, taken);
    if (!next) break;
    taken.add(next.id);
    result.push(next);
  }
  return result;
}

// ---------------------------------------------------------------------------------- Kürzen

type Fit = { reasons: Map<string, Set<Reason>> };

function note(fit: Fit, origin: string | null, reason: Reason) {
  if (!origin) return;
  const set = fit.reasons.get(origin) ?? new Set<Reason>();
  set.add(reason);
  fit.reasons.set(origin, set);
}

/** Niedrigste Priorität zuerst: Isolation vor Grundübung, später im Plan vor früher. */
function byLowPriority(patternOfSlot: (s: Slot) => MovementPattern) {
  return (a: Slot, b: Slot) =>
    Number(isCompound(patternOfSlot(a))) - Number(isCompound(patternOfSlot(b))) || b.order - a.order;
}

/**
 * Ein Kürzungsschritt für einen zu langen Tag, in fester Reihenfolge: doppelte Übung (gibt es an einem
 * anderen Tag) → gleiche Bewegung doppelt am Tag → Sätze bei Isolation, dann bei Grundübungen bis 2 →
 * Isolationsübung entfernen → Grundübung entfernen, wenn die Bewegung an einem anderen Tag vorkommt.
 * Gesperrte Übungen werden nie angefasst. Pausen werden nicht gekürzt.
 */
function reduceOnce(day: WorkDay, plan: WorkDay[], pat: (s: Slot) => MovementPattern, fit: Fit): boolean {
  const free = day.items.filter((s) => !s.locked).sort(byLowPriority(pat));
  const elsewhere = (s: Slot, test: (o: Slot) => boolean) => plan.some((d) => d !== day && d.items.some(test));
  const remove = (slot: Slot, reason: Reason) => {
    day.items = day.items.filter((s) => s !== slot);
    note(fit, slot.origin, reason);
  };

  // Bei Doppelten zuerst aus der Gruppe, die an diesem Tag am stärksten vertreten ist (Ausgewogenheit).
  const crowd = (s: Slot) => day.items.filter((o) => PATTERN_GROUP[pat(o)] === PATTERN_GROUP[pat(s)]).length;
  const low = byLowPriority(pat);
  const duplicate = free
    .filter((s) => elsewhere(s, (o) => o.exerciseId === s.exerciseId))
    .sort((a, b) => crowd(b) - crowd(a) || low(a, b))[0];
  if (duplicate) {
    remove(duplicate, 'seltener');
    return true;
  }
  const redundant = free.find((s) => day.items.some((o) => o !== s && pat(o) === pat(s)));
  if (redundant) {
    remove(redundant, 'redundant');
    return true;
  }

  for (const compound of [false, true]) {
    const candidates = free.filter((s) => isCompound(pat(s)) === compound && s.params.sets > 2);
    if (candidates.length > 0) {
      const most = candidates.reduce((a, b) => (b.params.sets > a.params.sets ? b : a));
      most.params = { ...most.params, sets: most.params.sets - 1 };
      note(fit, most.origin, 'zeitbudget');
      return true;
    }
  }

  if (day.items.length <= 1) return false;
  const last = free.find((s) => !isCompound(pat(s))) ?? free.find((s) => elsewhere(s, (o) => pat(o) === pat(s)));
  if (!last) return false;
  remove(last, 'zeitbudget');
  return true;
}

/**
 * Kürzt reihum immer den Tag, der am weitesten über dem Budget liegt. So verteilt sich das Kürzen
 * gleichmäßig auf alle Tage, statt einen Tag leer zu räumen.
 */
function fitDays(plan: WorkDay[], budget: number, extra: (items: PlanItemDraft[]) => number, reduce: (day: WorkDay) => boolean): Conflict[] {
  const stuck = new Set<WorkDay>();
  for (let guard = 0; guard < 1000; guard++) {
    const over = plan
      .filter((d) => !stuck.has(d) && minutesOf(d, extra) > budget)
      .sort((a, b) => minutesOf(b, extra) - minutesOf(a, extra));
    if (over.length === 0) break;
    if (!reduce(over[0])) stuck.add(over[0]);
  }
  const conflicts: Conflict[] = [];
  for (const day of plan) {
    const minutes = minutesOf(day, extra);
    if (minutes > budget) {
      const locked = { ...day, items: day.items.filter((s) => s.locked) };
      conflicts.push({ kind: 'zeit', day: day.name, minutes, budget, lockedMinutes: minutesOf(locked, extra) });
    }
  }
  return conflicts;
}

function sortDay(day: WorkDay, pat: (s: Slot) => MovementPattern) {
  day.items.sort((a, b) => rank(pat(a)) - rank(pat(b)) || a.order - b.order);
}

// ----------------------------------------------------------------------------- Vorlagen-Bausteine

/** Bausteine je Tagesart, nach Wichtigkeit geordnet; Varianten für A/B/C. */
const TEMPLATE_SLOTS: Record<DayType, MovementPattern[][]> = {
  ganzkoerper: [
    ['kniebeuge', 'druecken_horizontal', 'ziehen_vertikal', 'hueftstreckung', 'schulter_isolation', 'rumpf'],
    ['hueftstreckung', 'druecken_vertikal', 'ziehen_horizontal', 'ausfallschritt', 'trizeps', 'bizeps', 'rumpf'],
    ['kniebeuge', 'druecken_horizontal', 'ziehen_horizontal', 'ausfallschritt', 'hintere_schulter', 'rumpf'],
    ['hueftstreckung', 'druecken_vertikal', 'ziehen_vertikal', 'bein_isolation', 'bizeps', 'rumpf'],
  ],
  oberkoerper: [
    ['druecken_horizontal', 'ziehen_vertikal', 'druecken_vertikal', 'ziehen_horizontal', 'trizeps', 'bizeps'],
    ['druecken_vertikal', 'ziehen_horizontal', 'druecken_horizontal', 'ziehen_vertikal', 'schulter_isolation', 'hintere_schulter'],
  ],
  unterkoerper: [
    ['kniebeuge', 'hueftstreckung', 'bein_isolation', 'waden', 'rumpf'],
    ['hueftstreckung', 'ausfallschritt', 'bein_isolation', 'waden', 'rumpf'],
  ],
  push: [
    ['druecken_horizontal', 'druecken_vertikal', 'brust_isolation', 'schulter_isolation', 'trizeps'],
    ['druecken_vertikal', 'druecken_horizontal', 'schulter_isolation', 'brust_isolation', 'trizeps'],
  ],
  pull: [
    ['ziehen_vertikal', 'ziehen_horizontal', 'hintere_schulter', 'bizeps'],
    ['ziehen_horizontal', 'ziehen_vertikal', 'hintere_schulter', 'bizeps'],
  ],
  beine: [
    ['kniebeuge', 'hueftstreckung', 'ausfallschritt', 'bein_isolation', 'waden', 'rumpf'],
    ['hueftstreckung', 'kniebeuge', 'bein_isolation', 'waden', 'rumpf'],
  ],
  brust_ruecken: [
    ['druecken_horizontal', 'ziehen_vertikal', 'druecken_horizontal', 'ziehen_horizontal', 'brust_isolation'],
    ['druecken_horizontal', 'ziehen_horizontal', 'druecken_horizontal', 'ziehen_vertikal', 'brust_isolation'],
  ],
  schultern_arme: [
    ['druecken_vertikal', 'schulter_isolation', 'hintere_schulter', 'trizeps', 'bizeps'],
    ['druecken_vertikal', 'hintere_schulter', 'schulter_isolation', 'bizeps', 'trizeps'],
  ],
};

const EQUIPMENT_ORDER: Record<Level, Equipment[]> = {
  einsteiger: ['maschine', 'kurzhantel', 'kabel', 'langhantel', 'koerpergewicht'],
  fortgeschritten: ['langhantel', 'kurzhantel', 'kabel', 'maschine', 'koerpergewicht'],
};

/** Sätze, Wiederholungen und Pausen je Ziel (Vorschlag, TRAIN-018/O3: fachlich nicht abgenommen). */
export function templateParams(goal: TrainingGoal, experience: Level, pattern: MovementPattern, measure: Measure): Params {
  const beginner = experience === 'einsteiger';
  if (measure === 'zeit') return { sets: beginner ? 2 : 3, repsMin: 1, repsMax: 1, restSeconds: 60, targetSeconds: beginner ? 30 : 45 };
  const compound = isCompound(pattern);
  const table: Record<TrainingGoal, [Params, Params]> = {
    kraft: [
      beginner ? { sets: 3, repsMin: 6, repsMax: 8, restSeconds: 150 } : { sets: 4, repsMin: 4, repsMax: 6, restSeconds: 180 },
      { sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 },
    ],
    muskelaufbau: [
      { sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120 },
      { sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60 },
    ],
    fitness: [
      { sets: 2, repsMin: 10, repsMax: 15, restSeconds: 90 },
      { sets: 2, repsMin: 12, repsMax: 15, restSeconds: 60 },
    ],
  };
  const params = table[goal][compound ? 0 : 1];
  return { ...params, targetSeconds: null };
}

/** Passende Übung für einen Baustein: Gerät vorhanden, nicht ausgeschlossen, Schwierigkeit passend. */
function pickForPattern(
  pattern: MovementPattern,
  candidates: PlannerExercise[],
  experience: Level,
  usage: Map<string, number>,
  onDay: ReadonlySet<string>
): PlannerExercise | null {
  const order = pattern === 'rumpf' || pattern === 'ganzkoerper' ? (['koerpergewicht', ...EQUIPMENT_ORDER[experience]] as Equipment[]) : EQUIPMENT_ORDER[experience];
  // Einsteiger bekommen nur Einsteiger-Übungen; gibt es keine, bleibt der Baustein leer.
  const options = candidates
    .filter((e) => patternOf(e) === pattern && !onDay.has(e.id) && (experience === 'fortgeschritten' || levelOf(e.id) === 'einsteiger'))
    .sort(
      (a, b) =>
        (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0) ||
        order.indexOf(a.equipment) - order.indexOf(b.equipment) ||
        // Bei Rumpf zuerst Übungen mit Wiederholungen, Plank kommt als Abwechslung.
        Number(a.measure === 'zeit') - Number(b.measure === 'zeit') ||
        a.id.localeCompare(b.id)
    );
  return options[0] ?? null;
}

/** Nur kuratierte Kraftübungen in Vorlagen (TRAIN-001: keine erfundenen Übungen). */
function templateCandidates(input: Shared, available: (e: PlannerExercise) => boolean) {
  return input.exercises.filter((e) => e.kind === 'kraft' && EXERCISE_META[e.id] !== undefined && available(e));
}

function fillDay(
  day: WorkDay,
  variant: number,
  candidates: PlannerExercise[],
  experience: Level,
  usage: Map<string, number>,
  params: (pattern: MovementPattern, measure: Measure) => Params,
  limit: number
) {
  const slots = TEMPLATE_SLOTS[day.type][variant % TEMPLATE_SLOTS[day.type].length];
  let order = day.items.length;
  const add = (pattern: MovementPattern) => {
    const pick = pickForPattern(pattern, candidates, experience, usage, new Set(day.items.map((s) => s.exerciseId)));
    if (!pick) return;
    usage.set(pick.id, (usage.get(pick.id) ?? 0) + 1);
    day.items.push({ exerciseId: pick.id, origin: null, params: params(pattern, pick.measure), locked: false, order: 1000 + order++ });
  };
  for (const pattern of slots) if (day.items.length < limit) add(pattern);
  // Wenig Auswahl (z. B. nur Körpergewicht): Grundbewegungen mit einer zweiten Übung auffüllen.
  for (const pattern of slots.filter(isCompound)) if (day.items.length < Math.min(3, limit)) add(pattern);
}

function availability(blockedEquipment: Equipment[], blockedExercises: string[], available?: Equipment[]) {
  return (e: PlannerExercise) =>
    !blockedEquipment.includes(e.equipment) &&
    !blockedExercises.includes(e.id) &&
    (available === undefined || e.equipment === 'koerpergewicht' || available.includes(e.equipment));
}

// -------------------------------------------------------------------------------- Planumbau

/**
 * Baut einen bestehenden Plan auf eine neue Tageszahl, Zeit und Aufteilung um (8.2–8.4). Das Ergebnis
 * ist nur ein Vorschlag; gespeichert wird erst nach Bestätigung als neue Planversion (TRAIN-010).
 */
export function rebuildPlan(input: RebuildInput): PlanProposal {
  const early = inputConflicts(input.days, input.minutes);
  if (early.length > 0) return emptyProposal(input.current, early);
  const byId = new Map(input.exercises.map((e) => [e.id, e]));
  const extra = input.extraSeconds ?? (() => 0);
  const available = availability(input.blockedEquipment, input.blockedExercises);

  // 1. Bisherige Übungen mit Häufigkeit pro Woche.
  type Entry = { exerciseId: string; params: Params; days: string[]; order: number };
  const pool = new Map<string, Entry>();
  input.current.days.forEach((day, d) =>
    day.items.forEach((item, i) => {
      const entry = pool.get(item.exerciseId);
      if (entry) entry.days.push(day.name);
      else {
        const { exerciseId, ...params } = item;
        pool.set(exerciseId, { exerciseId, params: { ...params, targetSeconds: params.targetSeconds ?? null }, days: [day.name], order: d * 100 + i });
      }
    })
  );
  const entries = [...pool.values()].filter((e) => byId.has(e.exerciseId));
  if (entries.length === 0) return emptyProposal(input.current, [{ kind: 'leererPlan' }]);

  // 2. Geräte und ausgeschlossene Übungen: ersetzen oder (bei Sperre) Konflikt.
  const conflicts: Conflict[] = [];
  const replaced = new Map<string, string>();
  const removed = new Map<string, Reason[]>();
  const used = new Set(entries.map((e) => e.exerciseId));
  type Placed = Entry & { origin: string; locked: boolean };
  const placed: Placed[] = [];
  for (const entry of entries) {
    const exercise = byId.get(entry.exerciseId)!;
    const locked = input.locked.includes(entry.exerciseId);
    if (available(exercise)) {
      placed.push({ ...entry, origin: entry.exerciseId, locked });
      continue;
    }
    const reason: Reason = input.blockedExercises.includes(exercise.id) ? 'ausgeschlossen' : 'geraet';
    if (locked) {
      // Zwei harte Bedingungen widersprechen sich: Konflikt statt Entfernen (TRAIN-006).
      conflicts.push({ kind: 'gesperrtNichtVerfuegbar', exerciseId: exercise.id });
      placed.push({ ...entry, origin: entry.exerciseId, locked });
      continue;
    }
    const replacement = findReplacement(exercise, input.exercises, available, used);
    if (replacement) {
      used.add(replacement.id);
      replaced.set(exercise.id, replacement.id);
      placed.push({ ...entry, exerciseId: replacement.id, origin: entry.exerciseId, locked: false });
    } else {
      removed.set(exercise.id, [reason, 'keinErsatz']);
    }
  }

  // 3. Aufteilung und Tage.
  const decision = chooseSplit(input.split, input.days);
  const types = splitDays(decision.split, input.days);
  const names = dayNames(types, input.dayName);
  const plan: WorkDay[] = types.map((type, i) => ({ type, name: names[i], items: [] }));
  const pat = (s: { exerciseId: string }) => patternOf(byId.get(s.exerciseId)!);

  // 4. Verteilen: so oft pro Woche wie bisher (höchstens so oft, wie es passende Tage gibt), jeweils auf
  // den passenden Tag mit den wenigsten Übungen derselben Gruppe.
  const sorted = [...placed].sort((a, b) => Number(isCompound(pat(b))) - Number(isCompound(pat(a))) || a.order - b.order);
  for (const entry of sorted) {
    const pattern = pat(entry);
    const eligible = plan.map((d, i) => i).filter((i) => dayAccepts(plan[i].type, pattern));
    const group = PATTERN_GROUP[pattern];
    const load = (i: number) => plan[i].items.filter((s) => PATTERN_GROUP[pat(s)] === group).length;
    const chosen = [...eligible].sort((a, b) => load(a) - load(b) || plan[a].items.length - plan[b].items.length || a - b);
    for (const i of chosen.slice(0, Math.max(1, Math.min(entry.days.length, eligible.length)))) {
      plan[i].items.push({ exerciseId: entry.exerciseId, origin: entry.origin, params: { ...entry.params }, locked: entry.locked, order: entry.order });
    }
  }

  // 5. Sehr dünne Tage (unter 3 Übungen) mit passenden Übungen aus dem bisherigen Plan auffüllen,
  // leere Tage aus der kuratierten Liste (begründet als „ergänzt“).
  const additions: Addition[] = [];
  for (const day of plan) {
    for (const entry of sorted) {
      if (day.items.length >= 3) break;
      if (!dayAccepts(day.type, pat(entry)) || day.items.some((s) => s.exerciseId === entry.exerciseId)) continue;
      day.items.push({ exerciseId: entry.exerciseId, origin: entry.origin, params: { ...entry.params }, locked: entry.locked, order: entry.order });
    }
  }
  const usage = new Map<string, number>();
  plan.forEach((day, index) => {
    if (day.items.length > 0) return;
    const variant = plan.slice(0, index).filter((d) => d.type === day.type).length;
    fillDay(day, variant, templateCandidates(input, available), 'einsteiger', usage, (p, m) => templateParams('muskelaufbau', 'einsteiger', p, m), 3);
    for (const slot of day.items) additions.push({ exerciseId: slot.exerciseId, day: day.name, reason: 'leererTag' });
    if (day.items.length === 0) conflicts.push({ kind: 'leererTag', day: day.name });
  });
  for (const day of plan) sortDay(day, pat);

  // 6. Zeitbudget je Tag einhalten, sonst Konflikt mit echter Dauer (TRAIN-007).
  const fit: Fit = { reasons: new Map() };
  conflicts.push(...fitDays(plan, input.minutes, extra, (day) => reduceOnce(day, plan, pat, fit)));

  // 7. Entwurf und Änderungsliste.
  const oldDays = input.current.days;
  const draft: PlanDraft = {
    name: input.current.name,
    days: plan.map((d) => ({
      name: d.name,
      items: d.items.map(toItem),
      warmup: !oldDays.every((day) => day.warmup === false),
      cooldown: !oldDays.every((day) => day.cooldown === false),
    })),
  };
  const changes: ExerciseChange[] = entries.map((entry) => {
    const base = { exerciseId: entry.exerciseId, fromDays: entry.days, fromSets: entry.params.sets };
    const removal = removed.get(entry.exerciseId);
    if (removal) return { ...base, kind: 'entfernt', toDays: [], toSets: 0, replacedBy: null, reasons: removal };
    const slots = plan.flatMap((d) => d.items.filter((s) => s.origin === entry.exerciseId).map((s) => ({ day: d.name, slot: s })));
    const reasons = [...(fit.reasons.get(entry.exerciseId) ?? [])];
    if (input.locked.includes(entry.exerciseId)) reasons.unshift('gesperrt');
    if (slots.length === 0) return { ...base, kind: 'entfernt', toDays: [], toSets: 0, replacedBy: null, reasons };
    const toDays = slots.map((s) => s.day);
    const toSets = Math.max(...slots.map((s) => s.slot.params.sets));
    const replacedBy = replaced.get(entry.exerciseId) ?? null;
    if (replacedBy) {
      const why: Reason = input.blockedExercises.includes(entry.exerciseId) ? 'ausgeschlossen' : 'geraet';
      return { ...base, kind: 'ersetzt', toDays, toSets, replacedBy, reasons: [why, ...reasons] };
    }
    const fewer = toSets < entry.params.sets || toDays.length < entry.days.length;
    const same = toDays.length === entry.days.length && toDays.every((d) => entry.days.includes(d));
    const kind: ChangeKind = fewer ? 'reduziert' : same ? 'behalten' : 'verschoben';
    if (kind === 'verschoben' && !reasons.includes('aufteilung')) reasons.push('aufteilung');
    return { ...base, kind, toDays, toSets, replacedBy: null, reasons };
  });

  return {
    decision,
    dayTypes: types,
    draft,
    dayMinutes: plan.map((d) => minutesOf(d, extra)),
    changes,
    additions,
    conflicts,
  };
}

// ----------------------------------------------------------------------------------- Vorlagen

/**
 * Neuer Plan aus Ziel, Erfahrung, Geräten, Tagen und Zeit (8.6, TRAIN-001, -019): wenige Grundmodelle
 * mit Varianten statt hundert ungeprüfter Kopien. Nur kuratierte Übungen.
 */
export function buildTemplate(input: TemplateInput): PlanProposal {
  const early = inputConflicts(input.days, input.minutes);
  const empty: PlanDraft = { name: input.planName, days: [] };
  if (early.length > 0) return emptyProposal(empty, early);
  const byId = new Map(input.exercises.map((e) => [e.id, e]));
  const extra = input.extraSeconds ?? (() => 0);
  const available = availability(input.blockedEquipment, input.blockedExercises, input.available);
  const decision = chooseSplit(input.split, input.days);
  const types = splitDays(decision.split, input.days);
  const names = dayNames(types, input.dayName);
  const plan: WorkDay[] = types.map((type, i) => ({ type, name: names[i], items: [] }));
  const candidates = templateCandidates(input, available);
  const usage = new Map<string, number>();
  const conflicts: Conflict[] = [];
  const params = (p: MovementPattern, m: Measure) => templateParams(input.goal, input.experience, p, m);
  plan.forEach((day, index) => {
    const variant = plan.slice(0, index).filter((d) => d.type === day.type).length;
    fillDay(day, variant, candidates, input.experience, usage, params, 8);
    if (day.items.length === 0) conflicts.push({ kind: 'leererTag', day: day.name });
  });
  const pat = (s: { exerciseId: string }) => patternOf(byId.get(s.exerciseId)!);

  // Zeitbudget: zuerst die unwichtigsten Bausteine (am Ende), ab 3 Übungen erst Sätze kürzen.
  const reduce = (day: WorkDay) => {
    if (day.items.length > 3) {
      day.items.pop();
      return true;
    }
    for (const compound of [false, true]) {
      const slot = [...day.items].reverse().find((s) => isCompound(pat(s)) === compound && s.params.sets > 2);
      if (slot) {
        slot.params = { ...slot.params, sets: slot.params.sets - 1 };
        return true;
      }
    }
    if (day.items.length > 2) {
      day.items.pop();
      return true;
    }
    return false;
  };
  conflicts.push(...fitDays(plan, input.minutes, extra, reduce));
  for (const day of plan) sortDay(day, pat);

  return {
    decision,
    dayTypes: types,
    draft: {
      name: input.planName,
      days: plan.map((d) => ({ name: d.name, items: d.items.map(toItem), warmup: true, cooldown: true })),
    },
    dayMinutes: plan.map((d) => minutesOf(d, extra)),
    changes: [],
    additions: plan.flatMap((d) => d.items.map((s) => ({ exerciseId: s.exerciseId, day: d.name, reason: 'vorlage' as const }))),
    conflicts,
  };
}

/** Darf die Vorschau übernommen werden? Nur ohne Konflikte (TRAIN-007: nicht mit falscher Dauer). */
export function canApply(proposal: PlanProposal): boolean {
  return proposal.conflicts.length === 0 && proposal.draft.days.length > 0 && proposal.draft.days.every((d) => d.items.length > 0);
}

/** Letzter Tag einer befristeten Änderung (TRAIN-008): „diese Woche“ = bis Sonntag, „2 Wochen“ = 14 Tage. */
export function temporaryEnd(duration: 'woche' | 'zwei_wochen', today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (duration === 'woche' ? (7 - date.getUTCDay()) % 7 : 13));
  return date.toISOString().slice(0, 10);
}
