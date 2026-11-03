// Einblicke (W9): Kacheln und Wochen-Muster – nur mit genug Tagen, ohne Serien und ohne kcal bei sensibler Situation.

import { describe, expect, test } from '@jest/globals';

import { isoWeekday, shiftDay } from '../dates';
import {
  availableTiles,
  cleanTiles,
  completeFood,
  DEFAULT_INSIGHT_TILES,
  INSIGHT_TILES,
  PATTERN_MIN,
  tileSummaries,
  weekPatterns,
  type InsightDay,
} from '../insights';

const TODAY = '2026-11-03';
const FOOD_END = '2026-11-02';
const ALL = { ernaehrung: true, bereitschaft: true };

const empty = (day: string): InsightDay => ({ day, food: null, proteinGoal: null, trained: false, steps: null, sleepHours: null, readiness: null });

/** 8 Wochen + heute, jeder Tag über `fill` befüllbar. */
function range(fill: (day: string, i: number) => Partial<InsightDay> = () => ({}), count = 57): InsightDay[] {
  return Array.from({ length: count }, (_, i) => {
    const day = shiftDay(TODAY, i - count + 1);
    return { ...empty(day), ...fill(day, i) };
  });
}

const weekend = (day: string) => isoWeekday(day) >= 6;

describe('Auswahl der Kacheln', () => {
  test('ohne gespeicherte Auswahl gilt die Vorgabe', () => {
    expect(cleanTiles(null)).toEqual([...DEFAULT_INSIGHT_TILES]);
    expect(cleanTiles('kalorien')).toEqual([...DEFAULT_INSIGHT_TILES]);
  });
  test('unbekannte und doppelte Einträge fallen weg, Reihenfolge fest', () => {
    expect(cleanTiles(['schlaf', 'gibtsnicht', 'kalorien', 'schlaf'])).toEqual(['kalorien', 'schlaf']);
    expect(cleanTiles([])).toEqual([]);
  });
  test('Module: ohne Ernährung keine Kalorien/Eiweiß, ohne Bereitschaft kein Schlaf/Ampel', () => {
    expect(availableTiles(ALL)).toEqual([...INSIGHT_TILES]);
    expect(availableTiles({ ernaehrung: false, bereitschaft: true })).not.toContain('kalorien');
    expect(availableTiles({ ernaehrung: false, bereitschaft: true })).not.toContain('eiweiss');
    expect(availableTiles({ ernaehrung: true, bereitschaft: false })).toEqual(['kalorien', 'eiweiss', 'gewicht', 'training', 'schritte']);
  });
});

describe('vollständig erfasste Tage', () => {
  test('nur mit Einträgen, bekannten kcal und ohne Markierung', () => {
    expect(completeFood({ entries: 3, kcal: 2000, unknownKcal: 0, flagged: 0, protein: 100 })).toEqual({ kcal: 2000, protein: 100 });
    expect(completeFood({ entries: 0, kcal: null, unknownKcal: 0, protein: null })).toBeNull();
    expect(completeFood({ entries: 3, kcal: 1500, unknownKcal: 1, protein: 80 })).toBeNull();
    expect(completeFood({ entries: 3, kcal: 1500, unknownKcal: 0, flagged: 1, protein: 80 })).toBeNull();
  });
});

