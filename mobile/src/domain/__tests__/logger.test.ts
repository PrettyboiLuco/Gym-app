import { describe, expect, test } from '@jest/globals';

import { bestOneRepMax, estimateOneRepMax, loadModeOf, platesPerSide, setLabels, setOrder, setVolume, supersetLetters, warmupSets } from '../logger';
import { progressionAdvice } from '../progression';
import { findRecords, summarize } from '../summary';
import { estimateDayMinutes } from '../training';

describe('Logger-Paket (A1)', () => {
  test('Satz-Kürzel: Aufwärmen A, Drop D, Versagen mit V, Arbeitssätze fortlaufend', () => {
    expect(setLabels(['aufwaermen', 'aufwaermen', 'arbeit', 'arbeit', 'versagen', 'drop'])).toEqual(['A', 'A', '1', '2', '3V', 'D']);
  });

  test('Gewichtsart aus der Übung', () => {
    const base = { equipment: 'kurzhantel' as const, kind: 'kraft' as const, sides: 'beidseitig' as const };
    expect(loadModeOf({ ...base, id: 'x' })).toBe('normal');
    expect(loadModeOf({ ...base, id: 'rudern_kh_einarmig', sides: 'einseitig' })).toBe('einseitig');
    expect(loadModeOf({ ...base, id: 'dips_maschine', equipment: 'maschine' })).toBe('unterstuetzt');
    expect(loadModeOf({ ...base, id: 'dips', equipment: 'koerpergewicht' })).toBe('zusatzgewicht');
    expect(loadModeOf({ ...base, id: 'dehnen', kind: 'dehnung_statisch', sides: 'einseitig' })).toBe('normal');
    expect(loadModeOf({ ...base, id: 'x', loadMode: 'einseitig' })).toBe('einseitig');
  });

  test('Volumen: einseitig doppelt, Gegengewicht zählt nicht', () => {
    expect(setVolume(20, 10, 'normal')).toBe(200);
    expect(setVolume(20, 10, 'einseitig')).toBe(400);
    expect(setVolume(20, 10, 'unterstuetzt')).toBe(0);
  });

  test('geschätztes 1RM nach Epley, nur bis 12 Wiederholungen', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 10)).toBe(133.3);
    expect(estimateOneRepMax(100, 13)).toBeNull();
    expect(
      bestOneRepMax(
        [
          { weightKg: 60, reps: 8, setType: 'aufwaermen' },
          { weightKg: 80, reps: 5, setType: 'arbeit' },
        ],
        'normal'
      )
    ).toBe(93.3);
    expect(bestOneRepMax([{ weightKg: 30, reps: 8 }], 'unterstuetzt')).toBeNull();
  });

  test('Scheibenrechner', () => {
    const setup = { barKg: 20, platesKg: [25, 20, 15, 10, 5, 2.5, 1.25] };
    expect(platesPerSide(102.5, setup)).toEqual({ plates: [25, 15, 1.25], rest: 0 });
    expect(platesPerSide(20, setup)).toEqual({ plates: [], rest: 0 });
    expect(platesPerSide(15, setup)).toBeNull();
    // 61 kg lässt sich nicht genau legen: 2 × 20,5 → 20 je Seite, 1 kg fehlt.
    expect(platesPerSide(61, setup)).toEqual({ plates: [20], rest: 1 });
  });

  test('Aufwärmsätze aus dem Arbeitsgewicht', () => {
    expect(warmupSets(100, 2.5, 'kg')).toEqual([
      { weight: 50, reps: 8 },
      { weight: 70, reps: 5 },
      { weight: 85, reps: 3 },
    ]);
    expect(warmupSets(30, 2.5, 'kg')).toEqual([
      { weight: 15, reps: 8 },
      { weight: 22.5, reps: 4 },
    ]);
    expect(warmupSets(15, 2.5, 'kg')).toEqual([]);
  });

  test('Supersatz-Reihenfolge: im Wechsel, Pause erst nach der Runde', () => {
    const order = setOrder([
      { exerciseId: 'a', sets: 2, restSeconds: 90, superset: null },
      { exerciseId: 'b', sets: 3, restSeconds: 60, superset: 1 },
      { exerciseId: 'c', sets: 2, restSeconds: 75, superset: 1 },
    ]);
    expect(order.map((o) => [o.itemIndex, o.restSeconds])).toEqual([
      [0, 90],
      [0, 90],
      [1, 0],
      [2, 75],
      [1, 0],
      [2, 75],
      [1, 60],
    ]);
    expect(supersetLetters([null, 3, 3, 7])).toEqual(
      new Map([
        [3, 'A'],
        [7, 'B'],
      ])
    );
  });

  test('Zusammenfassung und Bestleistungen ohne Aufwärmsätze, Gegengewicht: weniger ist besser', () => {
    const sets = [
      { exerciseId: 'bank', weightKg: 60, reps: 8, seconds: null, setType: 'aufwaermen' as const },
      { exerciseId: 'bank', weightKg: 80, reps: 8, seconds: null, setType: 'arbeit' as const },
      { exerciseId: 'dips', weightKg: 20, reps: 8, seconds: null },
    ];
    const modeOf = (id: string) => (id === 'dips' ? ('unterstuetzt' as const) : ('normal' as const));
    expect(summarize(sets, '2026-11-01T10:00:00Z', '2026-11-01T11:00:00Z', modeOf)).toMatchObject({ sets: 2, volumeKg: 640 });
    const records = findRecords(
      sets,
      [
        { exerciseId: 'bank', maxKg: 75, repsAtMaxKg: 8, maxReps: 8, maxSeconds: null },
        { exerciseId: 'dips', maxKg: 30, minKg: 25, repsAtMaxKg: 8, maxReps: 8, maxSeconds: null },
      ],
      modeOf
    );
    expect(records).toEqual([
      { exerciseId: 'bank', kind: 'gewicht', weightKg: 80, reps: 8, previousKg: 75 },
      { exerciseId: 'dips', kind: 'weniger', weightKg: 20, reps: 8, previousKg: 25 },
    ]);
  });

  test('Steigerung bei Gegengewicht: weniger Unterstützung statt mehr Gewicht', () => {
    const history = [
      {
        daysAgo: 3,
        sets: [
          { weightKg: 30, reps: 12, seconds: null },
          { weightKg: 30, reps: 12, seconds: null },
        ],
      },
    ];
    const target = { sets: 2, repsMin: 8, repsMax: 12, seconds: null };
    expect(progressionAdvice(history, target, 'maschine', 'kg')).toMatchObject({ kind: 'mehrGewicht', weightKg: 32.5 });
    expect(progressionAdvice(history, target, 'maschine', 'kg', 'unterstuetzt')).toMatchObject({ kind: 'mehrGewicht', weightKg: 27.5 });
  });

  test('Steigerungsregel v2 nutzt RIR, ist aber standardmäßig aus', () => {
    const easy = [
      {
        daysAgo: 3,
        sets: [
          { weightKg: 80, reps: 9, seconds: null, rir: 3 },
          { weightKg: 80, reps: 9, seconds: null, rir: 4 },
        ],
      },
    ];
    const target = { sets: 2, repsMin: 8, repsMax: 12, seconds: null };
    expect(progressionAdvice(easy, target, 'langhantel', 'kg')).toMatchObject({ kind: 'mehrWdh' });
    expect(progressionAdvice(easy, target, 'langhantel', 'kg', 'normal', 2)).toMatchObject({ kind: 'mehrGewicht', weightKg: 82.5 });
    const limit = [
      {
        daysAgo: 3,
        sets: [
          { weightKg: 80, reps: 8, seconds: null, rir: 1 },
          { weightKg: 80, reps: 7, seconds: null, rir: 0 },
        ],
      },
    ];
    expect(progressionAdvice(limit, target, 'langhantel', 'kg', 'normal', 2)).toMatchObject({ kind: 'halten', weightKg: 80 });
  });

  test('Dauer: im Supersatz keine Pause zwischen den Übungen einer Runde', () => {
    const single = [
      { sets: 3, restSeconds: 90, targetSeconds: null },
      { sets: 3, restSeconds: 90, targetSeconds: null },
    ];
    const paired = single.map((i) => ({ ...i, superset: 1 }));
    // Ohne Supersatz: 6 × 45 s + 2 × 2 × 90 s + 2 × 60 s = 750 s ≈ 13 min; mit: 270 + 180 + 60 = 510 s ≈ 9 min.
    expect(estimateDayMinutes(single)).toBe(13);
    expect(estimateDayMinutes(paired)).toBe(9);
  });
});
