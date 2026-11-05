// Bestätigte Fehler aus der Prüfung vom 05.11.2026 (Kalorientracking und Trainingsdaten über 12 Monate).
// Vor dem Fix schlugen diese Fälle fehl.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { parseFoodText } from '@/domain/food-text';
import { parseMealKcal, parseNutrient, parseRecipeForm, weekAverage } from '@/domain/nutrition';
import { localDay } from '@/domain/time';
import { periodStats, type StatSet } from '@/domain/training-stats';
import { formatDay, formatNumber } from '@/i18n';

import type { Db } from '../db';
import { setCalorieGoal, trainingDays } from '../goals';
import { migrate } from '../migrations';
import { daySums, logQuick, logWater } from '../nutrition';
import { buildReport } from '../report';
import { loadDayTargets, loadTargetsSettings, saveTargetsSettings } from '../targets-settings';
import { createTestDb } from '../testing/node-db';
import { addSet, completeSet, exerciseBests, finishSession, listSessionSets, startSession } from '../training';

const TZ = 'Europe/Berlin';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const when = (diaryDate: string) => ({ diaryDate, at: new Date(`${diaryDate}T12:00:00Z`), timeZone: TZ });
const eat = (day: string, kcal: number, protein: number | null = 100, carbs: number | null = 200, fat: number | null = 60) =>
  logQuick(db, { name: 'Essen', kcal, protein, carbs, fat }, 'mittag', when(day));

describe('E1: Tage mit nur Getränken sind kein erfasster Tag', () => {
  test('Wasser allein zählt nicht in den Wochenschnitt, Essen mit Wasser schon', async () => {
    await eat('2026-11-02', 2000);
    await logWater(db, 500, when('2026-11-02'), 'Wasser');
    await logWater(db, 500, when('2026-11-03'), 'Wasser');
    await logWater(db, 250, when('2026-11-04'), 'Wasser');
    const sums = await daySums(db, '2026-11-02', '2026-11-04');
    expect(sums.find((s) => s.day === '2026-11-03')!.entries).toBe(0);
    expect(sums.find((s) => s.day === '2026-11-02')!.entries).toBe(1);
    const week = weekAverage(sums);
    expect(week.average).toBe(2000);
    expect(week.trackedDays).toBe(1);
    expect(week.emptyDays).toBe(2);
  });

  test('Bericht: Tag mit nur Wasser zählt nicht als Ernährungstag', async () => {
    await eat('2026-11-02', 2000);
    await logWater(db, 500, when('2026-11-03'), 'Wasser');
    const report = await buildReport(db, '2026-11-01', '2026-11-04');
    expect(report.nutrition?.days).toBe(1);
    expect(report.nutrition?.kcal).toBe(2000);
  });
});

describe('E2: Schnelleintrag einer ganzen Mahlzeit', () => {
  test('1200 kcal (Restaurant-Pizza) und „1.200“ mit Tausenderpunkt gehen', () => {
    expect(parseMealKcal('1200')).toBe(1200);
    expect(parseMealKcal('1.200')).toBe(1200);
    expect(parseMealKcal('10000')).toBe(10000);
    expect(parseMealKcal('10001')).toBe('invalid');
    expect(parseMealKcal('450,5')).toBe(450.5);
    expect(parseMealKcal('')).toBeNull();
  });
  test('pro 100 g bleibt die Grenze 1000 (kJ im kcal-Feld fällt auf)', () => {
    expect(parseNutrient('1200')).toBe('invalid');
    expect(parseNutrient('0,076')).toBe(0.076);
  });
});

describe('E3: Tausenderpunkt im Text-Eintrag', () => {
  test('„1.000 ml Milch“ ist ein Liter, „1.5 l“ bleibt 1,5 l, „1.250 kg“ bleibt 1,25 kg', () => {
    expect(parseFoodText('1.000 ml Milch')[0]).toMatchObject({ amount: 1000, unit: 'ml', name: 'milch' });
    expect(parseFoodText('1.250g Kartoffeln')[0]).toMatchObject({ amount: 1250, unit: 'g' });
    expect(parseFoodText('1.5 l Wasser')[0]).toMatchObject({ amount: 1500, unit: 'ml' });
    expect(parseFoodText('1.250 kg Kartoffeln')[0]).toMatchObject({ amount: 1250, unit: 'g' });
    expect(parseFoodText('0,5 l Saft')[0]).toMatchObject({ amount: 500, unit: 'ml' });
  });
});