describe('Kacheln', () => {
  test('Kalorien: Schnitt der letzten 7 abgeschlossenen Tage, heute zählt nicht', () => {
    const days = range((day) => ({ food: { kcal: day === TODAY ? 300 : day >= shiftDay(FOOD_END, -6) ? 2100 : 1800, protein: 100 } }));
    const t = tileSummaries(days, [], TODAY, FOOD_END);
    expect(t.kalorien.value).toBe(2100);
    expect(t.kalorien.days).toBe(7);
    expect(t.kalorien.spark).toHaveLength(14);
    expect(t.kalorien.spark.at(-1)).toBe(2100);
  });
  test('Kalorien: unter 3 erfassten Tagen kein Schnitt', () => {
    const days = range((day) => (day === FOOD_END || day === shiftDay(FOOD_END, -1) ? { food: { kcal: 2000, protein: null } } : {}));
    const t = tileSummaries(days, [], TODAY, FOOD_END);
    expect(t.kalorien.value).toBeNull();
    expect(t.kalorien.days).toBe(2);
  });
  test('Eiweiß mit Ziel: an x von y Tagen erreicht', () => {
    const days = range((day, i) => (day <= FOOD_END && day > shiftDay(FOOD_END, -7) ? { food: { kcal: 2000, protein: i % 2 ? 140 : 100 }, proteinGoal: 120 } : {}));
    const t = tileSummaries(days, [], TODAY, FOOD_END);
    expect(t.eiweiss.kind).toBe('count');
    expect(t.eiweiss.of).toBe(7);
    expect(t.eiweiss.value).toBeGreaterThanOrEqual(3);
    expect(t.eiweiss.value).toBeLessThanOrEqual(4);
  });
  test('Eiweiß ohne Ziel: Schnitt in g', () => {
    const days = range(() => ({ food: { kcal: 2000, protein: 90 } }));
    const t = tileSummaries(days, [], TODAY, FOOD_END);
    expect(t.eiweiss.kind).toBe('mean');
    expect(t.eiweiss.value).toBe(90);
  });
  test('Gewicht: Trend und Veränderung zur Vorwoche', () => {
    const weights = Array.from({ length: 14 }, (_, i) => ({ day: shiftDay(TODAY, -i), kg: i < 7 ? 80 : 81 }));
    const t = tileSummaries(range(), weights, TODAY, FOOD_END);
    expect(t.gewicht.value).toBe(80);
    expect(t.gewicht.change).toBeCloseTo(-1);
    expect(t.gewicht.days).toBe(7);
    expect(t.gewicht.spark).toHaveLength(28);
  });
  test('Training: Tage in 7 Tagen und Verlauf je Woche (8 Säulen)', () => {
    const days = range((day) => ({ trained: [1, 3, 5].includes(isoWeekday(day)) }));
    const t = tileSummaries(days, [], TODAY, FOOD_END);
    expect(t.training.value).toBe(3);
    expect(t.training.of).toBe(7);
    expect(t.training.bars).toBe(true);
    expect(t.training.spark).toEqual([3, 3, 3, 3, 3, 3, 3, 3]);
  });
  test('Schritte und Schlaf: Schnitt über Tage mit Wert', () => {
    const days = range((day, i) => ({ steps: i % 2 ? 8000 : null, sleepHours: 7.5 }));
    const t = tileSummaries(days, [], TODAY, FOOD_END);
    expect(t.schritte.value).toBe(8000);
    expect(t.schlaf.value).toBe(7.5);
    expect(t.schlaf.days).toBe(7);
  });
  test('Bereitschaft: grün unter den Tagen mit Ampel', () => {
    const days = range((day, i) => (i > 50 ? { readiness: i % 3 === 0 ? 'gelb' : 'gruen' } : {}));
    const t = tileSummaries(days, [], TODAY, FOOD_END);
    expect(t.bereitschaft.of).toBe(6);
    expect(t.bereitschaft.value).toBe(4);
    expect(t.bereitschaft.levels).toHaveLength(14);
  });
  test('ohne Daten: keine erfundenen Werte', () => {
    const t = tileSummaries(range(), [], TODAY, FOOD_END);
    expect(t.kalorien.value).toBeNull();
    expect(t.gewicht.value).toBeNull();
    expect(t.schritte.value).toBeNull();
    expect(t.bereitschaft.value).toBeNull();
    expect(t.training.value).toBe(0);
  });
});

