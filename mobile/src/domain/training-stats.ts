// Auswertung im Training (Ausbauplan A8): eigene Satzzeit, Zeitraum-Statistik mit Bestleistungen, Sätze je
// Muskelgruppe, geplanter Deload und Geräteprofile. Reine Logik ohne Datenbank.

import { shiftDay, weekStart } from './dates';
import type { Equipment } from './exercises';
import { setVolume, type LoadMode, type SetType } from './logger';
import type { PlanDraft } from './training';

// --------------------------------------------------------------------------- Eigene Satzzeit

export type SessionTiming = { durationSec: number; sets: { exerciseId: string; restSeconds: number }[] };

export const SET_SECONDS_RANGE = { min: 20, max: 150 } as const;
export const MIN_TIMED_SESSIONS = 3;

/**
 * Sekunden je Satz aus den letzten Trainings: Dauer minus geplante Pausen (nicht nach dem letzten Satz einer Übung)
 * minus 60 s Wechsel je Übung, geteilt durch die Sätze. Median über die Trainings; unter 3 Trainings → null (45 s).
 */
export function personalSecondsPerSet(sessions: SessionTiming[]): number | null {
  const values: number[] = [];
  for (const s of sessions) {
    if (s.sets.length < 6 || s.durationSec <= 0 || s.durationSec > 4 * 3600) continue;
    const exercises = [...new Set(s.sets.map((x) => x.exerciseId))];
    const lastOf = new Map(exercises.map((id) => [id, s.sets.map((x) => x.exerciseId).lastIndexOf(id)]));
    const rest = s.sets.reduce((sum, x, i) => sum + (lastOf.get(x.exerciseId) === i ? 0 : x.restSeconds), 0);
    const perSet = (s.durationSec - rest - exercises.length * 60) / s.sets.length;
    values.push(Math.min(SET_SECONDS_RANGE.max, Math.max(SET_SECONDS_RANGE.min, perSet)));
  }
  if (values.length < MIN_TIMED_SESSIONS) return null;
  const sorted = values.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}

// ------------------------------------------------------------------------------ Statistik

export type StatSet = {
  sessionId: string;
  day: string;
  exerciseId: string;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
};

export type PeriodRecord = {
  exerciseId: string;
  day: string;
  kind: 'gewicht' | 'wiederholungen' | 'zeit';
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
};

export type PeriodStats = {
  sessions: number;
  sets: number;
  volumeKg: number;
  cardioMinutes: number;
  cardioCount: number;
  records: PeriodRecord[];
  perExercise: { exerciseId: string; sets: number; volumeKg: number }[];
};

const isWork = (t: SetType) => t !== 'aufwaermen';

/**
 * Zahlen eines Zeitraums. `all` = alle Sätze aller abgeschlossenen Trainings, älteste zuerst (für die Bestleistungen
 * braucht es die Zeit davor). Bestleistung wie nach dem Training: mehr Gewicht, bei gleichem Höchstgewicht mehr
 * Wiederholungen, bei Zeitübungen länger – das erste Mal zählt nicht als Bestleistung.
 */
export function periodStats(
  all: StatSet[],
  cardio: { day: string; minutes: number | null }[],
  from: string,
  to: string,
  modeOf: (exerciseId: string) => LoadMode = () => 'normal'
): PeriodStats {
  const best = new Map<string, { kg: number; reps: number; seconds: number }>();
  const records = new Map<string, PeriodRecord>();
  const perExercise = new Map<string, { sets: number; volumeKg: number }>();
  const sessions = new Set<string>();
  let sets = 0;
  let volumeKg = 0;
  // Pro Training erst alle Sätze sammeln, dann mit dem Stand davor vergleichen.
  const bySession = new Map<string, StatSet[]>();
  for (const s of all) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s]);
  for (const [sessionId, list] of bySession) {
    const day = list[0].day;
    const inRange = day >= from && day <= to;
    if (inRange) sessions.add(sessionId);
    const work = list.filter((s) => isWork(s.setType));
    for (const s of work) {
      if (!inRange) continue;
      sets++;
      const v = setVolume(s.weightKg, s.reps, modeOf(s.exerciseId));
      volumeKg += v;
      const e = perExercise.get(s.exerciseId) ?? { sets: 0, volumeKg: 0 };
      perExercise.set(s.exerciseId, { sets: e.sets + 1, volumeKg: e.volumeKg + v });
    }
    for (const exerciseId of new Set(work.map((s) => s.exerciseId))) {
      if (modeOf(exerciseId) === 'unterstuetzt') continue;
      const mine = work.filter((s) => s.exerciseId === exerciseId);
      const kg = Math.max(0, ...mine.filter((s) => (s.reps ?? 0) > 0).map((s) => s.weightKg ?? 0));
      const reps = Math.max(0, ...mine.filter((s) => (s.weightKg ?? 0) === kg).map((s) => s.reps ?? 0));
      const seconds = Math.max(0, ...mine.map((s) => s.seconds ?? 0));
      const prev = best.get(exerciseId);
      if (prev && inRange) {
        let kind: PeriodRecord['kind'] | null = null;
        if (seconds > 0 && seconds > prev.seconds) kind = 'zeit';
        else if (kg > 0 && kg > prev.kg) kind = 'gewicht';
        else if (kg > 0 && kg === prev.kg && reps > prev.reps) kind = 'wiederholungen';
        if (kind) records.set(exerciseId, { exerciseId, day, kind, weightKg: kg || null, reps: reps || null, seconds: seconds || null });
      }
      best.set(exerciseId, {
        kg: Math.max(prev?.kg ?? 0, kg),
        reps: kg > (prev?.kg ?? 0) ? reps : kg === (prev?.kg ?? 0) ? Math.max(prev?.reps ?? 0, reps) : (prev?.reps ?? 0),
        seconds: Math.max(prev?.seconds ?? 0, seconds),
      });
    }
  }
  const inCardio = cardio.filter((c) => c.day >= from && c.day <= to);
  return {
    sessions: sessions.size,
    sets,
    volumeKg: Math.round(volumeKg),
    cardioMinutes: Math.round(inCardio.reduce((s, c) => s + (c.minutes ?? 0), 0)),
    cardioCount: inCardio.length,
    records: [...records.values()].sort((a, b) => b.day.localeCompare(a.day)),
    perExercise: [...perExercise.entries()]
      .map(([exerciseId, v]) => ({ exerciseId, sets: v.sets, volumeKg: Math.round(v.volumeKg) }))
      .sort((a, b) => b.volumeKg - a.volumeKg || b.sets - a.sets),
  };
}

