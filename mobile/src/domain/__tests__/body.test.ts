// Phase 4: Einheiten, Profil, Kalorienrechner, Ziele, Gewichtsverlauf.

import { describe, expect, test } from '@jest/globals';

import { comparePair, latestBySite } from '../body';
import { bmi, calculate, CALORIE_FLOOR, proteinRange, underweightLimitKg, type CalculatorInput } from '../energy';
import { EMPTY_GOAL_FORM, habitWeeks, parseGoalForm, strengthProgress, weekStart, weightProgress } from '../goals';
import { ageOn, EMPTY_PROFILE, parseBirthMonth, parseProfileForm, profileToForm } from '../profile';
import { parseSetInput } from '../training';
import { BODY_WEIGHT_RANGE, kgToUnit, parseLengthIn, parseWeightIn, unitToKg, weightInputText } from '../units';
import { dailyMeans, weeklyChange } from '../weight';

describe('Einheiten (UX-003)', () => {
  test('1 lb = 0,45359237 kg', () => expect(unitToKg(1, 'lb')).toBeCloseTo(0.45359237, 8));
  test('hin und zurück bleibt gleich', () => expect(kgToUnit(unitToKg(225, 'lb'), 'lb')).toBeCloseTo(225, 10));
  test('Körpergewicht in lb wird als kg gespeichert', () =>
    expect(parseWeightIn('176,4', 'lb', BODY_WEIGHT_RANGE)).toBeCloseTo(80.01, 2));
  test('Grenzen gelten in kg, auch bei lb', () => {
    expect(parseWeightIn('30', 'lb', BODY_WEIGHT_RANGE)).toBeNull();
    expect(parseWeightIn('44', 'lb', BODY_WEIGHT_RANGE)).not.toBeNull();
  });
  test('Größe in Zoll', () => expect(parseLengthIn('70', 'in', { min: 100, max: 250 })).toBeCloseTo(177.8));
  test('Eingabetext in lb', () => expect(weightInputText(100, 'lb')).toBe('220,46'));
  test('Satz in lb wird in kg gespeichert', () =>
    expect(parseSetInput('135', '5', 'lb')?.weightKg).toBeCloseTo(61.235, 3));
  test('Satz in kg unverändert', () => expect(parseSetInput('62,5', '8')).toEqual({ weightKg: 62.5, reps: 8 }));
});

describe('Profil (COACH-001)', () => {
  test('Alter in vollen Jahren', () => {
    expect(ageOn('1996-03', '2026-10-29')).toBe(30);
    expect(ageOn('1996-11', '2026-10-29')).toBe(29);
  });
  test('Geburtsmonat lesen', () => {
    expect(parseBirthMonth('03.1996', '2026-10-29')).toBe('1996-03');
    expect(parseBirthMonth('3/1996', '2026-10-29')).toBe('1996-03');
  });
  test('ungültige Geburtsmonate', () => {
    expect(parseBirthMonth('13.1996', '2026-10-29')).toBeNull();
    expect(parseBirthMonth('12.2026', '2026-10-29')).toBeNull();
    expect(parseBirthMonth('01.1890', '2026-10-29')).toBeNull();
    expect(parseBirthMonth('1996', '2026-10-29')).toBeNull();
  });
  test('alles leer ist erlaubt (freiwillig)', () => {
    const { profile } = parseProfileForm(profileToForm(EMPTY_PROFILE), EMPTY_PROFILE, '2026-10-29');
    expect(profile?.heightCm).toBeNull();
    expect(profile?.birthMonth).toBeNull();
  });
  test('unter 18 widerspricht dem Start nur für Erwachsene', () => {
    const form = { ...profileToForm(EMPTY_PROFILE), birth: '01.2010' };
    expect(parseProfileForm(form, EMPTY_PROFILE, '2026-10-29').problems).toEqual(['minor']);
  });
  test('Größe außerhalb des Bereichs', () => {
    const form = { ...profileToForm(EMPTY_PROFILE), height: '20' };
    expect(parseProfileForm(form, EMPTY_PROFILE, '2026-10-29').problems).toEqual(['height']);
  });
  test('Größe in Zoll wird in cm gespeichert', () => {
    const form = { ...profileToForm(EMPTY_PROFILE), height: '70', units: { weight: 'lb' as const, length: 'in' as const } };
    expect(parseProfileForm(form, EMPTY_PROFILE, '2026-10-29').profile?.heightCm).toBeCloseTo(177.8);
  });
});