describe('Wochen-Muster', () => {
  const opts = { today: TODAY, foodEnd: FOOD_END, modules: ALL, hideNumbers: false };

  test('Wochenende gegenüber unter der Woche (gerundet auf 10 kcal)', () => {
    const days = range((day) => ({ food: { kcal: weekend(day) ? 2453 : 2001, protein: null } }));
    const p = weekPatterns(days, opts).find((x) => x.key === 'wochenendeKcal');
    expect(p).toMatchObject({ direction: 'mehr', diff: 450, weekend: 2450, weekday: 2000 });
  });
  test('kleiner Unterschied heißt „etwa gleich“', () => {
    const days = range((day) => ({ food: { kcal: weekend(day) ? 2030 : 2000, protein: null } }));
    expect(weekPatterns(days, opts).find((x) => x.key === 'wochenendeKcal')).toMatchObject({ direction: 'gleich' });
  });
  test('zu wenige Wochenendtage → kein Muster', () => {
    let weekends = 0;
    const days = range((day) => {
      if (weekend(day) && ++weekends > PATTERN_MIN.weekendDays - 1) return {};
      return { food: { kcal: 2000, protein: null } };
    });
    expect(weekPatterns(days, opts).some((x) => x.key === 'wochenendeKcal')).toBe(false);
  });
  test('sensible Situation: keine kcal-Muster, Eiweiß bleibt', () => {
    const days = range((day) => ({ food: { kcal: weekend(day) ? 2500 : 2000, protein: 130 }, proteinGoal: 120, trained: isoWeekday(day) % 2 === 0 }));
    const keys = weekPatterns(days, { ...opts, hideNumbers: true }).map((x) => x.key);
    expect(keys).not.toContain('wochenendeKcal');
    expect(keys).not.toContain('trainingKcal');
    expect(keys).toContain('eiweissZiel');
  });
  test('ohne Ernährungsmodul keine Essens-Muster', () => {
    const days = range((day) => ({ food: { kcal: 2000, protein: 130 }, proteinGoal: 120 }));
    const keys = weekPatterns(days, { ...opts, modules: { ernaehrung: false, bereitschaft: true } }).map((x) => x.key);
    expect(keys).toEqual([]);
  });
  test('Eiweißziel: an x von 7 Tagen (4 Wochen, mindestens 14 Tage)', () => {
    const days = range((day) => ({ food: { kcal: 2000, protein: [1, 2, 3, 4, 5].includes(isoWeekday(day)) ? 130 : 90 }, proteinGoal: 120 }));
    expect(weekPatterns(days, opts).find((x) => x.key === 'eiweissZiel')).toMatchObject({ perWeek: 5, of: 28, hits: 20 });
    const few = range((day, i) => (i > 45 ? { food: { kcal: 2000, protein: 130 }, proteinGoal: 120 } : {}));
    expect(weekPatterns(few, opts).some((x) => x.key === 'eiweissZiel')).toBe(false);
  });
  test('Trainings- und Ruhetage: Ø kcal je Art', () => {
    const days = range((day) => {
      const trained = [1, 3, 5].includes(isoWeekday(day));
      return { trained, food: { kcal: trained ? 2300 : 2050, protein: null } };
    });
    expect(weekPatterns(days, opts).find((x) => x.key === 'trainingKcal')).toMatchObject({ training: 2300, rest: 2050 });
  });
  test('häufigste Trainingstage: in mindestens der Hälfte der Wochen', () => {
    const days = range((day, i) => ({ trained: isoWeekday(day) === 1 || (isoWeekday(day) === 4 && i % 14 < 7) || (isoWeekday(day) === 6 && i < 14) }));
    const p = weekPatterns(days, opts).find((x) => x.key === 'trainingWochentage');
    expect(p).toMatchObject({ weeks: 8 });
    expect(p && 'weekdays' in p ? p.weekdays : []).toContain(1);
    expect(p && 'weekdays' in p ? p.weekdays : []).not.toContain(6);
  });
  test('Schlaf am Wochenende, nur mit Modul Bereitschaft', () => {
    const days = range((day) => ({ sleepHours: weekend(day) ? 8.3 : 7.0 }));
    expect(weekPatterns(days, opts).find((x) => x.key === 'schlafWochenende')).toMatchObject({ direction: 'mehr', diff: 1.3 });
    expect(weekPatterns(days, { ...opts, modules: { ernaehrung: true, bereitschaft: false } }).some((x) => x.key === 'schlafWochenende')).toBe(false);
  });
  test('Schritte an Trainings- und Ruhetagen (bis gestern, gerundet auf 100)', () => {
    const days = range((day) => {
      const trained = [2, 4].includes(isoWeekday(day));
      return { trained, steps: trained ? 9140 : 6820 };
    });
    expect(weekPatterns(days, opts).find((x) => x.key === 'schritteTraining')).toMatchObject({ direction: 'mehr', training: 9100, rest: 6800 });
  });
  test('ohne Daten keine Muster', () => {
    expect(weekPatterns(range(), opts)).toEqual([]);
  });
});
