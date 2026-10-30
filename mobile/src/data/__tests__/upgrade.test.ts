// Golden-Dataset vor/nach Update (Freigabematrix Kap. 18, R1 Datenverlust): Eine Datenbank im Stand von Version 4
// (Phase 4) mit Daten aus allen damaligen Bereichen wird auf die neueste Version gebracht. Jede gespeicherte Spalte muss
// unverändert bleiben, die Verweise müssen stimmen, und die heutige App muss die Daten lesen können.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { Db } from '../db';
import { MIGRATIONS, migrate } from '../migrations';
import { createTestDb } from '../testing/node-db';
import { listWeights } from '../weights';

let db: Db & { close(): void };

/** Datenbank wie bei einer App-Version mit Stand `version`. */
async function migrateTo(target: Db, version: number) {
  await target.execAsync('PRAGMA foreign_keys = ON;');
  for (let v = 0; v < version; v++) {
    await target.execAsync(MIGRATIONS[v]);
    await target.execAsync(`PRAGMA user_version = ${v + 1}`);
  }
}

const T = '2026-10-29T08:00:00Z';

/** Daten, wie sie die App in Version 4 geschrieben hätte (Spalten von damals). */
const GOLDEN = `
  INSERT INTO weight_entry VALUES ('w1', '2026-10-27', 81.2, '${T}'), ('w2', '2026-10-28', 80.9, '${T}');
  INSERT INTO plan VALUES ('p1', '${T}');
  INSERT INTO plan_version VALUES ('pv1', 'p1', 1, 'Ganzkörper', 0, '${T}'), ('pv2', 'p1', 2, 'Ganzkörper neu', 1, '${T}');
  INSERT INTO plan_day VALUES ('pd1', 'pv1', 0, 'Tag A'), ('pd2', 'pv2', 0, 'Tag A');
  INSERT INTO plan_item VALUES ('pi1', 'pd1', 0, 'kniebeuge', 3, 6, 10, 120), ('pi2', 'pd2', 0, 'bankdruecken', 4, 5, 8, 150);
  INSERT INTO workout_session VALUES ('s1', 'pd1', 'abgeschlossen', NULL, '${T}', '2026-10-29T09:00:00Z');
  INSERT INTO set_log VALUES ('l1', 's1', 'kniebeuge', 0, 6, 10, 120, 80, 8, '${T}'), ('l2', 's1', 'kniebeuge', 1, 6, 10, 120, 80, 7, '${T}');
  INSERT INTO app_state VALUES ('nutrition_settings', '{"kcalGoal":2400,"drinkGoalMl":2000,"glassSizes":[250,500],"hideNumbers":false}');
  INSERT INTO food VALUES ('f1', 'eigen', NULL, 'Haferflocken', NULL, 'g', 'roh', 370, 13.5, 58.7, 7, 50, 1, 0, NULL, '${T}', '${T}'),
                          ('f2', 'off', '4000000000000', 'Joghurt', 'Marke', 'g', NULL, 60, 4, NULL, 3, NULL, 0, 0, '${T}', '${T}', '${T}');
  INSERT INTO recipe VALUES ('r1', '${T}');
  INSERT INTO recipe_version VALUES ('rv1', 'r1', 1, 'Porridge', 400, 2, 1, '${T}');
  INSERT INTO recipe_ingredient VALUES ('ri1', 'rv1', 0, 'f1', 'Haferflocken', 80, 'g', 296, 10.8, 47, 5.6);
  INSERT INTO meal_template VALUES ('mt1', 'Frühstück', '${T}');
  INSERT INTO meal_template_item VALUES ('mti1', 'mt1', 0, 'f2', 150, 'g');
  INSERT INTO consumption_event VALUES
    ('c1', 'essen', 'fruehstueck', NULL, 'f1', NULL, 'Haferflocken', NULL, 60, 'g', 222, 8.1, 35.2, 4.2, '${T}', '${T}', 'Europe/Berlin', 60, '2026-10-29'),
    ('c2', 'getraenk', NULL, 'wasser', NULL, NULL, 'Wasser', NULL, 500, 'ml', 0, 0, 0, 0, '${T}', '${T}', 'Europe/Berlin', 60, '2026-10-29'),
    ('c3', 'essen', 'abend', NULL, NULL, 'rv1', 'Porridge', NULL, 1, 'portion', NULL, NULL, NULL, NULL, '${T}', '${T}', 'Europe/Berlin', 60, '2026-10-29');
  INSERT INTO calorie_goal VALUES ('cg1', '2026-10-28', 2300, 'rechner', '{"weightKg":81}', '${T}');
  INSERT INTO goal VALUES ('g1', 'gewicht', '${T}'), ('g2', 'kraft', '${T}'), ('g3', 'gewohnheit', '${T}');
  INSERT INTO goal_version VALUES
    ('gv1', 'g1', 1, '2026-10-27', 'aktiv', 'abnehmen', 78, 81.2, NULL, NULL, NULL, NULL, '${T}'),
    ('gv2', 'g2', 1, '2026-10-27', 'aktiv', NULL, 100, NULL, 'kniebeuge', 5, NULL, NULL, '${T}'),
    ('gv3', 'g3', 1, '2026-10-27', 'beendet', NULL, NULL, NULL, NULL, NULL, 'trinken', 5, '${T}');
  INSERT INTO body_measurement VALUES ('b1', '2026-10-28', 'taille', 86.5, '${T}');
`;

