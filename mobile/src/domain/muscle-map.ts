// Muskelkarte (docs/Muskelkarte_Ausbau.md): welche Muskeln eine Übung trifft und wie viele Sätze sich je Muskel
// ergeben. Hauptmuskel = Zielmuskel der Übung (targets.ts), dazu mitbeteiligte Muskeln je Bewegungsmuster und einige
// Ausnahmen je Übung. Alle Zuordnungen sind Vorschläge ohne Fachprüfung (Phase 10.1).

import { CATALOG_EXERCISES } from './exercise-catalog';
import { patternOf, type MovementPattern, type MuscleGroup } from './exercises';
import { targetOf, type Target } from './targets';

/** Muskeln, die auf der Karte eine eigene Fläche haben (von oben nach unten). */
export const MAP_MUSCLES = [
  'nacken',
  'schulter_vorn',
  'schulter_seitlich',
  'schulter_hinten',
  'rotatoren',
  'brust_oben',
  'brust_mitte',
  'brust_unten',
  'saegemuskel',
  'bizeps',
  'trizeps',
  'unterarme',
  'oberer_ruecken',
  'lat',
  'unterer_ruecken',
  'bauch_gerade',
  'bauch_schraeg',
  'hueftbeuger',
  'abduktoren',
  'adduktoren',
  'gesaess',
  'quadrizeps',
  'beinbeuger',
  'waden',
] as const;
export type MapMuscle = (typeof MAP_MUSCLES)[number];

/** Muskelgruppe jedes Kartenmuskels (für Liste, kleine Karte und geschonte Bereiche). */
export const MAP_GROUP: Record<MapMuscle, MuscleGroup> = {
  nacken: 'nacken',
  schulter_vorn: 'schultern',
  schulter_seitlich: 'schultern',
  schulter_hinten: 'schultern',
  rotatoren: 'schultern',
  brust_oben: 'brust',
  brust_mitte: 'brust',
  brust_unten: 'brust',
  saegemuskel: 'brust',
  bizeps: 'arme',
  trizeps: 'arme',
  unterarme: 'arme',
  oberer_ruecken: 'ruecken',
  lat: 'ruecken',
  unterer_ruecken: 'ruecken',
  bauch_gerade: 'bauch',
  bauch_schraeg: 'bauch',
  hueftbeuger: 'huefte',
  abduktoren: 'huefte',
  adduktoren: 'huefte',
  gesaess: 'gesaess',
  quadrizeps: 'beine',
  beinbeuger: 'beine',
  waden: 'waden',
};

/** Bereiche, die sich als „geschont“ markieren lassen (Muskelgruppen mit Fläche auf der Karte). */
export const SPARE_AREAS = ['nacken', 'schultern', 'brust', 'arme', 'ruecken', 'bauch', 'huefte', 'gesaess', 'beine', 'waden'] as const;
export type SpareArea = (typeof SPARE_AREAS)[number];

/** Mitbeteiligte Muskeln je Bewegungsmuster (zählen mit einem halben Satz). */
export const SECONDARY_BY_PATTERN: Record<MovementPattern, readonly MapMuscle[]> = {
  kniebeuge: ['gesaess', 'adduktoren', 'unterer_ruecken'],
  hueftstreckung: ['gesaess', 'beinbeuger', 'unterer_ruecken'],
  ausfallschritt: ['gesaess', 'adduktoren'],
  bein_isolation: [],
  waden: [],
  druecken_horizontal: ['schulter_vorn', 'trizeps', 'saegemuskel'],
  druecken_vertikal: ['schulter_seitlich', 'trizeps', 'nacken', 'saegemuskel'],
  brust_isolation: ['schulter_vorn'],
  schulter_isolation: ['nacken'],
  trizeps: [],
  ziehen_horizontal: ['lat', 'schulter_hinten', 'bizeps', 'unterarme'],
  ziehen_vertikal: ['bizeps', 'oberer_ruecken', 'unterarme'],
  hintere_schulter: ['oberer_ruecken', 'rotatoren'],
  bizeps: ['unterarme'],
  rumpf: [],
  ganzkoerper: [],
};

/** Ausnahmen je Übung: ersetzen die mitbeteiligten Muskeln des Bewegungsmusters. */
export const SECONDARY_BY_EXERCISE: Record<string, readonly MapMuscle[]> = {
  kreuzheben: ['gesaess', 'beinbeuger', 'quadrizeps', 'oberer_ruecken', 'unterarme'],
  beinpresse: ['gesaess', 'adduktoren'],
  dips: ['brust_unten', 'schulter_vorn'],
  liegestuetze: ['schulter_vorn', 'trizeps', 'saegemuskel', 'bauch_gerade'],
  liegestuetze_knie: ['schulter_vorn', 'trizeps', 'saegemuskel'],
  plank: ['saegemuskel', 'schulter_vorn'],
  hip_thrust: ['beinbeuger'],
  beckenheben: ['beinbeuger'],
};

