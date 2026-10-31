// Erweiterter Übungskatalog (31.10.2026): Vollständigkeit, Ersatzübungen, neue Gerätearten und unveränderte Vorlagen.

import { describe, expect, test } from '@jest/globals';

import { CATALOG_TEXTS } from '@/i18n/de-exercises';
import { de } from '@/i18n/de';

import { CATALOG_EXERCISES, CATALOG_STRETCHES } from '../exercise-catalog';
import {
  EQUIPMENT,
  EXERCISE_META,
  HIIT_EXERCISES,
  MORE_STRENGTH_EXERCISES,
  STARTER_EXERCISES,
  STRETCH_EXERCISES,
  TIMED_EXERCISES,
  type Equipment,
  type Measure,
} from '../exercises';
import { buildTemplate, type PlannerExercise } from '../planner';
import { weightStep } from '../progression';
import { parseWish } from '../wish';

const CORE = [...STARTER_EXERCISES, ...MORE_STRENGTH_EXERCISES, ...HIIT_EXERCISES].map(
  (e): PlannerExercise => ({
    id: e.id,
    equipment: e.equipment,
    muscleGroup: e.muscleGroup,
    kind: 'kraft',
    measure: 'measure' in e ? (e.measure as Measure) : TIMED_EXERCISES.includes(e.id) ? 'zeit' : 'wdh',
  })
);
const CATALOG = CATALOG_EXERCISES.map(
  (e): PlannerExercise => ({ id: e.id, equipment: e.equipment, muscleGroup: e.muscleGroup, kind: 'kraft', measure: e.measure })
);
const ALL = [...CORE, ...CATALOG];
const byId = new Map(ALL.map((e) => [e.id, e]));

