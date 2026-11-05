// Beendetes Training bearbeiten, löschen und Krafttraining nachtragen (Prüfung 05.11.2026).

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { localDay, localMinutes, zonedTime } from '@/domain/time';
import { groupRows, orderForNewSet, parseEditRows, parseWorkoutTime, rowTexts, setTimes, type EditRow } from '@/domain/workout-edit';

import { addCardio, completeCardio } from '../cardio';
import type { Db } from '../db';
import { trainingDays } from '../goals';
import { migrate } from '../migrations';
import { createTestDb } from '../testing/node-db';
import { addSet, completeSet, exerciseBests, finishSession, getSession, listSessions, listSessionSets, savePlan, startSession } from '../training';
import { deleteWorkout, loadWorkoutForEdit, plannedSetsForDay, saveWorkout } from '../workout-edit';

const TZ = 'Europe/Berlin';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

const row = (over: Partial<EditRow>): EditRow => ({
  key: 'k',
  id: null,
  exerciseId: 'kniebeuge',
  order: 0,
  setType: 'arbeit',
  timed: false,
  weight: '',
  reps: '',
  seconds: '',
  plannedRepsMin: null,
  plannedRepsMax: null,
  plannedSeconds: null,
  restSeconds: 90,
  superset: null,
  ...over,
});

async function finishedWorkout(sets: [string, number, number][]) {
  const id = await startSession(db, null);
  for (const [exerciseId] of sets) await addSet(db, id, exerciseId);
  const rows = await listSessionSets(db, id);
  for (const [i, [, kg, reps]] of sets.entries()) await completeSet(db, rows[i].id, kg, reps);
  await finishSession(db, id, 'abgeschlossen');
  return id;
}

describe('Zeit: Ortszeit ↔ UTC', () => {
  test('Winter, Sommer und Zeitumstellung in Berlin', () => {
    expect(zonedTime('2026-01-15', 18 * 60 + 30, TZ).toISOString()).toBe('2026-01-15T17:30:00.000Z');
    expect(zonedTime('2026-07-15', 18 * 60 + 30, TZ).toISOString()).toBe('2026-07-15T16:30:00.000Z');
    // 2:30 gibt es am 29.03. nicht – rückt auf 3:30 Sommerzeit.
    expect(zonedTime('2026-03-29', 2 * 60 + 30, TZ).toISOString()).toBe('2026-03-29T01:30:00.000Z');
    expect(zonedTime('2026-10-25', 23 * 60 + 40, TZ).toISOString()).toBe('2026-10-25T22:40:00.000Z');
    expect(localMinutes(new Date('2026-07-15T16:30:00Z'), TZ)).toBe(18 * 60 + 30);
    expect(localDay(zonedTime('2026-11-05', 0, TZ), TZ)).toBe('2026-11-05');
  });

  test('Eingaben prüfen: Uhrzeit, Dauer, nicht in der Zukunft', () => {
    const now = Date.parse('2026-11-05T12:00:00Z');
    expect(parseWorkoutTime({ day: '2026-11-04', time: '18:30', minutes: '75' }, TZ, now)).toEqual({
      startedAtUtc: '2026-11-04T17:30:00.000Z',
      finishedAtUtc: '2026-11-04T18:45:00.000Z',
    });
    expect(parseWorkoutTime({ day: '2026-11-04', time: '18.30', minutes: '75' }, TZ, now)).toHaveProperty('startedAtUtc');
    expect(parseWorkoutTime({ day: '2026-11-04', time: '25:00', minutes: '60' }, TZ, now)).toEqual({ problem: 'zeit' });
    expect(parseWorkoutTime({ day: '2026-11-04', time: '18:00', minutes: '0' }, TZ, now)).toEqual({ problem: 'dauer' });
    expect(parseWorkoutTime({ day: '2026-11-04', time: '18:00', minutes: '601' }, TZ, now)).toEqual({ problem: 'dauer' });
    expect(parseWorkoutTime({ day: '2026-11-05', time: '18:00', minutes: '60' }, TZ, now)).toEqual({ problem: 'zukunft' });
  });
});

