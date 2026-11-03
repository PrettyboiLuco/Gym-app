// Fehlerbehebungen 03.11.2026, Regeln: lb-Import und Toleranz, Gegengewicht (Ziel, Steigerung), Kalendertage,
// Trainingslast, Untergrenze max(1200, Ruheenergie). Je Befund ein Test, damit er nicht zurückkommt.

import { describe, expect, test } from '@jest/globals';

import { suggestV2, type Estimate } from '../adaptive';
import { applyV2, weekDaysUntil, weeklyCheckin, type CheckinInput } from '../checkin';
import { rescalePlan } from '../coach';
import { shiftDay } from '../dates';
import { calorieFloor, calorieFloorFor, CALORIE_FLOOR } from '../energy';
import { strengthProgress } from '../goals';
import { parseTrainingCsv, type TrainingImport } from '../import-csv';
import { loadModeOf, sameKg } from '../logger';
import { daysSince, progressionAdvice, PROGRESSION_RULES_VERSION, type PastSession } from '../progression';
import { loadRatio } from '../readiness';
import { findRecords } from '../summary';
import { STRONG } from '../testing/import-samples';
import { unitToKg } from '../units';

const LB135 = unitToKg(135, 'lb');

describe('D1: Pfund aus dem Import wie aus der Eingabe', () => {
  test('Strong und Hevy: 135 lb ergeben genau den kg-Wert der Eingabe im Training', () => {
    const strong = parseTrainingCsv(STRONG, 'lb') as TrainingImport;
    expect(strong.workouts[0].sets[0].weightKg).toBe(LB135);
    const hevy = parseTrainingCsv(
      `"title","start_time","end_time","exercise_title","set_type","weight_lbs","reps"\n"Pull","26 Jan 2026, 18:05","26 Jan 2026, 19:10","Lat Pulldown (Cable)","normal","135","10"`
    ) as TrainingImport;
    expect(hevy.workouts[0].sets[0].weightKg).toBe(LB135);
  });

  test('alte Importe (auf 2 Stellen gerundet) gelten als dasselbe Gewicht', () => {
    expect(sameKg(61.23, LB135)).toBe(true);
    expect(sameKg(60, 61.25)).toBe(false);
    const records = findRecords(
      [{ exerciseId: 'a', weightKg: LB135, reps: 8, seconds: null }],
      [{ exerciseId: 'a', maxKg: 61.23, repsAtMaxKg: 8, maxReps: 8, maxSeconds: null }]
    );
    expect(records).toEqual([]);
    const more = findRecords(
      [{ exerciseId: 'a', weightKg: LB135, reps: 9, seconds: null }],
      [{ exerciseId: 'a', maxKg: 61.23, repsAtMaxKg: 8, maxReps: 8, maxSeconds: null }]
    );
    expect(more).toEqual([expect.objectContaining({ kind: 'wiederholungen', reps: 9, previousReps: 8 })]);
  });

  test('Stagnation wird erkannt, auch wenn ein Training aus dem Import stammt', () => {
    const at = (kg: number, daysAgo: number): PastSession => ({ daysAgo, sets: [8, 8, 8].map((reps) => ({ weightKg: kg, reps, seconds: null })) });
    const target = { sets: 3, repsMin: 8, repsMax: 12, seconds: null };
    const advice = progressionAdvice([at(LB135, 2), at(LB135, 5), at(61.23, 9)], target, 'langhantel', 'lb');
    expect(advice).toMatchObject({ kind: 'stagnation' });
  });
});

