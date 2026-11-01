// A9: Wochenvorschlag, Meal-Prep, Einkaufsliste, Rezept-Import (schema.org, Zutatenzeilen).

import { describe, expect, test } from '@jest/globals';

import { BASIS_FOODS } from '../basis-foods-data';
import { weekDays } from '../dates';
import { bookShopping, departmentFor, mealPrep, shoppingList, shoppingText, suggestWeek, MEAL_SHARE } from '../meal-plan';
import { ALL_BOOK_RECIPES, findBookRecipe } from '../recipe-book';
import { extractRecipe, lineGrams, parseIngredientLine, parseYield } from '../recipe-import';

const DAYS = weekDays('2026-11-02');

describe('Wochenvorschlag', () => {
  const base = {
    days: DAYS,
    recipes: ALL_BOOK_RECIPES,
    prefs: { diet: 'alles' as const, allergies: [] },
    goalKcal: 2400,
    goalProtein: 160,
    existing: [],
    snacks: false,
  };

  test('3 Mahlzeiten je Tag, kcal nahe am Anteil, keine Wiederholung binnen 2 Tagen', () => {
    const plan = suggestWeek(base);
    expect(plan).toHaveLength(21);
    for (const e of plan) {
      const r = findBookRecipe(e.ref)!;
      expect(r.meal).toBe(e.meal);
      expect(Math.abs((r.perPortion.kcal ?? 0) * e.portions - 2400 * MEAL_SHARE[e.meal])).toBeLessThan(2400 * MEAL_SHARE[e.meal] * 0.5);
    }
    for (const e of plan) {
      const close = plan.filter((o) => o !== e && o.ref === e.ref && Math.abs(Date.parse(o.day) - Date.parse(e.day)) <= 2 * 86_400_000);
      expect(close).toEqual([]);
    }
  });

  test('vegan ohne Erdnüsse; geplante Plätze bleiben; gleiche Eingabe = gleicher Vorschlag', () => {
    const plan = suggestWeek({ ...base, prefs: { diet: 'vegan', allergies: ['erdnuesse'] } });
    for (const e of plan) {
      const r = findBookRecipe(e.ref)!;
      expect(r.diet).toBe('vegan');
      expect(r.allergens).not.toContain('erdnuesse');
    }
    const fixed = { day: DAYS[0], meal: 'mittag' as const, source: 'buch' as const, ref: 'x', name: 'X', portions: 1 };
    const withExisting = suggestWeek({ ...base, existing: [fixed] });
    expect(withExisting.some((e) => e.day === DAYS[0] && e.meal === 'mittag')).toBe(false);
    expect(suggestWeek(base)).toEqual(suggestWeek(base));
    expect(suggestWeek({ ...base, snacks: true }).filter((e) => e.meal === 'snack')).toHaveLength(7);
  });
});

