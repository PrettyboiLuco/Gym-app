// Datenbank-Tests Phase 9: Schlaf, Check-in mit Entscheidung, Allergene am Lebensmittel, Sicherung.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { CHECKIN_RULES_VERSION, weeklyCheckin } from '@/domain/checkin';
import { EMPTY_PROFILE } from '@/domain/profile';

import { exportBackup, restoreBackup } from '../backup';
import { checkinInput, lastCheckinWeekEnd, listCheckins, listSleep, saveCheckin, saveSleep } from '../coach';
import type { Db } from '../db';
import { calorieGoalOn, saveGoal, setCalorieGoal } from '../goals';
import { migrate } from '../migrations';
import { foodFacts, getFood, logFood, recipeFacts, saveFood, saveRecipe, listRecipes } from '../nutrition';
import { createTestDb } from '../testing/node-db';
import { addWeight } from '../weights';

let db: Db & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const when = (day: string) => ({ diaryDate: day, at: new Date(`${day}T12:00:00Z`), timeZone: 'Europe/Berlin' });
const day = (offset: number) => new Date(Date.parse('2026-10-29T12:00:00Z') + offset * 86_400_000).toISOString().slice(0, 10);

async function fillTwoWeeks() {
  const food = await saveFood(db, null, {
    name: 'Testessen',
    brand: null,
    barcode: null,
    basis: 'g',
    per100: { kcal: 100, protein: 1, carbs: 1, fat: 1 },
    servingAmount: null,
  });
  await setCalorieGoal(db, 2000, day(-20));
  await saveGoal(db, null, { kind: 'gewicht', direction: 'abnehmen', targetKg: null }, day(-20), 80);
  for (let i = -13; i <= 0; i++) {
    await addWeight(db, day(i), 80);
    if (i > -7) await logFood(db, food, 1950, { kind: 'essen', meal: 'mittag' }, when(day(i)));
  }
}

describe('Schlaf (COACH-006)', () => {
  test('ein Eintrag pro Tag, neuer ersetzt alten', async () => {
    await saveSleep(db, '2026-10-29', 7, null);
    await saveSleep(db, '2026-10-29', 6.5, 4);
    expect(await listSleep(db)).toEqual([expect.objectContaining({ day: '2026-10-29', hours: 6.5, quality: 4 })]);
  });
});

describe('Wochen-Check-in (COACH-008)', () => {
  test('Werte der Woche werden richtig gesammelt', async () => {
    await fillTwoWeeks();
    const input = await checkinInput(db, day(0), EMPTY_PROFILE, 'Europe/Berlin');
    expect(input.days).toHaveLength(7);
    expect(input.days.every((d) => d.kcal === 1950 && d.goal === 2000)).toBe(true);
    expect(input.direction).toBe('abnehmen');
    expect(input.currentGoal).toBe(2000);
    expect(weeklyCheckin(input).suggestion).toEqual({ kind: 'kcal', from: 2000, to: 1900, reason: 'keinFortschritt' });
  });

  test('„Nicht jetzt“ ändert nichts, „Übernehmen“ setzt das Ziel ab heute als neue Version', async () => {
    await fillTwoWeeks();
    const result = weeklyCheckin(await checkinInput(db, day(0), EMPTY_PROFILE, 'Europe/Berlin'));
    await saveCheckin(db, { ...result, weekEnd: day(0), rulesVersion: CHECKIN_RULES_VERSION }, 'abgelehnt', day(1));
    expect((await calorieGoalOn(db, day(1)))?.kcal).toBe(2000);
    await saveCheckin(db, { ...result, weekEnd: day(0), rulesVersion: CHECKIN_RULES_VERSION }, 'angenommen', day(1));
    expect((await calorieGoalOn(db, day(1)))?.kcal).toBe(1900);
    // Vergangene Tage behalten ihr Ziel (GOAL-002).
    expect((await calorieGoalOn(db, day(0)))?.kcal).toBe(2000);
    expect((await listCheckins(db)).map((c) => c.decision)).toEqual(expect.arrayContaining(['abgelehnt', 'angenommen']));
    expect(await lastCheckinWeekEnd(db)).toBe(day(0));
  });
});

