// Grundnahrungsmittel (A4): Plausibilität der mitgelieferten Liste und Suche.

import { describe, expect, test } from '@jest/globals';

import { BASIS_FOODS } from '../basis-foods-data';
import { BOOK_INGREDIENTS } from '../recipe-book-data';
import { BOOK_TO_BASIS } from '../recipe-book-basis';
import { MICRO_KEYS, editDistance, fuzzyBasis, scaleMicros, sumMicros } from '../basis-foods';
import { foldText } from '../text';

// Abweichung von Atwater (4/4/9 + 2 für Ballaststoffe) ist hier echt: Alkohol (7 kcal/g), Backtriebmittel,
// Kakao und Haferkleie (USDA rechnet mit eigenen Faktoren).
const ATWATER_EXCEPTIONS = /Bier|wein|Spirituosen|Vanilleextrakt|Backpulver|Kakaopulver|Haferkleie/;

describe('Grundnahrungsmittel-Liste', () => {
  test('genug Einträge, eindeutige IDs und Namen', () => {
    expect(BASIS_FOODS.length).toBeGreaterThan(400);
    expect(new Set(BASIS_FOODS.map((f) => f.id)).size).toBe(BASIS_FOODS.length);
    expect(new Set(BASIS_FOODS.map((f) => foldText(f.name))).size).toBe(BASIS_FOODS.length);
  });

  test('Nährwerte plausibel', () => {
    for (const f of BASIS_FOODS) {
      const [kcal, protein, carbs, fat, fiber, sugar, satFat, salt] = f.per100;
      for (const v of [kcal, protein, carbs, fat]) expect(v).toBeGreaterThanOrEqual(0);
      expect(protein + carbs + fat + (fiber ?? 0)).toBeLessThanOrEqual(101);
      // Zucker gehört zu den Kohlenhydraten (USDA misst getrennt, daher Ballaststoffe als Rundungspuffer)
      if (sugar != null) expect(sugar).toBeLessThanOrEqual(carbs + (fiber ?? 0) + 0.5);
      if (satFat != null) expect(satFat).toBeLessThanOrEqual(fat + 0.1);
      if (salt != null) expect(salt).toBeLessThan(100);
      if (!ATWATER_EXCEPTIONS.test(f.name)) {
        const est = 4 * protein + 4 * carbs + 9 * fat + 2 * (fiber ?? 0);
        expect([f.name, Math.abs(est - kcal) <= Math.max(25, 0.2 * kcal)]).toEqual([f.name, true]);
      }
    }
  });

  test('Portionen und Mikronährstoffe', () => {
    for (const f of BASIS_FOODS) {
      for (const p of f.portions) expect(p.g).toBeGreaterThan(0);
      if (f.serving != null) expect(f.serving).toBeGreaterThan(0);
      for (const k of Object.keys(f.micros)) expect(MICRO_KEYS).toContain(k);
      for (const v of Object.values(f.micros)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  test('wichtige Grundnahrungsmittel sind dabei', () => {
    const names = BASIS_FOODS.map((f) => foldText([f.name, ...f.synonyms].join(' ')));
    for (const q of ['haferflocken', 'reis', 'banane', 'magerquark', 'skyr', 'ei', 'haehnchenbrust', 'kartoffel', 'olivenoel', 'brokkoli', 'lachs', 'tofu', 'vollmilch'])
      expect([q, names.some((n) => n.split(' ').some((w) => w.startsWith(q)))]).toEqual([q, true]);
  });
});

describe('Suche und Mikros', () => {
  test('Tippfehler und Synonyme', () => {
    expect(editDistance('hafer', 'hafer')).toBe(0);
    expect(editDistance('haferflockn', 'haferflocken')).toBe(1);
    expect(fuzzyBasis('Haferflockn', BASIS_FOODS)[0]?.name).toMatch(/Haferflocken/);
    expect(fuzzyBasis('Brokoli', BASIS_FOODS).some((f) => /Brokkoli/.test(f.name))).toBe(true);
    expect(fuzzyBasis('xy', BASIS_FOODS)).toEqual([]);
  });

  test('Mengen skalieren und Tagessumme mit Abdeckung', () => {
    expect(scaleMicros({ calcium: 120, vitD: 1 }, 2)).toEqual({ calcium: 240, vitD: 2 });
    expect(scaleMicros(null, 2)).toBeNull();
    expect(sumMicros([{ calcium: 100 }, null, { calcium: 50, iron: 2 }])).toEqual({ values: { calcium: 150, iron: 2 }, known: 2, total: 3 });
  });
});

describe('Zuordnung Rezeptbuch und Ernährungsweise', () => {
  test('jede Zuordnung zeigt auf vorhandene Einträge mit ähnlichen Werten', () => {
    const byId = new Map(BASIS_FOODS.map((f) => [f.id, f]));
    for (const [key, id] of Object.entries(BOOK_TO_BASIS)) {
      const book = BOOK_INGREDIENTS[key];
      const basis = byId.get(id);
      expect([key, !!book, !!basis]).toEqual([key, true, true]);
      // Flüssigkeiten mit Dichte ≈ 1 dürfen zwischen g und ml wechseln (kleine Mengen)
      if (!['zitronensaft', 'sojasauce'].includes(key)) expect([key, basis!.basis]).toEqual([key, book.basis]);
      // Kakao: USDA rechnet mit eigenen Energiefaktoren
      if (key !== 'kakao') expect([key, Math.abs(basis!.per100[0] - book.per100[0]) <= Math.max(30, 0.2 * book.per100[0])]).toEqual([key, true]);
      expect([key, Math.abs(basis!.per100[1] - book.per100[1]) <= Math.max(3, 0.25 * book.per100[1])]).toEqual([key, true]);
    }
  });

  test('Tierprodukte sind nicht als vegan markiert', () => {
    const get = (name: string) => BASIS_FOODS.find((f) => f.name === name)!;
    expect(get('Butter')).toMatchObject({ diet: 'vegetarisch', allergens: ['milch'] });
    expect(get('Schweineschmalz').diet).toBe('nicht_vegetarisch');
    expect(get('Eiernudeln (roh)').allergens).toContain('eier');
    expect(get('Kartoffelpüree (mit Milch)').allergens).toContain('milch');
    expect(get('Sojadrink')).toMatchObject({ diet: 'vegan', allergens: ['soja'] });
    expect(get('Aubergine')).toMatchObject({ diet: 'vegan', allergens: [] });
    expect(get('Erdnussbutter (cremig, ohne Salz)').allergens).toEqual(['erdnuesse']);
  });
});
