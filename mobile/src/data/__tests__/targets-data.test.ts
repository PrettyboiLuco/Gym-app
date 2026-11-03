// Ziele und Nährstoffe (Ausbauplan B2) mit echter Datenbank: Einstellungen, Wochenbudget, Ernährungsform,
// „Was fehlt mir heute?“, Nährstoff-Suche und Sicherung.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { BasisFood } from '@/domain/basis-foods';
import { buildPlan } from '@/domain/coach';

import { exportBackup } from '../backup';
import { syncBasisFoods } from '../basis-foods';
import type { Db } from '../db';
import { setCalorieGoal } from '../goals';
import { migrate } from '../migrations';
import { gapCandidates, loadGapsDay, rankFoodsBy } from '../nutrient-gaps';
import { listDay, loadNutritionSettings, logFood, logQuick, saveNutritionSettings, setDayIncomplete, setFavorite, saveFood } from '../nutrition';
import { loadProfile, saveProfile } from '../profile';
import { loadDayTargets, loadTargetsSettings, saveTargetsSettings } from '../targets-settings';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const basis = (over: Partial<BasisFood>): BasisFood => ({
  id: 'usda-x',
  name: 'x',
  group: 'eier_milch',
  basis: 'g',
  prep: null,
  per100: [100, 0, 0, 0, 0, 0, 0, 0],
  micros: {},
  portions: [],
  serving: null,
  synonyms: [],
  allergens: [],
  diet: 'vegan',
  ...over,
});
const quark = basis({
  id: 'usda-q',
  name: 'Magerquark',
  per100: [67, 12, 4, 0.2, 0, 4, 0.1, 0.1],
  micros: { calcium: 90 },
  portions: [{ label: '1 Becher', g: 250 }],
  allergens: ['milch'],
  diet: 'vegetarisch',
});
const lentils = basis({ id: 'usda-l', name: 'Linsen gekocht', group: 'huelsenfruechte', per100: [116, 9, 12, 0.4, 8, 1.8, 0.1, 0], micros: { iron: 3.3 } });
const chocolate = basis({ id: 'usda-s', name: 'Zartbitterschokolade', group: 'suesses_snacks', per100: [546, 5, 46, 31, 7, 24, 19, 0], micros: { iron: 8 } });

// Montag 02.11.2026 … Sonntag 08.11.2026
const at = (day: string) => ({ diaryDate: day, at: new Date(`${day}T10:00:00Z`), timeZone: 'Europe/Berlin' });
const idOf = async (catalog: string) => (await db.getFirstAsync<{ id: string }>('SELECT id FROM food WHERE catalog_origin = ?', catalog))!.id;

async function coachGoal(kcal = 2000, protein = 130) {
  await setCalorieGoal(db, kcal, '2026-10-01', 'coach', null, buildPlan(kcal, protein, [], 1200, false));
}

describe('Einstellungen im App-Zustand', () => {
  test('Standard, bereinigt, gespeichert und in der Sicherung', async () => {
    expect(await loadTargetsSettings(db)).toEqual({
      budget: { enabled: false, preset: 'ziel', shares: [100, 100, 100, 100, 100, 100, 100], carryover: false },
      pinnedMicros: [],
      dietProfile: 'ausgewogen',
    });
    await db.runAsync("INSERT INTO app_state (key, value) VALUES ('targets_settings', ?)", JSON.stringify({ pinnedMicros: ['iron', 'x'], dietProfile: 'paleo' }));
    expect((await loadTargetsSettings(db)).pinnedMicros).toEqual(['iron']);
    expect((await loadTargetsSettings(db)).dietProfile).toBe('ausgewogen');
    const settings = await loadTargetsSettings(db);
    await saveTargetsSettings(db, { ...settings, dietProfile: 'keto', budget: { ...settings.budget, enabled: true } });
    const backup = await exportBackup(db, null);
    expect(backup.appState.targets_settings).toMatchObject({ dietProfile: 'keto', budget: { enabled: true } });
  });
});

