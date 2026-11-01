// Import aus anderen Apps (Ausbauplan A5): Strong und Hevy (Trainings-CSV) sowie Gewicht (Datum + Gewicht).
// Reine Logik: erkennt das Format, liest Trainings mit Sätzen und ordnet Übungsnamen dem Katalog zu.
// Formate laut den Export-Dateien der Apps (Spaltennamen); beide Apps haben ihr Format mehrfach leicht geändert,
// daher werden mehrere Schreibweisen akzeptiert.

import type { CardioActivity } from './cardio';
import { csvNumber, csvObjects } from './csv';
import type { Equipment } from './exercises';
import type { SetType } from './logger';
import { foldText } from './text';

export type ImportSource = 'strong' | 'hevy';
export type ImportedSet = {
  exercise: string;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
  distanceKm: number | null;
  rir: number | null;
  note: string | null;
};
export type ImportedWorkout = { startedAt: string; finishedAt: string | null; title: string; note: string | null; sets: ImportedSet[] };
export type TrainingImport = { source: ImportSource; workouts: ImportedWorkout[]; exercises: string[] };
export type ImportError = 'leer' | 'unbekannt';

const LB = 0.45359237;
const MILE = 1.609344;

const pick = (row: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k];
  return '';
};

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Datum lesen: ISO („2024-01-26 18:05:00“), Hevy („26 Jan 2024, 18:05“) oder deutsch („26.01.2024 18:05“). Lokale Zeit. */
export function parseDateTime(text: string): Date | null {
  const s = text.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 12), +(m[5] ?? 0), +(m[6] ?? 0));
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4}),?\s*(\d{1,2}):(\d{2})/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1], +m[4], +m[5]);
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:,?\s*(\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 12), +(m[5] ?? 0));
  return null;
}

/** Dauer „1h 5m“, „65m“, „01:05:00“ oder Sekunden → Minuten. */
function durationMinutes(text: string): number | null {
  const s = text.trim();
  if (!s) return null;
  const hm = s.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?/i);
  if (hm && (hm[1] || hm[2])) return +(hm[1] ?? 0) * 60 + +(hm[2] ?? 0);
  const clock = s.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (clock) return clock[3] ? +clock[1] * 60 + +clock[2] : +clock[1] + +clock[2] / 60;
  const n = csvNumber(s);
  return n === null ? null : n > 600 ? n / 60 : n;
}

function setTypeOf(text: string): SetType {
  const s = text.toLowerCase();
  if (s.includes('warm') || s === 'w') return 'aufwaermen';
  if (s.includes('drop') || s === 'd') return 'drop';
  if (s.includes('fail') || s === 'f') return 'versagen';
  return 'arbeit';
}

/** RPE (z. B. 8) → Wiederholungen in Reserve (10 − RPE, 0–5). */
function rirFromRpe(text: string): number | null {
  const rpe = csvNumber(text);
  if (rpe === null || rpe <= 0) return null;
  return Math.max(0, Math.min(5, Math.round(10 - rpe)));
}

