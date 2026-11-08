// Prüfung 08.11.: Meilensteine aus SQL-Kennzahlen müssen genau dasselbe ergeben wie aus der vollen Satzliste.

import { afterEach, beforeEach, expect, test } from '@jest/globals';

import { loadModeOf } from '@/domain/logger';
import { milestones, summarizeSets } from '@/domain/motivation';

import type { Db } from '../db';
import { migrate } from '../migrations';
import { loadMotivation } from '../motivation';
import { createTestDb } from '../testing/node-db';
import { listExercises, listSessions, oldestActivityDay } from '../training';
import { allSets } from '../training-stats';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

test('Kennzahlen per SQL = Kennzahlen aus allen Sätzen (1000. Satz, erste 100 kg, Bestwert, Aufwärmen zählt nicht)', async () => {
  const ex = (await listExercises(db)).slice(0, 4);
  for (let s = 0; s < 45; s++) {
    const at = new Date(Date.parse('2026-01-05T17:00:00Z') + s * 2 * 86_400_000).toISOString();
    await db.runAsync("INSERT INTO workout_session (id, status, started_at_utc, finished_at_utc) VALUES (?, 'abgeschlossen', ?, ?)", `s${s}`, at, at);
    for (let p = 0; p < 25; p++) {
      const e = ex[p % ex.length];
      await db.runAsync(
        `INSERT INTO set_log (id, session_id, exercise_id, position, rest_seconds, weight_kg, reps, completed_at_utc, set_type)
         VALUES (?, ?, ?, ?, 0, ?, 8, ?, ?)`,
        `l${s}-${p}`,
        `s${s}`,
        e.id,
        p,
        40 + s * 2 + (p % 3) * 5,
        at,
        p === 0 ? 'aufwaermen' : 'arbeit'
      );
    }
  }
  const byId = new Map((await listExercises(db)).map((e) => [e.id, e]));
  const full = (await allSets(db))
    .filter((x) => x.setType !== 'aufwaermen')
    .map((x) => ({ ...x, normal: loadModeOf(byId.get(x.exerciseId)!) === 'normal' }));
  const m = await loadMotivation(db, '2026-11-08');
  const expected = milestones({ sessionDays: [], sets: full, weeks: [] }).map((x) => x.id);
  // Satz-Meilensteine und 100 kg wie aus der vollen Liste
  expect(m.milestones.map((x) => x.id).filter((id) => id.startsWith('saetze') || id === 'kg_100')).toEqual(expected);
  expect(m.stats.sets).toBe(full.length);
  expect(m.stats.bestKg).toBe(summarizeSets(full).bestKg);
  expect(m.milestones.find((x) => x.id === 'saetze_1000')?.day).toBe(full[999].day);
});

test('Verlauf: ab einem Datum alle Trainings (keine 50er-Grenze), ältester Tag bekannt', async () => {
  for (let s = 0; s < 70; s++) {
    const at = new Date(Date.parse('2026-01-01T17:00:00Z') + s * 86_400_000).toISOString();
    await db.runAsync("INSERT INTO workout_session (id, status, started_at_utc, finished_at_utc) VALUES (?, 'abgeschlossen', ?, ?)", `h${s}`, at, at);
  }
  expect(await listSessions(db)).toHaveLength(50);
  expect(await listSessions(db, 0, '2026-01-01T00:00:00.000Z')).toHaveLength(70);
  expect(await listSessions(db, 0, '2026-03-01T00:00:00.000Z')).toHaveLength(11);
  expect(await oldestActivityDay(db)).toBe('2026-01-01');
});
