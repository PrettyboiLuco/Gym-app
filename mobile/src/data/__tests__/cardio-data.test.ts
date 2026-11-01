// Cardio (A2): Migration 20, Cardio im Plan und im Training, für sich, Wochenpunkte und Trainingstage.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { addCardio, completeCardio, getCardio, listCardio, listCardioForSession, setCardioTimer } from '../cardio';
import type { Db } from '../db';
import { trainingDays } from '../goals';
import { MIGRATIONS, migrate } from '../migrations';
import { createTestDb } from '../testing/node-db';
import { listActivePlans, loadPlanDraft, savePlan, startSession } from '../training';
import { loadTrainingWeek } from '../training-week';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const values = { minutes: 20, distanceKm: 3.1, avgHr: null, effort: 6, level: null, note: null };

describe('Cardio', () => {
  test('Migration 20 auf einer bestehenden Datenbank', async () => {
    const old = createTestDb();
    await old.execAsync('PRAGMA foreign_keys = ON;');
    for (let v = 0; v < 19; v++) await old.execAsync(MIGRATIONS[v]);
    await old.execAsync('PRAGMA user_version = 19');
    await migrate(old);
    const id = await addCardio(old, { activity: 'laufband', day: '2026-11-01' });
    expect((await getCardio(old, id))?.activity).toBe('laufband');
    old.close();
  });

  test('Cardio im Plan: gespeichert, geladen und beim Training als offener Eintrag angelegt', async () => {
    const planId = await savePlan(db, null, {
      name: 'P',
      days: [
        {
          name: 'Beine',
          items: [{ exerciseId: 'beinpresse', sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120 }],
          cardio: [{ activity: 'laufband', minutes: 15, atEnd: true }],
        },
        { name: 'Cardio', items: [], cardio: [{ activity: 'rudergeraet', minutes: 30, atEnd: false }] },
      ],
    });
    const draft = await loadPlanDraft(db, planId);
    expect(draft?.days.map((d) => d.cardio)).toEqual([
      [{ activity: 'laufband', minutes: 15, atEnd: true }],
      [{ activity: 'rudergeraet', minutes: 30, atEnd: false }],
    ]);
    const [plan] = await listActivePlans(db);
    const sessionId = await startSession(db, plan.days[1].id);
    const [entry] = await listCardioForSession(db, sessionId);
    expect(entry).toMatchObject({ activity: 'rudergeraet', plannedMinutes: 30, atEnd: 0, completedAt: null });

    await setCardioTimer(db, entry.id, true);
    expect((await getCardio(db, entry.id))?.timerStartedAt).not.toBeNull();
    await completeCardio(db, entry.id, values);
    expect(await getCardio(db, entry.id)).toMatchObject({ minutes: 20, distanceKm: 3.1, effort: 6, timerStartedAt: null });
  });

  test('Cardio für sich zählt als Trainingstag in Woche und Gewohnheit', async () => {
    const id = await addCardio(db, { activity: 'gehen', day: '2026-11-04' });
    await completeCardio(db, id, values);
    // Offene Einträge zählen nicht.
    await addCardio(db, { activity: 'laufen', day: '2026-11-05' });
    expect((await listCardio(db, '2026-11-02', '2026-11-08')).map((c) => c.day)).toEqual(['2026-11-04']);
    const week = await loadTrainingWeek(db, '2026-11-06');
    expect(week.done).toEqual([false, false, true, false, false, false, false]);
    expect(await trainingDays(db, '2026-11-01T00:00:00Z', 'Europe/Berlin')).toContain('2026-11-04');
  });
});
