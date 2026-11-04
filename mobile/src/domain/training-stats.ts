// Auswertung im Training (Ausbauplan A8): eigene Satzzeit, Zeitraum-Statistik mit Bestleistungen, Sätze je
// Muskelgruppe, geplanter Deload und Geräteprofile. Reine Logik ohne Datenbank.

import { isoWeekday, shiftDay, weekStart } from './dates';
import type { Equipment } from './exercises';
import { estimateOneRepMax, sameKg, setVolume, type LoadMode, type SetType } from './logger';
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

// ------------------------------------------------------------------- Bestleistungen & Verlauf

/** Verlauf der häufigsten Übungen: so viele Wochen (Mo–So, die laufende zuletzt) und so viele Übungen. */
export const TREND_WEEKS = 8;
export const TREND_TOP = 5;

/**
 * Was der Verlauf einer Übung zeigt:
 * - e1rm: bestes geschätztes 1RM je Woche (Epley, bis 12 Wdh.) – Kraftübungen mit Gewicht
 * - gegengewicht: geringstes Gegengewicht je Woche (Maschine mit Unterstützung) – weniger heißt mehr eigene Last
 * - zeit: längste Haltezeit je Woche
 * - volumen: Volumen je Woche (kg × Wdh.), wenn kein 1RM schätzbar ist (z. B. nur über 12 Wdh.)
 * - wdh: meiste Wiederholungen in einem Satz (Körpergewicht ohne Zusatzgewicht)
 */
export type TrendMetric = 'e1rm' | 'gegengewicht' | 'zeit' | 'volumen' | 'wdh';

export type TrendRecord = { day: string; value: number; weightKg: number | null; reps: number | null; seconds: number | null };

export type ExerciseTrend = {
  exerciseId: string;
  metric: TrendMetric;
  /** Arbeitssätze im Fenster (danach richtet sich die Reihenfolge). */
  sets: number;
  /** Wert je Woche, älteste zuerst; null = in dieser Woche nicht trainiert. */
  weeks: (number | null)[];
  /** Letzter Wochenwert (die jüngste Woche mit Training). */
  latest: number | null;
  /** Letzte Bestleistung über die ganze Zeit (das erste Training einer Übung zählt nicht); null = noch keine. */
  record: TrendRecord | null;
};

/** Gegengewicht: weniger ist besser; alles andere: mehr ist besser. Kleine Unterschiede (Rundung) zählen nicht. */
export function betterTrend(metric: TrendMetric, value: number, than: number): boolean {
  if (metric === 'gegengewicht') return value < than && !sameKg(value, than);
  return value - than > (metric === 'e1rm' || metric === 'volumen' ? 0.05 : 0);
}

type Best = { value: number; weightKg: number | null; reps: number | null; seconds: number | null };

/** Bester Satz bzw. Wert einer Gruppe von Arbeitssätzen nach der Kennzahl; null = kein passender Satz. */
function bestOf(metric: TrendMetric, sets: StatSet[], mode: LoadMode): Best | null {
  let best: Best | null = null;
  const take = (b: Best) => {
    if (!best || betterTrend(metric, b.value, best.value)) best = b;
  };
  if (metric === 'volumen') {
    const value = sets.reduce((sum, s) => sum + setVolume(s.weightKg, s.reps, mode), 0);
    return value > 0 ? { value, weightKg: null, reps: null, seconds: null } : null;
  }
  for (const s of sets) {
    if (metric === 'e1rm') {
      const e = s.weightKg != null && s.reps != null ? estimateOneRepMax(s.weightKg, s.reps) : null;
      if (e !== null) take({ value: e, weightKg: s.weightKg, reps: s.reps, seconds: null });
    } else if (metric === 'gegengewicht') {
      if ((s.reps ?? 0) > 0 && s.weightKg != null) take({ value: s.weightKg, weightKg: s.weightKg, reps: s.reps, seconds: null });
    } else if (metric === 'zeit') {
      if ((s.seconds ?? 0) > 0) take({ value: s.seconds!, weightKg: s.weightKg, reps: null, seconds: s.seconds });
    } else if ((s.reps ?? 0) > 0) take({ value: s.reps!, weightKg: s.weightKg, reps: s.reps, seconds: null });
  }
  return best;
}