describe('Gegengewicht-Maschinen (D2, D3, D5)', () => {
  test('D3: alle Startübungen mit Gegengewicht', () => {
    for (const id of ['klimmzuege_unterstuetzt', 'klimmzuege_maschine', 'dips_maschine']) {
      expect(loadModeOf({ id, equipment: 'maschine', kind: 'kraft', sides: 'beidseitig' })).toBe('unterstuetzt');
    }
    expect(loadModeOf({ id: 'latzug', equipment: 'kabel', kind: 'kraft', sides: 'beidseitig' })).toBe('normal');
  });

  test('D2: Kraftziel mit Unterstützung – kleinstes Gewicht zählt, erreicht bei höchstens dem Ziel', () => {
    const sets = [
      { weightKg: 30, reps: 8, day: '2026-10-01' },
      { weightKg: 20, reps: 8, day: '2026-10-08' },
      { weightKg: 10, reps: 3, day: '2026-10-15' },
    ];
    const p = strengthProgress(sets, { targetKg: 20, targetReps: 8 }, 'unterstuetzt');
    expect(p.best).toMatchObject({ weightKg: 20 });
    expect(p.reached).toBe(true);
    expect(strengthProgress(sets, { targetKg: 15, targetReps: 8 }, 'unterstuetzt').reached).toBe(false);
    // Ohne Gewichtsart wie bisher: größtes Gewicht
    expect(strengthProgress(sets, { targetKg: 25, targetReps: 8 }).best).toMatchObject({ weightKg: 30 });
  });

  test('D5: Stagnation und Wiedereinstieg nehmen Prozent ODER einen Schritt zurück, nicht beides', () => {
    expect(PROGRESSION_RULES_VERSION).toBe(2);
    const target = { sets: 3, repsMin: 8, repsMax: 12, seconds: null };
    const at = (kg: number, daysAgo: number): PastSession => ({ daysAgo, sets: [8, 8, 8].map((reps) => ({ weightKg: kg, reps, seconds: null })) });
    // 30 kg Unterstützung: +10 % = 33 → 32,5 (vorher 30 · 1,1 + 2,5 = 35,5 → 35)
    expect(progressionAdvice([at(30, 2), at(30, 5), at(30, 9)], target, 'maschine', 'kg', 'unterstuetzt')).toMatchObject({
      kind: 'stagnation',
      weightKg: 32.5,
    });
    // 20 % nach 4 Wochen Pause: 36 → 35 (vorher 38,5 → 37,5)
    expect(progressionAdvice([at(30, 30)], target, 'maschine', 'kg', 'unterstuetzt')).toMatchObject({ kind: 'wiedereinstieg', weightKg: 35 });
    // Kleine Unterstützung: mindestens ein Schritt mehr
    expect(progressionAdvice([at(5, 2), at(5, 5), at(5, 9)], target, 'maschine', 'kg', 'unterstuetzt')).toMatchObject({ kind: 'stagnation', weightKg: 7.5 });
    expect(progressionAdvice([at(0, 2), at(0, 5), at(0, 9)], target, 'maschine', 'kg', 'unterstuetzt')).toMatchObject({ kind: 'stagnation', weightKg: 2.5 });
  });
});

describe('D6: Tage seit der letzten Einheit sind Kalendertage', () => {
  test('Montagabend bis Mittwochmorgen = 2 Tage, auch unter 48 Stunden', () => {
    expect(daysSince('2026-11-02T20:00:00Z', Date.parse('2026-11-04T06:00:00Z'), 'UTC')).toBe(2);
    expect(daysSince('2026-11-02T20:00:00Z', Date.parse('2026-11-02T23:00:00Z'), 'UTC')).toBe(0);
    // Zeitzone zählt: 23:30 UTC ist in Berlin schon der nächste Tag.
    expect(daysSince('2026-11-02T23:30:00Z', Date.parse('2026-11-03T08:00:00Z'), 'Europe/Berlin')).toBe(0);
    expect(daysSince('2026-11-02T22:30:00Z', Date.parse('2026-11-03T08:00:00Z'), 'Europe/Berlin')).toBe(1);
  });
});

describe('D7: Trainingslast unabhängig vom geladenen Zeitfenster', () => {
  test('mit erstem Lasttag aus der Datenbank gleiche Geschichte wie mit vollem Verlauf', () => {
    const today = '2026-11-01';
    const all = Array.from({ length: 70 }, (_, i) => ({ day: shiftDay(today, -i), load: i < 7 ? 600 : 300 })).reverse();
    const full = loadRatio(all, today);
    const window = all.filter((l) => l.day >= shiftDay(today, -8));
    // Nur 9 Tage geladen: ohne ersten Lasttag „zu wenig Geschichte“, mit ihm wie beim vollen Verlauf.
    expect(loadRatio(window, today).ratio).toBeNull();
    expect(loadRatio(window, today, all[0].day).historyDays).toBe(full.historyDays);
  });
});

