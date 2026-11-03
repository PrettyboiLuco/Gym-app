// Einblicke (W9) mit echter Datenbank: Auswahl in app_state, Tageswerte aus Tagebuch, Ziel, Training, Schritten und Schlaf.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { shiftDay } from '@/domain/dates';
import { tileSummaries, weekPatterns } from '@/domain/insights';

import { writeState } from '../app-state';
import { addCardio, completeCardio } from '../cardio';
import type { Db } from '../db';
import { setCalorieGoal } from '../goals';
import { loadInsightData, loadInsightTiles, saveInsightTiles } from '../insights';
import { migrate } from '../migrations';
import { logQuick, setDayIncomplete } from '../nutrition';
import { saveCheck } from '../readiness';
import { addSteps } from '../steps';
import { createTestDb } from '../testing/node-db';
import { addWeight } from '../weights';

const TZ = 'Europe/Berlin';
const TODAY = '2026-11-03';
const FOOD_END = '2026-11-02';

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const when = (diaryDate: string) => ({ diaryDate, at: new Date(`${diaryDate}T12:00:00Z`), timeZone: TZ });
const eat = (day: string, kcal: number, protein: number | null) => logQuick(db, { name: 'Essen', kcal, protein, carbs: null, fat: null }, 'mittag', when(day));

describe('Auswahl der Kacheln', () => {
  test('ohne Auswahl die Vorgabe, gespeichert in app_state', async () => {
    expect(await loadInsightTiles(db)).toEqual(['kalorien', 'eiweiss', 'gewicht', 'training']);
    await saveInsightTiles(db, ['schlaf', 'training']);
    expect(await loadInsightTiles(db)).toEqual(['training', 'schlaf']);
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_state WHERE key = 'insight_tiles'");
    expect(JSON.parse(row!.value)).toEqual(['training', 'schlaf']);
  });
  test('kaputte oder alte Werte fallen auf Bekanntes zurück', async () => {
    await writeState(db, 'insight_tiles', ['kalorien', 'alt']);
    expect(await loadInsightTiles(db)).toEqual(['kalorien']);
    await writeState(db, 'insight_tiles', { falsch: true });
    expect(await loadInsightTiles(db)).toEqual(['kalorien', 'eiweiss', 'gewicht', 'training']);
  });
});

describe('Tageswerte', () => {
  test('Fenster 8 Wochen bis heute, ältester zuerst', async () => {
    const { days } = await loadInsightData(db, TODAY, FOOD_END, TZ);
    expect(days[0].day).toBe(shiftDay(FOOD_END, -55));
    expect(days.at(-1)!.day).toBe(TODAY);
    expect(days).toHaveLength(57);
  });

  test('Essen nur an vollständigen Tagen, Eiweißziel aus dem Coach-Ziel', async () => {
    await setCalorieGoal(db, 2200, '2026-09-01', 'coach', null, {
      kcal: 2200,
      trainingKcal: null,
      restKcal: null,
      trainingWeekdays: null,
      macros: { protein: 120, fat: 70, carbs: 250, fiber: 30 },
    });
    await eat('2026-11-01', 1200, 70);
    await eat('2026-11-01', 900, 60);
    await eat('2026-10-31', 2000, 100);
    await setDayIncomplete(db, '2026-10-31', true);
    const { days } = await loadInsightData(db, TODAY, FOOD_END, TZ);
    const nov1 = days.find((d) => d.day === '2026-11-01')!;
    expect(nov1.food).toEqual({ kcal: 2100, protein: 130 });
    expect(nov1.proteinGoal).toBe(120);
    expect(days.find((d) => d.day === '2026-10-31')!.food).toBeNull();
  });

  test('Training, Schritte, Schlaf und Gewicht landen am richtigen Tag', async () => {
    const id = await addCardio(db, { activity: 'laufband', day: '2026-11-02' });
    await completeCardio(db, id, { minutes: 30, distanceKm: null, avgHr: null, effort: null, level: null, note: null });
    await addSteps(db, '2026-11-02', 9000);
    await saveCheck(db, TODAY, { sleepHours: 7.5 });
    await addWeight(db, TODAY, 80);
    const { days, weights } = await loadInsightData(db, TODAY, FOOD_END, TZ);
    const nov2 = days.find((d) => d.day === '2026-11-02')!;
    expect(nov2.trained).toBe(true);
    expect(nov2.steps).toBe(9000);
    expect(days.at(-1)!.sleepHours).toBe(7.5);
    expect(weights).toHaveLength(1);
  });

  test('bis zu Kachel und Muster: Wochenende gegenüber unter der Woche', async () => {
    for (let i = 0; i < 56; i++) {
      const day = shiftDay(FOOD_END, -i);
      const weekend = [0, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay());
      await eat(day, weekend ? 2500 : 2050, 110);
    }
    const { days, weights } = await loadInsightData(db, TODAY, FOOD_END, TZ, false);
    expect(tileSummaries(days, weights, TODAY, FOOD_END).kalorien.days).toBe(7);
    const pattern = weekPatterns(days, { today: TODAY, foodEnd: FOOD_END, modules: { ernaehrung: true, bereitschaft: true }, hideNumbers: false });
    expect(pattern.find((p) => p.key === 'wochenendeKcal')).toMatchObject({ direction: 'mehr', diff: 450 });
  });
});