describe('Ziele des Tages', () => {
  test('ohne Wochenbudget: Kalorienziel und Coach-Makros unverändert', async () => {
    await coachGoal();
    const t = await loadDayTargets(db, '2026-11-04');
    expect(t.kcal).toBe(2000);
    expect(t.budget).toBeNull();
    expect(t.macros?.protein).toBe(130);
    expect(t.netCarbs).toBeNull();
    expect(t.hidden).toBe(false);
  });

  test('Wochenbudget mit Übertrag aus vollständig erfassten Vortagen', async () => {
    await coachGoal();
    await logQuick(db, { name: 'Mo', kcal: 1500, protein: null, carbs: null, fat: null }, 'mittag', at('2026-11-02'));
    await logQuick(db, { name: 'Di', kcal: 1000, protein: null, carbs: null, fat: null }, 'mittag', at('2026-11-03'));
    await setDayIncomplete(db, '2026-11-03', true);
    const s = await loadTargetsSettings(db);
    await saveTargetsSettings(db, { ...s, budget: { ...s.budget, enabled: true, carryover: true } });
    const t = await loadDayTargets(db, '2026-11-04');
    expect(t.budget?.total).toBe(14000);
    expect(t.kcal).toBe(2100); // nur Montag zählt: 500 / 5 Tage
    expect(t.budget?.eaten).toBe(2500);
    const monday = await loadDayTargets(db, '2026-11-02');
    expect(monday.kcal).toBe(2000);
    expect(t.macros!.carbs).toBe(monday.macros!.carbs + 25); // +100 kcal nur über Kohlenhydrate
  });

  test('sensible Situation: keine Zahlen, kein Wochenbudget, Keto gilt als ausgewogen', async () => {
    await coachGoal();
    const s = await loadTargetsSettings(db);
    await saveTargetsSettings(db, { ...s, dietProfile: 'keto', budget: { ...s.budget, enabled: true } });
    expect((await loadDayTargets(db, '2026-11-04')).netCarbs).toEqual({ limit: 30 });
    await saveProfile(db, { ...(await loadProfile(db)), sensitive: true });
    const t = await loadDayTargets(db, '2026-11-04');
    expect(t.hidden).toBe(true);
    expect(t.budget).toBeNull();
    expect(t.dietProfile).toBe('ausgewogen');
    expect(t.netCarbs).toBeNull();
  });

  test('„ohne Zahlen“ blendet das Wochenbudget aus', async () => {
    await coachGoal();
    const s = await loadTargetsSettings(db);
    await saveTargetsSettings(db, { ...s, budget: { ...s.budget, enabled: true } });
    await saveNutritionSettings(db, { ...(await loadNutritionSettings(db)), hideNumbers: true });
    expect((await loadDayTargets(db, '2026-11-04')).budget).toBeNull();
  });
});

describe('Was fehlt mir heute?', () => {
  test('Vorschläge aus Grundnahrungsmitteln, eintragen per logFood', async () => {
    await syncBasisFoods(db, [quark, lentils, chocolate], 1);
    await coachGoal(2000, 130);
    await logQuick(db, { name: 'Frühstück', kcal: 900, protein: 40, carbs: 100, fat: 30 }, 'fruehstueck', at('2026-11-04'));
    const day = await loadGapsDay(db, '2026-11-04', [quark, lentils, chocolate]);
    // Ballaststoffe des Schnelleintrags unbekannt: die Lücke gilt als „höchstens so groß“ (Anzeige mit Hinweis).
    expect(day.gaps.map((g) => g.key)).toEqual(['protein', 'fiber']);
    expect(day.unknown.fiber).toBe(1);
    expect(day.kcalLeft).toBe(1100);
    const ids = day.suggestions.map((s) => s.food.name);
    expect(ids).toContain('Magerquark');
    expect(ids).not.toContain('Zartbitterschokolade');
    const first = day.suggestions[0];
    await logFood(db, first.food.id, first.amount, { kind: 'essen', meal: 'mittag' }, at('2026-11-04'));
    expect((await listDay(db, '2026-11-04')).length).toBe(2);
  });

  test('Ernährungsweise filtert Grundnahrungsmittel, Favoriten bleiben', async () => {
    await syncBasisFoods(db, [quark, lentils], 1);
    await coachGoal(2000, 130);
    await saveNutritionSettings(db, { ...(await loadNutritionSettings(db)), diet: 'vegan' });
    let names = (await loadGapsDay(db, '2026-11-04')).suggestions.map((s) => s.food.name);
    expect(names).toEqual(['Linsen gekocht']);
    await setFavorite(db, await idOf('usda-q'), true);
    names = (await loadGapsDay(db, '2026-11-04')).suggestions.map((s) => s.food.name);
    expect(names).toContain('Magerquark');
  });

  test('angeheftete Mikronährstoffe als Lücke; keine Vorschläge bei sensibler Situation', async () => {
    await syncBasisFoods(db, [quark, lentils], 1);
    await coachGoal();
    const s = await loadTargetsSettings(db);
    await saveTargetsSettings(db, { ...s, pinnedMicros: ['iron'] });
    expect((await loadGapsDay(db, '2026-11-04')).gaps.map((g) => g.key)).toContain('iron');
    await saveProfile(db, { ...(await loadProfile(db)), sensitive: true });
    const hidden = await loadGapsDay(db, '2026-11-04');
    expect(hidden.gaps).toEqual([]);
    expect(hidden.suggestions).toEqual([]);
  });

  test('Kandidaten: Grundnahrungsmittel und Favoriten; Suche je 100 kcal über alle', async () => {
    await syncBasisFoods(db, [quark, lentils], 1);
    const own = await saveFood(db, null, {
      name: 'Proteinriegel',
      brand: null,
      barcode: null,
      basis: 'g',
      servingAmount: 50,
      per100: { kcal: 350, protein: 30, carbs: 30, fat: 10, fiber: 5, sugar: null, satFat: null, salt: null },
    });
    expect((await gapCandidates(db)).map((f) => f.name).sort()).toEqual(['Linsen gekocht', 'Magerquark']);
    expect(own).toBeTruthy();
    const ranked = await rankFoodsBy(db, 'protein', 'kcal100');
    expect(ranked[0].food.name).toBe('Magerquark');
    expect(ranked.map((r) => r.food.name)).toContain('Proteinriegel');
    expect((await rankFoodsBy(db, 'protein', 'g100'))[0].food.name).toBe('Proteinriegel');
  });
});