/** Trainings-CSV von Strong oder Hevy lesen. `weightUnit` gilt für Strong-Dateien ohne Einheitenspalte. */
export function parseTrainingCsv(text: string, weightUnit: 'kg' | 'lb' = 'kg'): TrainingImport | { error: ImportError } {
  const { header, rows } = csvObjects(text);
  if (rows.length === 0) return { error: 'leer' };
  const has = (k: string) => header.includes(k);
  const source: ImportSource | null = has('exercise_title') ? 'hevy' : has('exercise name') && (has('set order') || has('workout name')) ? 'strong' : null;
  if (!source) return { error: 'unbekannt' };

  const byKey = new Map<string, ImportedWorkout>();
  for (const r of rows) {
    let start: Date | null;
    let end: Date | null = null;
    let title: string;
    let note: string | null;
    let set: ImportedSet;
    if (source === 'hevy') {
      start = parseDateTime(pick(r, 'start_time'));
      end = parseDateTime(pick(r, 'end_time'));
      title = pick(r, 'title') || 'Hevy';
      note = pick(r, 'description') || null;
      const lbs = csvNumber(pick(r, 'weight_lbs'));
      const kg = csvNumber(pick(r, 'weight_kg')) ?? (lbs === null ? null : lbs * LB);
      const miles = csvNumber(pick(r, 'distance_miles'));
      set = {
        exercise: pick(r, 'exercise_title'),
        setType: setTypeOf(pick(r, 'set_type')),
        weightKg: kg,
        reps: csvNumber(pick(r, 'reps')),
        seconds: csvNumber(pick(r, 'duration_seconds')),
        distanceKm: csvNumber(pick(r, 'distance_km')) ?? (miles === null ? null : miles * MILE),
        rir: rirFromRpe(pick(r, 'rpe')),
        note: pick(r, 'exercise_notes') || null,
      };
    } else {
      start = parseDateTime(pick(r, 'date'));
      const minutes = durationMinutes(pick(r, 'duration', 'workout duration'));
      end = start && minutes !== null ? new Date(start.getTime() + minutes * 60_000) : null;
      title = pick(r, 'workout name') || 'Strong';
      note = pick(r, 'workout notes') || null;
      const unit = (pick(r, 'weight unit') || weightUnit).toLowerCase();
      const w = csvNumber(pick(r, 'weight'));
      const dist = csvNumber(pick(r, 'distance'));
      const distUnit = pick(r, 'distance unit').toLowerCase();
      const order = pick(r, 'set order');
      set = {
        exercise: pick(r, 'exercise name'),
        setType: order.toUpperCase() === 'W' ? 'aufwaermen' : order.toUpperCase() === 'D' ? 'drop' : order.toUpperCase() === 'F' ? 'versagen' : 'arbeit',
        weightKg: w === null ? null : unit.startsWith('lb') ? w * LB : w,
        reps: csvNumber(pick(r, 'reps')),
        seconds: csvNumber(pick(r, 'seconds')),
        distanceKm: dist === null ? null : distUnit.startsWith('mi') ? dist * MILE : distUnit === 'm' ? dist / 1000 : dist,
        rir: rirFromRpe(pick(r, 'rpe')),
        note: pick(r, 'notes') || null,
      };
    }
    if (!start || !set.exercise) continue;
    // Strong schreibt 0 für „nicht erfasst“
    for (const k of ['reps', 'seconds', 'distanceKm'] as const) if (set[k] === 0) set[k] = null;
    // Strong schreibt für Pausen/leere Zeilen manchmal Sätze ohne Werte – die braucht niemand.
    if (!set.reps && !set.seconds && !set.distanceKm && !set.weightKg) continue;
    if (set.weightKg !== null) set.weightKg = Math.round(set.weightKg * 100) / 100;
    const key = `${start.toISOString()}|${title}`;
    const w = byKey.get(key) ?? { startedAt: start.toISOString(), finishedAt: end ? end.toISOString() : null, title, note, sets: [] };
    w.sets.push(set);
    byKey.set(key, w);
  }
  const workouts = [...byKey.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  if (workouts.length === 0) return { error: 'leer' };
  return { source, workouts, exercises: [...new Set(workouts.flatMap((w) => w.sets.map((s) => s.exercise)))].sort() };
}

/** Ein Satz ist Cardio, wenn er nur Zeit/Strecke hat (kein Gewicht, keine Wiederholungen) und lang ist. */
export const isCardioSet = (s: ImportedSet) => !s.reps && !s.weightKg && ((s.seconds ?? 0) >= 300 || (s.distanceKm ?? 0) > 0);

// ------------------------------------------------------------------------------------- Gewicht

export type WeightRow = { day: string; kg: number };

/** Gewichts-CSV: Spalte mit Datum und Spalte mit Gewicht (kg oder lb), z. B. aus Waagen- oder Kalorien-Apps. */
export function parseWeightCsv(text: string): WeightRow[] | { error: ImportError } {
  const { header, rows } = csvObjects(text);
  if (rows.length === 0) return { error: 'leer' };
  const dateKey = header.find((h) => /datum|date|tag|day|zeit|time/.test(h));
  const weightKey = header.find((h) => /gewicht|weight|kg|lb|masse/.test(h) && h !== dateKey);
  if (!dateKey || !weightKey) return { error: 'unbekannt' };
  const lb = /lb/.test(weightKey);
  const out = new Map<string, number>();
  for (const r of rows) {
    const d = parseDateTime(r[dateKey] ?? '');
    const v = csvNumber(r[weightKey]);
    if (!d || v === null) continue;
    const kg = Math.round((lb ? v * LB : v) * 10) / 10;
    if (kg < 20 || kg > 400) continue;
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.set(day, kg); // mehrere Werte am Tag: der letzte zählt
  }
  return out.size ? [...out.entries()].map(([day, kg]) => ({ day, kg })).sort((a, b) => a.day.localeCompare(b.day)) : { error: 'leer' };
}

// --------------------------------------------------------------------------- Übungen zuordnen

/** Vergleichstext ohne Gerät in Klammern („Bench Press (Barbell)“ → „bench press“). */
const fold = (s: string) => foldText(s.replace(/\(.*?\)/g, ' '));

/** Ähnlichkeit zweier Namen (0–1) über gemeinsame Wörter; Gerät in Klammern zählt extra. */
function nameSimilarity(a: string, b: string): number {
  const wa = new Set(fold(a).split(' ').filter(Boolean));
  const wb = new Set(fold(b).split(' ').filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  const base = (2 * common) / (wa.size + wb.size);
  const eqA = (a.match(/\((.*?)\)/)?.[1] ?? '').toLowerCase();
  const eqB = (b.match(/\((.*?)\)/)?.[1] ?? '').toLowerCase();
  return Math.min(1, base + (eqA && eqA === eqB ? 0.15 : 0));
}

export type Candidate = { id: string; names: string[]; equipment?: Equipment };

/** Gerät aus der Klammer bei Strong/Hevy („Bench Press (Dumbbell)“). */
const EQUIPMENT_HINTS: [RegExp, Equipment][] = [
  [/smith/i, 'smith'],
  [/barbell|langhantel/i, 'langhantel'],
  [/dumbbell|kurzhantel/i, 'kurzhantel'],
  [/cable|kabel/i, 'kabel'],
  [/machine|maschine|lever|plate loaded/i, 'maschine'],
  [/body ?weight|weighted|assisted|körpergewicht/i, 'koerpergewicht'],
  [/kettlebell/i, 'kettlebell'],
  [/band/i, 'band'],
  [/ez ?bar|sz/i, 'sz_stange'],
];

export function equipmentHint(name: string): Equipment | null {
  const inner = name.match(/\((.*?)\)/)?.[1];
  if (!inner) return null;
  return EQUIPMENT_HINTS.find(([re]) => re.test(inner))?.[1] ?? null;
}

/**
 * Beste Katalog-Übung zu einem Namen aus Strong/Hevy; unter der Schwelle: null (dann eigene Übung oder Auswahl).
 * Passt das Gerät aus der Klammer nicht, zählt der Treffer deutlich weniger („Bench Press (Dumbbell)“ ≠ Langhantel).
 */
export function matchExercise(name: string, candidates: readonly Candidate[], threshold = 0.6): { id: string; score: number } | null {
  const hint = equipmentHint(name);
  let best: { id: string; score: number } | null = null;
  for (const c of candidates) {
    for (const n of c.names) {
      let score = fold(n) === fold(name) ? 1 : nameSimilarity(name, n);
      if (hint && c.equipment) score += c.equipment === hint ? 0.05 : -0.3;
      if (!best || score > best.score) best = { id: c.id, score };
    }
  }
  return best && best.score >= threshold ? best : null;
}

// ------------------------------------------------------------------------------------- Cardio

const CARDIO_NAMES: [RegExp, CardioActivity][] = [
  [/treadmill|laufband/i, 'laufband'],
  [/elliptical|cross ?trainer/i, 'crosstrainer'],
  [/stair|treppe/i, 'treppensteiger'],
  [/stepper/i, 'stepper'],
  [/row(ing)? ?machine|rowing|rudern|ruderger/i, 'rudergeraet'],
  [/spinning|spin bike/i, 'spinning'],
  [/stationary|bike|ergometer|cycling \(indoor\)/i, 'ergometer'],
  [/cycling|radfahren|fahrrad/i, 'radfahren'],
  [/jump rope|seilspring/i, 'seilspringen'],
  [/swim|schwimm/i, 'schwimmen'],
  [/hik|wander/i, 'wandern'],
  [/walk|gehen|spazier/i, 'gehen'],
  [/run|jog|lauf/i, 'laufen'],
];

/** Cardio-Art aus dem Übungsnamen in Strong/Hevy; unbekannt = „sonstiges“ (Name bleibt erhalten). */
export function cardioActivityOf(name: string): CardioActivity {
  return CARDIO_NAMES.find(([re]) => re.test(name))?.[1] ?? 'sonstiges';
}

/** Übungen, die zugeordnet werden müssen: alle mit mindestens einem Kraft-Satz (reine Cardio-Übungen gehen ins Cardio). */
export function strengthExercises(imp: TrainingImport): string[] {
  const out = new Set<string>();
  for (const w of imp.workouts) for (const s of w.sets) if (!isCardioSet(s)) out.add(s.exercise);
  return [...out].sort();
}
