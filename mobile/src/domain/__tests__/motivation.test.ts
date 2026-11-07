// A10: Meilensteine, Plan-Wochen ohne Serien, Blutdruck-Eingabe, Einheiten ml/oz und ft/in.

import { describe, expect, test } from '@jest/globals';

import { formatHeight, formatVolume } from '@/i18n';

import { bpAverage, parseBloodPressure } from '../blood-pressure';
import { balance, milestoneProgress, milestones, milestoneStats, newMilestones, weekResults } from '../motivation';
import { feetInches, mlToUnit } from '../units';

const day = (i: number) => new Date(Date.parse('2026-09-07T12:00:00Z') + i * 86_400_000).toISOString().slice(0, 10); // Montag

describe('Plan-Wochen', () => {
  // 3 Trainings in Woche 1–4, Woche 5 nur 1, Woche 6 pausiert (krank), Woche 7 läuft
  const training = [0, 2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25, 28, 42].map(day);
  const paused = (d: string) => d >= day(35) && d <= day(41);
  const weeks = weekResults(training, 3, day(43), paused);
  test('geschafft, offen, pausiert, läuft', () => {
    expect(weeks.map((w) => w.status)).toEqual(['geschafft', 'geschafft', 'geschafft', 'geschafft', 'offen', 'pausiert', 'laeuft']);
  });
  test('Bilanz zählt keine laufende und keine pausierte Woche', () => {
    expect(balance(weeks, '0000-01-01', day(43))).toEqual({ done: 4, counted: 5 });
  });
  test('Meilensteine: Trainings, 100 kg, 4 Plan-Wochen; neu = noch nicht gesehen', () => {
    const sets = [
      { day: day(2), exerciseId: 'kreuzheben', weightKg: 100, reps: 3, normal: true },
      { day: day(0), exerciseId: 'latzug_assist', weightKg: 120, reps: 5, normal: false },
    ];
    const ms = milestones({ sessionDays: training.slice(0, 13), sets, weeks });
    expect(ms.map((m) => m.id)).toEqual(['training_1', 'kg_100', 'training_10', 'planwochen_4']);
    expect(ms.find((m) => m.id === 'kg_100')).toMatchObject({ day: day(2), detail: 'kreuzheben' });
    expect(newMilestones(ms, ['training_1', 'training_10']).map((m) => m.id)).toEqual(['kg_100', 'planwochen_4']);
  });
  test('ohne Ziel oder Trainings keine Wochen', () => {
    expect(weekResults([], 3, day(10), () => false)).toEqual([]);
    expect(weekResults(training, 0, day(10), () => false)).toEqual([]);
  });
});

describe('Blutdruck', () => {
  test('Eingabe prüfen, oberer Wert über unterem', () => {
    expect(parseBloodPressure({ systolic: '128', diastolic: '82', pulse: '' })).toEqual({ value: { systolic: 128, diastolic: 82, pulse: null }, problems: [] });
    expect(parseBloodPressure({ systolic: '80', diastolic: '120', pulse: '' }).problems).toEqual(['order']);
    expect(parseBloodPressure({ systolic: 'x', diastolic: '20', pulse: '300' }).problems).toEqual(['systolic', 'diastolic', 'pulse']);
  });
  test('Schnitt ohne Bewertung', () => {
    expect(
      bpAverage([
        { systolic: 120, diastolic: 80, pulse: 60 },
        { systolic: 131, diastolic: 85, pulse: null },
      ])
    ).toEqual({ systolic: 126, diastolic: 83, pulse: 60, count: 2 });
    expect(bpAverage([])).toBeNull();
  });
});

describe('Einheiten', () => {
  test('ml/oz und Liter', () => {
    expect(mlToUnit(500, 'oz')).toBeCloseTo(16.9, 1);
    expect(formatVolume(250, 'ml')).toBe('250 ml');
    expect(formatVolume(1500, 'ml')).toBe('1,5 l');
    expect(formatVolume(355, 'oz')).toBe('12 fl oz');
  });
  test('Größe in Fuß und Zoll', () => {
    expect(feetInches(180)).toEqual({ feet: 5, inches: 11 });
    expect(formatHeight(180, 'in')).toBe('5′ 11″');
    expect(formatHeight(180, 'cm')).toBe('180 cm');
  });
});

describe('Fortschritt zum nächsten Meilenstein', () => {
  const week = (start: string, status: 'geschafft' | 'offen' | 'pausiert' | 'laeuft') => ({ start, end: start, trained: 0, goal: 3, status });
  const stats = milestoneStats({
    sessionDays: Array.from({ length: 12 }, () => '2026-11-01'),
    sets: [
      { day: '2026-11-01', exerciseId: 'a', weightKg: 80, reps: 8, normal: true },
      { day: '2026-11-01', exerciseId: 'b', weightKg: 120, reps: 8, normal: false },
      { day: '2026-11-01', exerciseId: 'c', weightKg: 95, reps: 0, normal: true },
    ],
    weeks: [week('a', 'geschafft'), week('b', 'offen'), week('c', 'geschafft'), week('d', 'pausiert'), week('e', 'geschafft'), week('f', 'laeuft')],
  });
  test('Kennzahlen: Gegengewicht und Sätze ohne Wiederholung zählen nicht als Bestwert; Pause und laufende Woche unterbrechen nicht', () => {
    expect(stats).toEqual({ trainings: 12, sets: 3, bestKg: 80, weekRun: 2 });
  });
  test('Fortschritt je Art, nie über dem Ziel', () => {
    expect(milestoneProgress('training_50', stats)).toEqual({ current: 12, target: 50 });
    expect(milestoneProgress('training_10', stats)).toEqual({ current: 10, target: 10 });
    expect(milestoneProgress('kg_100', stats)).toEqual({ current: 80, target: 100 });
    expect(milestoneProgress('planwochen_4', stats)).toEqual({ current: 2, target: 4 });
    expect(milestoneProgress('saetze_1000', stats)).toEqual({ current: 3, target: 1000 });
  });
});