describe('Allergene am Lebensmittel (COACH-009)', () => {
  const draft = {
    name: 'Keks',
    brand: null,
    barcode: '4000000000006',
    basis: 'g' as const,
    per100: { kcal: 450, protein: 5, carbs: 60, fat: 20 },
    servingAmount: 10,
  };
  test('aus Open Food Facts gespeichert; Bearbeiten ohne Angabe lässt sie stehen', async () => {
    const id = await saveFood(db, null, { ...draft, allergens: ['gluten', 'milch'], traces: [], diet: 'vegetarisch' }, 'off');
    expect(foodFacts((await getFood(db, id))!)).toEqual({ allergens: ['gluten', 'milch'], traces: [], diet: 'vegetarisch' });
    await saveFood(db, id, { ...draft, name: 'Keks (neu)' });
    expect(foodFacts((await getFood(db, id))!).allergens).toEqual(['gluten', 'milch']);
    await saveFood(db, id, { ...draft, allergens: null });
    expect(foodFacts((await getFood(db, id))!).allergens).toBeNull();
  });
  test('eigenes Lebensmittel ohne Angabe = unbekannt', async () => {
    const id = await saveFood(db, null, draft);
    expect(foodFacts((await getFood(db, id))!)).toEqual({ allergens: null, traces: null, diet: null });
  });
});

describe('Rezept-Allergene aus den Zutaten (COACH-009)', () => {
  test('Allergene der Zutaten werden zusammengefasst', async () => {
    const base = { brand: null, barcode: null, basis: 'g' as const, per100: { kcal: 100, protein: 1, carbs: 1, fat: 1 }, servingAmount: null };
    const brot = await saveFood(db, null, { ...base, name: 'Brot', allergens: ['gluten'], traces: [] });
    const creme = await saveFood(db, null, { ...base, name: 'Creme', allergens: ['milch', 'schalenfruechte'], traces: [] });
    await saveRecipe(db, null, { name: 'Nutella-Brot', endWeightG: null, portions: 1, ingredients: [{ foodId: brot, amount: 40 }, { foodId: creme, amount: 15 }] });
    const [recipe] = await listRecipes(db);
    expect((await recipeFacts(db, recipe.versionId)).allergens?.sort()).toEqual(['gluten', 'milch', 'schalenfruechte']);
  });
});

describe('Check-in nimmt das heute gültige Ziel', () => {
  test('Ziel heute geändert → Vorschlag geht von diesem Ziel aus', async () => {
    await fillTwoWeeks();
    await setCalorieGoal(db, 2200, day(1));
    const input = await checkinInput(db, day(0), EMPTY_PROFILE, 'Europe/Berlin');
    expect(input.currentGoal).toBe(2200);
  });
});

describe('Sicherung (TECH-014)', () => {
  test('Schlaf, Check-ins und Allergene kommen mit', async () => {
    await saveSleep(db, '2026-10-29', 7, 3);
    await fillTwoWeeks();
    const result = weeklyCheckin(await checkinInput(db, day(0), EMPTY_PROFILE, 'Europe/Berlin'));
    await saveCheckin(db, { ...result, weekEnd: day(0), rulesVersion: 1 }, 'ohne', day(1));
    await saveFood(db, null, { name: 'Milchreis', brand: null, barcode: null, basis: 'g', per100: { kcal: 1, protein: 1, carbs: 1, fat: 1 }, servingAmount: null, allergens: ['milch'] });
    const other = createTestDb();
    await migrate(other);
    await restoreBackup(other, JSON.parse(JSON.stringify(await exportBackup(db, null))));
    expect(await listSleep(other)).toHaveLength(1);
    expect(await listCheckins(other)).toHaveLength(1);
    const row = await other.getFirstAsync<{ allergens: string }>("SELECT allergens FROM food WHERE name = 'Milchreis'");
    expect(row?.allergens).toBe('["milch"]');
    other.close();
  });
});
