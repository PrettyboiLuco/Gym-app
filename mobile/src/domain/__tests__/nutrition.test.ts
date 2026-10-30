import { describe, expect, test } from '@jest/globals';

import {
  drinkTotals,
  fractionOf,
  isValidBarcode,
  normalizeOffProduct,
  nutrientsForAmount,
  parseAmount,
  parseNutrient,
  per100FromTotal,
  shiftDay,
  suggestMeal,
  sumNutrients,
  totalOf,
  weekAverage,
  foodToForm,
  parseFoodForm,
  type FoodForm,
  parseRecipeForm,
  type RecipeForm,
  parseSettingsForm,
  type SettingsForm,
} from '../nutrition';

const nutella = { kcal: 539, protein: 6.3, carbs: 57.5, fat: 30.9 };

describe('Nährwerte für eine Menge', () => {
  test('20 g Nuss-Nougat-Creme', () => {
    const n = nutrientsForAmount(nutella, 20, 'g', 'g');
    expect(n.kcal).toBeCloseTo(107.8);
    expect(n.fat).toBeCloseTo(6.18);
  });
  test('unbekannter Wert bleibt unbekannt', () =>
    expect(nutrientsForAmount({ ...nutella, protein: null }, 20, 'g', 'g').protein).toBeNull());
  test('g und ml nicht ohne Dichte', () => expect(() => nutrientsForAmount(nutella, 20, 'g', 'ml')).toThrow());
});

describe('Summen', () => {
  test('unbekannte Werte werden gezählt, nicht als 0 versteckt', () => {
    const s = sumNutrients([nutella, { kcal: 100, protein: null, carbs: 10, fat: 1 }]);
    expect(s.values.kcal).toBe(639);
    expect(s.unknown.protein).toBe(1);
    expect(s.unknown.kcal).toBe(0);
  });
  test('Gesamtwert eines Rezepts ist unbekannt, wenn eine Zutat unbekannt ist', () =>
    expect(totalOf([nutella, { kcal: null, protein: 1, carbs: 1, fat: 1 }]).kcal).toBeNull());
  test('Rezept 1200 kcal, 800 g Endgewicht → 150 kcal/100 g, 200 g = 300 kcal (FOOD-017)', () => {
    const per100 = per100FromTotal({ kcal: 1200, protein: 80, carbs: 100, fat: 40 }, 800);
    expect(per100.kcal).toBe(150);
    expect(nutrientsForAmount(per100, 200, 'g', 'g').kcal).toBe(300);
  });
  test('1 von 4 Portionen', () => expect(fractionOf({ kcal: 1200, protein: null, carbs: 0, fat: 40 }, 0.25)).toEqual({
    kcal: 300,
    protein: null,
    carbs: 0,
    fat: 10,
  }));
});

describe('Eingaben', () => {
  test('Menge mit Komma', () => expect(parseAmount('62,5')).toBe(62.5));
  test('Menge 0 und Text abgelehnt', () => {
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('viel')).toBeNull();
  });
  test('leerer Nährwert ist unbekannt, 0 ist bekannt', () => {
    expect(parseNutrient('')).toBeNull();
    expect(parseNutrient('0')).toBe(0);
    expect(parseNutrient('abc')).toBe('invalid');
  });
  test('gültige EAN-13 (Prüfziffer)', () => expect(isValidBarcode('4006381333931')).toBe(true));
  test('falsche Prüfziffer', () => expect(isValidBarcode('4006381333932')).toBe(false));
  test('gültige EAN-8', () => expect(isValidBarcode('96385074')).toBe(true));
  test('Barcode mit führender Null bleibt Text', () => expect(isValidBarcode('0012345678905')).toBe(true));
});

describe('Mahlzeit und Datum', () => {
  test('Vorschläge aus der Uhrzeit', () => {
    expect(suggestMeal(7)).toBe('fruehstueck');
    expect(suggestMeal(12)).toBe('mittag');
    expect(suggestMeal(19)).toBe('abend');
    expect(suggestMeal(0)).toBe('snack');
  });
  test('Tag zurück über Monatsgrenze', () => expect(shiftDay('2026-11-01', -1)).toBe('2026-10-31'));
  test('Tag zurück am Tag der Zeitumstellung', () => expect(shiftDay('2026-10-26', -1)).toBe('2026-10-25'));
});

describe('Getränke', () => {
  test('Wasser und Gesamtgetränke getrennt (TIME-004)', () =>
    expect(
      drinkTotals([
        { drinkType: 'wasser', amount: 500, unit: 'ml' },
        { drinkType: 'saft', amount: 250, unit: 'ml' },
      ])
    ).toEqual({ waterMl: 500, allMl: 750 }));
});

describe('Woche', () => {
  test('Durchschnitt nur über erfasste Tage', () =>
    expect(
      weekAverage([
        { day: 'a', kcal: 2000, entries: 5 },
        { day: 'b', kcal: 2400, entries: 4 },
        { day: 'c', kcal: 0, entries: 0 },
      ])
    ).toEqual({ average: 2200, trackedDays: 2, incompleteDays: 0, emptyDays: 1 }));
  test('Tage mit unbekannten Werten zählen nicht in den Schnitt (sonst zu niedrig)', () =>
    expect(
      weekAverage([
        { day: 'a', kcal: 2000, entries: 5, unknownKcal: 0 },
        { day: 'b', kcal: 600, entries: 4, unknownKcal: 2 },
        { day: 'c', kcal: null, entries: 1, unknownKcal: 1 },
        { day: 'd', kcal: null, entries: 0, unknownKcal: 0 },
      ])
    ).toEqual({ average: 2000, trackedDays: 1, incompleteDays: 2, emptyDays: 1 }));
});

