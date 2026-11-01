import { describe, expect, test } from '@jest/globals';

import { lateCaffeineMg } from '../caffeine';
import { normalizeOffProduct, parseFoodForm, sumNutrients } from '../nutrition';

describe('Ernährung schneller (A3)', () => {
  test('Open Food Facts: Zucker, gesättigte Fette, Salz, Packung und Koffein werden übernommen', () => {
    const draft = normalizeOffProduct(
      {
        status: 1,
        product: {
          product_name_de: 'Energy Drink',
          product_quantity: 250,
          product_quantity_unit: 'ml',
          nutriments: { 'energy-kcal_100g': 45, sugars_100g: 11, 'saturated-fat_100g': 0, salt_100g: 0.2, caffeine_100g: 0.032 },
        },
      },
      '4000000000000'
    );
    expect(draft?.basis).toBe('ml');
    expect(draft?.per100).toMatchObject({ kcal: 45, sugar: 11, satFat: 0, salt: 0.2 });
    expect(draft?.packageAmount).toBe(250);
    expect(draft?.caffeine).toBe(32);
  });

  test('Formular: neue Felder freiwillig, ungültige gemeldet', () => {
    const base = { name: 'X', brand: '', barcode: '', basis: 'g' as const, prep: 'keine' as const, kcal: '100', protein: '', carbs: '', fat: '', fiber: '', serving: '', allergens: null };
    expect(parseFoodForm(base).draft?.per100).toMatchObject({ sugar: null, satFat: null, salt: null });
    expect(parseFoodForm({ ...base, sugar: '12,5', salt: '0,8', package: '500' }).draft).toMatchObject({ per100: { sugar: 12.5, salt: 0.8 }, packageAmount: 500 });
    expect(parseFoodForm({ ...base, salt: 'viel' }).problems).toContain('nutrient');
  });

  test('Summen: Einträge ohne Zuckerangabe zählen als unbekannt, nicht als 0', () => {
    const sums = sumNutrients([
      { kcal: 100, protein: 1, carbs: 20, fat: 1, fiber: null, sugar: 10 },
      { kcal: 50, protein: 1, carbs: 5, fat: 1, fiber: null },
    ]);
    expect(sums.values.sugar).toBe(10);
    expect(sums.unknown.sugar).toBe(1);
  });

  test('Koffein am Nachmittag (für das spätere Journal)', () => {
    const at = (h: number) => new Date(2026, 10, 1, h, 0).toISOString();
    expect(lateCaffeineMg([{ caffeineMg: 90, occurredAt: at(8) }, { caffeineMg: 80, occurredAt: at(15) }, { caffeineMg: null, occurredAt: at(16) }])).toBe(80);
  });
});