describe('Kalorienrechner (CALC-001–005)', () => {
  const base: CalculatorInput = {
    weightKg: 80,
    heightCm: 180,
    age: 30,
    term: '+5',
    activity: 'sitzend',
    sport: false,
    goal: 'halten',
    delta: 0,
    sensitive: false,
  };
  test('Ruheenergie 1780 × 1,45 = 2581 → 2580', () => {
    const r = calculate(base);
    expect(r.status).toBe('vorschlag');
    if (r.status !== 'vorschlag') return;
    expect(r.resting).toBe(1780);
    expect(r.estimate).toBeCloseTo(2581);
    expect(r.kcal).toBe(2580);
  });
  test('Sport erhöht nur den Faktor (+0,3), keine zweite Gutschrift', () => {
    const r = calculate({ ...base, sport: true });
    expect(r.status === 'vorschlag' && r.factor).toBeCloseTo(1.75);
  });
  test('abnehmen −500', () => {
    const r = calculate({ ...base, goal: 'abnehmen', delta: -500 });
    expect(r.status === 'vorschlag' && r.kcal).toBe(2080);
  });
  test('nicht erlaubter Abstand wird abgelehnt', () =>
    expect(() => calculate({ ...base, goal: 'abnehmen', delta: -1000 })).toThrow());
  test('fehlende Angaben werden genannt', () =>
    expect(calculate({ ...base, heightCm: null, activity: null })).toEqual({ status: 'fehlt', missing: ['height', 'activity'] }));
  test('außerhalb 19–78 Jahre keine Zahl (CALC-002)', () => {
    expect(calculate({ ...base, age: 18 }).status).toBe('alter');
    expect(calculate({ ...base, age: 79 }).status).toBe('alter');
  });
  test('sensible Situation: keine Zahl (COACH-010)', () =>
    expect(calculate({ ...base, sensitive: true }).status).toBe('sensibel'));
  test('Untergewicht + abnehmen: keine Zahl (GOAL-007)', () =>
    expect(calculate({ ...base, weightKg: 55, goal: 'abnehmen', delta: -250 }).status).toBe('untergewicht'));
  test('Untergewicht + zunehmen: Zahl mit Hinweis', () => {
    const r = calculate({ ...base, weightKg: 55, goal: 'zunehmen', delta: 250 });
    expect(r.status === 'vorschlag' && r.lowBmi).toBe(true);
  });
  test('unter der Untergrenze: keine Zahl (CALC-005)', () => {
    const small: CalculatorInput = { ...base, weightKg: 50, heightCm: 155, age: 70, term: '-161', goal: 'abnehmen', delta: -500 };
    expect(calculate(small).status).toBe('fachpruefung');
  });
  test('nie unter der geschätzten Ruheenergie', () => {
    const r = calculate({ ...base, goal: 'abnehmen', delta: -500 });
    expect(r.status === 'vorschlag' && r.kcal >= r.resting && r.kcal >= CALORIE_FLOOR).toBe(true);
  });
  test('Eiweiß als Bereich (COACH-005)', () => {
    expect(proteinRange(80, true)).toEqual({ min: 96, max: 160 });
    expect(proteinRange(80, false)).toEqual({ min: 64, max: 64 });
  });
  test('BMI und Grenze', () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 2);
    expect(underweightLimitKg(180)).toBeCloseTo(59.94, 2);
  });
});

