// Phase 9: Allergien/Essenszeiten (COACH-007/-009), Essen in eigenen Worten (FOOD-014), Check-in (COACH-006/-008/-010),
// Übungsbilder (MEDIA-013).

import { describe, expect, test } from '@jest/globals';

import { EXERCISE_MEDIA } from '@/media/exercise-media';

import { checkinDue, weekDays, weeklyCheckin, type CheckinInput } from '../checkin';
import { allergensFromOff, combineFacts, dietCheck, dietFromOff, needsAttention, suggestMealAt } from '../diet';
import { HIIT_EXERCISES, MORE_STRENGTH_EXERCISES, STARTER_EXERCISES, STRETCH_EXERCISES } from '../exercises';
import { guessDrinkType, isPlainWater, matchScore, parseFoodText, resolveAmount } from '../food-text';
import { validateMedia, type MediaEntry } from '../media';

describe('Allergien und Ernährungsweise (COACH-009)', () => {
  test('Tags aus Open Food Facts; fehlende Liste = unbekannt', () => {
    expect(allergensFromOff(['en:milk', 'en:nuts', 'en:milk'])).toEqual(['milch', 'schalenfruechte']);
    expect(allergensFromOff([])).toEqual([]);
    expect(allergensFromOff(undefined)).toBeNull();
    expect(dietFromOff(['en:vegan'])).toBe('vegan');
    expect(dietFromOff(['en:maybe-vegan'])).toBeNull();
  });
  const prefs = { allergies: ['milch' as const], diet: 'vegan' as const };
  test('enthält, Spuren, Konflikt mit Ernährungsweise', () => {
    const check = dietCheck({ allergens: ['milch'], traces: ['milch', 'gluten'], diet: 'vegetarisch' }, prefs);
    expect(check).toEqual({ contains: ['milch'], traces: [], unknown: false, dietConflict: 'ja' });
    expect(needsAttention(check)).toBe(true);
  });
  test('keine Angaben → unbekannt, nie „allergenfrei“', () => {
    expect(dietCheck({ allergens: null, traces: null, diet: null }, prefs)).toEqual({
      contains: [],
      traces: [],
      unknown: true,
      dietConflict: 'unbekannt',
    });
  });
  test('Rezept/Vorlage: Allergene vereinigt, strengste Ernährungsweise, Unbekanntes bleibt unbekannt', () => {
    expect(
      combineFacts([
        { allergens: ['gluten'], traces: [], diet: 'vegan' },
        { allergens: ['milch'], traces: null, diet: 'vegetarisch' },
      ])
    ).toEqual({ allergens: ['gluten', 'milch'], traces: null, diet: 'vegetarisch' });
    expect(combineFacts([{ allergens: null, traces: null, diet: null }, { allergens: [], traces: [], diet: 'vegan' }])).toEqual({
      allergens: null,
      traces: null,
      diet: null,
    });
    expect(combineFacts([{ allergens: null, traces: null, diet: null }, { allergens: [], traces: [], diet: 'nicht_vegetarisch' }]).diet).toBe('nicht_vegetarisch');
  });
  test('ohne eigene Allergien keine Hinweise', () =>
    expect(needsAttention(dietCheck({ allergens: ['milch'], traces: null, diet: null }, { allergies: [], diet: 'alles' }))).toBe(false));
});

describe('Essenszeiten (COACH-007)', () => {
  const times = { fruehstueck: 9, mittag: 14, abend: 20 };
  test('Mahlzeit nach eigenen Zeiten, sonst Snack', () => {
    expect(suggestMealAt(10, times)).toBe('fruehstueck');
    expect(suggestMealAt(15, times)).toBe('mittag');
    expect(suggestMealAt(17, times)).toBe('snack');
    expect(suggestMealAt(22, times)).toBe('abend');
  });
  test('ausgelassene Mahlzeit wird nicht vorgeschlagen', () =>
    expect(suggestMealAt(9, { ...times, fruehstueck: null })).toBe('snack'));
});