describe('Eingaben der Sätze', () => {
  test('leere Zeilen fallen weg, leeres Gewicht = 0, lb wird kg', () => {
    const { sets, invalid } = parseEditRows(
      [
        row({ key: 'a', weight: '100', reps: '5', order: 0 }),
        row({ key: 'b', order: 1 }),
        row({ key: 'c', exerciseId: 'klimmzug', weight: '', reps: '8', order: 2 }),
      ],
      'kg'
    );
    expect(invalid).toEqual([]);
    expect(sets.map((s) => [s.exerciseId, s.weightKg, s.reps])).toEqual([
      ['kniebeuge', 100, 5],
      ['klimmzug', 0, 8],
    ]);
    expect(parseEditRows([row({ weight: '225', reps: '5' })], 'lb').sets[0].weightKg).toBeCloseTo(102.06, 2);
  });

  test('ungültige Zeilen melden ihren Schlüssel, Zeit-Sätze brauchen Sekunden', () => {
    const { invalid } = parseEditRows(
      [row({ key: 'a', weight: '100', reps: '0' }), row({ key: 'b', weight: '-5', reps: '5' }), row({ key: 'c', timed: true, weight: '10' })],
      'kg'
    );
    expect(invalid).toEqual(['a', 'b', 'c']);
    const timed = parseEditRows([row({ timed: true, seconds: '45' })], 'kg').sets[0];
    expect(timed).toMatchObject({ seconds: 45, reps: null, weightKg: 0 });
  });

  test('Feldtexte aus gespeicherten Sätzen (lb, Zeit-Satz ohne Gewicht)', () => {
    expect(rowTexts({ weightKg: 60, reps: 8, seconds: null }, 'kg')).toEqual({ weight: '60', reps: '8', seconds: '' });
    expect(rowTexts({ weightKg: 0, reps: null, seconds: 45 }, 'kg')).toEqual({ weight: '', reps: '', seconds: '45' });
  });

  test('neuer Satz landet hinter dem letzten Satz der Übung, auch im Supersatz', () => {
    const rows = [
      { exerciseId: 'a', order: 0 },
      { exerciseId: 'b', order: 1 },
      { exerciseId: 'a', order: 2 },
      { exerciseId: 'b', order: 3 },
    ];
    expect(orderForNewSet(rows, 'a')).toBe(2.5);
    expect(orderForNewSet(rows, 'b')).toBe(4);
    expect(orderForNewSet(rows, 'neu')).toBe(4);
    expect(orderForNewSet([], 'neu')).toBe(0);
    expect(groupRows(rows).map((g) => [g.exerciseId, g.rows.length])).toEqual([
      ['a', 2],
      ['b', 2],
    ]);
  });

  test('Satzzeiten: bestehende wandern mit, neue verteilen sich im Fenster', () => {
    const previous = new Map([['s1', '2026-11-04T17:10:00.000Z']]);
    const times = setTimes([{ id: 's1' }, { id: null }], previous, {
      oldStartUtc: '2026-11-04T17:00:00.000Z',
      startedAtUtc: '2026-11-03T17:00:00.000Z',
      finishedAtUtc: '2026-11-03T18:00:00.000Z',
    });
    expect(times).toEqual(['2026-11-03T17:10:00.000Z', '2026-11-03T17:40:00.000Z']);
  });
});

describe('Training bearbeiten', () => {
  test('Gewicht korrigieren, Satz entfernen, Satz hinzufügen, Zeit verschieben', async () => {
    const id = await finishedWorkout([
      ['kniebeuge', 100, 5],
      ['kniebeuge', 100, 5],
      ['bankdruecken', 80, 8],
    ]);
    const loaded = (await loadWorkoutForEdit(db, id))!;
    const [first, , bench] = loaded.sets;
    await saveWorkout(db, {
      sessionId: id,
      startedAtUtc: '2026-11-03T17:00:00.000Z',
      finishedAtUtc: '2026-11-03T18:00:00.000Z',
      sets: [
        { ...first, id: first.id, weightKg: 102.5, reps: 5, seconds: null },
        { ...bench, id: bench.id, weightKg: 80, reps: 8, seconds: null },
        { ...bench, id: null, weightKg: 80, reps: 7, seconds: null },
      ],
    });
    const sets = await listSessionSets(db, id);
    expect(sets.map((s) => [s.exerciseId, s.weightKg, s.reps, s.position])).toEqual([
      ['kniebeuge', 102.5, 5, 0],
      ['bankdruecken', 80, 8, 1],
      ['bankdruecken', 80, 7, 2],
    ]);
    expect(sets.every((s) => s.completedAt! >= '2026-11-03T17:00:00.000Z' && s.completedAt! <= '2026-11-03T18:00:00.000Z')).toBe(true);
    const session = (await getSession(db, id))!;
    expect([session.startedAt, session.finishedAt, session.status]).toEqual(['2026-11-03T17:00:00.000Z', '2026-11-03T18:00:00.000Z', 'abgeschlossen']);
    expect(await trainingDays(db, '2026-11-01T00:00:00.000Z', TZ)).toEqual(['2026-11-03']);
    expect((await exerciseBests(db, 'kniebeuge'))[0].weightKg).toBe(102.5);
  });

  test('laufendes Training lässt sich hier weder laden noch speichern noch löschen', async () => {
    const id = await startSession(db, null);
    expect(await loadWorkoutForEdit(db, id)).toBeNull();
    await expect(
      saveWorkout(db, { sessionId: id, startedAtUtc: '2026-11-03T17:00:00.000Z', finishedAtUtc: '2026-11-03T18:00:00.000Z', sets: [] })
    ).rejects.toThrow();
    await expect(deleteWorkout(db, id)).rejects.toThrow();
    expect((await getSession(db, id))?.status).toBe('aktiv');
  });
});

