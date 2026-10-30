// Steigerungsregeln (Phase 8.5, Register TRAIN-018, TRAIN-015). Versionierte Entscheidungstabelle,
// damit eine spätere fachliche Abnahme (Phase 10.1) genau diese Fassung prüft. Ein Vorschlag ist nie
// Pflicht: Er füllt auf Wunsch die Eingabefelder, gespeichert wird nur, was du einträgst.
//
// Fassung 1 (Vorschlag, fachlich nicht abgenommen):
// 1. Wiedereinstieg: letzte Einheit dieser Übung vor ≥ 28 Tagen → −20 %, vor ≥ 14 Tagen → −10 %.
// 2. Zeit-Übung: alle Sätze mit Zielzeit geschafft → +5 s, sonst Zeit halten.
// 3. Alle geplanten Sätze am oberen Ende des Wiederholungsbereichs → mehr Gewicht (kleinster Schritt),
//    wieder am unteren Ende beginnen. Ohne Zusatzgewicht: mehr Wdh. oder schwerere Variante.
// 4. Mehr als die Hälfte der Sätze unter dem Bereich → Gewicht halten.
// 5. Dreimal hintereinander gleiches Gewicht ohne mehr Wiederholungen → Stagnation: ca. 10 % leichter
//    und neu aufbauen oder Übung/Bereich wechseln.
// 6. Sonst: gleiches Gewicht, eine Wiederholung mehr.

import type { Equipment } from './exercises';
import { kgToUnit, unitToKg, type WeightUnit } from './units';

export const PROGRESSION_RULES_VERSION = 1;

export type DoneSet = { weightKg: number; reps: number | null; seconds: number | null };
/** Eine frühere Einheit dieser Übung (gleiche Übung, TRAIN-014), neueste zuerst. */
export type PastSession = { daysAgo: number; sets: DoneSet[] };
export type Target = { sets: number; repsMin: number | null; repsMax: number | null; seconds: number | null };

export type Advice =
  | { kind: 'wiedereinstieg'; weightKg: number; reps: number | null; seconds: number | null; daysAgo: number; percent: number }
  | { kind: 'mehrGewicht'; weightKg: number; reps: number }
  | { kind: 'mehrWdh'; weightKg: number; reps: number }
  | { kind: 'variante'; reps: number }
  | { kind: 'halten'; weightKg: number; reps: number }
  | { kind: 'stagnation'; weightKg: number; reps: number }
  | { kind: 'mehrZeit'; seconds: number }
  | { kind: 'zeitHalten'; seconds: number };

/** Kleinster sinnvoller Gewichtsschritt in der gewählten Einheit. */
export function weightStep(equipment: Equipment, unit: WeightUnit): number {
  if (unit === 'lb') return 5;
  return equipment === 'kurzhantel' ? 2 : 2.5;
}

/** Auf den Schritt runden (in der Anzeigeeinheit), zurück in kg. */
function roundToStep(kg: number, step: number, unit: WeightUnit): number {
  const shown = Math.max(0, Math.round(kgToUnit(kg, unit) / step) * step);
  return Math.round(unitToKg(shown, unit) * 1000) / 1000;
}

function topWeight(sets: DoneSet[]): number {
  return Math.max(0, ...sets.map((s) => s.weightKg));
}

function totalReps(sets: DoneSet[], weight: number): number {
  return sets.filter((s) => s.weightKg === weight).reduce((sum, s) => sum + (s.reps ?? 0), 0);
}

export function progressionAdvice(
  history: PastSession[],
  target: Target,
  equipment: Equipment,
  unit: WeightUnit
): Advice | null {
  const last = history.find((h) => h.sets.length > 0);
  if (!last) return null;
  const step = weightStep(equipment, unit);
  const timed = target.seconds !== null;

  if (last.daysAgo >= 14) {
    const percent = last.daysAgo >= 28 ? 20 : 10;
    const factor = 1 - percent / 100;
    if (timed) {
      const best = Math.max(...last.sets.map((s) => s.seconds ?? 0));
      return { kind: 'wiedereinstieg', weightKg: 0, reps: null, seconds: Math.max(5, Math.round((best * factor) / 5) * 5), daysAgo: last.daysAgo, percent };
    }
    const weight = topWeight(last.sets);
    return {
      kind: 'wiedereinstieg',
      weightKg: roundToStep(weight * factor, step, unit),
      reps: target.repsMin,
      seconds: null,
      daysAgo: last.daysAgo,
      percent,
    };
  }

  if (timed) {
    const goal = target.seconds ?? 0;
    const reached = last.sets.length >= target.sets && last.sets.every((s) => (s.seconds ?? 0) >= goal);
    return reached ? { kind: 'mehrZeit', seconds: Math.min(600, goal + 5) } : { kind: 'zeitHalten', seconds: goal };
  }

  if (target.repsMin === null || target.repsMax === null) return null;
  const weight = topWeight(last.sets);
  const atWeight = last.sets.filter((s) => s.weightKg === weight);
  const allTop = atWeight.length >= target.sets && atWeight.every((s) => (s.reps ?? 0) >= target.repsMax!);
  if (allTop) {
    if (weight === 0 && equipment === 'koerpergewicht') return { kind: 'variante', reps: target.repsMax };
    return { kind: 'mehrGewicht', weightKg: roundToStep(weight + unitToKg(step, unit), step, unit), reps: target.repsMin };
  }

  const below = last.sets.filter((s) => (s.reps ?? 0) < target.repsMin!).length;
  if (below * 2 > last.sets.length) return { kind: 'halten', weightKg: weight, reps: target.repsMin };

  // Stagnation: die letzten drei Einheiten mit gleichem Höchstgewicht, Wiederholungen nicht gestiegen.
  const recent = history.filter((h) => h.sets.length > 0).slice(0, 3);
  if (
    recent.length === 3 &&
    recent.every((h) => topWeight(h.sets) === weight) &&
    totalReps(recent[0].sets, weight) <= totalReps(recent[2].sets, weight)
  ) {
    return { kind: 'stagnation', weightKg: roundToStep(weight * 0.9, step, unit), reps: target.repsMin };
  }

  const fewest = Math.min(...atWeight.map((s) => s.reps ?? 0));
  return { kind: 'mehrWdh', weightKg: weight, reps: Math.min(target.repsMax, Math.max(target.repsMin, fewest + 1)) };
}

/** Werte, mit denen offene Sätze vorbelegt werden (null = Feld nicht ändern). */
export function adviceValues(advice: Advice): { weightKg: number | null; reps: number | null; seconds: number | null } {
  switch (advice.kind) {
    case 'wiedereinstieg':
      return { weightKg: advice.seconds === null ? advice.weightKg : null, reps: advice.reps, seconds: advice.seconds };
    case 'mehrZeit':
    case 'zeitHalten':
      return { weightKg: null, reps: null, seconds: advice.seconds };
    case 'variante':
      return { weightKg: null, reps: advice.reps, seconds: null };
    default:
      return { weightKg: advice.weightKg, reps: advice.reps, seconds: null };
  }
}

/** Ganze Tage zwischen zwei Zeitpunkten (für „letzte Einheit vor … Tagen“). */
export function daysBetween(fromIso: string, toMs: number): number {
  return Math.floor((toMs - Date.parse(fromIso)) / 86_400_000);
}

/** Pause seit dem letzten Training groß genug für einen Hinweis zum Wiedereinstieg (TRAIN-015)? */
export const COMEBACK_DAYS = 14;
