// Fehler aus dem Phase 1 Scan (docs/Phase_1_Scan.md), Datenschicht – je Fehler ein Test, damit er nicht zurückkommt.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { Db } from '../db';
import { migrate } from '../migrations';
import { createTestDb } from '../testing/node-db';
import { startSession } from '../training';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

describe('Phase 1 Scan – Daten', () => {
  test('F2: Doppeltipp auf „Training starten“ legt nur ein Training an', async () => {
    const a = await startSession(db, null);
    const b = await startSession(db, null);
    expect(b).toBe(a);
    const rows = await db.getAllAsync<{ id: string }>("SELECT id FROM workout_session WHERE status = 'aktiv'");
    expect(rows).toHaveLength(1);
  });
});
