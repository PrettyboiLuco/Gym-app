// Beendetes Training bearbeiten oder Krafttraining nachtragen (Prüfung 05.11.2026, Lücke gegenüber Hevy/Strong):
// Eingaben prüfen und in Sätze umwandeln. Reine Logik, die Datenbank steht in data/workout-edit.ts.

import { SET_TYPES, type SetType } from './logger';
import { zonedTime } from './time';
import { parseSecondsInput, parseSetInput, parseWholeNumber } from './training';
import { LIFT_RANGE, parseWeightIn, weightInputText, type WeightUnit } from './units';

/** Geplante Werte eines Satzes (aus dem Plan oder dem bisherigen Satz), damit Steigerung und Supersätze stimmen. */
export type PlannedFields = {
  plannedRepsMin: number | null;
  plannedRepsMax: number | null;
  plannedSeconds: number | null;
  restSeconds: number;
  superset: number | null;
};

/** Eine Zeile im Bearbeiten-Bildschirm: Texte so, wie sie im Feld stehen. */
export type EditRow = PlannedFields & {
  /** Schlüssel nur für die Anzeige. */
  key: string;
  /** Bestehender Satz; null = neu. */
  id: string | null;
  exerciseId: string;
  /** Reihenfolge: bestehende Sätze ihre Position, neue dahinter (Supersätze bleiben verschränkt). */
  order: number;
  setType: SetType;
  timed: boolean;
  weight: string;
  reps: string;
  seconds: string;
};

/** Gespeicherter Satz nach der Prüfung (Gewicht immer in kg). */
export type EditedSet = PlannedFields & {
  id: string | null;
  exerciseId: string;
  setType: SetType;
  weightKg: number;
  reps: number | null;
  seconds: number | null;
};

const blank = (s: string) => s.trim() === '';

/** Zeile ohne Eingabe: wird nicht gespeichert (ein bestehender Satz damit gelöscht). */
export function isEmptyRow(row: Pick<EditRow, 'weight' | 'reps' | 'seconds' | 'timed'>): boolean {
  return row.timed ? blank(row.seconds) && blank(row.weight) : blank(row.reps) && blank(row.weight);
}

/**
 * Prüft alle Zeilen. Leere Zeilen fallen weg; leeres Gewicht gilt als 0 (Körpergewicht). Ungültige Zeilen kommen mit
 * ihrem Schlüssel zurück, dann wird nichts gespeichert.
 */
export function parseEditRows(rows: EditRow[], unit: WeightUnit): { sets: EditedSet[]; invalid: string[] } {
  const sets: EditedSet[] = [];
  const invalid: string[] = [];
  for (const row of [...rows].sort((a, b) => a.order - b.order)) {
    if (isEmptyRow(row)) continue;
    const setType = (SET_TYPES as readonly string[]).includes(row.setType) ? row.setType : 'arbeit';
    const planned: PlannedFields = {
      plannedRepsMin: row.plannedRepsMin,
      plannedRepsMax: row.plannedRepsMax,
      plannedSeconds: row.plannedSeconds,
      restSeconds: row.restSeconds,
      superset: row.superset,
    };
    if (row.timed) {
      const seconds = parseSecondsInput(row.seconds);
      const weightKg = blank(row.weight) ? 0 : parseWeightIn(row.weight, unit, LIFT_RANGE);
      if (seconds === null || weightKg === null) invalid.push(row.key);
      else sets.push({ ...planned, id: row.id, exerciseId: row.exerciseId, setType, weightKg, reps: null, seconds });
      continue;
    }
    const parsed = parseSetInput(blank(row.weight) ? '0' : row.weight, row.reps, unit);
    if (!parsed) invalid.push(row.key);
    else sets.push({ ...planned, id: row.id, exerciseId: row.exerciseId, setType, weightKg: parsed.weightKg, reps: parsed.reps, seconds: null });
  }
  return { sets, invalid };
}

/** Feldtexte eines gespeicherten Satzes (Gewicht in der Anzeigeeinheit). */
export function rowTexts(set: { weightKg: number | null; reps: number | null; seconds: number | null }, unit: WeightUnit) {
  return {
    weight: set.weightKg == null || (set.weightKg === 0 && set.seconds != null) ? '' : weightInputText(set.weightKg, unit),
    reps: set.reps == null ? '' : String(set.reps),
    seconds: set.seconds == null ? '' : String(set.seconds),
  };
}

