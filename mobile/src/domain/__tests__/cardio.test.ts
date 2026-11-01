import { describe, expect, test } from '@jest/globals';

import { elapsedMinutes, pace, parseCardioForm } from '../cardio';
import { validatePlan } from '../training';

const form = { minutes: '20', distance: '', avgHr: '', effort: null, level: '', note: '' };

describe('Cardio (A2)', () => {
  test('Eingaben prüfen: Minuten Pflicht, Strecke und Puls freiwillig', () => {
    expect(parseCardioForm(form).values).toMatchObject({ minutes: 20, distanceKm: null, avgHr: null });
    expect(parseCardioForm({ ...form, minutes: '22,5', distance: '3,25', avgHr: '140', effort: 6, level: ' 5 % ' }).values).toEqual({
      minutes: 22.5,
      distanceKm: 3.25,
      avgHr: 140,
      effort: 6,
      level: '5 %',
      note: null,
    });
    expect(parseCardioForm({ ...form, minutes: '' }).problems).toEqual(['minutes']);
    expect(parseCardioForm({ ...form, minutes: '601' }).problems).toEqual(['minutes']);
    expect(parseCardioForm({ ...form, distance: 'abc', avgHr: '300' }).problems).toEqual(['distance', 'hr']);
  });

  test('Tempo und Stoppuhr', () => {
    expect(pace(30, 5)).toEqual({ minPerKm: 6, kmh: 10 });
    expect(pace(30, null)).toBeNull();
    expect(elapsedMinutes('2026-11-01T10:00:00Z', Date.parse('2026-11-01T10:12:30Z'))).toBe(12.5);
  });

  test('Plantag: reiner Cardio-Tag erlaubt, Minuten 1–180', () => {
    const day = (cardio: { activity: 'laufband'; minutes: number }[]) => ({ name: 'P', days: [{ name: 'Cardio', items: [], cardio }] });
    expect(validatePlan(day([{ activity: 'laufband', minutes: 30 }]))).toEqual([]);
    expect(validatePlan(day([]))).toContain('dayEmpty');
    expect(validatePlan(day([{ activity: 'laufband', minutes: 0 }]))).toContain('invalidCardio');
    expect(validatePlan(day([{ activity: 'laufband', minutes: 181 }]))).toContain('invalidCardio');
  });
});
