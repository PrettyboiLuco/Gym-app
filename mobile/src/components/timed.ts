// Gemeinsame Hilfen für Dehnen, Aufwärmen/Cool-down und HIIT: Dauer, Starten, Texte.

import type { Db } from '@/data/db';
import { loadRoutineVersion, loadTimedRun, startTimedSession, type RoutineSummary } from '@/data/routines';
import type { Exercise } from '@/data/training';
import type { Sides } from '@/domain/exercises';
import { routineSteps, type RoutineDraft, type Template } from '@/domain/routines';
import { newRun, stepsTotalSeconds, type RunKind } from '@/domain/timeline';
import { t } from '@/i18n';

export function sidesLookup(exercises: Exercise[]): (id: string) => Sides {
  const map = new Map(exercises.map((e) => [e.id, e.sides]));
  return (id) => map.get(id) ?? 'beidseitig';
}

export function holdLookup(exercises: Exercise[]): (id: string) => number {
  const map = new Map(exercises.map((e) => [e.id, e.holdSeconds]));
  return (id) => map.get(id) ?? 30;
}

/** Dauer in ganzen Minuten (aufgerundet), inklusive Seitenwechsel und Pausen. */
export function routineMinutes(draft: RoutineDraft, exercises: Exercise[]): number {
  if (draft.items.length === 0) return 0;
  return Math.ceil(stepsTotalSeconds(routineSteps(draft, sidesLookup(exercises))) / 60);
}

/** Eigene Routinen mit Dauer für Listen. */
export async function withMinutes(db: Db, list: RoutineSummary[], exercises: Exercise[]) {
  const result: (RoutineSummary & { minutes: number })[] = [];
  for (const r of list) {
    const draft = await loadRoutineVersion(db, r.versionId);
    result.push({ ...r, minutes: draft ? routineMinutes(draft, exercises) : 0 });
  }
  return result;
}

export function templateName(template: Template): string {
  return t(`templates.${template.id}.name`);
}

/**
 * Startet einen Ablauf und speichert ihn, damit er einen Neustart übersteht. Läuft schon einer,
 * wird kein zweiter gestartet (Ergebnis 'running').
 */
export async function startRoutineRun(
  db: Db,
  opts: {
    kind: RunKind;
    name: string;
    source: string;
    draft: RoutineDraft;
    exercises: Exercise[];
    routineVersionId?: string | null;
    workoutSessionId?: string | null;
  }
): Promise<'started' | 'running'> {
  if (await loadTimedRun(db)) return 'running';
  const steps = routineSteps(opts.draft, sidesLookup(opts.exercises));
  const base = newRun({ kind: opts.kind, title: opts.name, steps, sessionId: '', workoutSessionId: opts.workoutSessionId ?? null }, Date.now());
  await startTimedSession(
    db,
    {
      kind: opts.kind,
      name: opts.name,
      source: opts.source,
      routineVersionId: opts.routineVersionId ?? null,
      workoutSessionId: opts.workoutSessionId ?? null,
    },
    base
  );
  return 'started';
}