describe('Open Food Facts einlesen', () => {
  test('v3-Antwort mit deutschem Namen', () => {
    const food = normalizeOffProduct(
      {
        status: 'success',
        product: {
          product_name: 'Hazelnut spread',
          product_name_de: 'Nuss-Nougat-Creme',
          brands: 'Marke A, Marke B',
          product_quantity_unit: 'g',
          serving_quantity: '15',
          nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
        },
      },
      '3017620422003'
    );
    expect(food).toEqual({
      name: 'Nuss-Nougat-Creme',
      brand: 'Marke A',
      barcode: '3017620422003',
      basis: 'g',
      prep: null,
      per100: nutella,
      servingAmount: 15,
      allergens: null,
      traces: null,
      diet: null,
    });
  });
  test('Allergene, Spuren und vegan/vegetarisch aus den Tags (COACH-009)', () => {
    const food = normalizeOffProduct(
      {
        status: 1,
        product: {
          product_name: 'Keks',
          allergens_tags: ['en:gluten', 'en:milk', 'en:unbekannt'],
          traces_tags: [],
          ingredients_analysis_tags: ['en:non-vegan', 'en:vegetarian'],
        },
      },
      '1'
    );
    expect(food).toMatchObject({ allergens: ['gluten', 'milch'], traces: [], diet: 'vegetarisch' });
  });
  test('Getränk in ml, kcal aus kJ, fehlendes Eiweiß bleibt unbekannt', () => {
    const food = normalizeOffProduct(
      {
        status: 1,
        product: {
          product_name: 'Apfelsaft',
          product_quantity_unit: 'ml',
          nutriments: { 'energy-kj_100g': 184.1, carbohydrates_100g: 10.5, fat_100g: 0 },
        },
      },
      '4000000000000'
    );
    expect(food?.basis).toBe('ml');
    expect(food?.per100).toEqual({ kcal: 44, protein: null, carbs: 10.5, fat: 0 });
  });
  test('nicht gefunden ergibt null', () => {
    expect(normalizeOffProduct({ status: 'failure', product: null }, '1')).toBeNull();
    expect(normalizeOffProduct({ status: 0 }, '1')).toBeNull();
    expect(normalizeOffProduct('kaputt', '1')).toBeNull();
  });
});

describe('Formular Lebensmittel', () => {
  const base: FoodForm = {
    name: ' Haferflocken ',
    brand: '',
    barcode: '',
    basis: 'g',
    prep: 'keine',
    allergens: null,
    kcal: '370',
    protein: '13,5',
    carbs: '',
    fat: '7',
    serving: '',
  };
  test('leere Werte bleiben unbekannt, Komma wird gelesen', () =>
    expect(parseFoodForm(base)).toEqual({
      draft: {
        name: 'Haferflocken',
        brand: null,
        barcode: null,
        basis: 'g',
        prep: null,
        per100: { kcal: 370, protein: 13.5, carbs: null, fat: 7 },
        servingAmount: null,
        allergens: null,
      },
      problems: [],
    }));
  test('Fehler werden gesammelt', () =>
    expect(
      parseFoodForm({ ...base, name: ' ', kcal: 'abc', serving: '0', barcode: '4000000000002' }).problems
    ).toEqual(['name', 'nutrient', 'serving', 'barcode']));
  test('mehr als 100 g Makros pro 100 g ist ein Tippfehler', () =>
    expect(parseFoodForm({ ...base, protein: '60', carbs: '50', fat: '1' }).problems).toEqual(['macros']));
  test('hin und zurück ergibt dasselbe', () => {
    const draft = parseFoodForm({ ...base, prep: 'gekocht', barcode: '3017620422003', serving: '40' }).draft!;
    expect(parseFoodForm(foodToForm(draft)).draft).toEqual(draft);
  });
});

describe('Formular Rezept', () => {
  const base: RecipeForm = { name: 'Chili', endWeight: '800', portions: '', ingredients: [{ foodId: 'a', amount: '400' }] };
  test('gültig mit Endgewicht', () =>
    expect(parseRecipeForm(base).draft).toEqual({
      name: 'Chili',
      endWeightG: 800,
      portions: null,
      ingredients: [{ foodId: 'a', amount: 400 }],
    }));
  test('Endgewicht oder Portionen nötig', () =>
    expect(parseRecipeForm({ ...base, endWeight: '' }).problems).toEqual(['needOne']));
  test('Fehler werden gesammelt', () =>
    expect(
      parseRecipeForm({ name: '', endWeight: '0', portions: '0', ingredients: [{ foodId: 'a', amount: 'x' }] }).problems
    ).toEqual(['name', 'amount', 'endWeight', 'portions']));
  test('keine Zutaten', () => expect(parseRecipeForm({ ...base, ingredients: [] }).problems).toEqual(['ingredients']));
});

describe('Formular Einstellungen', () => {
  const base: SettingsForm = { kcalGoal: '', drinkGoal: '1500', glassSizes: [250], hideNumbers: false };
  test('leeres Ziel = kein Ziel', () => {
    const result = parseSettingsForm(base);
    expect(result.settings).toEqual({ drinkGoalMl: 1500, glassSizes: [250], hideNumbers: false });
    expect(result.kcalGoal).toBeNull();
  });
  test('Kalorienziel wird getrennt zurückgegeben (versioniert gespeichert)', () =>
    expect(parseSettingsForm({ ...base, kcalGoal: '2300' }).kcalGoal).toBe(2300));
  test('Tippfehler werden abgefangen', () =>
    expect(parseSettingsForm({ ...base, kcalGoal: '25000', drinkGoal: '1,5', glassSizes: [] }).problems).toEqual([
      'kcal',
      'drink',
      'glasses',
    ]));
});
