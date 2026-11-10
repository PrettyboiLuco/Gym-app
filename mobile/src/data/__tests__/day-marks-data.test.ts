// Verlauf: Ruhetag und Krank für einen einzelnen Tag (fin-Vergleich, 10.11.2026).

import { afterEach, beforeEach, expect, test } from '@jest/globals';

import { exportBackup, restoreBackup } from '../backup';
import { listDayMarks, setRestDay } from '../day-marks';
import type { Db } from '../db';
import { migrate } from '../migrations';
import { clearStatusDay, listStatus, setStatusDay, startStatus } from '../readiness';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

test('Ruhetag setzen, aufheben und in der Sicherung', async () => {
  await setRestDay(db, '2026-11-05', true);
  await setRestDay(db, '2026-11-05', true);
  expect(await listDayMarks(db, '2026-11-01', '2026-11-30')).toEqual([{ day: '2026-11-05', kind: 'ruhetag' }]);
  const backup = await exportBackup(db, null);
  await setRestDay(db, '2026-11-05', false);
  expect(await listDayMarks(db, '2026-11-01', '2026-11-30')).toEqual([]);
  await restoreBackup(db, backup);
  expect(await listDayMarks(db, '2026-11-01', '2026-11-30')).toHaveLength(1);
});

test('Krank an einem vergangenen Tag: ein Tag, aufhebbar; laufender Zeitraum bleibt unberührt', async () => {
  await setStatusDay(db, 'krank', '2026-11-03');
  expect((await listStatus(db)).map((p) => [p.status, p.fromDay, p.toDay])).toEqual([['krank', '2026-11-03', '2026-11-03']]);
  await clearStatusDay(db, '2026-11-03');
  expect(await listStatus(db)).toEqual([]);
  await startStatus(db, 'verletzt', '2026-11-08');
  await setStatusDay(db, 'krank', '2026-11-09'); // schon abgedeckt
  expect(await listStatus(db)).toHaveLength(1);
});
