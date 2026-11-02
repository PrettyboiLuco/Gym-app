// Fehler aus dem Phase 1 Scan (docs/Phase_1_Scan.md), reine Logik – je Fehler ein Test, damit er nicht zurückkommt.

import { describe, expect, test } from '@jest/globals';

import { lateCaffeineMg } from '../caffeine';
import { weeklyCheckin } from '../checkin';
import { shiftDay } from '../dates';
import { foodToForm, parseFoodForm } from '../nutrition';
import { progressionAdvice } from '../progression';
import { journalFindings, loadRatio, performanceIndex } from '../readiness';
import { parseIngredientLine } from '../recipe-import';
import { deloadEnd } from '../training-stats';

describe('Phase 1 Scan – Logik', () => {
  test('F4: gescannter Wert mit vielen Nachkommastellen lässt sich wieder speichern', () => {
    const form = foodToForm({
      name: 'Brot',
      brand: null,
      barcode: null,
      basis: 'g',
      per100: { kcal: 52.4, protein: 1, carbs: 2, fat: 0.5, fiber: null, salt: 0.0762 },
      servingAmount: null,
    });
    expect(form.salt).toBe('0,076');
    const { draft, problems } = parseFoodForm(form);
    expect(problems).toEqual([]);
    expect(draft!.per100.salt).toBeCloseTo(0.076);
  });

  test('F7: gleichmäßiges Training mit 3 Wochen Verlauf ergibt Last ≈ 1, nicht 1,45', () => {
    const today = '2026-10-31';
    const loads = Array.from({ length: 21 }, (_, i) => i)
      .filter((i) => i % 2 === 0)
      .map((i) => ({ day: shiftDay(today, -i), load: 300 }));
    const r = loadRatio(loads, today);
    expect(r.historyDays).toBe(21);
    expect(r.ratio).toBeGreaterThan(0.95);
    expect(r.ratio).toBeLessThan(1.2);
  });

  test('F8: Ziel unter der Untergrenze – Vorschlag nennt die Untergrenze als Grund', () => {
    const days = Array.from({ length: 7 }, (_, i) => ({ day: shiftDay('2026-10-31', i - 6), kcal: 1050, entries: 3, unknownKcal: 0, goal: 1100 }));
    const weights = Array.from({ length: 14 }, (_, i) => ({ day: shiftDay('2026-10-31', -i), kg: 80 }));
    const r = weeklyCheckin({
      weekEnd: '2026-10-31',
      weights,
      days,
      workouts: 3,
      plannedPerWeek: 3,
      stepsAvg: null,
      sleepHours: [],
      direction: 'abnehmen',
      sensitive: false,
      hideNumbers: false,
      heightCm: 180,
      currentGoal: 1100,
    });
    expect(r.suggestion).toEqual({ kind: 'kcal', from: 1100, to: 1200, reason: 'untergrenze' });
  });

  test('Rezept-Import: Tausenderpunkt, Gedankenstrich-Spannen und „ca.“', () => {
    const p = (l: string) => {
      const r = parseIngredientLine(l);
      return [r.amount, r.unit, r.name];
    };
    expect(p('1.000 g Mehl')).toEqual([1000, 'g', 'Mehl']);
    expect(p('2–3 EL Öl')).toEqual([2, 'el', 'Öl']);
    expect(p('2 - 3 Karotten')).toEqual([2, 'stueck', 'Karotten']);
    expect(p('ca. 200 g Reis')).toEqual([200, 'g', 'Reis']);
    // unverändert richtig
    expect(p('1.5kg Rind')).toEqual([1500, 'g', 'Rind']);
    expect(p('0,5 kg Mehl')).toEqual([500, 'g', 'Mehl']);
    expect(p('1 ½ Zwiebeln')).toEqual([1.5, 'stueck', 'Zwiebeln']);
  });

  test('„ca. 10 % leichter“ ist bei großen Gewichtsschritten mindestens ein Schritt leichter', () => {
    const sets = (kg: number) => [8, 8, 8].map((reps) => ({ weightKg: kg, reps, seconds: null }));
    const target = { sets: 3, repsMin: 8, repsMax: 12, seconds: null };
    const stagnation = (kg: number, eq: 'kettlebell' | 'langhantel') =>
      progressionAdvice(
        [0, 1, 2].map((i) => ({ daysAgo: 3 + i * 3, sets: sets(kg) })),
        target,
        eq,
        'kg'
      );
    expect(stagnation(16, 'kettlebell')).toMatchObject({ kind: 'stagnation', weightKg: 12 });
    expect(stagnation(10, 'langhantel')).toMatchObject({ kind: 'stagnation', weightKg: 7.5 });
    expect(progressionAdvice([{ daysAgo: 15, sets: sets(8) }], target, 'kurzhantel', 'kg')).toMatchObject({ kind: 'wiedereinstieg', weightKg: 6 });
    // normale Gewichte unverändert: 100 kg → 90 kg
    expect(stagnation(100, 'langhantel')).toMatchObject({ weightKg: 90 });
  });

  test('Leichte Woche: am Sonntag gestartet dauert sie bis zum nächsten Sonntag', () => {
    expect(deloadEnd('2026-11-01')).toBe('2026-11-08'); // Sonntag
    expect(deloadEnd('2026-10-26')).toBe('2026-11-01'); // Montag
    expect(deloadEnd('2026-10-31')).toBe('2026-11-01'); // Samstag
  });

  test('Koffein nach Mitternacht (Tagebuchtag endet später) zählt als spät', () => {
    const at = (day: string, hour: number) => new Date(`${day}T${String(hour).padStart(2, '0')}:30:00`).toISOString();
    const events = [
      { caffeineMg: 80, occurredAt: at('2026-11-02', 1), diaryDate: '2026-11-01' }, // 1:30 Uhr, gehört noch zum Vortag
      { caffeineMg: 60, occurredAt: at('2026-11-01', 9), diaryDate: '2026-11-01' }, // Frühstück
      { caffeineMg: 40, occurredAt: at('2026-11-01', 16), diaryDate: '2026-11-01' }, // nachmittags
    ];
    expect(lateCaffeineMg(events)).toBe(120);
  });

  test('A6.10: Leistung = Schnitt aus 1RM ÷ eigenem Bestwert; im Journal als eigene Größe', () => {
    expect(
      performanceIndex(
        new Map([
          ['bank', 95],
          ['zug', 80],
        ]),
        new Map([
          ['bank', 100],
          ['zug', 80],
        ])
      )
    ).toBe(97.5);
    expect(performanceIndex(new Map([['neu', 50]]), new Map())).toBeNull();
    const day = (i: number, factor: boolean, performance: number) => ({
      day: `2026-10-${String(i + 1).padStart(2, '0')}`,
      sleepHours: null,
      sleepQuality: null,
      energy: null,
      soreness: null,
      factors: [],
      allFactors: factor ? ['alkohol'] : [],
      performance,
    });
    const days = [...Array.from({ length: 5 }, (_, i) => day(i, true, 92)), ...Array.from({ length: 5 }, (_, i) => day(i + 5, false, 99))];
    const f = journalFindings(days as never);
    expect(f[0]).toMatchObject({ factor: 'alkohol', metric: 'performance', withAvg: 92, withoutAvg: 99 });
  });
});
