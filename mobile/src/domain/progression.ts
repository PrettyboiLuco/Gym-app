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

import { DAY_MS } from './dates';
import type { Equipment } from './exercises';
import type { LoadMode } from './logger';
import { kgToUnit, unitToKg, type WeightUnit } from './units';

export const PROGRESSION_RULES_VERSION = 1;

/**
 * Fassung 2 (A1, vorbereitet, **ausgeschaltet** bis zur fachlichen Freigabe): wie Fassung 1, zusätzlich mit
 * Wiederholungen in Reserve (RIR) je Satz:
 * a) Alle Sätze im Bereich und jeder mit RIR ≥ 3 → mehr Gewicht, auch wenn das obere Ende noch nicht erreicht ist.
 * b) Ein Satz unter dem Bereich mit RIR 0 → Gewicht halten (Grenze erreicht, nicht steigern).
 * Ohne RIR-Angaben verhält sich Fassung 2 genau wie Fassung 1.
 */
export const PROGRESSION_V2_ENABLED = false;

export type DoneSet = { weightKg: number; reps: number | null; seconds: number | null; rir?: number | null };
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
  // Kettlebells gibt es meist in 4-kg-Stufen.
  if (equipment === 'kettlebell') return 4;
  if (equipment === 'medizinball') return 1;
  return equipment === 'kurzhantel' ? 2 : 2.5;
}

/** Auf den Schritt runden (in der Anzeigeeinheit), zurück in kg. */
function roundToStep(kg: number, step: number, unit: WeightUnit): number {
  const shown = Math.max(0, Math.round(kgToUnit(kg, unit) / step) * step);
  return Math.round(unitToKg(shown, unit) * 1000) / 1000;
}

/**
 * Leichter um den Faktor, auf den Geräteschritt gerundet – aber mindestens ein Schritt leichter, sonst bliebe
 * „ca. 10 % leichter“ bei großen Schritten (Kettlebell 16 kg, Kurzhantel 8 kg) beim selben Gewicht (Phase 1 Scan).
 */
function lighter(kg: number, factor: number, step: number, unit: WeightUnit): number {
  const rounded = roundToStep(kg * factor, step, unit);
  if (rounded < kg || kg <= 0) return rounded;
  return roundToStep(Math.max(0, unitToKg(kgToUnit(roundToStep(kg, step, unit), unit) - step, unit)), step, unit);
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
  unit: WeightUnit,
  /** Gegengewicht-Maschine: mehr Gewicht heißt mehr Unterstützung – die Richtung wird umgedreht (A1). */
  loadMode: LoadMode = 'normal',
  version: 1 | 2 = PROGRESSION_V2_ENABLED ? 2 : 1
): Advice | null {
  const advice = adviceV1(history, target, equipment, unit, version);
  return advice && loadMode === 'unterstuetzt' ? invertForAssist(advice, history, equipment, unit) : advice;
}

/** Bei Gegengewicht: Steigern = weniger Unterstützung, Zurücknehmen = mehr Unterstützung. */
function invertForAssist(advice: Advice, history: PastSession[], equipment: Equipment, unit: WeightUnit): Advice {
  const last = history.find((h) => h.sets.length > 0);
  if (!last) return advice;
  const step = weightStep(equipment, unit);
  const assist = Math.min(...last.sets.map((s) => s.weightKg));
  switch (advice.kind) {
    case 'mehrGewicht':
      if (assist <= 0) return { kind: 'variante', reps: advice.reps };
      return { ...advice, weightKg: roundToStep(Math.max(0, assist - unitToKg(step, unit)), step, unit) };
    case 'stagnation':
      return { ...advice, weightKg: roundToStep(assist * 1.1 + unitToKg(step, unit), step, unit) };
    case 'wiedereinstieg':
      return advice.seconds !== null ? advice : { ...advice, weightKg: roundToStep(assist * (1 + advice.percent / 100) + unitToKg(step, unit), step, unit) };
    case 'halten':
    case 'mehrWdh':
      return { ...advice, weightKg: assist };
    default:
      return advice;
  }
}

function adviceV1(history: PastSession[], target: Target, equipment: Equipment, unit: WeightUnit, version: 1 | 2): Advice | null {
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
      weightKg: lighter(weight, factor, step, unit),
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
    if (weight === 0 && (equipment === 'koerpergewicht' || equipment === 'band' || equipment === 'gymnastikball'))
      return { kind: 'variante', reps: target.repsMax };
    return { kind: 'mehrGewicht', weightKg: roundToStep(weight + unitToKg(step, unit), step, unit), reps: target.repsMin };
  }

  if (version === 2) {
    const inRange = atWeight.length >= target.sets && atWeight.every((s) => (s.reps ?? 0) >= target.repsMin!);
    const easy = atWeight.length > 0 && atWeight.every((s) => s.rir != null && s.rir >= 3);
    if (inRange && easy && weight > 0) {
      return { kind: 'mehrGewicht', weightKg: roundToStep(weight + unitToKg(step, unit), step, unit), reps: target.repsMin };
    }
    if (last.sets.some((s) => (s.reps ?? 0) < target.repsMin! && s.rir === 0)) return { kind: 'halten', weightKg: weight, reps: target.repsMin };
  }

  const below = last.sets.filter((s) => (s.reps ?? 0) < target.repsMin!).length;
  if (below * 2 > last.sets.length) return { kind: 'halten', weightKg: weight, reps: target.repsMin };

  // Stagnation: die letzten drei Einheiten mit gleichem Höchstgewicht, Wiederholungen nicht gestiegen.
  const recent = history.filter((h) => h.sets.length > 0).slice(0, 3);
  if (recent.length === 3 && recent.every((h) => topWeight(h.sets) === weight) && totalReps(recent[0].sets, weight) <= totalReps(recent[2].sets, weight)) {
    return { kind: 'stagnation', weightKg: lighter(weight, 0.9, step, unit), reps: target.repsMin };
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
export function daysSince(fromIso: string, toMs: number): number {
  return Math.floor((toMs - Date.parse(fromIso)) / DAY_MS);
}

/** Pause seit dem letzten Training groß genug für einen Hinweis zum Wiedereinstieg (TRAIN-015)? */
export const COMEBACK_DAYS = 14;
