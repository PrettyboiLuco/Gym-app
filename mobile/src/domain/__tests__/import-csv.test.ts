// A5: CSV schreiben/lesen, Strong-/Hevy-Import, Gewichts-CSV, Zuordnung der Übungen.

import { describe, expect, test } from '@jest/globals';

import { csvNumber, parseCsv, toCsv } from '../csv';
import {
  cardioActivityOf,
  equipmentHint,
  matchExercise,
  parseDateTime,
  parseTrainingCsv,
  parseWeightCsv,
  strengthExercises,
  type TrainingImport,
} from '../import-csv';
import { HEVY, STRONG } from '../testing/import-samples';

describe('CSV', () => {
  test('Export für Excel: BOM, Semikolon, Dezimalkomma, Anführungszeichen', () => {
    const csv = toCsv(
      ['Name', 'kg'],
      [
        ['Bank; schwer', 82.5],
        ['Sag "Hi"', null],
      ]
    );
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Bank; schwer";82,5');
    expect(csv).toContain('"Sag ""Hi""";');
    expect(parseCsv(csv)).toEqual([
      ['Name', 'kg'],
      ['Bank; schwer', '82,5'],
      ['Sag "Hi"', ''],
    ]);
  });
  test('Zahlen in beiden Schreibweisen', () => {
    expect(csvNumber('1.234,5')).toBe(1234.5);
    expect(csvNumber('1,234.5')).toBe(1234.5);
    expect(csvNumber('82,5')).toBe(82.5);
    expect(csvNumber('')).toBeNull();
    expect(csvNumber('abc')).toBeNull();
  });
  test('Datumsformate', () => {
    expect(parseDateTime('26 Jan 2026, 18:05')?.getHours()).toBe(18);
    expect(parseDateTime('2026-01-20 17:00:00')?.getDate()).toBe(20);
    expect(parseDateTime('20.01.2026')?.getMonth()).toBe(0);
    expect(parseDateTime('gestern')).toBeNull();
  });
});

describe('Strong und Hevy', () => {
  test('Hevy: Trainings, Satzarten, RPE → RIR, Cardio erkannt', () => {
    const r = parseTrainingCsv(HEVY) as TrainingImport;
    expect(r.source).toBe('hevy');
    expect(r.workouts).toHaveLength(2);
    const push = r.workouts[0];
    expect(push.title).toBe('Push');
    expect(push.sets.map((s) => s.setType)).toEqual(['aufwaermen', 'arbeit', 'drop', 'arbeit']);
    expect(push.sets[1]).toMatchObject({ weightKg: 80, reps: 8, rir: 2 });
    expect(push.sets[2].rir).toBe(1);
    expect(push.sets[0].note).toBe('Pausiert');
    expect(r.workouts[1].sets[0].setType).toBe('versagen');
    expect(strengthExercises(r)).toEqual(['Bench Press (Barbell)', 'Bench Press (Dumbbell)', 'Squat (Barbell)']);
  });
  test('Strong: Pfund umrechnen, Dauer, leere Zeilen weg, Zeit-Sätze', () => {
    const r = parseTrainingCsv(STRONG, 'lb') as TrainingImport;
    expect(r.source).toBe('strong');
    const [w] = r.workouts;
    expect(w.sets).toHaveLength(3);
    expect(w.sets[0].weightKg).toBeCloseTo(61.23, 2);
    expect(w.sets[1].rir).toBe(3);
    expect(w.sets[2]).toMatchObject({ exercise: 'Plank', seconds: 60, reps: null });
    expect(new Date(w.finishedAt!).getTime() - new Date(w.startedAt).getTime()).toBe(65 * 60_000);
  });
  test('unbekanntes Format und leere Datei', () => {
    expect(parseTrainingCsv('a;b\n1;2')).toEqual({ error: 'unbekannt' });
    expect(parseTrainingCsv('')).toEqual({ error: 'leer' });
  });
  test('Übungen zuordnen: Gerät aus der Klammer entscheidet', () => {
    const c = [
      { id: 'bank_lh', names: ['Bankdrücken', 'Bench Press'], equipment: 'langhantel' as const },
      { id: 'bank_kh', names: ['Bankdrücken (Kurzhantel)', 'Dumbbell Bench Press', 'Bench Press'], equipment: 'kurzhantel' as const },
      { id: 'squat', names: ['Kniebeuge', 'Squat', 'Back Squat'], equipment: 'langhantel' as const },
    ];
    expect(equipmentHint('Bench Press (Dumbbell)')).toBe('kurzhantel');
    expect(matchExercise('Bench Press (Barbell)', c)?.id).toBe('bank_lh');
    expect(matchExercise('Bench Press (Dumbbell)', c)?.id).toBe('bank_kh');
    expect(matchExercise('Squat (Barbell)', c)?.id).toBe('squat');
    expect(matchExercise('Cable Fly Crossovers', c)).toBeNull();
  });
  test('Cardio-Art aus dem Namen', () => {
    expect(cardioActivityOf('Treadmill')).toBe('laufband');
    expect(cardioActivityOf('Running')).toBe('laufen');
    expect(cardioActivityOf('Cycling')).toBe('radfahren');
    expect(cardioActivityOf('Rowing Machine')).toBe('rudergeraet');
    expect(cardioActivityOf('Battle Ropes')).toBe('sonstiges');
  });
});

describe('Gewichts-CSV', () => {
  test('Spalten erkennen, Pfund, letzter Wert am Tag', () => {
    expect(parseWeightCsv('Datum;Gewicht (kg)\n01.10.2026;82,4\n01.10.2026;82,0\n02.10.2026;81,8')).toEqual([
      { day: '2026-10-01', kg: 82 },
      { day: '2026-10-02', kg: 81.8 },
    ]);
    expect(parseWeightCsv('date,weight_lb\n2026-10-01,180')).toEqual([{ day: '2026-10-01', kg: 81.6 }]);
    expect(parseWeightCsv('x;y\n1;2')).toEqual({ error: 'unbekannt' });
  });
});