/** Stufe für die Karte: 0 = keine Sätze, 1 = 1–5, 2 = 6–11, 3 = 12–19, 4 = ab 20 Sätzen pro Woche. */
export function muscleLevel(sets: number): 0 | 1 | 2 | 3 | 4 {
  return sets <= 0 ? 0 : sets <= 5 ? 1 : sets <= 11 ? 2 : sets <= 19 ? 3 : 4;
}

// ------------------------------------------------------------------------------------ Deload

export const DELOAD_RULES_VERSION = 1;
export const DELOAD_WEEKS_DEFAULT = 8;
export const DELOAD_RIR = '3';

/**
 * Trainingswochen am Stück seit dem letzten Deload: Wochen mit mindestens einem Training, rückwärts ab der
 * aktuellen Woche; eine Woche ganz ohne Training beendet den Block (das war die Pause).
 */
export function trainingWeeksInBlock(trainingDays: string[], today: string, lastDeloadEnd: string | null): number {
  const weeks = new Set(trainingDays.filter((d) => d <= today && (!lastDeloadEnd || d > lastDeloadEnd)).map(weekStart));
  let count = 0;
  let cursor = weekStart(today);
  // Die laufende Woche zählt, auch wenn noch kein Training war.
  if (!weeks.has(cursor)) cursor = shiftDay(cursor, -7);
  while (weeks.has(cursor)) {
    count++;
    cursor = shiftDay(cursor, -7);
  }
  return count;
}

/** Angebot einer leichten Woche? Nur Angebot; „später“ verschiebt um eine Woche. */
export function deloadDue(weeksInBlock: number, intervalWeeks: number, snoozedUntil: string | null, today: string): boolean {
  if (snoozedUntil && today <= snoozedUntil) return false;
  return weeksInBlock >= intervalWeeks;
}

/** Leichte Woche: halbe Sätze (mindestens 1), RIR 3, gleiche Übungen und Wiederholungen. */
export function deloadDraft(draft: PlanDraft): PlanDraft {
  return {
    ...draft,
    days: draft.days.map((d) => ({
      ...d,
      items: d.items.map((i) => ({ ...i, sets: Math.max(1, Math.ceil(i.sets / 2)), rir: i.targetSeconds ? i.rir : DELOAD_RIR })),
    })),
  };
}

// ------------------------------------------------------------------------------ Geräteprofile

export type EquipmentProfile = { id: string; name: string; equipment: Equipment[] };

export const DEFAULT_PROFILES = (studio: Equipment[]): EquipmentProfile[] => [
  { id: 'studio', name: 'Studio', equipment: studio },
  { id: 'zuhause', name: 'Zuhause', equipment: ['koerpergewicht', 'kurzhantel', 'band'] },
  { id: 'hotel', name: 'Hotel', equipment: ['koerpergewicht', 'kurzhantel', 'maschine', 'kabel'] },
];

/** Körpergewicht geht immer. */
export function usableEquipment(profile: EquipmentProfile): Equipment[] {
  return [...new Set<Equipment>(['koerpergewicht', ...profile.equipment])];
}
