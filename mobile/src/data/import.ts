// Import aus anderen Apps (Ausbauplan A5.3/A5.4): Trainings aus Strong/Hevy als abgeschlossene Einheiten mit Sätzen,
// Cardio-Sätze als Cardio-Einträge, Gewichte aus CSV. Doppelte werden übersprungen (gleiche Startzeit bzw. gleicher
// Tag), daher kann man denselben Export gefahrlos zweimal einlesen.

import {
  cardioActivityOf,
  equipmentHint,
  isCardioSet,
  matchExercise,
  type Candidate,
  type ImportedSet,
  type TrainingImport,
  type WeightRow,
} from '@/domain/import-csv';
import { localDay, timeZone } from '@/domain/time';
import { exerciseName, exerciseSynonyms } from '@/format/exercise-name';

import { newId, nowUtc, type Db } from './db';
import { addCustomExercise, listExercises } from './training';

/** Zuordnung je Übungsname: ID einer vorhandenen Übung, „neu“ (eigene Übung anlegen) oder „weglassen“. */
export type ExerciseChoice = { kind: 'vorhanden'; id: string } | { kind: 'neu' } | { kind: 'weglassen' };

async function exerciseCandidates(db: Db): Promise<Candidate[]> {
  return (await listExercises(db))
    .filter((e) => e.kind === 'kraft')
    .map((e) => ({ id: e.id, names: [exerciseName(e), ...exerciseSynonyms(e)], equipment: e.equipment }));
}

/** Vorschlag je Name: sicherer Treffer → vorhandene Übung, sonst „neu“ (der Nutzer kann alles ändern). */
export async function suggestChoices(db: Db, names: string[]): Promise<Record<string, ExerciseChoice & { score?: number }>> {
  const candidates = await exerciseCandidates(db);
  const out: Record<string, ExerciseChoice & { score?: number }> = {};
  for (const n of names) {
    const hit = matchExercise(n, candidates);
    out[n] = hit ? { kind: 'vorhanden', id: hit.id, score: hit.score } : { kind: 'neu' };
  }
  return out;
}

export type ImportResult = { workouts: number; sets: number; cardio: number; duplicates: number; newExercises: number };

const intOrNull = (v: number | null, min = 1) => (v === null || !Number.isFinite(v) || Math.round(v) < min ? null : Math.round(v));

function measureOf(sets: ImportedSet[]) {
  return sets.every((s) => !s.reps && (s.seconds ?? 0) > 0) ? 'zeit' : 'wdh';
}

export async function importTraining(db: Db, imp: TrainingImport, choices: Record<string, ExerciseChoice>): Promise<ImportResult> {
  const result: ImportResult = { workouts: 0, sets: 0, cardio: 0, duplicates: 0, newExercises: 0 };
  const existing = new Set((await db.getAllAsync<{ at: string }>('SELECT started_at_utc AS at FROM workout_session')).map((r) => new Date(r.at).toISOString()));
  await db.withTransactionAsync(async () => {
    // Eigene Übungen nur für Namen anlegen, die wirklich Kraft-Sätze haben
    const ids = new Map<string, string>();
    const setsByName = new Map<string, ImportedSet[]>();
    for (const w of imp.workouts) for (const s of w.sets) if (!isCardioSet(s)) setsByName.set(s.exercise, [...(setsByName.get(s.exercise) ?? []), s]);
    for (const [name, sets] of setsByName) {
      const choice = choices[name] ?? { kind: 'neu' };
      if (choice.kind === 'vorhanden') ids.set(name, choice.id);
      else if (choice.kind === 'neu') {
        const id = await addCustomExercise(db, name, equipmentHint(name) ?? 'maschine', 'ganzkoerper', { measure: measureOf(sets) });
        ids.set(name, id);
        result.newExercises++;
      }
    }

    for (const w of imp.workouts) {
      if (existing.has(w.startedAt)) {
        result.duplicates++;
        continue;
      }
      const start = new Date(w.startedAt).getTime();
      const end = w.finishedAt ? new Date(w.finishedAt).getTime() : start + Math.max(1, w.sets.length) * 2 * 60_000;
      const strength = w.sets.filter((s) => !isCardioSet(s) && ids.has(s.exercise) && (intOrNull(s.reps) || intOrNull(s.seconds)));
      const cardio = w.sets.filter(isCardioSet);
      if (strength.length === 0 && cardio.length === 0) continue;
      const sessionId = newId();
      const title = /^(hevy|strong)$/i.test(w.title) ? null : w.title;
      const note = [title, w.note].filter(Boolean).join(' – ') || null;
      await db.runAsync(
        `INSERT INTO workout_session (id, plan_day_id, status, started_at_utc, finished_at_utc, note, time_zone) VALUES (?, NULL, 'abgeschlossen', ?, ?, ?, ?)`,
        sessionId,
        w.startedAt,
        new Date(end).toISOString(),
        note,
        timeZone
      );
      // Zeitpunkte gleichmäßig über die Einheit verteilen, damit Reihenfolge und Verlauf stimmen
      const step = strength.length > 1 ? (end - start) / strength.length : 0;
      for (const [i, s] of strength.entries()) {
        await db.runAsync(
          `INSERT INTO set_log (id, session_id, exercise_id, position, weight_kg, reps, seconds, set_type, rir, note, completed_at_utc)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          newId(),
          sessionId,
          ids.get(s.exercise)!,
          i,
          s.weightKg !== null && s.weightKg >= 0 ? s.weightKg : null,
          intOrNull(s.reps),
          intOrNull(s.seconds),
          s.setType,
          s.rir,
          s.note,
          new Date(start + step * (i + 1)).toISOString()
        );
        result.sets++;
      }
      for (const s of cardio) {
        const minutes = s.seconds ? Math.min(600, Math.round((s.seconds / 60) * 10) / 10) : null;
        const km = s.distanceKm && s.distanceKm <= 300 ? Math.round(s.distanceKm * 100) / 100 : null;
        const activity = cardioActivityOf(s.exercise);
        await db.runAsync(
          `INSERT INTO cardio_log (id, session_id, activity, custom_name, day, at_end, minutes, distance_km, note, completed_at_utc, created_at_utc)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
          newId(),
          sessionId,
          activity,
          activity === 'sonstiges' ? s.exercise : null,
          localDay(new Date(start), timeZone),
          minutes && minutes > 0 ? minutes : null,
          km && km > 0 ? km : null,
          s.note,
          new Date(end).toISOString(),
          nowUtc()
        );
        result.cardio++;
      }
      existing.add(w.startedAt);
      result.workouts++;
    }
  });
  return result;
}

/** Gewichte übernehmen; Tage, für die es schon einen Wert gibt, bleiben unverändert. */
export async function importWeights(db: Db, rows: WeightRow[]): Promise<{ added: number; skipped: number }> {
  const days = new Set((await db.getAllAsync<{ day: string }>('SELECT DISTINCT day FROM weight_entry')).map((r) => r.day));
  let added = 0;
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      if (days.has(r.day)) continue;
      await db.runAsync('INSERT INTO weight_entry (id, day, kg, recorded_at_utc) VALUES (?, ?, ?, ?)', newId(), r.day, r.kg, `${r.day}T08:00:00.000Z`);
      days.add(r.day);
      added++;
    }
  });
  return { added, skipped: rows.length - added };
}