describe('E4: Bericht zählt fehlende Makros nicht als 0', () => {
  test('Schnelleintrag ohne Makros macht den Tag „unbekannt“, nicht 0 g', async () => {
    await eat('2026-11-02', 2000, 150, 200, 60);
    await eat('2026-11-03', 1800, null, null, null);
    const report = await buildReport(db, '2026-11-01', '2026-11-04');
    expect(report.nutrition?.days).toBe(2);
    expect(report.nutrition?.protein).toBe(150);
    expect(report.nutrition?.carbs).toBe(200);
  });
  test('nur Tage ohne Makros: „–“ statt 0', async () => {
    await eat('2026-11-03', 1800, null, null, null);
    const report = await buildReport(db, '2026-11-01', '2026-11-04');
    expect(report.nutrition?.protein).toBeNull();
    expect(report.nutrition?.fat).toBeNull();
  });
});

describe('E5: Wochenbudget und Ernährungsform gelten ab dem Tag der Änderung', () => {
  const plan = { kcal: 2000, trainingKcal: null, restKcal: null, trainingWeekdays: null, macros: { protein: 150, fat: 67, carbs: 200, fiber: 30 } };

  test('alte Tage behalten Ernährungsform und Makros, neue Tage bekommen die neue', async () => {
    await setCalorieGoal(db, 2000, '2026-10-01', 'coach', null, plan);
    const before = await loadDayTargets(db, '2026-10-31');
    const settings = await loadTargetsSettings(db);
    await saveTargetsSettings(db, { ...settings, dietProfile: 'lowcarb' }, '2026-11-05');
    const past = await loadDayTargets(db, '2026-10-31');
    const now = await loadDayTargets(db, '2026-11-05');
    expect(past.dietProfile).toBe(before.dietProfile);
    expect(past.macros).toEqual(before.macros);
    expect(now.dietProfile).toBe('lowcarb');
    expect(now.macros?.carbs).toBeLessThan(before.macros!.carbs);
    // Die Einstellungen selbst zeigen den aktuellen Stand.
    expect(past.settings.dietProfile).toBe('lowcarb');
  });

  test('Wochenbudget ein: vergangene Wochen bleiben ohne Budget', async () => {
    await setCalorieGoal(db, 2000, '2026-10-01', 'coach', null, plan);
    const settings = await loadTargetsSettings(db);
    await saveTargetsSettings(db, { ...settings, budget: { ...settings.budget, enabled: true, preset: 'wochenende' } }, '2026-11-02');
    expect((await loadDayTargets(db, '2026-10-31')).budget).toBeNull();
    expect((await loadDayTargets(db, '2026-10-31')).kcal).toBe(2000);
    expect((await loadDayTargets(db, '2026-11-07')).budget).not.toBeNull();
  });

  test('zweimal am selben Tag ändern: letzte Änderung gilt, kein doppelter Eintrag', async () => {
    const settings = await loadTargetsSettings(db);
    await saveTargetsSettings(db, { ...settings, dietProfile: 'lowcarb' }, '2026-11-05');
    await saveTargetsSettings(db, { ...settings, dietProfile: 'keto' }, '2026-11-05');
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_state WHERE key = 'targets_settings_history'");
    const history = JSON.parse(row!.value) as { from: string; dietProfile: string }[];
    expect(history.map((v) => [v.from, v.dietProfile])).toEqual([
      ['0000-01-01', 'ausgewogen'],
      ['2026-11-05', 'keto'],
    ]);
  });

  test('nur angeheftete Nährstoffe ändern legt keinen Verlauf an', async () => {
    const settings = await loadTargetsSettings(db);
    await saveTargetsSettings(db, { ...settings, pinnedMicros: ['iron'] }, '2026-11-05');
    expect(await db.getFirstAsync("SELECT value FROM app_state WHERE key = 'targets_settings_history'")).toBeNull();
  });
});