/** Längstes Training, das sich eintragen lässt. */
export const MAX_WORKOUT_MINUTES = 600;

export type WorkoutTimeProblem = 'zeit' | 'dauer' | 'zukunft';

/**
 * Start und Ende aus Tag, Uhrzeit („18:30“) und Dauer in Minuten, in der Zeitzone des Geräts. Ein Training, das noch
 * nicht begonnen hat, lässt sich nicht nachtragen.
 */
export function parseWorkoutTime(
  input: { day: string; time: string; minutes: string },
  timeZone: string,
  nowMs: number
): { startedAtUtc: string; finishedAtUtc: string } | { problem: WorkoutTimeProblem } {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(input.time.trim());
  const clock = m && Number(m[1]) <= 23 && Number(m[2]) <= 59 ? Number(m[1]) * 60 + Number(m[2]) : null;
  if (clock === null || !/^\d{4}-\d{2}-\d{2}$/.test(input.day)) return { problem: 'zeit' };
  const minutes = parseWholeNumber(input.minutes);
  if (minutes === null || minutes < 1 || minutes > MAX_WORKOUT_MINUTES) return { problem: 'dauer' };
  const start = zonedTime(input.day, clock, timeZone);
  if (start.getTime() > nowMs) return { problem: 'zukunft' };
  return { startedAtUtc: start.toISOString(), finishedAtUtc: new Date(start.getTime() + minutes * 60_000).toISOString() };
}

/** Dauer eines Trainings in ganzen Minuten (mindestens 1), für das Feld „Dauer“. */
export function workoutMinutes(startedAtUtc: string, finishedAtUtc: string | null): number {
  if (!finishedAtUtc) return 60;
  return Math.min(MAX_WORKOUT_MINUTES, Math.max(1, Math.round((Date.parse(finishedAtUtc) - Date.parse(startedAtUtc)) / 60_000)));
}

/**
 * Zeitpunkte der Sätze nach dem Speichern: Bestehende Sätze wandern mit, wenn sich der Start verschiebt, und bleiben im
 * Trainingsfenster; neue Sätze verteilen sich gleichmäßig über das Fenster. So stimmen Trainingstag, Verlauf und
 * „letzte Leistung“ auch für nachgetragene Trainings.
 */
export function setTimes(
  sets: { id: string | null }[],
  previous: Map<string, string>,
  window: { oldStartUtc: string | null; startedAtUtc: string; finishedAtUtc: string }
): string[] {
  const start = Date.parse(window.startedAtUtc);
  const end = Math.max(start, Date.parse(window.finishedAtUtc));
  const shift = window.oldStartUtc ? start - Date.parse(window.oldStartUtc) : 0;
  const clamp = (ms: number) => Math.min(end, Math.max(start, ms));
  return sets.map((set, i) => {
    const before = set.id ? previous.get(set.id) : undefined;
    if (before) return new Date(clamp(Date.parse(before) + shift)).toISOString();
    return new Date(Math.round(start + ((i + 1) * (end - start)) / (sets.length + 1))).toISOString();
  });
}

/**
 * Reihenfolge für einen neuen Satz einer Übung: direkt hinter ihrem letzten Satz, vor allem, was danach kommt (auch bei
 * verschränkten Supersätzen). Neue Übung (keine Sätze): ganz ans Ende.
 */
export function orderForNewSet(rows: Pick<EditRow, 'exerciseId' | 'order'>[], exerciseId: string): number {
  const mine = rows.filter((r) => r.exerciseId === exerciseId).map((r) => r.order);
  const max = rows.length ? Math.max(...rows.map((r) => r.order)) : -1;
  if (!mine.length) return max + 1;
  const last = Math.max(...mine);
  const next = rows.filter((r) => r.order > last).map((r) => r.order);
  return next.length ? (last + Math.min(...next)) / 2 : last + 1;
}

/** Zeilen je Übung in der Reihenfolge ihres ersten Satzes (Anzeige). */
export function groupRows<R extends Pick<EditRow, 'exerciseId' | 'order'>>(rows: R[]): { exerciseId: string; rows: R[] }[] {
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  const groups = new Map<string, R[]>();
  for (const row of sorted) groups.set(row.exerciseId, [...(groups.get(row.exerciseId) ?? []), row]);
  return [...groups.entries()].map(([exerciseId, list]) => ({ exerciseId, rows: list }));
}