describe('Meal-Prep und Einkaufsliste', () => {
  test('Meal-Prep: je 1 Portion an aufeinanderfolgenden Tagen', () => {
    const prep = mealPrep({ meal: 'mittag', source: 'buch', ref: 'r', name: 'R' }, '2026-11-02', 4);
    expect(prep.map((p) => [p.day, p.portions])).toEqual([
      ['2026-11-02', 1],
      ['2026-11-03', 1],
      ['2026-11-04', 1],
      ['2026-11-05', 1],
    ]);
  });

  test('gleiche Zutaten zusammengefasst, aufgerundet, nach Abteilung; Eier mit Stückzahl', () => {
    const recipe = ALL_BOOK_RECIPES.find((r) => r.ingredients.some(([id]) => id === 'ei'))!;
    const items = shoppingList([...bookShopping(recipe, 1), ...bookShopping(recipe, 2)]);
    const once = bookShopping(recipe, 3);
    for (const s of once) {
      const item = items.find((i) => i.name === s.name)!;
      expect(item.amount).toBeGreaterThanOrEqual(Math.floor(s.amount));
    }
    const egg = items.find((i) => i.name.startsWith('Eier'))!;
    expect(egg.department).toBe('milch_eier');
    expect(egg.pieces).toBeGreaterThan(0);
    expect(items.map((i) => i.department)).toEqual(
      [...items.map((i) => i.department)].sort(
        (a, b) =>
          ['obst_gemuese', 'brot', 'fleisch_fisch', 'milch_eier', 'trocken', 'konserven', 'tiefkuehl', 'getraenke', 'sonstiges'].indexOf(a) -
          ['obst_gemuese', 'brot', 'fleisch_fisch', 'milch_eier', 'trocken', 'konserven', 'tiefkuehl', 'getraenke', 'sonstiges'].indexOf(b)
      )
    );
    const text = shoppingText(
      items,
      new Set([egg.key]),
      (d) => d.toUpperCase(),
      (i) => `${i.amount} ${i.basis}`
    );
    expect(text).toContain(`☑ ${egg.amount} g ${egg.name}`);
  });

  test('Abteilungen: TK und Dose gehen vor', () => {
    expect(departmentFor('Beeren (TK)', null)).toBe('tiefkuehl');
    expect(departmentFor('Kidneybohnen (Dose, abgetropft)', 'usda-16145')).toBe('konserven');
    expect(departmentFor('Banane', 'usda-09040')).toBe('obst_gemuese');
    expect(departmentFor('Unbekannt', null)).toBe('sonstiges');
  });
});

describe('Rezept-Import', () => {
  const html = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":["Recipe"],"name":"Protein-Porridge &amp; Beeren","recipeYield":["2","2 Portionen"],"recipeIngredient":["100 g Haferflocken","2 EL Honig","1 ½ Bananen, in Scheiben","250ml Milch","1 Prise Salz","Zimt"],"recipeInstructions":[{"@type":"HowToStep","text":"Alles aufkochen."},{"@type":"HowToStep","text":"<b>Servieren</b>."}]}]}</script></head></html>`;

  test('liest schema.org-Rezept auch in @graph', () => {
    const r = extractRecipe(html, 'https://example.org/r')!;
    expect(r).toMatchObject({ name: 'Protein-Porridge & Beeren', portions: 2, source: 'https://example.org/r' });
    expect(r.ingredients).toHaveLength(6);
    expect(r.steps).toEqual(['Alles aufkochen.', 'Servieren .']);
    expect(extractRecipe('<html>kein Rezept</html>')).toBeNull();
    expect(parseYield('4 Portionen')).toBe(4);
  });

  test('Zutatenzeilen: Menge, Einheit, Name', () => {
    expect(parseIngredientLine('100 g Haferflocken')).toMatchObject({ amount: 100, unit: 'g', name: 'Haferflocken' });
    expect(parseIngredientLine('250ml Milch')).toMatchObject({ amount: 250, unit: 'ml', name: 'Milch' });
    expect(parseIngredientLine('0,5 kg Hähnchenbrust')).toMatchObject({ amount: 500, unit: 'g' });
    expect(parseIngredientLine('1 ½ Bananen, in Scheiben')).toMatchObject({ amount: 1.5, unit: 'stueck', name: 'Bananen' });
    expect(parseIngredientLine('2 EL Honig')).toMatchObject({ amount: 2, unit: 'el', name: 'Honig' });
    expect(parseIngredientLine('Zimt')).toMatchObject({ amount: null, unit: null, name: 'Zimt' });
  });

  test('Gramm über die Portionen der Grundnahrungsmittel', () => {
    const honey = BASIS_FOODS.find((f) => f.name === 'Honig')!;
    const egg = BASIS_FOODS.find((f) => f.name === 'Hühnerei (roh)')!;
    expect(lineGrams(parseIngredientLine('2 EL Honig'), honey.portions, honey.serving)).toBe(2 * honey.portions.find((p) => /EL/.test(p.label))!.g);
    expect(lineGrams(parseIngredientLine('3 Eier'), egg.portions, egg.serving)).toBe(159);
    expect(lineGrams(parseIngredientLine('1 Prise Salz'), [], null)).toBe(0.5);
    expect(lineGrams(parseIngredientLine('1 Dose Tomaten'), [], null)).toBeNull();
  });
});
