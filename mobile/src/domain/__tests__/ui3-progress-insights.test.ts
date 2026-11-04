// Einblicke: leere Kacheln zeigen den Weg zum ersten Wert („2 von 3 Tagen erfasst“) statt nur eines Strichs.

import { describe, expect, test } from '@jest/globals';

import { shiftDay } from '../dates';
import { TILE_MIN_DAYS, tileSummaries, WEIGHT_TREND_DAYS, type InsightDay } from '../insights';

const TODAY = '2026-11-03';
const FOOD_END = '2026-11-02';

const days = (fill: (i: number) => Partial<InsightDay>): InsightDay[] =>
  Array.from({ length: 57 }, (_, i) => ({
    day: shiftDay(TODAY, i - 56),
    food: null,
    proteinGoal: null,
    trained: false,
    steps: null,
    sleepHours: null,
    readiness: null,
    ...fill(i),
  }));

describe('Fortschritt bis zum ersten Wert', () => {
  test('Kalorien: 2 von 3 Tagen erfasst, ab dem dritten ein Schnitt', () => {
    // Essen zählt bis gestern (Index 55 = FOOD_END).
    const two = tileSummaries(
      days((i) => (i >= 54 && i <= 55 ? { food: { kcal: 2000, protein: 100 } } : {})),
      [],
      TODAY,
      FOOD_END
    );
    expect(two.kalorien).toMatchObject({ value: null, days: 2, need: TILE_MIN_DAYS });
    const three = tileSummaries(
      days((i) => (i >= 53 && i <= 55 ? { food: { kcal: 2000, protein: 100 } } : {})),
      [],
      TODAY,
      FOOD_END
    );
    expect(three.kalorien).toMatchObject({ value: 2000, days: 3 });
  });

  test('Gewicht: Tage gewogen von 4; Schritte und Schlaf brauchen 3 Tage; Training und Bereitschaft ohne feste Zahl', () => {
    const weights = [0, 1].map((i) => ({ day: shiftDay(TODAY, -i), kg: 80 }));
    const t = tileSummaries(
      days(() => ({})),
      weights,
      TODAY,
      FOOD_END
    );
    expect(t.gewicht).toMatchObject({ value: null, days: 2, need: WEIGHT_TREND_DAYS });
    expect(t.schritte.need).toBe(TILE_MIN_DAYS);
    expect(t.schlaf.need).toBe(TILE_MIN_DAYS);
    expect(t.training.need).toBeNull();
    expect(t.bereitschaft.need).toBeNull();
  });
});
