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
  sets?: { day: string; exerciseId: string; weightKg: number | null; reps: number | null; normal: boolean }[];
  /** Statt aller Sätze nur die Kennzahlen daraus (schnell, per SQL ermittelt – „Heute“ braucht nicht die ganze Historie). */
  summary?: SetSummary;
  weeks: WeekResult[];
};

/** Was Meilensteine und „Bisher“ aus den Sätzen brauchen. */
export type SetSummary = {
  count: number;
  /** Tag des 1000. bzw. 5000. Satzes (falls erreicht). */
  day1000: string | null;
  day5000: string | null;
  /** Erster Satz mit mindestens 100 kg (echte Last, ≥ 1 Wiederholung). */
  heavy: { day: string; exerciseId: string } | null;
  bestKg: number;
};

/** Kennzahlen aus einer vollständigen Satzliste (älteste zuerst). */
export function summarizeSets(sets: NonNullable<MotivationInput['sets']>): SetSummary {
  const heavy = sets.find((s) => s.normal && (s.weightKg ?? 0) >= 100 && (s.reps ?? 0) >= 1);
  return {
    count: sets.length,
    day1000: sets[999]?.day ?? null,
    day5000: sets[4999]?.day ?? null,
    heavy: heavy ? { day: heavy.day, exerciseId: heavy.exerciseId } : null,
    bestKg: sets.reduce((max, x) => (x.normal && (x.reps ?? 0) >= 1 ? Math.max(max, x.weightKg ?? 0) : max), 0),
  };
}

const summaryOf = (input: MotivationInput): SetSummary => input.summary ?? summarizeSets(input.sets ?? []);

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
  const sum = summaryOf(input);
  if (sum.day1000) out.push({ id: 'saetze_1000', day: sum.day1000, detail: null });
  if (sum.day5000) out.push({ id: 'saetze_5000', day: sum.day5000, detail: null });
  const heavy = sum.heavy;
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

export type MilestoneStats = { trainings: number; sets: number; bestKg: number; weekRun: number };

/** Kennzahlen für „Bisher“ und den Fortschritt zum nächsten Meilenstein (gleiche Zählweise wie `milestones`). */
export function milestoneStats(input: MotivationInput): MilestoneStats {
  let run = 0;
  for (const w of input.weeks) {
    if (w.status === 'pausiert' || w.status === 'laeuft') continue;
    run = w.status === 'geschafft' ? run + 1 : 0;
  }
  const sum = summaryOf(input);
  return { trainings: input.sessionDays.length, sets: sum.count, bestKg: sum.bestKg, weekRun: run };
}

/** Wie weit bis zu einem Meilenstein? `current` ist nie größer als `target`. */
export function milestoneProgress(id: MilestoneId, stats: MilestoneStats): { current: number; target: number } {
  const [kind, raw] = id.split('_');
  const target = Number(raw);
  const value = kind === 'training' ? stats.trainings : kind === 'saetze' ? stats.sets : kind === 'kg' ? stats.bestKg : stats.weekRun;
  return { current: Math.min(value, target), target };
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
