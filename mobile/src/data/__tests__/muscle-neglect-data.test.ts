// Muskel-Hinweis „zuletzt vor N Tagen“: Daten aus Plan und Sätzen (fin-Vergleich, 10.11.2026).

import { afterEach, beforeEach, expect, test } from '@jest/globals';

import { shiftDay } from '@/domain/dates';

import type { Db } from '../db';
import { migrate } from '../migrations';
import { startStatus } from '../readiness';
import { createTestDb } from '../testing/node-db';
import { savePlan } from '../training';
import { loadMuscleNeglect } from '../training-week';

const TODAY = '2026-11-10';
let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

async function trained(id: string, daysAgo: number, exerciseId: string, setType = 'arbeit') {
  const at = `${shiftDay(TODAY, -daysAgo)}T17:00:00.000Z`;
  await db.runAsync("INSERT INTO workout_session (id, status, started_at_utc, finished_at_utc, time_zone) VALUES (?, 'abgeschlossen', ?, ?, 'UTC')", id, at, at);
  await db.runAsync(
    `INSERT INTO set_log (id, session_id, exercise_id, position, rest_seconds, weight_kg, reps, completed_at_utc, set_type)
     VALUES (?, ?, ?, 0, 60, 20, 10, ?, ?)`,
    `${id}-1`,
    id,
    exerciseId,
    at,
    setType
  );
}

test('Schultern aus dem Plan seit 10 Tagen nicht → Hinweis; Aufwärmsätze zählen nicht; Status schweigt', async () => {
  await savePlan(db, null, {
    name: 'P',
    days: [
      {
        name: 'Oben',
        items: [
          { exerciseId: 'seitheben', sets: 3, repsMin: 10, repsMax: 15, restSeconds: 90 },
          { exerciseId: 'beinpresse', sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120 },
        ],
      },
    ],
  });
  expect(await loadMuscleNeglect(db, TODAY)).toBeNull(); // noch nie trainiert
  await trained('a', 10, 'seitheben');
  await trained('b', 2, 'beinpresse');
  await trained('c', 1, 'seitheben', 'aufwaermen');
  expect(await loadMuscleNeglect(db, TODAY)).toEqual({ group: 'schultern', days: 10, lastDay: shiftDay(TODAY, -10) });
  await startStatus(db, 'krank', TODAY);
  expect(await loadMuscleNeglect(db, TODAY)).toBeNull();
});
