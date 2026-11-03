// Logger-Paket (Ausbauplan A1): Satzarten, Gewichtsart je Übung, geschätztes 1RM, Scheibenrechner,
// Aufwärmsätze und Supersatz-Reihenfolge. Reine Logik ohne Oberfläche.

import type { Equipment, ExerciseKind, Sides } from './exercises';
import type { WeightUnit } from './units';

// ------------------------------------------------------------------------------------------ Satzarten

export const SET_TYPES = ['arbeit', 'aufwaermen', 'drop', 'versagen'] as const;
export type SetType = (typeof SET_TYPES)[number];

/** Aufwärmsätze zählen nicht für Bestleistungen, Volumen, Steigerung und Wochensätze. */
export const countsAsWork = (type: SetType | null | undefined) => type !== 'aufwaermen';

/** Kürzel statt Satznummer (Arbeitssätze werden fortlaufend nummeriert). */
export function setLabels(types: (SetType | null | undefined)[]): string[] {
  let n = 0;
  return types.map((t) => {
    if (t === 'aufwaermen') return 'A';
    if (t === 'drop') return 'D';
    n += 1;
    return t === 'versagen' ? `${n}V` : String(n);
  });
}

export const RIR_OPTIONS = [0, 1, 2, 3, 4] as const;

// ---------------------------------------------------------------------------------- Gewichtsart

/**
 * Wie das eingetragene Gewicht gemeint ist:
 * - normal: Gewicht der Hantel/Maschine
 * - einseitig: Gewicht je Seite (einarmig/einbeinig) – Volumen zählt beide Seiten
 * - unterstuetzt: Gegengewicht (Klimmzug-/Dip-Maschine) – weniger ist schwerer, zählt nicht zum Volumen
 * - zusatzgewicht: Körpergewicht plus Zusatz (Dip + 10 kg); 0 = nur Körpergewicht
 */
export const LOAD_MODES = ['normal', 'einseitig', 'unterstuetzt', 'zusatzgewicht'] as const;
export type LoadMode = (typeof LOAD_MODES)[number];

/** Startübungen mit Gegengewicht (Maschine): Klimmzug- und Dip-Maschinen. Band-Varianten tragen kein Gewicht ein. */
const ASSISTED_IDS = new Set(['dips_maschine', 'klimmzuege_maschine', 'klimmzuege_unterstuetzt']);

/**
 * Gleiche Last? Gewichte werden in kg gespeichert; 135 lb sind 61,2349… kg. Je nach Herkunft (Eingabe, Import,
 * Rundung auf den Geräteschritt) unterscheiden sich solche Werte in der dritten Nachkommastelle. Echte
 * Gewichtsunterschiede sind viel größer (kleinste Scheibe 0,5 kg bzw. 1 lb).
 */
export const SAME_KG_TOLERANCE = 0.01;
export const sameKg = (a: number, b: number) => Math.abs(a - b) < SAME_KG_TOLERANCE;

export function loadModeOf(exercise: { id: string; equipment: Equipment; kind: ExerciseKind; sides: Sides; loadMode?: LoadMode | null }): LoadMode {
  if (exercise.loadMode) return exercise.loadMode;
  if (exercise.kind !== 'kraft') return 'normal';
  if (ASSISTED_IDS.has(exercise.id)) return 'unterstuetzt';
  if (exercise.sides === 'einseitig') return 'einseitig';
  if (exercise.equipment === 'koerpergewicht') return 'zusatzgewicht';
  return 'normal';
}

/** Bewegtes Gewicht eines Satzes fürs Volumen. */
export function setVolume(weightKg: number | null, reps: number | null, mode: LoadMode): number {
  if (mode === 'unterstuetzt') return 0;
  const v = (weightKg ?? 0) * (reps ?? 0);
  return mode === 'einseitig' ? v * 2 : v;
}

// ------------------------------------------------------------------------------- geschätztes 1RM

export const E1RM_MAX_REPS = 12;

/** Geschätztes Einwiederholungs-Maximum nach Epley; nur bis 12 Wdh. sinnvoll, sonst null. */
export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (!(weightKg > 0) || !(reps >= 1) || reps > E1RM_MAX_REPS) return null;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** Bestes geschätztes 1RM aus mehreren Sätzen (Aufwärmsätze und unterstützte Übungen zählen nicht). */
export function bestOneRepMax(sets: { weightKg: number | null; reps: number | null; setType?: SetType | null }[], mode: LoadMode): number | null {
  if (mode === 'unterstuetzt') return null;
  let best: number | null = null;
  for (const s of sets) {
    if (!countsAsWork(s.setType) || s.weightKg == null || s.reps == null) continue;
    const e = estimateOneRepMax(s.weightKg, s.reps);
    if (e !== null && (best === null || e > best)) best = e;
  }
  return best;
}

