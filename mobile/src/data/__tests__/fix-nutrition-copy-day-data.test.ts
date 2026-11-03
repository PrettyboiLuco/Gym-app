// Fehlerbehebung Ernährung: „Ganzen Vortag kopieren“ behält die Uhrzeit jedes Eintrags.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { Db } from '../db';
import { migrate } from '../migrations';
import { copyDay, listDay, logQuick } from '../nutrition';
import { createTestDb } from '../testing/node-db';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const at = (day: string, hour: number, minute = 0) => {
  const d = new Date(`${day}T00:00:00`);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const quick = { kcal: 300, protein: null, carbs: null, fat: null };
const clock = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours()}:${d.getMinutes()}`;
};

describe('Ganzen Tag kopieren', () => {
  test('Uhrzeit des Originals auf den neuen Tag verschoben', async () => {
    await logQuick(db, { name: 'Müsli', ...quick }, 'fruehstueck', { diaryDate: '2025-03-01', at: at('2025-03-01', 7, 15), timeZone: 'Europe/Berlin' });
    await logQuick(db, { name: 'Pasta', ...quick }, 'abend', { diaryDate: '2025-03-01', at: at('2025-03-01', 19, 30), timeZone: 'Europe/Berlin' });
    expect(await copyDay(db, '2025-03-01', { diaryDate: '2025-03-02', at: at('2025-03-02', 12), timeZone: 'Europe/Berlin' })).toBe(2);
    const copied = await listDay(db, '2025-03-02');
    const byName = Object.fromEntries(copied.map((e) => [e.name, e]));
    expect(clock(byName['Müsli'].occurredAt)).toBe('7:15');
    expect(clock(byName['Pasta'].occurredAt)).toBe('19:30');
    expect(new Date(byName['Pasta'].occurredAt).getDate()).toBe(2);
  });

  test('nie in der Zukunft: dann die übergebene Zeit', async () => {
    await logQuick(db, { name: 'Pasta', ...quick }, 'abend', { diaryDate: '2099-01-01', at: at('2099-01-01', 19), timeZone: 'Europe/Berlin' });
    const now = new Date();
    await copyDay(db, '2099-01-01', { diaryDate: '2099-01-02', at: now, timeZone: 'Europe/Berlin' });
    const [e] = await listDay(db, '2099-01-02');
    expect(new Date(e.occurredAt).getTime()).toBe(now.getTime());
  });
});
