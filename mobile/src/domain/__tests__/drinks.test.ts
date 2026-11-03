// Getränke erkennen: gescannte Getränke zählen als ml zur Trinkmenge, nicht als Gramm im Essen.

import { describe, expect, test } from '@jest/globals';

import { guessDrinkType, isLiquidQuantity, normalizeOffProduct } from '../nutrition';

describe('Getränk am Namen erkennen', () => {
  test.each([
    ['Gerolsteiner Mineralwasser', 'wasser'],
    ['Coca-Cola Zero', 'softdrink'],
    ['Red Bull Energy Drink', 'softdrink'],
    ['Orangensaft', 'saft'],
    ['Apfelschorle', 'saft'],
    ['Eistee Pfirsich', 'kaffee_tee'],
    ['Cold Brew Kaffee', 'kaffee_tee'],
    ['Haferdrink Barista', 'milch'],
    ['Frische Vollmilch 3,5 %', 'milch'],
    ['Pils', 'alkohol'],
  ])('%s → %s', (name, type) => expect(guessDrinkType(name)).toBe(type));

  test.each([
    'Kaffeebohnen ganze Bohne',
    'Milchschokolade',
    'Eistee-Pulver',
    'Milchreis',
    'Weizenbrötchen',
    'Tomaten passiert',
    'Teewurst',
    'Bio Erdnuss Butter Creamy',
  ])('%s ist kein Getränk', (name) => expect(guessDrinkType(name)).toBeNull());

  test('Kategorien von Open Food Facts haben Vorrang', () => {
    expect(guessDrinkType('Bio Zitrone', ['en:beverages', 'en:sodas'])).toBe('softdrink');
    expect(guessDrinkType('Gerolsteiner', ['en:mineral-waters'])).toBe('wasser');
  });

  test('Packungsangabe in Litern', () => {
    expect(isLiquidQuantity('0,5 l')).toBe(true);
    expect(isLiquidQuantity('330 ml')).toBe(true);
    expect(isLiquidQuantity('6 x 1.5L')).toBe(true);
    expect(isLiquidQuantity('500 g')).toBe(false);
    expect(isLiquidQuantity(undefined)).toBe(false);
  });
});

describe('Barcode-Produkt als Getränk', () => {
  const product = (p: Record<string, unknown>) =>
    normalizeOffProduct({ status: 1, product: { nutriments: { 'energy-kcal_100g': 42 }, ...p } }, '4000000000000');

  test('ohne Packungseinheit, aber „0,5 l“ in der Angabe → je 100 ml, Packung in ml', () => {
    const food = product({ product_name: 'Zitronenlimonade', quantity: '0,5 l', product_quantity: 0.5, product_quantity_unit: 'l' });
    expect(food?.basis).toBe('ml');
    expect(food?.packageAmount).toBe(500);
  });
  test('nur an der Kategorie erkennbar → ml', () => {
    expect(product({ product_name: 'Bio Zitrone', categories_tags: ['en:beverages', 'en:sodas'] })?.basis).toBe('ml');
  });
  test('Essen bleibt in Gramm', () => {
    expect(product({ product_name: 'Haferflocken', quantity: '500 g', product_quantity: 500, product_quantity_unit: 'g' })?.basis).toBe('g');
  });
});