describe('E6: großes Kochen', () => {
  test('6-kg-Topf Chili mit 3 kg Hackfleisch lässt sich speichern', () => {
    const { problems } = parseRecipeForm({
      name: 'Chili',
      endWeight: '6000',
      portions: '',
      ingredients: [{ foodId: 'a', amount: '3000' }],
    } as Parameters<typeof parseRecipeForm>[0]);
    expect(problems).toEqual([]);
  });
});

describe('T1: Bestleistungen nach dem Wechsel kg → lb', () => {
  const set = (day: string, weightKg: number, reps: number): StatSet => ({
    sessionId: day,
    day,
    exerciseId: 'bank',
    setType: 'arbeit',
    weightKg,
    reps,
    seconds: null,
  });

  test('60 kg als „132,28 lb“ übernommen (60,0012 kg) ist keine neue Bestleistung', () => {
    const sets = [set('2026-06-01', 60, 10), set('2026-07-01', 60.0012, 8)];
    const stats = periodStats(sets, [], '2026-07-01', '2026-07-31');
    expect(stats.records).toEqual([]);
  });

  test('wirklich schwerer und mehr Wiederholungen bei gleichem Gewicht bleiben Bestleistungen', () => {
    expect(periodStats([set('2026-06-01', 60, 10), set('2026-07-01', 62.5, 6)], [], '2026-07-01', '2026-07-31').records[0].kind).toBe('gewicht');
    expect(periodStats([set('2026-06-01', 60, 10), set('2026-07-01', 60.0012, 11)], [], '2026-07-01', '2026-07-31').records[0].kind).toBe('wiederholungen');
  });

  test('Bestwert je Training: 60 kg × 10 schlägt 60,0012 kg × 8', async () => {
    const id = await startSession(db, null);
    await addSet(db, id, 'kniebeuge');
    await addSet(db, id, 'kniebeuge');
    const [first, second] = await listSessionSets(db, id);
    await completeSet(db, first.id, 60, 10);
    await completeSet(db, second.id, 60.0012, 8);
    await finishSession(db, id, 'abgeschlossen');
    const [best] = await exerciseBests(db, 'kniebeuge');
    expect(best.reps).toBe(10);
  });
});

describe('T2: Training über Mitternacht ist ein Trainingstag', () => {
  test('Sa 23:40 bis So 0:14 zählt nur für Samstag', async () => {
    const id = await startSession(db, null);
    await addSet(db, id, 'kniebeuge');
    const [set] = await listSessionSets(db, id);
    await completeSet(db, set.id, 80, 5);
    await finishSession(db, id, 'abgeschlossen');
    // 13.12.2026 23:40 Berlin = 22:40 UTC; Satz um 0:14 am 14.12. = 23:14 UTC.
    await db.runAsync("UPDATE workout_session SET started_at_utc = '2026-12-13T22:40:00.000Z' WHERE id = ?", id);
    await db.runAsync("UPDATE set_log SET completed_at_utc = '2026-12-13T23:14:00.000Z' WHERE session_id = ?", id);
    expect(await trainingDays(db, '2026-12-01T00:00:00.000Z', TZ)).toEqual(['2026-12-13']);
  });

  test('Training ohne erledigten Satz zählt nicht', async () => {
    const id = await startSession(db, null);
    await addSet(db, id, 'kniebeuge');
    await finishSession(db, id, 'abgebrochen');
    expect(await trainingDays(db, '2026-01-01T00:00:00.000Z', TZ)).toEqual([]);
  });
});

describe('Tempo: Formatierer werden wiederverwendet', () => {
  test('Ergebnisse bleiben gleich (Zeitzone, Sommerzeit, Zahlen, Datum)', () => {
    expect(localDay(new Date('2026-03-29T00:30:00Z'), TZ)).toBe('2026-03-29');
    expect(localDay(new Date('2026-10-24T22:30:00Z'), TZ)).toBe('2026-10-25');
    expect(localDay(new Date('2026-10-24T22:30:00Z'), 'UTC')).toBe('2026-10-24');
    expect(formatNumber(1234.56, 1)).toBe('1234,6');
    expect(formatNumber(1234.56, 0)).toBe('1235');
    expect(formatDay('2026-11-05')).toBe('05.11.2026');
  });
});