describe('D10: Untergrenze max(1200, Ruheenergie)', () => {
  test('aus Körperdaten; ohne Angaben oder außerhalb 19–78 Jahre 1200', () => {
    expect(calorieFloor(null)).toBe(CALORIE_FLOOR);
    expect(calorieFloor(1780)).toBe(1780);
    expect(calorieFloor(1345.25)).toBe(1350);
    expect(calorieFloorFor({ weightKg: 80, heightCm: 180, age: 30, term: '+5' })).toBe(1780);
    expect(calorieFloorFor({ weightKg: 80, heightCm: 180, age: 17, term: '+5' })).toBe(CALORIE_FLOOR);
    expect(calorieFloorFor({ weightKg: null, heightCm: 180, age: 30, term: '+5' })).toBe(CALORIE_FLOOR);
  });

  test('Check-in Fassung 1 senkt nie unter die Ruheenergie', () => {
    const weights = Array.from({ length: 14 }, (_, i) => ({ day: shiftDay('2026-10-16', i), kg: 80 }));
    const days = weekDaysUntil('2026-10-29').map((day) => ({ day, kcal: 1820, entries: 3, unknownKcal: 0, goal: 1850 }));
    const input: CheckinInput = {
      weekEnd: '2026-10-29',
      weights,
      days,
      workouts: 3,
      plannedPerWeek: 3,
      stepsAvg: 8000,
      sleepHours: [],
      direction: 'abnehmen',
      sensitive: false,
      hideNumbers: false,
      heightCm: 180,
      currentGoal: 1850,
    };
    expect(weeklyCheckin(input).suggestion).toEqual({ kind: 'kcal', from: 1850, to: 1750, reason: 'keinFortschritt' });
    expect(weeklyCheckin({ ...input, floor: 1780 }).suggestion).toEqual({ kind: 'kcal', from: 1850, to: 1780, reason: 'keinFortschritt' });
    expect(weeklyCheckin({ ...input, floor: 1850 }).suggestion).toEqual({ kind: 'passt' });
  });

  test('Fassung 2 (Verbrauch): Untergrenze in suggestV2 und zusätzlich in applyV2', () => {
    const estimate = { kind: 'schaetzung', kcal: 2100 } as Estimate;
    const v2 = suggestV2({ estimate, delta: -500, currentGoal: 1800, weightKg: 80, heightCm: 180 });
    expect(v2).toMatchObject({ kind: 'kcal', to: 1600 });
    expect(suggestV2({ estimate, delta: -500, currentGoal: 1800, weightKg: 80, heightCm: 180, floor: 1780 })).toMatchObject({ kind: 'passt' });
    const base = { summary: {} as never, hints: [], suggestion: { kind: 'passt' as const } };
    expect(applyV2({ ...base, floor: 1780 }, v2).suggestion).toEqual({ kind: 'kcal', from: 1800, to: 1780, reason: 'verbrauch' });
    expect(applyV2({ ...base, floor: 1800 }, v2).suggestion).toEqual({ kind: 'passt' });
    expect(applyV2(base, v2).suggestion).toEqual({ kind: 'kcal', from: 1800, to: 1600, reason: 'verbrauch' });
  });

  test('neu skaliertes Ziel: Ruhetag nie unter der übergebenen Untergrenze', () => {
    const plan = { kcal: 2400, trainingKcal: 2600, restKcal: 2250, trainingWeekdays: [1, 3, 5], macros: { protein: 160, fat: 80, carbs: 300, fiber: 30 } };
    expect(rescalePlan(plan, 1900).restKcal).toBe(1750);
    expect(rescalePlan(plan, 1900, 1780).restKcal).toBe(1780);
  });
});