const TABLES = [
  'weight_entry', 'plan', 'plan_version', 'plan_day', 'plan_item', 'workout_session', 'set_log', 'app_state', 'food',
  'recipe', 'recipe_version', 'recipe_ingredient', 'meal_template', 'meal_template_item', 'consumption_event',
  'calorie_goal', 'goal', 'goal_version', 'body_measurement',
];

/** Alle Zeilen aller Tabellen, nur mit den Spalten, die es in Version 4 schon gab. */
async function snapshot(target: Db, columns: Record<string, string[]>) {
  const out: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    const where = table === 'app_state' ? ` WHERE key = 'nutrition_settings'` : '';
    out[table] = await target.getAllAsync(`SELECT ${columns[table].join(', ')} FROM ${table}${where} ORDER BY rowid`);
  }
  return out;
}

async function columnsOf(target: Db) {
  const columns: Record<string, string[]> = {};
  for (const table of TABLES) {
    columns[table] = (await target.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map((c) => c.name);
  }
  return columns;
}

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => db.close());

describe('Update von Version 4 auf die neueste Version (Golden-Dataset)', () => {
  test('alle alten Daten bleiben Spalte für Spalte erhalten', async () => {
    await migrateTo(db, 4);
    await db.execAsync(GOLDEN);
    const columns = await columnsOf(db);
    const before = await snapshot(db, columns);
    expect(before.set_log).toHaveLength(2);

    await migrate(db);

    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(MIGRATIONS.length);
    expect(await snapshot(db, columns)).toEqual(before);
    expect(await db.getAllAsync('PRAGMA foreign_key_check')).toEqual([]);
  });

  test('neue Spalten sind bei alten Daten „unbekannt“ bzw. Standard, nicht erfunden', async () => {
    await migrateTo(db, 4);
    await db.execAsync(GOLDEN);
    await migrate(db);
    const food = await db.getAllAsync<{ fiber: number | null; allergens: string | null }>('SELECT fiber, allergens FROM food ORDER BY rowid');
    expect(food).toEqual([
      { fiber: null, allergens: null },
      { fiber: null, allergens: null },
    ]);
    const goal = await db.getFirstAsync<{ training_kcal: number | null; protein_g: number | null }>(
      "SELECT training_kcal, protein_g FROM calorie_goal WHERE id = 'cg1'"
    );
    expect(goal).toEqual({ training_kcal: null, protein_g: null });
  });

  test('die heutige App liest die alten Daten', async () => {
    await migrateTo(db, 4);
    await db.execAsync(GOLDEN);
    await migrate(db);
    expect((await listWeights(db)).map((w) => w.kg)).toEqual(expect.arrayContaining([81.2, 80.9]));
  });

  test('Update von jeder Zwischenversion läuft durch', async () => {
    for (let start = 0; start < MIGRATIONS.length; start++) {
      const fresh = createTestDb();
      await migrateTo(fresh, start);
      await migrate(fresh);
      const v = await fresh.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      expect([start, v?.user_version]).toEqual([start, MIGRATIONS.length]);
      fresh.close();
    }
  });
});
