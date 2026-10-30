// Jede Übung, jedes Muster und jeder Grund hat einen Text in der Sprachdatei (UX-004: kein Text im Code).

import { describe, expect, test } from '@jest/globals';

import { de } from '@/i18n/de';

import { EQUIPMENT, EXERCISE_META, HIIT_EXERCISES, MORE_STRENGTH_EXERCISES, MOVEMENT_PATTERNS, MUSCLE_GROUPS, STARTER_EXERCISES, STRETCH_EXERCISES } from '../exercises';
import { DAY_TYPES, GOALS, SPLITS } from '../planner';
import { DURATIONS } from '../wish';

const strength = [...STARTER_EXERCISES, ...MORE_STRENGTH_EXERCISES, ...HIIT_EXERCISES];

describe('Sprachdatei vollständig', () => {
  test('Namen aller Übungen', () => {
    for (const e of [...strength, ...STRETCH_EXERCISES]) expect(de.exercises).toHaveProperty(e.id);
  });
  test('Kurzanleitung für jede Übung (TRAIN-001: Erklärung für Einsteiger)', () => {
    for (const e of [...strength, ...STRETCH_EXERCISES]) expect(de.exerciseHow).toHaveProperty(e.id);
  });
  test('Metadaten für jede Kraftübung', () => {
    for (const e of strength) expect(EXERCISE_META).toHaveProperty(e.id);
  });
  test('Geräte, Muskelgruppen, Muster, Tagesarten, Aufteilungen, Ziele, Dauer', () => {
    for (const k of EQUIPMENT) expect(de.equipment).toHaveProperty(k);
    for (const k of MUSCLE_GROUPS) expect(de.muscle).toHaveProperty(k);
    for (const k of MOVEMENT_PATTERNS) expect(de.pattern).toHaveProperty(k);
    for (const k of DAY_TYPES) expect(de.dayType).toHaveProperty(k);
    for (const k of SPLITS) {
      expect(de.split).toHaveProperty(k);
      expect(de.split.fits).toHaveProperty(k);
    }
    for (const k of GOALS) expect(de.trainingGoal).toHaveProperty(k);
    for (const k of DURATIONS) expect(de.assistant.durationOption).toHaveProperty(k);
  });
});