const TARGET_TO_MAP: Record<Target, readonly MapMuscle[]> = {
  brust_oben: ['brust_oben'],
  brust_mitte: ['brust_mitte'],
  brust_unten: ['brust_unten'],
  lat: ['lat'],
  oberer_ruecken: ['oberer_ruecken'],
  unterer_ruecken: ['unterer_ruecken'],
  schulter_vorn: ['schulter_vorn'],
  schulter_seitlich: ['schulter_seitlich'],
  schulter_hinten: ['schulter_hinten'],
  rotatoren: ['rotatoren'],
  bizeps: ['bizeps'],
  trizeps: ['trizeps'],
  unterarme: ['unterarme'],
  quadrizeps: ['quadrizeps'],
  beinbeuger: ['beinbeuger'],
  adduktoren: ['adduktoren'],
  abduktoren: ['abduktoren'],
  hueftbeuger: ['hueftbeuger'],
  bauch_gerade: ['bauch_gerade'],
  bauch_schraeg: ['bauch_schraeg'],
  // Rumpfstabilität hat keine eigene Fläche: zählt auf geraden und seitlichen Bauch.
  rumpf_stabil: ['bauch_gerade', 'bauch_schraeg'],
};

/** Gruppen ohne Unterteilung in targets.ts, die trotzdem genau eine Fläche haben. */
const GROUP_TO_MAP: Partial<Record<MuscleGroup, readonly MapMuscle[]>> = {
  gesaess: ['gesaess'],
  waden: ['waden'],
  nacken: ['nacken'],
};

const CATALOG_PATTERN = new Map(CATALOG_EXERCISES.map((e) => [e.id, e.pattern]));

export type ExerciseForMap = { id: string; muscleGroup: MuscleGroup; pattern?: MovementPattern | null };
export type ExerciseMuscles = { primary: MapMuscle[]; secondary: MapMuscle[]; wholeBody: boolean };

/** Haupt- und mitbeteiligte Muskeln einer Kraftübung. Ganzkörper-Übungen haben keine einzelnen Muskeln. */
export function exerciseMuscles(e: ExerciseForMap): ExerciseMuscles {
  const pattern = patternOf({ ...e, pattern: e.pattern ?? CATALOG_PATTERN.get(e.id) ?? null });
  if (e.muscleGroup === 'ganzkoerper' || pattern === 'ganzkoerper') return { primary: [], secondary: [], wholeBody: true };
  const target = targetOf(e, pattern);
  const primary = [...(target ? TARGET_TO_MAP[target] : (GROUP_TO_MAP[e.muscleGroup] ?? []))];
  const secondary = (SECONDARY_BY_EXERCISE[e.id] ?? SECONDARY_BY_PATTERN[pattern]).filter((m) => !primary.includes(m));
  return { primary, secondary, wholeBody: false };
}

/** Sätze je Kartenmuskel: Hauptmuskel ganz, mitbeteiligt getrennt gezählt; Ganzkörper extra. */
export type MuscleTally = {
  primary: Partial<Record<MapMuscle, number>>;
  secondary: Partial<Record<MapMuscle, number>>;
  whole: number;
};

export const EMPTY_TALLY: MuscleTally = { primary: {}, secondary: {}, whole: 0 };

/** Zählt Arbeitssätze je Muskel aus (Übung, Anzahl Sätze). */
export function tallyMuscles(entries: Iterable<{ exercise: ExerciseForMap; sets: number }>): MuscleTally {
  const tally: MuscleTally = { primary: {}, secondary: {}, whole: 0 };
  for (const { exercise, sets } of entries) {
    if (!(sets > 0)) continue;
    const m = exerciseMuscles(exercise);
    if (m.wholeBody) tally.whole += sets;
    for (const p of m.primary) tally.primary[p] = (tally.primary[p] ?? 0) + sets;
    for (const s of m.secondary) tally.secondary[s] = (tally.secondary[s] ?? 0) + sets;
  }
  return tally;
}

/** Wert eines Muskels für die Farbe: Hauptsätze plus – wenn gewünscht – die Hälfte der mitbeteiligten. */
export function muscleValue(tally: MuscleTally, m: MapMuscle, halfSecondary: boolean): number {
  return (tally.primary[m] ?? 0) + (halfSecondary ? (tally.secondary[m] ?? 0) / 2 : 0);
}

/** Summe je Muskelgruppe (für die Liste) – Hauptsätze, mitbeteiligte halb, wenn gewünscht. */
export function groupValue(tally: MuscleTally, group: MuscleGroup, halfSecondary: boolean): number {
  return MAP_MUSCLES.filter((m) => MAP_GROUP[m] === group).reduce((sum, m) => sum + muscleValue(tally, m, halfSecondary), 0);
}

/** Die Gruppen, in denen ein Muskel etwas zählt, mit ihren Muskeln – sortiert nach Menge. */
export function tallyByGroup(
  tally: MuscleTally,
  halfSecondary: boolean
): { group: MuscleGroup; value: number; muscles: { muscle: MapMuscle; value: number }[] }[] {
  const groups = [...new Set(MAP_MUSCLES.map((m) => MAP_GROUP[m]))];
  return groups
    .map((group) => ({
      group,
      value: groupValue(tally, group, halfSecondary),
      muscles: MAP_MUSCLES.filter((m) => MAP_GROUP[m] === group)
        .map((muscle) => ({ muscle, value: muscleValue(tally, muscle, halfSecondary) }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value),
    }))
    .filter((g) => g.value > 0)
    .sort((a, b) => b.value - a.value);
}
