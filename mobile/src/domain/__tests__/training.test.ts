import { describe, expect, test } from '@jest/globals';

import {
  estimateDayMinutes,
  extendRest,
  formatClock,
  intervalState,
  intervalTotalSeconds,
  moveItem,
  nextDayIndex,
  parseSetInput,
  isRestVisible,
  restRemainingMs,
  startRest,
  stopRest,
  validatePlan,
  type PlanDraft,
} from '../training';

const valid: PlanDraft = {
  name: 'Ganzkörper',
  days: [{ name: 'A', items: [{ exerciseId: 'kniebeuge', sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120 }] }],
};

describe('Plan prüfen', () => {
  test('gültiger Plan hat keine Probleme', () => expect(validatePlan(valid)).toEqual([]));
  test('fehlender Name, leerer Tag', () =>
    expect(validatePlan({ name: ' ', days: [{ name: 'A', items: [] }] })).toEqual(['nameMissing', 'dayEmpty']));
  test('kein Tag', () => expect(validatePlan({ name: 'X', days: [] })).toEqual(['noDays']));
  test.each([2, 3, 4, 5, 6])('%i Trainingstage sind gültig (TRAIN-004)', (count) =>
    expect(validatePlan({ ...valid, days: Array(count).fill(valid.days[0]) })).toEqual([]));
  test('mehr als 7 Tage', () =>
    expect(validatePlan({ ...valid, days: Array(8).fill(valid.days[0]) })).toContain('tooManyDays'));
  test('Wiederholungsbereich verkehrt herum', () =>
    expect(
      validatePlan({ ...valid, days: [{ name: 'A', items: [{ ...valid.days[0].items[0], repsMin: 12, repsMax: 8 }] }] })
    ).toEqual(['invalidReps']));
  test('0 Sätze und Pause über 30 Minuten', () =>
    expect(
      validatePlan({
        ...valid,
        days: [{ name: 'A', items: [{ ...valid.days[0].items[0], sets: 0, restSeconds: 2000 }] }],
      })
    ).toEqual(['invalidSets', 'invalidRest']));
});

describe('Reihenfolge', () => {
  test('nach oben und unten verschieben', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });
  test('ungültige Position ändert nichts', () => expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']));
});

describe('Satz-Eingabe', () => {
  test('Komma-Gewicht und Wiederholungen', () =>
    expect(parseSetInput('62,5', '8')).toEqual({ weightKg: 62.5, reps: 8 }));
  test('Körpergewicht 0 kg erlaubt', () => expect(parseSetInput('0', '12')).toEqual({ weightKg: 0, reps: 12 }));
  test('ungültige Eingaben', () => {
    expect(parseSetInput('', '8')).toBeNull();
    expect(parseSetInput('60', '0')).toBeNull();
    expect(parseSetInput('60', 'acht')).toBeNull();
    expect(parseSetInput('-5', '8')).toBeNull();
    expect(parseSetInput('1200', '8')).toBeNull();
  });
});

describe('Dauer und nächster Tag', () => {
  test('3 Sätze, 120 s Pause ≈ 7 min', () =>
    // 3×45 + 2×120 + 60 = 435 s
    expect(estimateDayMinutes([{ sets: 3, restSeconds: 120 }])).toBe(7));
  test('erster Tag ohne bisheriges Training', () => expect(nextDayIndex(3, null)).toBe(0));
  test('nach dem letzten Tag beginnt der Plan von vorn', () => expect(nextDayIndex(3, 2)).toBe(0));
  test('Tag nach dem zuletzt absolvierten', () => expect(nextDayIndex(4, 1)).toBe(2));
});

describe('Pausentimer', () => {
  test('Start: Restzeit aus Endzeit', () => {
    const timer = startRest(null, 90, 1_000);
    expect(restRemainingMs(timer, 31_000)).toBe(60_000);
    expect(timer?.generation).toBe(1);
  });
  test('Verlängern um 30 s erhöht Generation', () => {
    const timer = extendRest(startRest(null, 90, 0), 30, 10_000);
    expect(restRemainingMs(timer, 10_000)).toBe(110_000);
    expect(timer?.generation).toBe(2);
  });
  test('Verlängern nach Ablauf zählt ab jetzt', () =>
    expect(restRemainingMs(extendRest(startRest(null, 30, 0), 30, 100_000), 100_000)).toBe(30_000));
  test('abgelaufen bleibt bei 0', () => expect(restRemainingMs(startRest(null, 30, 0), 60_000)).toBe(0));
  test('kein Timer ergibt 0', () => expect(restRemainingMs(null, 0)).toBe(0));
  test('nach Überspringen bekommt der nächste Timer eine neue Generation (Vibrationsfehler)', () => {
    const first = startRest(null, 90, 0);
    const skipped = stopRest(first);
    expect(isRestVisible(skipped)).toBe(false);
    expect(restRemainingMs(skipped, 0)).toBe(0);
    const next = startRest(skipped, 90, 1000);
    expect(next?.generation).toBe(2);
    expect(isRestVisible(next)).toBe(true);
  });
  test('Pause 0 s startet keinen sichtbaren Timer', () => expect(isRestVisible(startRest(null, 0, 0))).toBe(false));
  test('+30 s nach Überspringen startet eine neue 30-s-Pause', () =>
    expect(restRemainingMs(extendRest(stopRest(startRest(null, 90, 0)), 30, 5000), 5000)).toBe(30_000));
});

describe('Intervall-Timer (HIIT)', () => {
  const config = { workSeconds: 40, restSeconds: 20, rounds: 3 };
  test('Gesamtdauer ohne Pause nach letzter Runde', () => expect(intervalTotalSeconds(config)).toBe(160));
  test('Start: Arbeit Runde 1', () =>
    expect(intervalState(config, 0)).toEqual({ phase: 'arbeit', round: 1, remainingMs: 40_000 }));
  test('nach 45 s: Pause Runde 1', () =>
    expect(intervalState(config, 45_000)).toEqual({ phase: 'pause', round: 1, remainingMs: 15_000 }));
  test('nach 60 s: Arbeit Runde 2', () =>
    expect(intervalState(config, 60_000)).toEqual({ phase: 'arbeit', round: 2, remainingMs: 40_000 }));
  test('nach 160 s: fertig', () => expect(intervalState(config, 160_000).phase).toBe('fertig'));
  test('ohne Pause folgt Runde auf Runde', () =>
    expect(intervalState({ workSeconds: 30, restSeconds: 0, rounds: 2 }, 30_000)).toEqual({
      phase: 'arbeit',
      round: 2,
      remainingMs: 30_000,
    }));
  test('ungültige Einstellung abgelehnt', () =>
    expect(() => intervalState({ workSeconds: 0, restSeconds: 10, rounds: 3 }, 0)).toThrow());
  test('Uhrzeitformat', () => {
    expect(formatClock(90_000)).toBe('1:30');
    expect(formatClock(4_100)).toBe('0:05');
  });
});