describe('Ziele (GOAL-001–007)', () => {
  const ctx = { currentKg: 80, heightCm: 180, sensitive: false };
  const weightForm = { ...EMPTY_GOAL_FORM, kind: 'gewicht' as const };
  test('Abnehmen auf 75 kg', () =>
    expect(parseGoalForm({ ...weightForm, direction: 'abnehmen', targetWeight: '75' }, 'kg', ctx).draft).toEqual({
      kind: 'gewicht',
      direction: 'abnehmen',
      targetKg: 75,
    }));
  test('Ziel ins Untergewicht wird nicht unterstützt', () =>
    expect(parseGoalForm({ ...weightForm, direction: 'abnehmen', targetWeight: '55' }, 'kg', ctx).problems).toEqual(['underweight']));
  test('schon im Untergewicht: Abnehmen nicht unterstützt', () =>
    expect(parseGoalForm({ ...weightForm, direction: 'abnehmen' }, 'kg', { ...ctx, currentKg: 55 }).problems).toEqual(['underweight']));
  test('sensible Situation: kein Abnehmziel', () =>
    expect(parseGoalForm({ ...weightForm, direction: 'abnehmen' }, 'kg', { ...ctx, sensitive: true }).problems).toEqual(['sensitive']));
  test('Zielgewicht beim Abnehmen braucht die Größe', () =>
    expect(parseGoalForm({ ...weightForm, direction: 'abnehmen', targetWeight: '75' }, 'kg', { ...ctx, heightCm: null }).problems).toEqual([
      'heightNeeded',
    ]));
  test('Richtung und Zielgewicht passen nicht', () =>
    expect(parseGoalForm({ ...weightForm, direction: 'zunehmen', targetWeight: '75' }, 'kg', ctx).problems).toEqual(['direction']));
  test('Halten ignoriert ein Zielgewicht', () =>
    expect(parseGoalForm({ ...weightForm, direction: 'halten', targetWeight: '75' }, 'kg', ctx).draft).toEqual({
      kind: 'gewicht',
      direction: 'halten',
      targetKg: null,
    }));
  test('Zielgewicht in lb', () => {
    const draft = parseGoalForm({ ...weightForm, direction: 'abnehmen', targetWeight: '165' }, 'lb', ctx).draft;
    expect(draft?.kind === 'gewicht' && draft.targetKg).toBeCloseTo(74.84, 2);
  });
  test('Kraftziel braucht Übung, Gewicht, Wiederholungen', () =>
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kind: 'kraft' }, 'kg', ctx).problems).toEqual(['exercise', 'lift', 'reps']));
  test('Gewohnheit 1–7 Tage', () => {
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kind: 'gewohnheit', perWeek: '8' }, 'kg', ctx).problems).toEqual(['perWeek']);
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kind: 'gewohnheit', perWeek: '3' }, 'kg', ctx).draft).toEqual({
      kind: 'gewohnheit',
      habit: 'training',
      perWeek: 3,
      targetSteps: null,
    });
  });

  test('Gewichtsfortschritt aus dem Durchschnitt', () =>
    expect(weightProgress({ direction: 'abnehmen', targetKg: 75, startKg: 80 }, 78)).toEqual({
      startKg: 80,
      currentKg: 78,
      targetKg: 75,
      changeKg: -2,
      remainingKg: 3,
      reached: false,
    }));
  test('ohne Trend keine Aussage', () =>
    expect(weightProgress({ direction: 'abnehmen', targetKg: 75, startKg: 80 }, null).remainingKg).toBeNull());
  test('Ziel erreicht', () => expect(weightProgress({ direction: 'zunehmen', targetKg: 70, startKg: 65 }, 70.2).reached).toBe(true));

  const sets = [
    { weightKg: 90, reps: 3, day: '2026-10-20' },
    { weightKg: 85, reps: 5, day: '2026-10-22' },
    { weightKg: 80, reps: 8, day: '2026-10-27' },
  ];
  test('Kraftziel: bester Satz mit genug Wiederholungen', () => {
    const p = strengthProgress(sets, { targetKg: 100, targetReps: 5 });
    expect(p.best).toEqual(sets[1]);
    expect(p.last).toEqual(sets[2]);
    expect(p.reached).toBe(false);
  });
  test('Kraftziel erreicht', () => expect(strengthProgress(sets, { targetKg: 85, targetReps: 5 }).reached).toBe(true));
  test('schwerer Satz mit zu wenigen Wiederholungen zählt nicht', () =>
    expect(strengthProgress(sets, { targetKg: 90, targetReps: 5 }).reached).toBe(false));

  test('Wochenbeginn Montag', () => {
    expect(weekStart('2026-10-29')).toBe('2026-10-26');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
  });
  test('Wochenquote zählt verschiedene Tage', () => {
    const weeks = habitWeeks(['2026-10-26', '2026-10-26', '2026-10-28', '2026-10-20'], '2026-10-29', 2);
    expect(weeks[0]).toEqual({ start: '2026-10-26', count: 2, reached: true });
    expect(weeks[1]).toEqual({ start: '2026-10-19', count: 1, reached: false });
    expect(weeks).toHaveLength(4);
  });
});

describe('Gewichtsverlauf (GOAL-003)', () => {
  const entries = Array.from({ length: 14 }, (_, i) => ({
    day: `2026-10-${String(29 - i).padStart(2, '0')}`,
    kg: i < 7 ? 79 : 80,
  }));
  test('Veränderung zur Vorwoche', () => expect(weeklyChange(entries, '2026-10-29')).toBeCloseTo(-1));
  test('ohne zwei Durchschnitte keine Veränderung', () => expect(weeklyChange(entries.slice(0, 7), '2026-10-29')).toBeNull());
  test('ein Wert pro Tag (Mittel)', () =>
    expect(dailyMeans([{ day: '2026-10-29', kg: 80 }, { day: '2026-10-29', kg: 81 }], '2026-10-29', 30)).toEqual([
      { day: '2026-10-29', kg: 80.5 },
    ]));
});

describe('Körpermaße (GOAL-004)', () => {
  test('letzter und vorletzter Wert je Stelle', () => {
    const result = latestBySite([
      { id: 'a', day: '2026-10-29', site: 'taille', cm: 84 },
      { id: 'b', day: '2026-10-22', site: 'taille', cm: 85 },
      { id: 'c', day: '2026-10-15', site: 'taille', cm: 86 },
    ]);
    expect(result.taille?.latest.cm).toBe(84);
    expect(result.taille?.previous?.cm).toBe(85);
    expect(result.arm).toBeUndefined();
  });
});

describe('Fortschrittsfotos (GOAL-008)', () => {
  const photos = [
    { id: '1', day: '2026-10-30', pose: 'vorne' as const, fileName: '1.jpg' },
    { id: '2', day: '2026-09-01', pose: 'vorne' as const, fileName: '2.jpg' },
    { id: '3', day: '2026-10-01', pose: 'vorne' as const, fileName: '3.jpg' },
    { id: '4', day: '2026-10-15', pose: 'seite' as const, fileName: '4.jpg' },
  ];
  test('Vergleich: erstes und neuestes Foto derselben Ansicht', () => {
    const pair = comparePair(photos, 'vorne');
    expect(pair?.first.id).toBe('2');
    expect(pair?.latest.id).toBe('1');
  });
  test('ein Foto reicht nicht für einen Vergleich', () => expect(comparePair(photos, 'seite')).toBeNull());
});