describe('Katalog vollständig', () => {
  test('über 350 Kraftübungen, keine doppelten IDs, keine Überschneidung mit Start- oder Dehnübungen', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(350);
    const ids = [...ALL.map((e) => e.id), ...STRETCH_EXERCISES.map((e) => e.id), ...CATALOG_STRETCHES.map((e) => e.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
  test('jede Übung hat Name und Kurzanleitung, keine Texte ohne Übung', () => {
    for (const e of CATALOG_EXERCISES) {
      expect([e.id, (de.exercises as unknown as Record<string, string>)[e.id]?.length > 3]).toEqual([e.id, true]);
      expect([e.id, (de.exerciseHow as unknown as Record<string, string>)[e.id]?.length > 30]).toEqual([e.id, true]);
    }
    for (const e of CATALOG_STRETCHES) {
      expect([e.id, (de.exercises as unknown as Record<string, string>)[e.id]?.length > 3]).toEqual([e.id, true]);
      expect([e.id, (de.exerciseHow as unknown as Record<string, string>)[e.id]?.length > 30]).toEqual([e.id, true]);
    }
    expect(Object.keys(CATALOG_TEXTS).sort()).toEqual([...CATALOG_EXERCISES, ...CATALOG_STRETCHES].map((e) => e.id).sort());
  });
  test('alle Gerätearten haben Übungen (Kraft oder Dehnen), die neuen mindestens 8', () => {
    for (const eq of EQUIPMENT) {
      const count = [...ALL, ...STRETCH_EXERCISES, ...CATALOG_STRETCHES].filter((e) => e.equipment === eq).length;
      expect([eq, count >= (EQUIPMENT.indexOf(eq) >= EQUIPMENT.indexOf('kettlebell') ? 8 : 10)]).toEqual([eq, true]);
      expect(de.equipment).toHaveProperty(eq);
    }
  });
  test('Dehnübungen: gültige Art, Haltezeit 5–300 s, keine doppelten IDs', () => {
    const ids = [...STRETCH_EXERCISES, ...CATALOG_STRETCHES].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of CATALOG_STRETCHES) {
      expect(['dehnung_statisch', 'dehnung_dynamisch', 'mobilitaet']).toContain(e.kind);
      expect(e.holdSeconds).toBeGreaterThanOrEqual(5);
      expect(e.holdSeconds).toBeLessThanOrEqual(300);
    }
    expect(STRETCH_EXERCISES.length + CATALOG_STRETCHES.length).toBeGreaterThanOrEqual(75);
  });
});

describe('Ersatzübungen im Katalog', () => {
  test('nur existierende Übungen, gleiches Muster und gleiche Messart, nie sich selbst', () => {
    for (const e of CATALOG_EXERCISES) {
      const meta = EXERCISE_META[e.id];
      expect(meta.pattern).toBe(e.pattern);
      for (const alt of meta.alternatives) {
        expect(alt).not.toBe(e.id);
        expect([e.id, alt, byId.has(alt)]).toEqual([e.id, alt, true]);
        expect([e.id, alt, EXERCISE_META[alt].pattern]).toEqual([e.id, alt, e.pattern]);
        expect([e.id, alt, byId.get(alt)!.measure]).toEqual([e.id, alt, e.measure]);
      }
    }
  });
  test('fast jede Übung hat mindestens zwei Ersatzübungen, zuerst mit anderem Gerät', () => {
    const few = CATALOG_EXERCISES.filter((e) => EXERCISE_META[e.id].alternatives.length < 2).map((e) => e.id);
    // Wenige Halte-Übungen (z. B. Hängen, Nacken-Halten) haben naturgemäß kaum gleichartigen Ersatz: höchstens 2 %.
    expect(few.length).toBeLessThanOrEqual(Math.ceil(CATALOG_EXERCISES.length * 0.02));
    const hackenschmidt = EXERCISE_META.hackenschmidt.alternatives;
    expect(byId.get(hackenschmidt[0])!.equipment).not.toBe('maschine');
  });
});

describe('Fly-Varianten (Butterfly vs. Cable Flys)', () => {
  test('sitzend, liegend, Schrägbank und stehend sind eigene Übungen mit eigenem Namen', () => {
    const names = ['butterfly', 'cable_flys_sitzend', 'cable_flys_flachbank', 'cable_flys_schraegbank', 'cable_crossover', 'fliegende_kh'].map(
      (id) => (de.exercises as unknown as Record<string, string>)[id]
    );
    expect(new Set(names).size).toBe(names.length);
  });
  test('Butterfly belegt: zuerst Fly-Übungen als Ersatz, nicht Drücken', () => {
    const alts = EXERCISE_META.butterfly.alternatives;
    expect(alts.slice(0, 4).every((id) => EXERCISE_META[id].pattern === 'brust_isolation')).toBe(true);
    expect(alts[0]).toBe('cable_flys_sitzend');
  });
});

describe('Vorlagen und neue Geräte', () => {
  const base = {
    days: 3,
    minutes: 60,
    split: 'auto' as const,
    goal: 'muskelaufbau' as const,
    experience: 'einsteiger' as const,
    blockedEquipment: [],
    blockedExercises: [],
    dayName: (type: string, letter: string | null) => (letter ? `${type} ${letter}` : type),
    planName: 'Start',
  };
  const old: Equipment[] = ['langhantel', 'kurzhantel', 'kabel', 'maschine', 'koerpergewicht'];

  test.each([2, 3, 4, 5, 6])('%i Tage: Vorlage mit bisheriger Ausstattung bleibt durch den Katalog unverändert', (days) => {
    for (const experience of ['einsteiger', 'fortgeschritten'] as const) {
      const before = buildTemplate({ ...base, days, experience, exercises: CORE, available: old });
      const after = buildTemplate({ ...base, days, experience, exercises: ALL, available: [...EQUIPMENT] });
      expect(after.draft).toEqual(before.draft);
    }
  });

  test('nur Kettlebell und Band zu Hause: Vorlage nutzt nur diese und Körpergewicht', () => {
    const p = buildTemplate({ ...base, exercises: ALL, available: ['kettlebell', 'band', 'koerpergewicht'] });
    expect(p.conflicts).toEqual([]);
    const used = p.draft.days.flatMap((d) => d.items.map((i) => byId.get(i.exerciseId)!.equipment));
    expect(used.length).toBeGreaterThan(0);
    for (const eq of used) expect(['kettlebell', 'band', 'koerpergewicht']).toContain(eq);
    expect(used.some((eq) => eq === 'kettlebell' || eq === 'band')).toBe(true);
  });

  test('Steigerung: Kettlebell in 4-kg-Schritten', () => expect(weightStep('kettlebell', 'kg')).toBe(4));

  test('Freitext versteht die neuen Geräte', () => {
    const wish = parseWish('Ohne Kettlebell und ohne Smith-Maschine, keine SZ-Stange, ohne Widerstandsband', []);
    expect(wish.blockedEquipment ?? []).toEqual(expect.arrayContaining(['kettlebell', 'smith', 'sz_stange', 'band']));
    expect(parseWish('zu Hause mit Kettlebell und Band', []).blockedEquipment).toEqual(
      expect.arrayContaining(['langhantel', 'kabel', 'maschine', 'smith', 'sz_stange', 'kurzhantel'])
    );
    expect(parseWish('zu Hause mit Kettlebell und Band', []).blockedEquipment).not.toContain('kettlebell');
    expect(parseWish('zu Hause mit Kettlebell und Band', []).blockedEquipment).not.toContain('band');
    expect(parseWish('zu Hause ohne Geräte', []).blockedEquipment).toEqual(expect.arrayContaining(['kettlebell', 'band', 'medizinball']));
    expect(parseWish('zu Hause mit Gymnastikball', []).blockedEquipment).not.toContain('gymnastikball');
  });
});
