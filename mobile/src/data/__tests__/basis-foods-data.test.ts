// Grundnahrungsmittel (A4): Einspielen, Aktualisieren, Abkoppeln bei Änderung, Suche, Mikros im Tagebuch.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { BasisFood } from '@/domain/basis-foods';
import { BASIS_FOODS } from '@/domain/basis-foods-data';

import { syncBasisFoods } from '../basis-foods';
import type { Db } from '../db';
import { migrate } from '../migrations';
import { getFood, listDay, logFood, saveFood, searchFoods, updateEvent } from '../nutrition';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const quark: BasisFood = {
  id: 'usda-test1',
  name: 'Magerquark',
  group: 'eier_milch',
  basis: 'g',
  prep: null,
  per100: [72, 10.3, 2.7, 0.3, 0, 1.9, 0.2, 0.08],
  micros: { calcium: 86, vitB12: 0.5 },
  portions: [{ label: '1 Becher', g: 250 }],
  serving: 250,
  synonyms: ['Speisequark mager'],
  allergens: ['milch'],
  diet: 'vegetarisch',
};
const oats: BasisFood = { ...quark, id: 'usda-test2', name: 'Haferflocken', group: 'getreide', per100: [379, 13.2, 57.6, 6.5, 10.1, 1, 1.1, 0.02], synonyms: ['Oats'], allergens: ['gluten'], diet: 'vegan' };
const when = { diaryDate: '2026-11-01', at: new Date('2026-11-01T08:00:00Z'), timeZone: 'Europe/Berlin' };
const idOf = async (catalog: string) => (await db.getFirstAsync<{ id: string }>('SELECT id FROM food WHERE catalog_origin = ?', catalog))!.id;

describe('Grundnahrungsmittel in der Datenbank', () => {
  test('einspielen nur bei neuer Version, verknüpfte aktualisieren, geänderte bleiben', async () => {
    expect(await syncBasisFoods(db, [quark, oats], 1)).toBe(2);
    expect(await syncBasisFoods(db, [quark, oats], 1)).toBe(0);
    const id = await idOf('usda-test1');
    expect(await getFood(db, id)).toMatchObject({ name: 'Magerquark', source: 'eigen', kcal: 72, catalogId: 'usda-test1', diet: 'vegetarisch' });

    // Nutzer ändert Haferflocken → abgekoppelt, Update lässt sie in Ruhe und legt sie nicht neu an
    const oatId = await idOf('usda-test2');
    const oatFood = (await getFood(db, oatId))!;
    await saveFood(db, oatId, {
      name: 'Meine Haferflocken',
      brand: null,
      barcode: null,
      basis: 'g',
      per100: { kcal: 370, protein: 13, carbs: 58, fat: 7, fiber: 10 },
      servingAmount: oatFood.servingAmount,
    });
    expect(await getFood(db, oatId)).toMatchObject({ catalogId: null, catalogOrigin: 'usda-test2' });

    expect(await syncBasisFoods(db, [{ ...quark, per100: [70, 11, 3, 0.2, 0, 2, 0.1, 0.1] }, { ...oats, name: 'Neu' }], 2)).toBe(1);
    expect((await getFood(db, id))!.kcal).toBe(70);
    expect((await getFood(db, oatId))!.name).toBe('Meine Haferflocken');
    expect((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM food'))!.n).toBe(2);
  });

  test('Suche über Synonyme, Umlaute und Tippfehler; Grundnahrungsmittel vor Produkten', async () => {
    await syncBasisFoods(db, BASIS_FOODS, 1);
    await saveFood(db, null, { name: 'Haferflocken Crunchy', brand: 'Marke', barcode: '400', basis: 'g', per100: { kcal: 450, protein: 9, carbs: 60, fat: 18, fiber: 6 }, servingAmount: null }, 'off');
    const oats = await searchFoods(db, 'Haferflocken');
    expect(oats[0].catalogId).not.toBeNull();
    expect(oats.at(-1)?.name).toBe('Haferflocken Crunchy');
    expect((await searchFoods(db, 'Hühnchen')).some((f) => /Hähnchen/.test(f.name))).toBe(true);
    expect((await searchFoods(db, 'Haferflockn')).some((f) => /Haferflocken/.test(f.name))).toBe(true);
  });

  test('Mikronährstoffe werden mitgebucht und beim Ändern der Menge skaliert', async () => {
    await syncBasisFoods(db, [quark], 1);
    const eventId = await logFood(db, await idOf('usda-test1'), 250, { kind: 'essen', meal: 'fruehstueck' }, when);
    let [e] = await listDay(db, '2026-11-01');
    expect(JSON.parse(e.microsJson!)).toEqual({ calcium: 215, vitB12: 1.25 });
    await updateEvent(db, eventId, { amount: 500, meal: 'fruehstueck', diaryDate: '2026-11-01' });
    [e] = await listDay(db, '2026-11-01');
    expect(JSON.parse(e.microsJson!)).toEqual({ calcium: 430, vitB12: 2.5 });
  });
});

test('genauer Synonym-Treffer zuerst: „Eier“ → Hühnerei vor Aubergine („Eierfrucht“)', async () => {
  await syncBasisFoods(db, BASIS_FOODS, 1);
  const [first] = await searchFoods(db, 'Eier');
  expect(first.name).toBe('Hühnerei (roh)');
});