/** Passende Kennzahl einer Übung aus ihren Arbeitssätzen. */
function metricFor(sets: StatSet[], mode: LoadMode): TrendMetric {
  if (mode === 'unterstuetzt') return 'gegengewicht';
  if (sets.some((s) => (s.seconds ?? 0) > 0 && !(s.reps ?? 0))) return 'zeit';
  if (bestOf('e1rm', sets, mode)) return 'e1rm';
  if (bestOf('volumen', sets, mode)) return 'volumen';
  return 'wdh';
}

/**
 * „Bestleistungen & Verlauf“: die häufigsten Übungen der letzten Wochen (nach Arbeitssätzen) mit einem Wert je Woche
 * und der letzten Bestleistung. `all` = alle Sätze abgeschlossener Trainings, älteste zuerst – die Bestleistung braucht
 * auch die Zeit vor dem Fenster. Beschreibt nur, was war: keine Wertung, keine Serien.
 */
export function exerciseTrends(
  all: StatSet[],
  today: string,
  modeOf: (exerciseId: string) => LoadMode = () => 'normal',
  weeks = TREND_WEEKS,
  top = TREND_TOP
): ExerciseTrend[] {
  const work = all.filter((s) => isWork(s.setType) && s.day <= today);
  const first = shiftDay(weekStart(today), -7 * (weeks - 1));
  const inWindow = work.filter((s) => s.day >= first);
  const counts = new Map<string, { sets: number; last: string }>();
  for (const s of inWindow) {
    const c = counts.get(s.exerciseId);
    counts.set(s.exerciseId, { sets: (c?.sets ?? 0) + 1, last: c && c.last > s.day ? c.last : s.day });
  }
  const chosen = [...counts.entries()].sort((a, b) => b[1].sets - a[1].sets || b[1].last.localeCompare(a[1].last) || a[0].localeCompare(b[0])).slice(0, top);

  return chosen.map(([exerciseId, { sets }]) => {
    const mode = modeOf(exerciseId);
    const mine = work.filter((s) => s.exerciseId === exerciseId);
    const metric = metricFor(
      inWindow.filter((s) => s.exerciseId === exerciseId),
      mode
    );
    const values = Array.from({ length: weeks }, (_, i) => {
      const from = shiftDay(first, 7 * i);
      const to = shiftDay(from, 6);
      return (
        bestOf(
          metric,
          mine.filter((s) => s.day >= from && s.day <= to),
          mode
        )?.value ?? null
      );
    });
    // Bestleistung: Training für Training mit dem Stand davor vergleichen (wie nach dem Training).
    const bySession = new Map<string, StatSet[]>();
    for (const s of mine) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s]);
    let best: number | null = null;
    let record: TrendRecord | null = null;
    for (const list of bySession.values()) {
      const b = bestOf(metric, list, mode);
      if (!b) continue;
      if (best !== null && betterTrend(metric, b.value, best)) record = { day: list[0].day, ...b };
      if (best === null || betterTrend(metric, b.value, best)) best = b.value;
    }
    const present = values.filter((v): v is number => v !== null);
    return { exerciseId, metric, sets, weeks: values, latest: present.at(-1) ?? null, record };
  });
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

/**
 * Ende der leichten Woche: der kommende Sonntag. Am Sonntag selbst gestartet läuft sie bis zum nächsten Sonntag –
 * sonst wäre sie nur einen Tag lang, würde aber den 8-Wochen-Zähler trotzdem zurücksetzen (Phase 1 Scan).
 */
export function deloadEnd(today: string): string {
  return isoWeekday(today) === 7 ? shiftDay(today, 7) : shiftDay(today, 7 - isoWeekday(today));
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
