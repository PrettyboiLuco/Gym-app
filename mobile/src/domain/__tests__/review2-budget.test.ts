// Prüftest (Gutachten 2): Das Wochenbudget hebt ein eigenes Ziel unter der Untergrenze an – und sagt es (raisedToFloor).

import { describe, expect, test } from '@jest/globals';

import { applyCarryover, DEFAULT_BUDGET, distributeWeek, planWeek } from '@/domain/budget';

const week = (goals: number[], floor: number) =>
  planWeek({
    goals,
    days: goals.map(() => ({ kcal: null, complete: false, unknown: 0 })),
    index: 2,
    trainingWeekdays: [],
    settings: { ...DEFAULT_BUDGET, enabled: true },
    floor,
  });

describe('Wochenbudget und Untergrenze', () => {
  test('eigenes Ziel 1500 unter der Untergrenze 1700: jeder Tag wird auf 1700 angehoben, mit Hinweis', () => {
    const w = week([1500, 1500, 1500, 1500, 1500, 1500, 1500], 1700);
    expect(w?.planned).toEqual([1700, 1700, 1700, 1700, 1700, 1700, 1700]);
    expect(w?.total).toBe(11900);
    expect(w?.dayTarget).toBe(1700);
    expect(w?.raisedToFloor).toBe(true);
  });

  test('Ziel über der Untergrenze: kein Hinweis', () => {
    const w = week([2000, 2000, 2000, 2000, 2000, 2000, 2000], 1700);
    expect(w?.dayTarget).toBe(2000);
    expect(w?.raisedToFloor).toBe(false);
  });

  test('Ziel 1750 mit Untergrenze 1700: Wochenende-Vorlage drückt Wochentage nicht unter die Grenze, Summe bleibt', () => {
    const planned = distributeWeek(7 * 1750, [100, 100, 100, 100, 100, 115, 115], 1700);
    expect(Math.min(...planned)).toBeGreaterThanOrEqual(1700);
    expect(planned.reduce((a, b) => a + b, 0)).toBe(7 * 1750);
  });

  test('Übertrag: großer Überschuss wird auf 300 je Tag gedeckelt, Rest verfällt', () => {
    const r = applyCarryover([2000, 2000, 2000, 2000, 2000, 2000, 2000], [500, 500, null, null, null, null, null], 2, 1200);
    expect(r.balance).toBe(3000);
    expect(r.targets.slice(2)).toEqual([2300, 2300, 2300, 2300, 2300]);
    expect(r.carried).toBe(1500);
  });
});
