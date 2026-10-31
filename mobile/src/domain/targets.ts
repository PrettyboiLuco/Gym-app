// Zielmuskeln innerhalb einer Muskelgruppe (Wunsch Luc 31.10.2026: Übungsliste „Muskel → Zielmuskel“). Nur für die
// Einteilung in der Liste; Planassistent und Vorlagen arbeiten weiter mit Muskelgruppe und Bewegungsmuster.

import type { MovementPattern, MuscleGroup } from './exercises';

export const TARGETS = {
  brust: ['brust_oben', 'brust_mitte', 'brust_unten'],
  ruecken: ['lat', 'oberer_ruecken', 'unterer_ruecken'],
  schultern: ['schulter_vorn', 'schulter_seitlich', 'schulter_hinten', 'rotatoren'],
  arme: ['bizeps', 'trizeps', 'unterarme'],
  beine: ['quadrizeps', 'beinbeuger'],
  huefte: ['adduktoren', 'abduktoren', 'hueftbeuger'],
  bauch: ['bauch_gerade', 'bauch_schraeg', 'rumpf_stabil'],
} as const satisfies Partial<Record<MuscleGroup, readonly string[]>>;

export type Target = (typeof TARGETS)[keyof typeof TARGETS][number];

export function targetsOf(group: MuscleGroup): readonly Target[] {
  return (TARGETS as Partial<Record<MuscleGroup, readonly Target[]>>)[group] ?? [];
}

/** Ausdrücklich zugeordnete Zielmuskeln (neue Übungen tragen ihn in den Daten, siehe exercise-catalog.ts). */
const EXPLICIT = new Map<string, Target>();

export function registerTargets(entries: Iterable<[string, Target]>) {
  for (const [id, target] of entries) EXPLICIT.set(id, target);
}

type ExerciseLike = { id: string; muscleGroup: MuscleGroup; pattern?: MovementPattern | null };

/**
 * Zielmuskel einer Übung: ausdrücklich zugeordnet, sonst nach Regeln aus ID und Bewegungsmuster (für die Übungen bis
 * 31.10.2026 und eigene Übungen). null = Muskelgruppe ohne Unterteilung.
 */
export function targetOf(e: ExerciseLike, pattern: MovementPattern): Target | null {
  const explicit = EXPLICIT.get(e.id);
  if (explicit) return explicit;
  const id = e.id;
  switch (e.muscleGroup) {
    case 'brust':
      if (/negativ|dips|crossover_oben|_erhoeht/.test(id)) return 'brust_unten';
      if (/schraeg|incline|crossover_unten|landmine/.test(id)) return 'brust_oben';
      return 'brust_mitte';
    case 'ruecken':
      if (pattern === 'ziehen_vertikal') return 'lat';
      if (pattern === 'hueftstreckung' || pattern === 'rumpf' || /dehn_unterer|rueckenstrecker|superman/.test(id)) return 'unterer_ruecken';
      if (/lat/.test(id)) return 'lat';
      return 'oberer_ruecken';
    case 'schultern':
      if (/aussenrotation|cuban|innenrotation|dislokation/.test(id)) return 'rotatoren';
      if (pattern === 'hintere_schulter' || /reverse|face_pull|pull_apart|ytw|hinten/.test(id)) return 'schulter_hinten';
      if (pattern === 'druecken_vertikal' || /front/.test(id)) return 'schulter_vorn';
      return 'schulter_seitlich';
    case 'arme':
      if (/handgelenk|unterarm|reverse_curls|zottman|wrist/.test(id)) return 'unterarme';
      if (pattern === 'bizeps' || /bizeps/.test(id)) return 'bizeps';
      return 'trizeps';
    case 'beine':
      if (pattern === 'hueftstreckung' || /beinbeuger|nordic|glute_ham|hinten/.test(id)) return 'beinbeuger';
      return 'quadrizeps';
    case 'huefte':
      if (/abduk|seitgehen|clamshell|fire_hydrant|tfl/.test(id)) return 'abduktoren';
      if (/hueftbeuger|hueftkreisen|90_90|ausfallschritt_rotation/.test(id)) return 'hueftbeuger';
      return 'adduktoren';
    case 'bauch':
      if (/twist|holzhacker|seitbeug|seitstuetz|windmill|rotation|pallof|scheibenwischer|fersen|seitlich|fahrrad|koffer|russian/.test(id))
        return 'bauch_schraeg';
      if (/plank|dead_bug|bird_dog|hollow|l_sit|stir|ab_roller|rollout|mountain|kobra|bauch_rueckenlage/.test(id)) return 'rumpf_stabil';
      return 'bauch_gerade';
    default:
      return null;
  }
}
