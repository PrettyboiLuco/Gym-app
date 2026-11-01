import { describe, expect, test } from '@jest/globals';

import { findRecords, summarize, trainedDays, type DoneSet } from '../summary';

const set = (exerciseId: string, weightKg: number | null, reps: number | null, seconds: number | null = null): DoneSet => ({
  exerciseId,
  weightKg,
  reps,
  seconds,
});

describe('Zusammenfassung nach dem Training', () => {
  test('Sätze, Übungen, Volumen und Dauer', () => {
    const s = summarize([set('a', 60, 10), set('a', 60, 8), set('b', 0, 12)], '2026-10-31T10:00:00Z', '2026-10-31T10:52:20Z');
    expect(s).toEqual({ sets: 3, exercises: 2, volumeKg: 1080, minutes: 52 });
  });
  test('ohne Ende keine Dauer', () => {
    expect(summarize([], '2026-10-31T10:00:00Z', null).minutes).toBeNull();
  });
});

describe('Bestleistungen', () => {
  test('mehr Gewicht als bisher', () => {
    const r = findRecords([set('a', 80, 5), set('a', 75, 8)], [{ exerciseId: 'a', maxKg: 77.5, repsAtMaxKg: 5, maxReps: 8, maxSeconds: null }]);
    expect(r).toEqual([{ exerciseId: 'a', kind: 'gewicht', weightKg: 80, reps: 5, previousKg: 77.5 }]);
  });
  test('gleiches Höchstgewicht, mehr Wiederholungen', () => {
    const r = findRecords([set('a', 80, 6)], [{ exerciseId: 'a', maxKg: 80, repsAtMaxKg: 5, maxReps: 8, maxSeconds: null }]);
    expect(r[0]).toMatchObject({ kind: 'wiederholungen', reps: 6, previousReps: 5 });
  });
  test('kein Rekord beim ersten Mal und bei weniger', () => {
    expect(findRecords([set('a', 80, 5)], [])).toEqual([]);
    expect(findRecords([set('a', 70, 5)], [{ exerciseId: 'a', maxKg: 80, repsAtMaxKg: 5, maxReps: 5, maxSeconds: null }])).toEqual([]);
  });
  test('Körpergewicht und Zeit', () => {
    expect(findRecords([set('k', 0, 15)], [{ exerciseId: 'k', maxKg: 0, repsAtMaxKg: 12, maxReps: 12, maxSeconds: null }])[0]).toMatchObject({
      kind: 'wiederholungen',
      reps: 15,
    });
    expect(findRecords([set('p', 0, null, 75)], [{ exerciseId: 'p', maxKg: 0, repsAtMaxKg: null, maxReps: null, maxSeconds: 60 }])[0]).toMatchObject({
      kind: 'zeit',
      seconds: 75,
      previousSeconds: 60,
    });
  });
});

describe('Trainingswoche', () => {
  test('Tage Mo–So', () => {
    expect(trainedDays(['2026-10-26', '2026-10-28', '2026-11-02', '2026-10-25'], '2026-10-26')).toEqual([true, false, true, false, false, false, false]);
  });
});
