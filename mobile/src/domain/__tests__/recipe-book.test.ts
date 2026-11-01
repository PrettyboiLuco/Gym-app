import { describe, expect, test } from '@jest/globals';

import { findClaims } from '../claims';
import { BOOK_INGREDIENTS, BOOK_RECIPES } from '../recipe-book-data';
import { ALL_BOOK_RECIPES, BOOK_GOALS, filterBook, GOAL_LIMITS, perPortion, recipeDiet, scaledIngredients } from '../recipe-book';

describe('Rezeptbuch', () => {
  test('jedes Ziel hat mindestens 12 Rezepte, IDs sind eindeutig', () => {
    for (const goal of BOOK_GOALS) expect(BOOK_RECIPES.filter((r) => r.goal === goal).length).toBeGreaterThanOrEqual(12);
    expect(new Set(BOOK_RECIPES.map((r) => r.id)).size).toBe(BOOK_RECIPES.length);
  });

  test('alle Zutaten sind bekannt, Mengen und Schritte sinnvoll', () => {
    for (const r of BOOK_RECIPES) {
      for (const [id, amount] of r.ingredients) {
        expect(BOOK_INGREDIENTS[id]).toBeDefined();
        expect(amount).toBeGreaterThan(0);
      }
      expect(r.steps.length).toBeGreaterThan(0);
      expect(r.portions).toBeGreaterThan(0);
    }
  });

  test('Nährwerte je 100 g sind plausibel (Energie passt grob zu den Makros)', () => {
    for (const [id, ing] of Object.entries(BOOK_INGREDIENTS)) {
      const [kcal, p, c, f, fiber] = ing.per100;
      const calc = p * 4 + c * 4 + f * 9 + fiber * 2;
      // Kakao und Gewürze schwanken stärker; alle anderen innerhalb von 15 % bzw. 15 kcal.
      if (id !== 'kakao') expect(Math.abs(calc - kcal)).toBeLessThanOrEqual(Math.max(15, kcal * 0.15));
    }
  });

  test('jedes Rezept passt zu seinem Ziel (kcal je Portion und Eiweißanteil)', () => {
    const wrong: string[] = [];
    for (const r of BOOK_RECIPES) {
      const n = perPortion(r);
      const lim = GOAL_LIMITS[r.goal];
      const share = ((n.protein ?? 0) * 4) / (n.kcal ?? 1);
      if (n.kcal! < lim.minKcal || n.kcal! > lim.maxKcal || share < lim.proteinShare || n.protein! < lim.minProtein) {
        wrong.push(`${r.id}: ${n.kcal} kcal, ${n.protein} g Eiweiß (${Math.round(share * 100)} %)`);
      }
    }
    expect(wrong).toEqual([]);
  });

  test('Ernährungsweise wird aus den Zutaten abgeleitet und gefiltert', () => {
    expect(recipeDiet(BOOK_RECIPES.find((r) => r.id === 'e_linsen_bolognese')!)).toBe('vegan');
    expect(recipeDiet(BOOK_RECIPES.find((r) => r.id === 'hd_quark_beeren')!)).toBe('vegetarisch');
    const vegan = filterBook(ALL_BOOK_RECIPES, { goal: null, meal: null, diet: 'vegan' });
    expect(vegan.length).toBeGreaterThan(0);
    expect(vegan.every((r) => r.diet === 'vegan')).toBe(true);
    const veggie = filterBook(ALL_BOOK_RECIPES, { goal: null, meal: null, diet: 'vegetarisch' });
    expect(veggie.every((r) => r.diet !== 'nicht_vegetarisch')).toBe(true);
  });

  test('Mengen skalieren mit der Portionszahl', () => {
    const chili = BOOK_RECIPES.find((r) => r.id === 'd_chili_light')!;
    expect(scaledIngredients(chili, 2).find((l) => l.id === 'hack5')?.amount).toBe(250);
    expect(scaledIngredients(chili, 1).find((l) => l.id === 'tomatenmark')?.amount).toBe(8);
  });

  test('keine unzulässigen Versprechen in Rezepttexten', () => {
    const text = BOOK_RECIPES.flatMap((r) => [r.name, ...r.steps, r.tip ?? '']).join('\n');
    expect(findClaims(text)).toEqual([]);
  });
});