describe('Essen in eigenen Worten (FOOD-014)', () => {
  test('Beispiel „2 Scheiben Brot mit Nutella, 1 Banane, 300 ml Milch“', () =>
    expect(parseFoodText('2 Scheiben Brot mit Nutella, 1 Banane, 300 ml Milch')).toEqual([
      { raw: '2 Scheiben Brot', name: 'brot', amount: 2, unit: 'scheibe' },
      { raw: 'Nutella', name: 'nutella', amount: null, unit: null },
      { raw: '1 Banane', name: 'banane', amount: 1, unit: null },
      { raw: '300 ml Milch', name: 'milch', amount: 300, unit: 'ml' },
    ]));
  test('Zahlwörter, Komma-Zahlen, zusammengeschrieben, kg/l', () => {
    const items = parseFoodText('eine Banane und 1,5 l Wasser; 200g Reis + 0,2 kg Hähnchen');
    expect(items.map((i) => [i.name, i.amount, i.unit])).toEqual([
      ['banane', 1, null],
      ['wasser', 1500, 'ml'],
      ['reis', 200, 'g'],
      ['haehnchen', 200, 'g'],
    ]);
  });
  test('Menge nur, wenn sicher umrechenbar', () => {
    const brot = { basis: 'g' as const, servingAmount: 40 };
    expect(resolveAmount({ amount: 2, unit: 'scheibe' }, brot)).toBe(80);
    expect(resolveAmount({ amount: 150, unit: 'g' }, brot)).toBe(150);
    expect(resolveAmount({ amount: 2, unit: 'el' }, brot)).toBeNull();
    expect(resolveAmount({ amount: 300, unit: 'ml' }, brot)).toBeNull();
    expect(resolveAmount({ amount: 2, unit: 'scheibe' }, { basis: 'g', servingAmount: null })).toBeNull();
  });
  test('Trefferqualität', () => {
    expect(matchScore('brot', 'Brot')).toBe(3);
    expect(matchScore('nutella', 'Nutella Nuss-Nougat-Creme')).toBe(2);
    expect(matchScore('haferflocken', 'Kernige Haferflocken')).toBe(1);
    expect(matchScore('banane', 'Brot')).toBe(0);
  });
  test('Getränke erkennen (zählen in der Trinkübersicht, TIME-005) und reines Wasser', () => {
    expect(guessDrinkType('Vollmilch 3,5 %')).toBe('milch');
    expect(guessDrinkType('Apfelschorle')).toBe('saft');
    expect(guessDrinkType('Cola Zero')).toBe('softdrink');
    expect(guessDrinkType('Haferdrink')).toBe('sonstiges');
    expect(isPlainWater('Wasser')).toBe(true);
    expect(isPlainWater('Mineralwasser')).toBe(true);
    expect(isPlainWater('Wassermelone')).toBe(false);
  });
  test('Text ohne Essen ergibt nichts', () => expect(parseFoodText(' , und ')).toEqual([]));
});

const days = (end: string, kcal: number, goal: number | null = 2000) =>
  weekDays(end).map((day) => ({ day, kcal, entries: 3, unknownKcal: 0, goal }));