describe('Training löschen', () => {
  test('Sätze und Cardio darin weg, Bestleistungen ohne es, anderes bleibt', async () => {
    const keep = await finishedWorkout([['kniebeuge', 100, 5]]);
    const gone = await finishedWorkout([['kniebeuge', 140, 3]]);
    const cardio = await addCardio(db, { activity: 'laufband', sessionId: gone });
    await completeCardio(db, cardio, { minutes: 10, distanceKm: null, avgHr: null, effort: null, level: null, note: null });
    await deleteWorkout(db, gone);
    expect(await getSession(db, gone)).toBeNull();
    expect(await db.getFirstAsync('SELECT id FROM set_log WHERE session_id = ?', gone)).toBeNull();
    expect(await db.getFirstAsync('SELECT id FROM cardio_log WHERE session_id = ?', gone)).toBeNull();
    expect((await listSessions(db)).map((s) => s.id)).toEqual([keep]);
    expect((await exerciseBests(db, 'kniebeuge')).map((b) => b.weightKg)).toEqual([100]);
  });
});

describe('Training nachtragen', () => {
  test('freies Training mit Datum in der Vergangenheit', async () => {
    const id = await saveWorkout(db, {
      sessionId: null,
      startedAtUtc: '2026-10-20T16:00:00.000Z',
      finishedAtUtc: '2026-10-20T17:00:00.000Z',
      sets: parseEditRows([row({ weight: '60', reps: '10' }), row({ key: 'b', weight: '60', reps: '9', order: 1 })], 'kg').sets,
    });
    const session = (await getSession(db, id))!;
    expect(session.status).toBe('abgeschlossen');
    expect((await listSessionSets(db, id)).map((s) => s.reps)).toEqual([10, 9]);
    expect(await trainingDays(db, '2026-10-01T00:00:00.000Z', TZ)).toEqual(['2026-10-20']);
  });

  test('mit Plantag: Vorlage in Trainingsreihenfolge, Plantag am Training', async () => {
    const planId = await savePlan(db, null, {
      name: 'Plan',
      days: [
        {
          name: 'A',
          items: [
            { exerciseId: 'kniebeuge', sets: 2, repsMin: 5, repsMax: 8, restSeconds: 120, superset: null },
            { exerciseId: 'plank', sets: 1, repsMin: 1, repsMax: 1, restSeconds: 60, superset: null, targetSeconds: 45 },
          ],
        },
      ],
    } as Parameters<typeof savePlan>[2]);
    const day = await db.getFirstAsync<{ id: string }>(
      'SELECT d.id FROM plan_day d JOIN plan_version v ON v.id = d.plan_version_id WHERE v.plan_id = ?',
      planId
    );
    const planned = await plannedSetsForDay(db, day!.id);
    expect(planned.map((p) => [p.exerciseId, p.plannedRepsMax, p.plannedSeconds])).toEqual([
      ['kniebeuge', 8, null],
      ['kniebeuge', 8, null],
      ['plank', null, 45],
    ]);
    const id = await saveWorkout(db, {
      sessionId: null,
      planDayId: day!.id,
      startedAtUtc: '2026-10-21T16:00:00.000Z',
      finishedAtUtc: '2026-10-21T17:00:00.000Z',
      sets: [{ ...planned[0], id: null, setType: 'arbeit', weightKg: 100, reps: 8, seconds: null }],
    });
    const session = (await getSession(db, id))!;
    expect(session.dayName).toBe('A');
    expect((await listSessionSets(db, id))[0]).toMatchObject({ plannedRepsMin: 5, plannedRepsMax: 8, restSeconds: 120 });
  });
});
