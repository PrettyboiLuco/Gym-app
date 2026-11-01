// Grundnahrungsmittel offline (Ausbauplan A4): mitgelieferte Liste beim Start einspielen bzw. aktualisieren.
// Regeln: verknüpfte Einträge (catalog_id) werden aktualisiert; geänderte (nur noch catalog_origin) bleiben unberührt
// und werden auch nicht neu angelegt; fehlende kommen dazu. Läuft nur, wenn sich die Listen-Version geändert hat.

import { BASIS_VERSION, searchTermsOf, type BasisFood } from '@/domain/basis-foods';
import { BASIS_FOODS } from '@/domain/basis-foods-data';

import { readState, writeState } from './app-state';
import { newId, nowUtc, type Db } from './db';

function values(f: BasisFood) {
  const [kcal, protein, carbs, fat, fiber, sugar, satFat, salt] = f.per100;
  return [
    f.name,
    f.basis,
    f.prep,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    satFat,
    salt,
    f.serving,
    searchTermsOf(f),
    JSON.stringify(f.portions),
    JSON.stringify(f.micros),
    f.allergens === null ? null : JSON.stringify(f.allergens),
    f.diet,
  ] as const;
}

export async function syncBasisFoods(db: Db, foods: readonly BasisFood[] = BASIS_FOODS, version = BASIS_VERSION): Promise<number> {
  const stored = await readState<number>(db, 'basis_foods_version', 0);
  if (stored >= version || foods.length === 0) return 0;
  let changed = 0;
  await db.withTransactionAsync(async () => {
    const linked = new Set((await db.getAllAsync<{ id: string }>('SELECT catalog_id AS id FROM food WHERE catalog_id IS NOT NULL')).map((r) => r.id));
    const detached = new Set(
      (await db.getAllAsync<{ id: string }>('SELECT catalog_origin AS id FROM food WHERE catalog_origin IS NOT NULL AND catalog_id IS NULL')).map((r) => r.id)
    );
    const now = nowUtc();
    for (const f of foods) {
      if (linked.has(f.id)) {
        await db.runAsync(
          `UPDATE food SET name = ?, basis = ?, prep = ?, kcal = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, sugar = ?, sat_fat = ?,
           salt = ?, serving_amount = ?, search_terms = ?, portions = ?, micros = ?, allergens = ?, diet = ?, updated_at_utc = ?
           WHERE catalog_id = ?`,
          ...values(f),
          now,
          f.id
        );
      } else if (!detached.has(f.id)) {
        await db.runAsync(
          `INSERT INTO food (id, source, barcode, name, basis, prep, kcal, protein, carbs, fat, fiber, sugar, sat_fat, salt, serving_amount,
           search_terms, portions, micros, allergens, diet, favorite, created_at_utc, updated_at_utc, catalog_id, catalog_origin)
           VALUES (?, 'eigen', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
          newId(),
          ...values(f),
          now,
          now,
          f.id,
          f.id
        );
      } else continue;
      changed++;
    }
  });
  await writeState(db, 'basis_foods_version', version);
  return changed;
}
