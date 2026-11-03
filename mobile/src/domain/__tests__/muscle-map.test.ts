// Muskelkarte: Haupt- und mitbeteiligte Muskeln je Übung und die Zählung (docs/Muskelkarte_Ausbau.md, Punkte 1–3).

import { describe, expect, test } from '@jest/globals';

import { CATALOG_EXERCISES } from '../exercise-catalog';
import { HIIT_EXERCISES, MORE_STRENGTH_EXERCISES, MOVEMENT_PATTERNS, MUSCLE_GROUPS, STARTER_EXERCISES } from '../exercises';
import {
  exerciseMuscles,
  MAP_GROUP,
  MAP_MUSCLES,
  muscleValue,
  SECONDARY_BY_EXERCISE,
  SECONDARY_BY_PATTERN,
  SPARE_AREAS,
  tallyByGroup,
  tallyMuscles,
} from '../muscle-map';

const strength = [...STARTER_EXERCISES, ...MORE_STRENGTH_EXERCISES, ...HIIT_EXERCISES, ...CATALOG_EXERCISES];

describe('Haupt- und mitbeteiligte Muskeln', () => {
  test('jede Kraftübung hat einen Hauptmuskel oder zählt als Ganzkörper', () => {
    const without = strength.filter((e) => {
      const m = exerciseMuscles(e);
      return !m.wholeBody && m.primary.length === 0;
    });
    expect(without.map((e) => e.id)).toEqual([]);
  });

  test('kein Muskel ist zugleich Haupt- und mitbeteiligter Muskel', () => {
    for (const e of strength) {
      const m = exerciseMuscles(e);
      for (const s of m.secondary) expect(m.primary).not.toContain(s);
    }
  });

  test('alle Regeln nennen nur Muskeln der Karte, jedes Muster hat eine Regel', () => {
    for (const p of MOVEMENT_PATTERNS) expect(SECONDARY_BY_PATTERN[p]).toBeDefined();
    for (const list of [...Object.values(SECONDARY_BY_PATTERN), ...Object.values(SECONDARY_BY_EXERCISE)])
      for (const m of list) expect(MAP_MUSCLES).toContain(m);
  });

  test('Beispiele', () => {
    expect(exerciseMuscles({ id: 'bankdruecken', muscleGroup: 'brust' })).toEqual({
      primary: ['brust_mitte'],
      secondary: ['schulter_vorn', 'trizeps', 'saegemuskel'],
      wholeBody: false,
    });
    expect(exerciseMuscles({ id: 'klimmzuege', muscleGroup: 'ruecken' }).primary).toEqual(['lat']);
    expect(exerciseMuscles({ id: 'klimmzuege', muscleGroup: 'ruecken' }).secondary).toContain('bizeps');
    expect(exerciseMuscles({ id: 'plank', muscleGroup: 'bauch' }).primary).toEqual(['bauch_gerade', 'bauch_schraeg']);
    expect(exerciseMuscles({ id: 'burpees', muscleGroup: 'ganzkoerper' }).wholeBody).toBe(true);
    expect(exerciseMuscles({ id: 'wadenheben', muscleGroup: 'waden' })).toEqual({ primary: ['waden'], secondary: [], wholeBody: false });
  });

  test('der Sägemuskel ist nie Hauptmuskel', () => {
    for (const e of strength) expect(exerciseMuscles(e).primary).not.toContain('saegemuskel');
  });

  test('eigene Übungen ohne Katalogeintrag laufen über die Regeln', () => {
    const own = exerciseMuscles({ id: 'eigen_123', muscleGroup: 'arme', pattern: 'trizeps' });
    expect(own.primary).toEqual(['trizeps']);
  });
});

describe('Zählung', () => {
  const tally = tallyMuscles([
    { exercise: { id: 'bankdruecken', muscleGroup: 'brust' }, sets: 4 },
    { exercise: { id: 'trizepsdruecken_kabel', muscleGroup: 'arme' }, sets: 3 },
    { exercise: { id: 'burpees', muscleGroup: 'ganzkoerper' }, sets: 2 },
  ]);

  test('Hauptsätze ganz, mitbeteiligte halb (wenn gewünscht)', () => {
    expect(muscleValue(tally, 'brust_mitte', true)).toBe(4);
    expect(muscleValue(tally, 'trizeps', false)).toBe(3);
    expect(muscleValue(tally, 'trizeps', true)).toBe(5);
    expect(tally.whole).toBe(2);
  });

  test('Liste nach Gruppen, größte zuerst', () => {
    const groups = tallyByGroup(tally, true);
    // Brust 4 + Sägemuskel ½ × 4 = 6, Arme 3 + ½ × 4 = 5, Schultern ½ × 4 = 2
    expect(groups.map((g) => g.group)).toEqual(['brust', 'arme', 'schultern']);
    expect(groups[0].muscles.map((m) => m.muscle)).toEqual(['brust_mitte', 'saegemuskel']);
  });

  test('geschonte Bereiche sind Muskelgruppen mit Fläche', () => {
    const withArea = new Set(Object.values(MAP_GROUP));
    for (const a of SPARE_AREAS) {
      expect(MUSCLE_GROUPS).toContain(a);
      expect(withArea.has(a)).toBe(true);
    }
  });
});
