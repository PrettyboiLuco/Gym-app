// Plan-Datei: ein Trainingsplan als Text (JSON), zum Übernehmen in die App.
// Format „myhealth-plan“, Version 1:
// {
//   "format": "myhealth-plan", "version": 1, "name": "…", "note": "Regeln, Pausen …",
//   "weekdays": [7, 1, 3, 5],                       // Trainingstage ISO (1 = Mo … 7 = So), optional
//   "days": [ { "name": "…", "items": [
//       { "exercise": "<Übungs-ID oder eigen:schlüssel>", "name": "Anzeigename (optional)", "sets": 3, "reps": [8, 12],
//         "rest": 240, "rir": "1–2", "note": "…" } ] } ],
//   "customExercises": [ { "key": "…", "name": "…", "equipment": "koerpergewicht", "muscleGroup": "ruecken",
//                          "kind": "mobilitaet", "sides": "einseitig", "holdSeconds": 30 } ],   // optional
//   "routines": [ { "name": "…", "kind": "dehnen", "items": [ { "exercise": "…", "seconds": 40 } ] } ],  // optional
//   "goals": { "kcal": 3900, "drinkMl": 5000 }      // optional, nur nach Bestätigung übernommen
// }
// "reps" ist [von, bis] oder eine Zahl; Zeit-Übungen nutzen "seconds" statt "reps". "rest" in Sekunden (Standard 120).

import { EQUIPMENT, EXERCISE_KINDS, MUSCLE_GROUPS, SIDES, type Equipment, type ExerciseKind, type MuscleGroup, type Sides } from './exercises';
import { ROUTINE_DEFAULTS, type RoutineDraft } from './routines';
import { validatePlan, type PlanDraft, type PlanProblem } from './training';

export const PLAN_FILE_FORMAT = 'myhealth-plan';
/** Verweis auf eine Übung, die mit der Datei neu angelegt wird. */
export const CUSTOM_PREFIX = 'eigen:';

export type CustomExerciseSpec = {
  key: string;
  name: string;
  equipment: Equipment;
  muscleGroup: MuscleGroup;
  kind: ExerciseKind;
  sides: Sides;
  holdSeconds: number | null;
};

export type PlanImport = {
  draft: PlanDraft;
  note: string | null;
  weekdays: number[] | null;
  customExercises: CustomExerciseSpec[];
  /** Exercise-IDs können `eigen:schlüssel` sein; sie werden beim Übernehmen aufgelöst. */
  routines: RoutineDraft[];
  goals: { kcal: number | null; drinkMl: number | null };
};

export type PlanFileResult =
  | ({ ok: true } & PlanImport)
  | { ok: false; error: 'json' | 'format' | 'unknownExercises' | 'routine' | 'custom'; unknown?: string[] }
  | { ok: false; error: 'invalid'; problems: PlanProblem[] };

const DEFAULT_REST = 120;
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function parsePlanFile(text: string, knownExerciseIds: ReadonlySet<string>): PlanFileResult {
  let data: unknown;
  try {
    data = JSON.parse(text.trim());
  } catch {
    return { ok: false, error: 'json' };
  }
  const f = data as Record<string, unknown>;
  if (!f || typeof f !== 'object' || f.format !== PLAN_FILE_FORMAT || f.version !== 1 || typeof f.name !== 'string' || !Array.isArray(f.days)) {
    return { ok: false, error: 'format' };
  }

  // Eigene Übungen (z. B. Massagepistole) – müssen vollständig und gültig sein.
  const customExercises: CustomExerciseSpec[] = [];
  for (const c of Array.isArray(f.customExercises) ? f.customExercises : []) {
    const r = c as Record<string, unknown>;
    const spec = {
      key: str(r.key) ?? '',
      name: str(r.name) ?? '',
      equipment: r.equipment as Equipment,
      muscleGroup: r.muscleGroup as MuscleGroup,
      kind: (r.kind ?? 'kraft') as ExerciseKind,
      sides: (r.sides ?? 'beidseitig') as Sides,
      holdSeconds: num(r.holdSeconds),
    };
    if (
      !spec.key ||
      !spec.name ||
      !EQUIPMENT.includes(spec.equipment) ||
      !MUSCLE_GROUPS.includes(spec.muscleGroup) ||
      !EXERCISE_KINDS.includes(spec.kind) ||
      !SIDES.includes(spec.sides)
    ) {
      return { ok: false, error: 'custom' };
    }
    customExercises.push(spec);
  }
  const customKeys = new Set(customExercises.map((c) => `${CUSTOM_PREFIX}${c.key}`));
  const unknown = new Set<string>();
  const ref = (v: unknown) => {
    const id = typeof v === 'string' ? v : '';
    if (!knownExerciseIds.has(id) && !customKeys.has(id)) unknown.add(id || '?');
    return id;
  };

  const draft: PlanDraft = {
    name: f.name,
    days: (f.days as unknown[]).map((d) => {
      const day = d as Record<string, unknown>;
      return {
        name: typeof day.name === 'string' ? day.name : '',
        items: (Array.isArray(day.items) ? day.items : []).map((i) => {
          const item = i as Record<string, unknown>;
          const reps = Array.isArray(item.reps) ? item.reps : [item.reps, item.reps];
          const seconds = num(item.seconds);
          return {
            exerciseId: ref(item.exercise),
            sets: Number(item.sets),
            repsMin: seconds !== null ? 1 : Number(reps[0]),
            repsMax: seconds !== null ? 1 : Number(reps[1]),
            restSeconds: num(item.rest) ?? DEFAULT_REST,
            targetSeconds: seconds,
            rir: str(item.rir),
            note: str(item.note),
            label: str(item.name),
          };
        }),
      };
    }),
  };

  const routines: RoutineDraft[] = [];
  for (const r of Array.isArray(f.routines) ? f.routines : []) {
    const row = r as Record<string, unknown>;
    const items = (Array.isArray(row.items) ? row.items : []).map((i) => {
      const it = i as Record<string, unknown>;
      return { exerciseId: ref(it.exercise), seconds: Number(it.seconds) };
    });
    if (!str(row.name) || items.length === 0 || items.some((i) => !Number.isInteger(i.seconds) || i.seconds < 5 || i.seconds > 300)) {
      return { ok: false, error: 'routine' };
    }
    routines.push({ ...ROUTINE_DEFAULTS, kind: 'dehnen', name: str(row.name)!, items, switchSeconds: num(row.switchSeconds) ?? ROUTINE_DEFAULTS.switchSeconds, transitionSeconds: num(row.transitionSeconds) ?? ROUTINE_DEFAULTS.transitionSeconds });
  }

  if (unknown.size > 0) return { ok: false, error: 'unknownExercises', unknown: [...unknown] };
  const problems = validatePlan(draft);
  if (problems.length > 0) return { ok: false, error: 'invalid', problems };

  const weekdays = Array.isArray(f.weekdays) ? f.weekdays.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7) : null;
  const goals = (f.goals ?? {}) as Record<string, unknown>;
  const kcal = num(goals.kcal);
  const drinkMl = num(goals.drinkMl);
  return {
    ok: true,
    draft,
    note: str(f.note),
    weekdays: weekdays && weekdays.length > 0 ? [...new Set(weekdays)].sort() : null,
    customExercises,
    routines,
    goals: { kcal: kcal !== null && kcal >= 1000 && kcal <= 8000 ? Math.round(kcal) : null, drinkMl: drinkMl !== null && drinkMl >= 500 && drinkMl <= 10000 ? Math.round(drinkMl) : null },
  };
}