const weights = (from: string, kgs: number[]) =>
  kgs.map((kg, i) => ({ day: new Date(Date.parse(`${from}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), kg }));

function input(over: Partial<CheckinInput> = {}): CheckinInput {
  return {
    weekEnd: '2026-10-29',
    // 14 Tage, Woche 1 ≈ 80 kg, Woche 2 ≈ 80 kg (kein Fortschritt)
    weights: weights('2026-10-16', Array(14).fill(80)),
    days: days('2026-10-29', 1950),
    workouts: 3,
    plannedPerWeek: 3,
    stepsAvg: 8000,
    sleepHours: [7, 7.5, 8],
    direction: 'abnehmen',
    sensitive: false,
    hideNumbers: false,
    heightCm: 180,
    currentGoal: 2000,
    ...over,
  };
}

describe('Wochen-Check-in (COACH-008)', () => {
  test('Abnehmen ohne Fortschritt → −100 kcal, nur Vorschlag', () =>
    expect(weeklyCheckin(input()).suggestion).toEqual({ kind: 'kcal', from: 2000, to: 1900, reason: 'keinFortschritt' }));
  test('zu schneller Verlust (> 1 %/Woche) → +100', () =>
    expect(weeklyCheckin(input({ weights: [...weights('2026-10-16', Array(7).fill(82)), ...weights('2026-10-23', Array(7).fill(80.9))] })).suggestion).toEqual(
      { kind: 'kcal', from: 2000, to: 2100, reason: 'zuSchnell' }
    ));
  test('Fortschritt im Rahmen → keine Änderung', () =>
    expect(weeklyCheckin(input({ weights: [...weights('2026-10-16', Array(7).fill(80.5)), ...weights('2026-10-23', Array(7).fill(80))] })).suggestion).toEqual({
      kind: 'passt',
    }));
  test('deutlich über dem Ziel gegessen → erst Ziel einhalten, nicht senken', () =>
    expect(weeklyCheckin(input({ days: days('2026-10-29', 2300) })).suggestion).toEqual({ kind: 'zielEinhalten', over: 300 }));
  test('zu wenige Daten → sagt, was fehlt', () => {
    const r = weeklyCheckin(input({ weights: weights('2026-10-26', [80, 80]), days: days('2026-10-29', 1900).map((d, i) => (i < 3 ? d : { ...d, entries: 0, kcal: null })) }));
    expect(r.suggestion).toEqual({ kind: 'mehrDaten', missing: ['gewicht', 'essen'] });
    expect(r.summary.completeDays).toBe(3);
  });
  test('unvollständige Tage zählen nicht in den Schnitt (TRACK-002)', () => {
    const r = weeklyCheckin(input({ days: days('2026-10-29', 2000).map((d, i) => (i === 0 ? { ...d, kcal: 500, unknownKcal: 2 } : d)) }));
    expect(r.summary.kcalAvg).toBe(2000);
    expect(r.summary.incompleteDays).toBe(1);
  });
  test('Modus „ohne Zahlen“ → keine Kalorienvorschläge (TRACK-006)', () =>
    expect(weeklyCheckin(input({ hideNumbers: true })).suggestion).toEqual({ kind: 'ohneZahlen' }));
  test('sensible Situation → nie Kalorienvorschläge (COACH-010)', () =>
    expect(weeklyCheckin(input({ sensitive: true })).suggestion).toEqual({ kind: 'sensibel' }));
  test('Untergrenze 1200 und kein Senken bei Untergewicht (GOAL-007)', () => {
    expect(weeklyCheckin(input({ currentGoal: 1250 })).suggestion).toMatchObject({ kind: 'kcal', to: 1200 });
    expect(weeklyCheckin(input({ currentGoal: 1200 })).suggestion).toEqual({ kind: 'passt' });
    expect(weeklyCheckin(input({ heightCm: 210 })).suggestion).toEqual({ kind: 'passt' }); // 80 kg bei 2,10 m: BMI < 18,5
  });
  test('Zunehmen und Halten', () => {
    expect(weeklyCheckin(input({ direction: 'zunehmen' })).suggestion).toMatchObject({ kind: 'kcal', to: 2100 });
    const up = [...weights('2026-10-16', Array(7).fill(79)), ...weights('2026-10-23', Array(7).fill(80))];
    expect(weeklyCheckin(input({ direction: 'halten', weights: up })).suggestion).toMatchObject({ kind: 'kcal', to: 1900, reason: 'abweichung' });
  });
  test('Schlaf nur als Hinweis, ändert keine Kalorien (COACH-006)', () => {
    const short = weeklyCheckin(input({ sleepHours: [5, 5.5, 5], direction: 'halten' }));
    expect(short.hints).toContain('schlafKurz');
    expect(short.suggestion).toEqual({ kind: 'passt' });
  });
  test('Eiweiß/Ballaststoffe deutlich unter Ziel → Hinweis, keine Kalorienänderung (C9)', () => {
    const low = days('2026-10-29', 1950).map((d) => ({ ...d, protein: 80, goalProtein: 130, fiber: 15, goalFiber: 30 }));
    const r = weeklyCheckin(input({ days: low }));
    expect(r.hints).toEqual(expect.arrayContaining(['eiweissWenig', 'ballaststoffeWenig']));
    expect(r.summary).toMatchObject({ proteinAvg: 80, proteinGoal: 130, fiberAvg: 15, fiberGoal: 30 });
    expect(weeklyCheckin(input({ days: low, hideNumbers: true })).hints).not.toContain('eiweissWenig');
  });
  test('weniger trainiert als geplant → Hinweis', () =>
    expect(weeklyCheckin(input({ workouts: 1 })).hints).toContain('trainingWeniger'));
  test('fällig nach 7 Tagen', () => {
    expect(checkinDue(null, '2026-10-30')).toBe(true);
    expect(checkinDue('2026-10-25', '2026-10-30')).toBe(false);
    expect(checkinDue('2026-10-23', '2026-10-30')).toBe(true);
  });
});

describe('Übungsbilder (MEDIA-013)', () => {
  const ids = new Set([...STARTER_EXERCISES, ...MORE_STRENGTH_EXERCISES, ...HIIT_EXERCISES, ...STRETCH_EXERCISES].map((e) => e.id));
  test('Verzeichnis in der App ist gültig (jedes Bild mit Herkunft)', () => expect(validateMedia(EXERCISE_MEDIA, ids)).toEqual([]));
  test('fehlende Herkunft, unbekannte Übung, Datum, doppelt werden erkannt', () => {
    const ok: MediaEntry = { exerciseId: 'kniebeuge', source: 1, kind: 'bild', author: 'Luc', license: 'eigenes Werk', origin: 'Foto', checkedAt: '2026-11-15', movementReviewed: false };
    expect(validateMedia([ok], ids)).toEqual([]);
    expect(validateMedia([{ ...ok, author: ' ' }, { ...ok, exerciseId: 'gibtsnicht', checkedAt: '15.11.' }, ok], ids).map((p) => p.problem)).toEqual([
      'herkunftFehlt',
      'unbekannteUebung',
      'datum',
      'doppelt',
    ]);
  });
});
