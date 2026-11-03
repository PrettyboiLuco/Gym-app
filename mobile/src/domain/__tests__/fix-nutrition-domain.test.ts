// Fehlerbehebungen Ernährung (Mengen mit 3 Nachkommastellen, Großpackungen, Tausenderpunkt nur bei g/ml).

import { describe, expect, test } from '@jest/globals';

import { foodToForm, PACKAGE_MAX, parseAmount, parseFoodForm, type FoodDraft } from '../nutrition';
import { parseIngredientLine } from '../recipe-import';

const draft: FoodDraft = {
  name: 'Reis',
  brand: null,
  barcode: null,
  basis: 'g',
  per100: { kcal: 350, protein: 7, carbs: 78, fat: 0.6, fiber: null, sugar: null, satFat: null, salt: null },
  servingAmount: 1000 / 3,
  packageAmount: 10_000,
  allergens: null,
};

describe('Mengen', () => {
  test('angezeigte Menge mit 3 Nachkommastellen lässt sich wieder speichern (1000 g / 3 Portionen)', () => {
    expect(parseAmount('333,333')).toBe(333.333);
    expect(parseAmount('0,125')).toBe(0.125);
  });

  test('mehr als 3 Nachkommastellen und über 5000 bleiben ungültig', () => {
    expect(parseAmount('1,2345')).toBeNull();
    expect(parseAmount('5000,5')).toBeNull();
    expect(parseAmount('5000')).toBe(5000);
  });

  test('eigene Obergrenze für den Packungsinhalt', () => {
    expect(parseAmount('10000', PACKAGE_MAX)).toBe(10_000);
    expect(parseAmount('100001', PACKAGE_MAX)).toBeNull();
  });

  test('Formular eines Produkts mit 10-kg-Sack und gedrittelter Portion lässt sich unverändert speichern', () => {
    const form = foodToForm(draft);
    expect(form.serving).toBe('333,333');
    expect(form.package).toBe('10000');
    const r = parseFoodForm(form);
    expect(r.problems).toEqual([]);
    expect(r.draft).toMatchObject({ servingAmount: 333.333, packageAmount: 10_000 });
  });
});

describe('Rezept-Import: Tausenderpunkt', () => {
  const p = (l: string) => {
    const r = parseIngredientLine(l);
    return [r.amount, r.unit, r.name];
  };

  test('bei kg und l ist der Punkt ein Dezimalpunkt', () => {
    expect(p('1.250 kg Kartoffeln')).toEqual([1250, 'g', 'Kartoffeln']);
    expect(p('1.500 l Brühe')).toEqual([1500, 'ml', 'Brühe']);
    expect(p('1.250kg Mehl')).toEqual([1250, 'g', 'Mehl']);
  });

  test('bei g, ml und ohne Einheit bleibt der Tausenderpunkt', () => {
    expect(p('1.250 g Mehl')).toEqual([1250, 'g', 'Mehl']);
    expect(p('1.000 ml Milch')).toEqual([1000, 'ml', 'Milch']);
    expect(p('1.000 Reiskörner')).toEqual([1000, 'stueck', 'Reiskörner']);
  });
});
