// Zusammenfassung nach einem Training und Bestleistungen (nur aus echten, erledigten Sätzen).
// Aufwärmsätze zählen nicht mit (A1); Gewichtsart je Übung bestimmt Volumen und Richtung der Bestleistung.

import { countsAsWork, setVolume, type LoadMode, type SetType } from './logger';

export type DoneSet = {
  exerciseId: string;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
  setType?: SetType | null;
};

type ModeOf = (exerciseId: string) => LoadMode;
const normalMode: ModeOf = () => 'normal';

/** Bisher Bestes einer Übung aus früheren, nicht abgebrochenen Trainings. */
export type PreviousBest = {
  exerciseId: string;
  maxKg: number | null;
  /** Kleinstes Gewicht mit Wiederholungen – bei Gegengewicht-Übungen ist weniger besser (A1). */
  minKg?: number | null;
  repsAtMaxKg: number | null;
  maxReps: number | null;
  maxSeconds: number | null;
};

export type Record =
  | { exerciseId: string; kind: 'gewicht'; weightKg: number; reps: number; previousKg: number }
  | { exerciseId: string; kind: 'wiederholungen'; weightKg: number; reps: number; previousReps: number }
  | { exerciseId: string; kind: 'zeit'; seconds: number; previousSeconds: number }
  /** Gegengewicht-Übung: weniger Unterstützung als je zuvor. */
  | { exerciseId: string; kind: 'weniger'; weightKg: number; reps: number; previousKg: number };

export type Summary = { sets: number; exercises: number; volumeKg: number; minutes: number | null };

/** Sätze, Übungen, bewegtes Gewicht (Gewicht × Wiederholungen) und Dauer in Minuten. */
export function summarize(all: DoneSet[], startedAt: string, finishedAt: string | null, modeOf: ModeOf = normalMode): Summary {
  const sets = all.filter((s) => countsAsWork(s.setType));
  const volumeKg = sets.reduce((sum, s) => sum + setVolume(s.weightKg, s.reps, modeOf(s.exerciseId)), 0);
  const minutes = finishedAt ? Math.max(1, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 60_000)) : null;
  return { sets: sets.length, exercises: new Set(sets.map((s) => s.exerciseId)).size, volumeKg: Math.round(volumeKg), minutes };
}

/**
 * Neue Bestleistungen gegenüber früheren Trainings. Ohne früheren Wert gibt es keine „Bestleistung“
 * (das erste Mal ist ein Anfang, kein Rekord). Je Übung höchstens eine Meldung, die stärkste:
 * mehr Gewicht → bei gleichem Höchstgewicht mehr Wiederholungen → bei Zeitübungen länger gehalten.
 */
export function findRecords(all: DoneSet[], previous: PreviousBest[], modeOf: ModeOf = normalMode): Record[] {
  const sets = all.filter((s) => countsAsWork(s.setType));
  const prevById = new Map(previous.map((p) => [p.exerciseId, p]));
  const records: Record[] = [];
  for (const exerciseId of [...new Set(sets.map((s) => s.exerciseId))]) {
    const prev = prevById.get(exerciseId);
    if (!prev) continue;
    const mine = sets.filter((s) => s.exerciseId === exerciseId);
    const timed = mine.filter((s) => s.seconds != null);
    if (timed.length > 0) {
      const best = Math.max(...timed.map((s) => s.seconds ?? 0));
      if (prev.maxSeconds != null && best > prev.maxSeconds) records.push({ exerciseId, kind: 'zeit', seconds: best, previousSeconds: prev.maxSeconds });
      continue;
    }
    const lifted = mine.filter((s) => s.reps != null && s.reps > 0);
    if (lifted.length === 0) continue;
    if (modeOf(exerciseId) === 'unterstuetzt') {
      // Gegengewicht: weniger Unterstützung bei mindestens einer Wiederholung ist die Bestleistung.
      const minKg = Math.min(...lifted.map((s) => s.weightKg ?? 0));
      const reps = Math.max(...lifted.filter((s) => (s.weightKg ?? 0) === minKg).map((s) => s.reps ?? 0));
      if (prev.minKg != null && minKg < prev.minKg - 1e-9) records.push({ exerciseId, kind: 'weniger', weightKg: minKg, reps, previousKg: prev.minKg });
      continue;
    }
    const maxKg = Math.max(...lifted.map((s) => s.weightKg ?? 0));
    const repsAtMax = Math.max(...lifted.filter((s) => (s.weightKg ?? 0) === maxKg).map((s) => s.reps ?? 0));
    if (maxKg > 0) {
      if (prev.maxKg != null && maxKg > prev.maxKg + 1e-9) {
        records.push({ exerciseId, kind: 'gewicht', weightKg: maxKg, reps: repsAtMax, previousKg: prev.maxKg });
      } else if (prev.maxKg != null && Math.abs(maxKg - prev.maxKg) < 1e-9 && prev.repsAtMaxKg != null && repsAtMax > prev.repsAtMaxKg) {
        records.push({ exerciseId, kind: 'wiederholungen', weightKg: maxKg, reps: repsAtMax, previousReps: prev.repsAtMaxKg });
      }
    } else if (prev.maxReps != null && (prev.maxKg ?? 0) === 0 && repsAtMax > prev.maxReps) {
      // Körpergewicht: mehr Wiederholungen
      records.push({ exerciseId, kind: 'wiederholungen', weightKg: 0, reps: repsAtMax, previousReps: prev.maxReps });
    }
  }
  return records;
}

/** Tage Mo–So (Index 0–6) mit abgeschlossenem Training in der Woche von `monday`. */
export function trainedDays(days: string[], monday: string): boolean[] {
  const week = Array.from({ length: 7 }, () => false);
  const start = Date.parse(`${monday}T12:00:00Z`);
  for (const day of days) {
    const index = Math.round((Date.parse(`${day}T12:00:00Z`) - start) / 86_400_000);
    if (index >= 0 && index < 7) week[index] = true;
  }
  return week;
}
