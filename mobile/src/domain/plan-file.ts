// Plan-Datei: ein Trainingsplan als Text (JSON), zum Übernehmen in die App, ohne andere Daten anzufassen.
// Format „myhealth-plan“, Version 1:
// { "format": "myhealth-plan", "version": 1, "name": "…",
//   "days": [ { "name": "…", "items": [ { "exercise": "<Übungs-ID>", "sets": 3, "reps": [8, 12], "rest": 240 } ] } ] }
// "reps" ist [von, bis] oder eine Zahl; Zeit-Übungen nutzen "seconds" statt "reps". "rest" in Sekunden (Standard 120).

import { validatePlan, type PlanDraft, type PlanProblem } from './training';

export const PLAN_FILE_FORMAT = 'myhealth-plan';

export type PlanFileResult =
  | { ok: true; draft: PlanDraft; note: string | null }
  | { ok: false; error: 'json' | 'format' | 'unknownExercises'; unknown?: string[] }
  | { ok: false; error: 'invalid'; problems: PlanProblem[] };

const DEFAULT_REST = 120;

export function parsePlanFile(text: string, knownExerciseIds: ReadonlySet<string>): PlanFileResult {
  let data: unknown;
  try {
    data = JSON.parse(text.trim());
  } catch {
    return { ok: false, error: 'json' };
  }
  const f = data as { format?: unknown; version?: unknown; name?: unknown; note?: unknown; days?: unknown };
  if (!f || typeof f !== 'object' || f.format !== PLAN_FILE_FORMAT || f.version !== 1 || typeof f.name !== 'string' || !Array.isArray(f.days)) {
    return { ok: false, error: 'format' };
  }
  const unknown = new Set<string>();
  const draft: PlanDraft = {
    name: f.name,
    days: f.days.map((d) => {
      const day = d as { name?: unknown; items?: unknown };
      const items = Array.isArray(day.items) ? day.items : [];
      return {
        name: typeof day.name === 'string' ? day.name : '',
        items: items.map((i) => {
          const item = i as { exercise?: unknown; sets?: unknown; reps?: unknown; rest?: unknown; seconds?: unknown };
          const exerciseId = typeof item.exercise === 'string' ? item.exercise : '';
          if (!knownExerciseIds.has(exerciseId)) unknown.add(exerciseId || '?');
          const reps = Array.isArray(item.reps) ? item.reps : [item.reps, item.reps];
          const seconds = typeof item.seconds === 'number' ? item.seconds : null;
          return {
            exerciseId,
            sets: Number(item.sets),
            repsMin: seconds !== null ? 1 : Number(reps[0]),
            repsMax: seconds !== null ? 1 : Number(reps[1]),
            restSeconds: typeof item.rest === 'number' ? item.rest : DEFAULT_REST,
            targetSeconds: seconds,
          };
        }),
      };
    }),
  };
  if (unknown.size > 0) return { ok: false, error: 'unknownExercises', unknown: [...unknown] };
  const problems = validatePlan(draft);
  if (problems.length > 0) return { ok: false, error: 'invalid', problems };
  return { ok: true, draft, note: typeof f.note === 'string' ? f.note : null };
}