// -------------------------------------------------------------------------------- Scheibenrechner

export type PlateSetup = { barKg: number; platesKg: number[] };
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5];
export const BAR_OPTIONS_KG = [20, 15, 10] as const;
export const BAR_OPTIONS_LB = [45, 35, 25] as const;

export function defaultPlateSetup(unit: WeightUnit): PlateSetup {
  return unit === 'lb' ? { barKg: 45, platesKg: DEFAULT_PLATES_LB } : { barKg: 20, platesKg: DEFAULT_PLATES_KG };
}

/** Langhantel-Übungen (Scheibenrechner sinnvoll). */
export const usesPlates = (equipment: Equipment) => equipment === 'langhantel';

/**
 * Scheiben je Seite für ein Zielgewicht (alles in der Anzeigeeinheit). Gierig von groß nach klein, jede Scheibe
 * beliebig oft. `rest` > 0, wenn sich das Gewicht mit den Scheiben nicht genau legen lässt.
 */
export function platesPerSide(target: number, setup: PlateSetup): { plates: number[]; rest: number } | null {
  if (!(target >= setup.barKg)) return null;
  let side = Math.round(((target - setup.barKg) / 2) * 1000) / 1000;
  const plates: number[] = [];
  for (const p of [...setup.platesKg].filter((x) => x > 0).sort((a, b) => b - a)) {
    while (side + 1e-9 >= p) {
      plates.push(p);
      side = Math.round((side - p) * 1000) / 1000;
    }
  }
  return { plates, rest: Math.round(side * 2 * 1000) / 1000 };
}

// -------------------------------------------------------------------------------- Aufwärmsätze

/**
 * Aufwärmsätze zum Arbeitsgewicht (in der Anzeigeeinheit, auf `step` gerundet). Unter 20 kg (bzw. 45 lb) keine
 * Vorschläge – da ist der erste Arbeitssatz Aufwärmen genug. Nie schwerer als 90 % des Arbeitsgewichts.
 */
export function warmupSets(workWeight: number, step: number, unit: WeightUnit): { weight: number; reps: number }[] {
  const min = unit === 'lb' ? 45 : 20;
  if (!(workWeight >= min)) return [];
  const scheme =
    workWeight >= 2 * min
      ? [
          [0.5, 8],
          [0.7, 5],
          [0.85, 3],
        ]
      : [
          [0.5, 8],
          [0.75, 4],
        ];
  const round = (w: number) => Math.max(step, Math.round(w / step) * step);
  const result: { weight: number; reps: number }[] = [];
  for (const [factor, reps] of scheme) {
    const weight = Math.min(round(workWeight * factor), Math.floor((workWeight * 0.9) / step) * step);
    if (weight > 0 && !result.some((r) => r.weight === weight)) result.push({ weight, reps });
  }
  return result;
}

// ------------------------------------------------------------------------------------- Supersätze

export type PlannedSets = { exerciseId: string; sets: number; restSeconds: number; superset: number | null };
export type SetSlot = { itemIndex: number; restSeconds: number; superset: number | null };

/**
 * Reihenfolge der Sätze eines Plantags. Aufeinanderfolgende Übungen mit gleicher Supersatz-Nummer laufen im
 * Wechsel (A1, B1, A2, B2 …); zwischen ihnen gibt es keine Pause, erst nach der letzten Übung einer Runde die
 * geplante Pause dieser Übung. Übungen ohne Supersatz laufen wie bisher nacheinander.
 */
export function setOrder(items: PlannedSets[]): SetSlot[] {
  const slots: SetSlot[] = [];
  let i = 0;
  while (i < items.length) {
    const group = items[i].superset;
    let j = i + 1;
    if (group !== null) while (j < items.length && items[j].superset === group) j++;
    const block = items.slice(i, j).map((item, k) => ({ item, index: i + k }));
    if (block.length === 1) {
      const { item, index } = block[0];
      for (let s = 0; s < item.sets; s++) slots.push({ itemIndex: index, restSeconds: item.restSeconds, superset: null });
    } else {
      const rounds = Math.max(...block.map((b) => b.item.sets));
      for (let r = 0; r < rounds; r++) {
        const inRound = block.filter((b) => b.item.sets > r);
        inRound.forEach((b, k) => slots.push({ itemIndex: b.index, restSeconds: k === inRound.length - 1 ? b.item.restSeconds : 0, superset: group }));
      }
    }
    i = j;
  }
  return slots;
}

/** Buchstabe für eine Supersatz-Gruppe (A, B, C …) in der Reihenfolge ihres ersten Auftretens. */
export function supersetLetters(groups: (number | null | undefined)[]): Map<number, string> {
  const letters = new Map<number, string>();
  for (const g of groups) if (g != null && !letters.has(g)) letters.set(g, String.fromCharCode(65 + letters.size));
  return letters;
}
