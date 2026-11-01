// A7: Verbrauch aus Aufnahme und Gewichtstrend, Wochenverlauf, Check-in Fassung 2 mit Schutzregeln.

import { describe, expect, test } from '@jest/globals';

import { estimateExpenditure, suggestV2, weeklyBalance, type IntakeDay } from '../adaptive';
import { applyV2, type CheckinResult } from '../checkin';
import { shiftDay as shift } from '../dates';

const END = '2026-10-31';
/** 28 Tage mit Aufnahme `kcal`, Gewicht fällt linear um `kgPerWeek`. */
function scenario(kcal: number, kgPerWeek: number, opts: { skip?: (i: number) => boolean; flag?: (i: number) => boolean } = {}) {
  const days: IntakeDay[] = [];
  const weights: { day: string; kg: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const day = shift(END, -i);
    if (!opts.skip?.(i)) days.push({ day, kcal, entries: 3, unknownKcal: 0, flagged: opts.flag?.(i) ? 1 : 0 });
    weights.push({ day, kg: 90 - ((27 - i) * kgPerWeek) / 7 });
  }
  return { days, weights };
}

describe('Verbrauch', () => {
  test('stabiles Gewicht → Verbrauch = Aufnahme', () => {
    const { days, weights } = scenario(2800, 0);
    expect(estimateExpenditure(days, weights, END)).toMatchObject({ kind: 'schaetzung', kcal: 2800, completeDays: 28, spanDays: 21, plusMinus: 200 });
  });

  test('0,5 kg pro Woche weniger bei 2.400 kcal → rund 2.950 kcal Verbrauch', () => {
    const { days, weights } = scenario(2400, 0.5);
    const e = estimateExpenditure(days, weights, END);
    expect(e.kind).toBe('schaetzung');
    if (e.kind === 'schaetzung') {
      expect(e.change).toBeCloseTo(-1.5, 5);
      expect(e.kcal).toBe(2950);
    }
  });

  test('zu wenige vollständige Tage oder als unvollständig markiert → noch am Lernen', () => {
    const few = scenario(2500, 0, { skip: (i) => i % 2 === 0 || i < 4 });
    expect(estimateExpenditure(few.days, few.weights, END)).toMatchObject({ kind: 'lernen', completeDays: 12 });
    const flagged = scenario(2500, 0, { flag: (i) => i < 20 });
    expect(estimateExpenditure(flagged.days, flagged.weights, END)).toMatchObject({ kind: 'lernen', completeDays: 8 });
    const noWeights = scenario(2500, 0);
    expect(estimateExpenditure(noWeights.days, noWeights.weights.slice(-3), END)).toMatchObject({ kind: 'lernen', weightStart: false });
  });

  test('Wochenverlauf: 4 Wochen, älteste zuerst', () => {
    const { days, weights } = scenario(2400, 0.5);
    const weeks = weeklyBalance(days, weights, END);
    expect(weeks).toHaveLength(4);
    expect(weeks[3].to).toBe(END);
    expect(weeks[0].expenditure).toBeNull(); // Woche davor fehlt für den Trend
    expect(weeks[3].expenditure).toBe(2950);
  });
});

describe('Check-in Fassung 2', () => {
  const estimate = estimateExpenditure(...(Object.values(scenario(2400, 0.5)) as [IntakeDay[], { day: string; kg: number }[]]), END);
  test('Ziel = Verbrauch + Abstand, gedeckelt auf ±200 je Woche, auf 50 gerundet', () => {
    expect(suggestV2({ estimate, delta: -500, currentGoal: 2400, weightKg: 88, heightCm: 180 })).toEqual({ kind: 'passt', target: 2450 });
    expect(suggestV2({ estimate, delta: 0, currentGoal: 2400, weightKg: 88, heightCm: 180 })).toEqual({
      kind: 'kcal',
      from: 2400,
      to: 2600,
      target: 2950,
      capped: true,
    });
    expect(suggestV2({ estimate, delta: -500, currentGoal: 2300, weightKg: 88, heightCm: 180 })).toMatchObject({ kind: 'kcal', to: 2450, capped: false });
  });
  test('Schutz: nie unter die Untergrenze, kein Senken bei Untergewicht, ohne Schätzung/Einrichtung kein Vorschlag', () => {
    const low = { ...estimate, kcal: 1300 } as typeof estimate;
    expect(suggestV2({ estimate: low, delta: -500, currentGoal: 1300, weightKg: 70, heightCm: 180 })).toMatchObject({ kind: 'kcal', to: 1200 });
    expect(suggestV2({ estimate, delta: -500, currentGoal: 2700, weightKg: 55, heightCm: 180 })).toMatchObject({ kind: 'passt' });
    expect(
      suggestV2({
        estimate: { kind: 'lernen', completeDays: 3, needed: 14, weightStart: true, weightEnd: true, from: '', to: '' },
        delta: 0,
        currentGoal: 2000,
        weightKg: 80,
        heightCm: 180,
      })
    ).toEqual({
      kind: 'ohne',
      why: 'lernen',
    });
    expect(suggestV2({ estimate, delta: null, currentGoal: 2000, weightKg: 80, heightCm: 180 })).toEqual({ kind: 'ohne', why: 'keineEinrichtung' });
  });
  test('Sperren aus Fassung 1 bleiben bestehen', () => {
    const base = { summary: {} as CheckinResult['summary'], hints: [] };
    const v2 = { kind: 'kcal' as const, from: 2000, to: 2200, target: 2200, capped: false };
    for (const kind of ['sensibel', 'ohneZahlen', 'pausiert'] as const) {
      expect(applyV2({ ...base, suggestion: { kind } }, v2)).toMatchObject({ suggestion: { kind }, rulesVersion: 1 });
    }
    expect(applyV2({ ...base, suggestion: { kind: 'zielEinhalten', over: 300 } }, v2)).toMatchObject({
      suggestion: { kind: 'kcal', reason: 'verbrauch' },
      rulesVersion: 2,
    });
    expect(applyV2({ ...base, suggestion: { kind: 'passt' } }, { kind: 'ohne', why: 'lernen' })).toMatchObject({ rulesVersion: 1 });
  });
});
