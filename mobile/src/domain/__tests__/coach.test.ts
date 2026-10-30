// Coach-Rechenkern (C2–C5, C8, C9).

import { describe, expect, test } from '@jest/globals';

import {
  buildPlan,
  coachEnergy,
  dailyTips,
  dayTarget,
  daySplit,
  gymPal,
  isoWeekday,
  macroSettings,
  macrosFor,
  needsRecalc,
  palFromSteps,
  proteinTarget,
  rescalePlan,
  type CoachInput,
} from '../coach';
import { restingEnergy } from '../energy';

const base: CoachInput = { weightKg: 80, heightCm: 180, age: 30, term: '+5', steps: 8000, gymDays: 4, goal: 'zunehmen', delta: 250, sensitive: false };

describe('Bedarf aus Schritten und Gym-Tagen (C2)', () => {
  test.each([
    [3000, 1.4],
    [5000, 1.5],
    [7499, 1.5],
    [9999, 1.6],
    [10000, 1.7],
    [15000, 1.8],
  ])('%i Schritte → %f', (steps, pal) => expect(palFromSteps(steps)).toBe(pal));
  test('je Gym-Tag +0,065, höchstens 7 Tage', () => {
    expect(gymPal(4)).toBe(0.26);
    expect(gymPal(10)).toBe(0.455);
  });
  test('Bulk: Erhalt + 250, Rechenweg nachvollziehbar', () => {
    const r = coachEnergy(base);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    const resting = restingEnergy(80, 180, 30, '+5'); // 1780
    expect(r.pal).toBe(1.86);
    expect(r.maintenance).toBe(Math.round((resting * 1.86) / 10) * 10);
    expect(r.kcal).toBe(r.maintenance + 250);
  });
  test('Schlaf kommt in der Rechnung nicht vor (COACH-006): gleiche Eingaben, gleiche Zahl', () =>
    expect(coachEnergy({ ...base })).toEqual(coachEnergy(base)));
  test('Cut nie unter die Untergrenze', () => {
    const r = coachEnergy({ ...base, weightKg: 50, heightCm: 160, age: 70, term: '-161', steps: 2000, gymDays: 0, goal: 'abnehmen', delta: -500 });
    expect(r.status === 'ok' && r.kcal).toBe(1200);
    expect(r.status === 'ok' && r.floorApplied).toBe(true);
  });
  test('fehlende Angaben, sensible Situation, Alter, Untergewicht', () => {
    expect(coachEnergy({ ...base, steps: null, term: null })).toEqual({ status: 'fehlt', missing: ['term', 'steps'] });
    expect(coachEnergy({ ...base, sensitive: true })).toEqual({ status: 'sensibel' });
    expect(coachEnergy({ ...base, age: 17 })).toEqual({ status: 'alter' });
    expect(coachEnergy({ ...base, weightKg: 55, goal: 'abnehmen', delta: -500 })).toEqual({ status: 'untergewicht' });
  });
  test('nur erlaubte Tempo-Stufen', () => expect(() => coachEnergy({ ...base, delta: 1000 })).toThrow());
});

describe('Makros (C4)', () => {
  test('Eiweiß je Ziel und Training', () => {
    expect(proteinTarget(80, 'zunehmen', 4)).toBe(128);
    expect(proteinTarget(80, 'abnehmen', 4)).toBe(160);
    expect(proteinTarget(80, 'halten', 0)).toBe(64);
    expect(proteinTarget(80, 'abnehmen', 1)).toBe(96);
  });
  test('Fett 30 %, Kohlenhydrate Rest, Ballaststoffe 30 g; Summe passt zu den Kalorien', () => {
    const m = macrosFor(2800, 128);
    expect(m).toEqual({ protein: 128, fat: 93, carbs: 362, fiber: 30 });
    expect(Math.abs(m.protein * 4 + m.fat * 9 + m.carbs * 4 - 2800)).toBeLessThan(10);
  });
  test('wenig Kalorien, viel Eiweiß: Fett sinkt bis 20 %, Kohlenhydrate nie negativ', () => {
    const m = macrosFor(1200, 200);
    expect(m.carbs).toBeGreaterThanOrEqual(0);
    expect(m.fat).toBeGreaterThanOrEqual(Math.round((1200 * 0.2) / 9));
  });
});

