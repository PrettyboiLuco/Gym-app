// Statistik und „Heute“: Verlauf der häufigsten Übungen, Vergleich mit dem Vorzeitraum, „Einrichten“ ausblenden.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import type { Db } from '../db';
import { migrate } from '../migrations';
import { loadSetupHidden, saveSetupHidden } from '../profile';
import { createTestDb } from '../testing/node-db';
import { loadExerciseTrends, loadPeriodComparison } from '../training-stats';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

async function session(id: string, start: string, sets: { ex: string; kg: number; reps: number }[]) {
  await db.runAsync("INSERT INTO workout_session (id, status, started_at_utc, finished_at_utc) VALUES (?, 'abgeschlossen', ?, ?)", id, start, start);
  for (const [i, s] of sets.entries())
    await db.runAsync(
      'INSERT INTO set_log (id, session_id, exercise_id, position, weight_kg, reps, rest_seconds, completed_at_utc) VALUES (?, ?, ?, ?, ?, ?, 90, ?)',
      `${id}-${i}`,
      id,
      s.ex,
      i,
      s.kg,
      s.reps,
      start
    );
}

describe('Statistik aus der Datenbank', () => {
  test('Verlauf: Gegengewicht-Maschine (weniger = besser) und 1RM der Kniebeuge', async () => {
    await session('a', '2026-10-20T17:00:00Z', [
      { ex: 'kniebeuge', kg: 100, reps: 5 },
      { ex: 'klimmzuege_maschine', kg: 40, reps: 8 },
    ]);
    await session('b', '2026-10-27T17:00:00Z', [
      { ex: 'kniebeuge', kg: 105, reps: 5 },
      { ex: 'kniebeuge', kg: 105, reps: 5 },
      { ex: 'klimmzuege_maschine', kg: 30, reps: 8 },
    ]);
    const trends = await loadExerciseTrends(db, '2026-11-04');
    expect(trends.map((t) => t.exerciseId)).toEqual(['kniebeuge', 'klimmzuege_maschine']);
    expect(trends[0]).toMatchObject({ metric: 'e1rm', record: { day: '2026-10-27', weightKg: 105, reps: 5 } });
    expect(trends[1]).toMatchObject({ metric: 'gegengewicht', latest: 30, record: { day: '2026-10-27', value: 30 } });
  });

  test('Vergleich: Zeitraum und Vorzeitraum aus denselben Sätzen', async () => {
    await session('a', '2026-10-02T17:00:00Z', [{ ex: 'kniebeuge', kg: 100, reps: 5 }]);
    await session('b', '2026-11-02T17:00:00Z', [
      { ex: 'kniebeuge', kg: 100, reps: 5 },
      { ex: 'kniebeuge', kg: 100, reps: 5 },
    ]);
    const { current, previous } = await loadPeriodComparison(db, { from: '2026-11-01', to: '2026-11-30' }, { from: '2026-10-01', to: '2026-10-04' });
    expect([current.sessions, current.sets, current.volumeKg]).toEqual([1, 2, 1000]);
    expect([previous.sessions, previous.sets, previous.volumeKg]).toEqual([1, 1, 500]);
  });
});

test('„Einrichten in 3 Schritten“: „Später“ bleibt gespeichert', async () => {
  expect(await loadSetupHidden(db)).toBe(false);
  await saveSetupHidden(db, true);
  expect(await loadSetupHidden(db)).toBe(true);
});
