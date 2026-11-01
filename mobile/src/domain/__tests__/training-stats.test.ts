// A8: eigene Satzzeit, Zeitraum-Statistik mit Bestleistungen, Muskelstufen, Deload, Geräteprofile.

import { describe, expect, test } from '@jest/globals';

import { weekStart } from '../dates';
import { DEFAULT_PROFILES, deloadDraft, deloadDue, muscleLevel, periodStats, personalSecondsPerSet, trainingWeeksInBlock, usableEquipment, type StatSet } from '../training-stats';

describe('Satzzeit', () => {
  const session = (minutes: number) => ({
    durationSec: minutes * 60,
    sets: [...Array(4)].map(() => ({ exerciseId: 'a', restSeconds: 120 })).concat([...Array(4)].map(() => ({ exerciseId: 'b', restSeconds: 90 }))),
  });
  test('Median aus mindestens 3 Trainings, Pausen und Wechsel abgezogen', () => {
    // 30 min = 1800 s − (3×120 + 3×90 = 630) − 2×60 = 1050 / 8 ≈ 131 s
    expect(personalSecondsPerSet([session(30), session(30), session(30)])).toBe(131);
    expect(personalSecondsPerSet([session(25), session(30)])).toBeNull();
    // Unrealistisch kurz → untere Grenze
    expect(personalSecondsPerSet([session(14), session(14), session(14)])).toBe(20);
  });
});

describe('Statistik', () => {
  const set = (sessionId: string, day: string, exerciseId: string, kg: number, reps: number, setType: StatSet['setType'] = 'arbeit'): StatSet => ({
    sessionId,
    day,
    exerciseId,
    setType,
    weightKg: kg,
    reps,
    seconds: null,
  });
  const all = [
    set('s1', '2026-09-28', 'bank', 80, 8),
    set('s2', '2026-10-05', 'bank', 80, 10),
    set('s2', '2026-10-05', 'bank', 40, 10, 'aufwaermen'),
    set('s3', '2026-10-12', 'bank', 85, 6),
    set('s3', '2026-10-12', 'squat', 100, 5),
    set('s4', '2026-11-02', 'squat', 105, 5),
  ];
  test('Zahlen und Bestleistungen im Oktober; erstes Mal zählt nicht', () => {
    const s = periodStats(all, [{ day: '2026-10-10', minutes: 30 }, { day: '2026-11-01', minutes: 20 }], '2026-10-01', '2026-10-31');
    expect(s).toMatchObject({ sessions: 2, sets: 3, volumeKg: 800 + 510 + 500, cardioMinutes: 30, cardioCount: 1 });
    expect(s.records.map((r) => [r.exerciseId, r.kind, r.weightKg, r.reps])).toEqual([['bank', 'gewicht', 85, 6]]);
    expect(s.perExercise[0]).toMatchObject({ exerciseId: 'bank', sets: 2 });
  });
  test('Wiederholungs-Bestleistung bei gleichem Gewicht', () => {
    const s = periodStats(all, [], '2026-10-05', '2026-10-05');
    expect(s.records).toEqual([expect.objectContaining({ exerciseId: 'bank', kind: 'wiederholungen', reps: 10 })]);
  });
  test('Stufen der Muskelkarte', () => {
    expect([0, 3, 8, 15, 25].map(muscleLevel)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('Deload', () => {
  const days = (weeks: number, from = '2026-11-02') => [...Array(weeks)].map((_, i) => new Date(Date.parse(`${from}T12:00:00Z`) - i * 7 * 86_400_000).toISOString().slice(0, 10));
  test('Wochen am Stück; eine Woche Pause beendet den Block', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(trainingWeeksInBlock(days(8), '2026-11-03', null)).toBe(8);
    expect(trainingWeeksInBlock([...days(3), ...days(5, '2026-10-05')], '2026-11-03', null)).toBe(3);
    expect(trainingWeeksInBlock(days(8), '2026-11-03', '2026-10-18')).toBe(3);
    // laufende Woche ohne Training zählt nicht, beendet aber den Block nicht
    expect(trainingWeeksInBlock(days(8, '2026-10-26'), '2026-11-04', null)).toBe(8);
  });
  test('Angebot ab Intervall, nicht während „später“', () => {
    expect(deloadDue(8, 8, null, '2026-11-01')).toBe(true);
    expect(deloadDue(7, 8, null, '2026-11-01')).toBe(false);
    expect(deloadDue(9, 8, '2026-11-05', '2026-11-01')).toBe(false);
  });
  test('halbe Sätze, RIR 3, Zeitübungen ohne RIR', () => {
    const d = deloadDraft({
      name: 'P',
      days: [{ name: 'A', items: [{ exerciseId: 'x', sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120, rir: '1' }, { exerciseId: 'plank', sets: 1, repsMin: 1, repsMax: 1, restSeconds: 60, targetSeconds: 45 }] }],
    });
    expect(d.days[0].items.map((i) => [i.sets, i.rir])).toEqual([
      [2, '3'],
      [1, undefined],
    ]);
  });
});

test('Geräteprofile: Körpergewicht immer', () => {
  const [studio, home, hotel] = DEFAULT_PROFILES(['langhantel', 'maschine']);
  expect(studio.equipment).toEqual(['langhantel', 'maschine']);
  expect(usableEquipment(studio)).toContain('koerpergewicht');
  expect(home.equipment).toContain('kurzhantel');
  expect(hotel.id).toBe('hotel');
});