describe('Makro-Ausrichtung (Lean/Bodybuilding)', () => {
  const standard = { profile: 'standard' as const, proteinPerKg: 1.6, fatShare: 0.3 };
  test('Lean: Fett 20 %, mehr Eiweiß und mehr Kohlenhydrate als Standard', () => {
    const lean = macroSettings({ ...standard, profile: 'lean' }, 80, 'zunehmen', 4);
    expect(lean).toEqual({ protein: 160, fatShare: 0.2 });
    const a = buildPlan(3560, 128, [], 1200, false).macros!;
    const b = buildPlan(3560, lean.protein, [], 1200, false, lean.fatShare).macros!;
    expect(b.fat).toBe(Math.round((3560 * 0.2) / 9));
    expect(b.protein).toBeGreaterThan(a.protein);
    expect(b.carbs).toBeGreaterThan(a.carbs);
    expect(Math.abs(b.protein * 4 + b.fat * 9 + b.carbs * 4 - 3560)).toBeLessThan(10);
  });
  test('Lean im Cut: 2,2 g Eiweiß pro kg', () =>
    expect(macroSettings({ ...standard, profile: 'lean' }, 80, 'abnehmen', 4).protein).toBe(176));
  test('Eigene Werte werden in den Rahmen gesetzt (Fett nie unter 20 %)', () => {
    expect(macroSettings({ profile: 'eigen', proteinPerKg: 3.5, fatShare: 0.1 }, 80, 'zunehmen', 4)).toEqual({ protein: 200, fatShare: 0.2 });
    expect(macroSettings({ profile: 'eigen', proteinPerKg: 1.8, fatShare: 0.25 }, 80, 'zunehmen', 4)).toEqual({ protein: 144, fatShare: 0.25 });
  });
  test('Check-in/Einstellungen behalten die Ausrichtung (Fettanteil)', () => {
    const plan = rescalePlan(buildPlan(3560, 160, [1, 3, 5], 1200, true, 0.2), 3460);
    expect(plan.macros!.fat).toBe(Math.round((3460 * 0.2) / 9));
    expect(plan.macros!.protein).toBe(160);
  });
});

describe('Trainings- und Ruhetage (C5)', () => {
  test('gleicher Wochenschnitt', () => {
    const { training, rest } = daySplit(2800, 4, 1200);
    expect(training).toBe(3000);
    expect(Math.abs((training * 4 + rest * 3) / 7 - 2800)).toBeLessThan(10);
  });
  test('viele Trainingstage: Ruhetag höchstens −300', () => {
    const { training, rest } = daySplit(2800, 6, 1200);
    expect(rest).toBe(2500);
    expect(training).toBe(2850);
  });
  test('Ruhetag nie unter der Untergrenze', () => expect(daySplit(1300, 5, 1200).rest).toBe(1200));
  test('0 oder 7 Trainingstage: keine Aufteilung', () => expect(daySplit(2000, 7, 1200)).toEqual({ training: 2000, rest: 2000 }));
  test('Tagesziel nach Wochentag, Unterschied über Kohlenhydrate', () => {
    const plan = buildPlan(2800, 128, [1, 3, 5], 1200, true);
    expect(isoWeekday('2026-11-02')).toBe(1); // Montag
    const monday = dayTarget(plan, '2026-11-02');
    const tuesday = dayTarget(plan, '2026-11-03');
    expect(monday.trainingDay).toBe(true);
    expect(tuesday.trainingDay).toBe(false);
    expect(monday.kcal).toBeGreaterThan(tuesday.kcal);
    expect(monday.macros!.protein).toBe(tuesday.macros!.protein);
    // Rundung auf ganze Gramm: höchstens 1 g Abweichung.
    expect(Math.abs(monday.macros!.carbs - tuesday.macros!.carbs - (monday.kcal - tuesday.kcal) / 4)).toBeLessThanOrEqual(1);
  });
  test('ohne Aufteilung jeder Tag gleich', () => {
    const plan = buildPlan(2400, 120, [1, 3, 5], 1200, false);
    expect(dayTarget(plan, '2026-11-02')).toEqual({ kcal: 2400, trainingDay: null, macros: plan.macros });
  });
  test('neues Ziel (Check-in): Eiweiß, Ballaststoffe und Trainingstage bleiben', () => {
    const plan = rescalePlan(buildPlan(2800, 128, [1, 3, 5], 1200, true), 2700);
    expect(plan.kcal).toBe(2700);
    expect(plan.macros!.protein).toBe(128);
    expect(plan.macros!.fiber).toBe(30);
    expect(plan.trainingWeekdays).toEqual([1, 3, 5]);
  });
});

describe('Neu berechnen und Tipps (C8, C9)', () => {
  test('Schritte ±2000 oder Gym-Tage ±2', () => {
    expect(needsRecalc(8000, 10500, 4, 4)).toBe(true);
    expect(needsRecalc(8000, 9000, 4, 2)).toBe(true);
    expect(needsRecalc(8000, 9000, 4, 3)).toBe(false);
    expect(needsRecalc(null, 9000, 4, null)).toBe(false);
  });
  const target = dayTarget(buildPlan(2800, 128, [1, 3, 5], 1200, true), '2026-11-02');
  const ctx = { target, eaten: { kcal: 1000, protein: 40, fiber: 10 }, drinksMl: 300, drinkGoalMl: 1500, hour: 16, sleepHours: 5.5, hideNumbers: false };
  test('passende Tipps', () =>
    expect(dailyTips(ctx).map((t) => t.key)).toEqual(['eiweissOffen', 'ballaststoffeOffen', 'trainingstag', 'trinken', 'schlafKurz']));
  test('Modus ohne Zahlen: keine Gramm-Tipps', () =>
    expect(dailyTips({ ...ctx, hideNumbers: true }).map((t) => t.key)).toEqual(['trainingstag', 'trinken', 'schlafKurz']));
  test('nichts offen → „alles gut“, keine Aufforderung zu mehr', () =>
    expect(dailyTips({ target: null, eaten: { kcal: 0, protein: 0, fiber: 0 }, drinksMl: 0, drinkGoalMl: null, hour: 9, sleepHours: null, hideNumbers: false })).toEqual([{ key: 'allesGut' }]));
});
