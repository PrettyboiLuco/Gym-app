// Meilensteine und Wochenbilanz (Ausbauplan A10.5/A10.6). Bewusst ohne Serien: Ruhetage gehören zum Plan, eine
// verpasste Woche nimmt nichts weg, Wochen mit Status krank/verletzt/Pause zählen gar nicht.

import { shiftDay, weekStart } from './dates';

export const MILESTONES = [
  'training_1',
  'training_10',
  'training_50',
  'training_100',
  'training_250',
  'training_500',
  'saetze_1000',
  'saetze_5000',
  'kg_100',
  'planwochen_4',
  'planwochen_12',
] as const;
export type MilestoneId = (typeof MILESTONES)[number];
export type Milestone = { id: MilestoneId; day: string; detail: string | null };

export type MotivationInput = {
  /** Tag je abgeschlossenem Training, älteste zuerst. */
  sessionDays: string[];
  /** Arbeitssätze (ohne Aufwärmen), älteste zuerst; `normal` = Gewicht zählt als Last (nicht Gegengewicht). */
  sets: { day: string; exerciseId: string; weightKg: number | null; reps: number | null; normal: boolean }[];
  weeks: WeekResult[];
};

/** Erreichte Meilensteine mit Tag (älteste zuerst). */
export function milestones(input: MotivationInput): Milestone[] {
  const out: Milestone[] = [];
  const nth = (n: number, id: MilestoneId) => {
    if (input.sessionDays.length >= n) out.push({ id, day: input.sessionDays[n - 1], detail: null });
  };
  nth(1, 'training_1');
  nth(10, 'training_10');
  nth(50, 'training_50');
  nth(100, 'training_100');
  nth(250, 'training_250');
  nth(500, 'training_500');
  if (input.sets.length >= 1000) out.push({ id: 'saetze_1000', day: input.sets[999].day, detail: null });
  if (input.sets.length >= 5000) out.push({ id: 'saetze_5000', day: input.sets[4999].day, detail: null });
  const heavy = input.sets.find((s) => s.normal && (s.weightKg ?? 0) >= 100 && (s.reps ?? 0) >= 1);
  if (heavy) out.push({ id: 'kg_100', day: heavy.day, detail: heavy.exerciseId });
  let run = 0;
  for (const w of input.weeks) {
    if (w.status === 'pausiert') continue;
    run = w.status === 'geschafft' ? run + 1 : 0;
    if (run === 4 && !out.some((m) => m.id === 'planwochen_4')) out.push({ id: 'planwochen_4', day: w.end, detail: null });
    if (run === 12 && !out.some((m) => m.id === 'planwochen_12')) out.push({ id: 'planwochen_12', day: w.end, detail: null });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day) || MILESTONES.indexOf(a.id) - MILESTONES.indexOf(b.id));
}

// ---------------------------------------------------------------------------- Wochenbilanz

export type WeekStatus = 'geschafft' | 'offen' | 'pausiert' | 'laeuft';
export type WeekResult = { start: string; end: string; trained: number; goal: number; status: WeekStatus };

/**
 * Plan-Wochen von der ersten Trainingswoche bis heute. Geschafft = an mindestens `goal` Tagen trainiert (Ruhetage
 * zählen also mit). Die laufende Woche ist „läuft“, solange sie nicht geschafft ist. Status-Wochen zählen nicht.
 */
export function weekResults(trainingDays: string[], goal: number, today: string, pausedDay: (day: string) => boolean): WeekResult[] {
  if (!trainingDays.length || goal < 1) return [];
  const days = new Set(trainingDays);
  const out: WeekResult[] = [];
  for (let start = weekStart([...trainingDays].sort()[0]); start <= today; start = shiftDay(start, 7)) {
    const end = shiftDay(start, 6);
    let trained = 0;
    let paused = false;
    for (let i = 0; i < 7; i++) {
      const d = shiftDay(start, i);
      if (days.has(d)) trained++;
      if (d <= today && pausedDay(d)) paused = true;
    }
    const current = end >= today;
    const status: WeekStatus = trained >= goal ? 'geschafft' : paused ? 'pausiert' : current ? 'laeuft' : 'offen';
    out.push({ start, end, trained, goal, status });
  }
  return out;
}

export type Balance = { done: number; counted: number };

/** „x von y Plan-Wochen“ für die Wochen, die im Zeitraum enden; laufende und pausierte zählen nicht mit. */
export function balance(weeks: WeekResult[], from: string, to: string): Balance {
  const inRange = weeks.filter((w) => w.end >= from && w.start <= to && (w.status === 'geschafft' || w.status === 'offen'));
  return { done: inRange.filter((w) => w.status === 'geschafft').length, counted: inRange.length };
}

/** Neue Meilensteine seit dem letzten Ansehen. */
export function newMilestones(all: Milestone[], seen: readonly string[]): Milestone[] {
  return all.filter((m) => !seen.includes(m.id));
}
