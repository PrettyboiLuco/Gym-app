// Statistik „Bestleistungen & Verlauf“: häufigste Übungen, Wochenwerte und letzte Bestleistung (auch mit Gegengewicht).

import { describe, expect, test } from '@jest/globals';

import { betterTrend, exerciseTrends, TREND_WEEKS, type StatSet } from '../training-stats';

const set = (sessionId: string, day: string, exerciseId: string, kg: number | null, reps: number | null, more: Partial<StatSet> = {}): StatSet => ({
  sessionId,
  day,
  exerciseId,
  setType: 'arbeit',
  weightKg: kg,
  reps,
  seconds: null,
  ...more,
});

// Mittwoch; die laufende Woche beginnt am 2.11.
const TODAY = '2026-11-04';

describe('exerciseTrends', () => {
  test('häufigste Übungen zuerst, höchstens fünf, Aufwärmsätze zählen nicht', () => {
    const sets: StatSet[] = [];
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach((id, i) => {
      for (let n = 0; n <= i; n++) sets.push(set(`s${id}${n}`, '2026-11-02', id, 50, 5));
    });
    // Viele Aufwärmsätze machen „a“ nicht häufiger.
    for (let n = 0; n < 10; n++) sets.push(set('wu', '2026-11-02', 'a', 20, 10, { setType: 'aufwaermen' }));
    const trends = exerciseTrends(sets, TODAY);
    expect(trends.map((t) => t.exerciseId)).toEqual(['f', 'e', 'd', 'c', 'b']);
    expect(trends[0].sets).toBe(6);
  });

  test('bestes geschätztes 1RM je Woche, ältere Wochen als Lücke, letzte Bestleistung mit Datum', () => {
    const sets = [
      // vor dem Fenster: erstes Training zählt nicht als Bestleistung
      set('s0', '2026-08-03', 'bank', 80, 5),
      set('s1', '2026-10-19', 'bank', 80, 8), // 1RM 101,3 → Bestleistung
      set('s2', '2026-10-26', 'bank', 85, 5), // 99,2 – keine
      set('s3', '2026-11-02', 'bank', 90, 3), // 99 – keine
      set('s3', '2026-11-02', 'bank', 60, 15), // über 12 Wdh.: kein 1RM
    ];
    const [trend] = exerciseTrends(sets, TODAY);
    expect(trend.metric).toBe('e1rm');
    expect(trend.weeks).toHaveLength(TREND_WEEKS);
    expect(trend.weeks.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(trend.weeks.slice(5)).toEqual([101.3, 99.2, 99]);
    expect(trend.latest).toBe(99);
    expect(trend.record).toEqual({ day: '2026-10-19', value: 101.3, weightKg: 80, reps: 8, seconds: null });
  });

  test('Gegengewicht: weniger ist besser', () => {
    const sets = [
      set('s1', '2026-10-12', 'klimmzug', 40, 8),
      set('s2', '2026-10-19', 'klimmzug', 45, 8), // mehr Unterstützung → keine Bestleistung
      set('s3', '2026-10-26', 'klimmzug', 30, 6), // weniger → Bestleistung
      set('s3', '2026-10-26', 'klimmzug', 35, 8),
      set('s4', '2026-11-03', 'klimmzug', 30, 8), // gleich → keine
    ];
    const [trend] = exerciseTrends(sets, TODAY, () => 'unterstuetzt');
    expect(trend.metric).toBe('gegengewicht');
    expect(trend.weeks.slice(4)).toEqual([40, 45, 30, 30]);
    expect(trend.record).toMatchObject({ day: '2026-10-26', value: 30, reps: 6 });
    expect(betterTrend('gegengewicht', 25, 30)).toBe(true);
    expect(betterTrend('e1rm', 25, 30)).toBe(false);
  });

  test('Haltezeit, Volumen und Wiederholungen als Ersatz, ohne Bestleistung beim ersten Mal', () => {
    const plank = exerciseTrends([set('p1', '2026-11-02', 'plank', null, null, { seconds: 45 })], TODAY)[0];
    expect(plank).toMatchObject({ metric: 'zeit', latest: 45, record: null });
    const high = exerciseTrends(
      [set('h1', '2026-10-26', 'curl', 10, 15), set('h2', '2026-11-02', 'curl', 10, 20), set('h2', '2026-11-02', 'curl', 10, 20)],
      TODAY,
      () => 'einseitig'
    )[0];
    // einseitig: Volumen zählt beide Seiten (2 Sätze × 10 kg × 20 × 2)
    expect(high).toMatchObject({ metric: 'volumen', latest: 800, record: { day: '2026-11-02', value: 800 } });
    const dips = exerciseTrends([set('d1', '2026-10-26', 'dips', 0, 10), set('d2', '2026-11-02', 'dips', 0, 12)], TODAY, () => 'zusatzgewicht')[0];
    expect(dips).toMatchObject({ metric: 'wdh', latest: 12, record: { value: 12, reps: 12 } });
  });

  test('Sätze nach heute zählen nicht, ohne Sätze im Fenster keine Übung', () => {
    expect(exerciseTrends([set('x', '2026-11-05', 'bank', 80, 5)], TODAY)).toEqual([]);
    expect(exerciseTrends([set('x', '2026-08-01', 'bank', 80, 5)], TODAY)).toEqual([]);
  });
});
