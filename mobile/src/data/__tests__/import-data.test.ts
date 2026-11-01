// A5: Strong-/Hevy-Import und Gewichts-Import in die Datenbank; zweiter Import legt nichts doppelt an.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { parseTrainingCsv, parseWeightCsv, type TrainingImport, type WeightRow } from '@/domain/import-csv';
import { HEVY } from '@/domain/testing/import-samples';

import type { Db } from '../db';
import { buildCsv } from '../export-csv';
import { importTraining, importWeights, suggestChoices } from '../import';
import { migrate } from '../migrations';
import { createTestDb } from '../testing/node-db';
import { exerciseBests, listSessions } from '../training';
import { addWeight, listWeights } from '../weights';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

describe('Import in die Datenbank', () => {
  test('Hevy-Trainings werden abgeschlossene Einheiten mit Sätzen, Cardio und Bestleistung', async () => {
    const imp = parseTrainingCsv(HEVY) as TrainingImport;
    const choices = await suggestChoices(db, ['Bench Press (Barbell)', 'Bench Press (Dumbbell)', 'Squat (Barbell)']);
    expect(choices['Bench Press (Barbell)']).toMatchObject({ kind: 'vorhanden', id: 'bankdruecken' });
    expect(choices['Squat (Barbell)']).toMatchObject({ kind: 'vorhanden', id: 'kniebeuge' });

    const r = await importTraining(db, imp, choices);
    expect(r).toMatchObject({ workouts: 2, sets: 4, cardio: 1, duplicates: 0 });
    const sessions = await listSessions(db);
    expect(sessions).toHaveLength(2);
    expect(sessions.every((s) => s.status === 'abgeschlossen')).toBe(true);
    const cardio = await db.getFirstAsync<{ activity: string; minutes: number; distanceKm: number }>(
      'SELECT activity, minutes, distance_km AS distanceKm FROM cardio_log'
    );
    expect(cardio).toEqual({ activity: 'laufband', minutes: 20, distanceKm: 2.5 });
    const bests = await exerciseBests(db, 'bankdruecken');
    expect(bests.length).toBeGreaterThan(0);
    const types = await db.getAllAsync<{ t: string; rir: number | null }>(
      "SELECT set_type AS t, rir FROM set_log WHERE exercise_id = 'bankdruecken' ORDER BY position"
    );
    expect(types).toEqual([
      { t: 'aufwaermen', rir: null },
      { t: 'arbeit', rir: 2 },
    ]);

    // derselbe Export noch einmal: nichts doppelt
    const again = await importTraining(db, imp, choices);
    expect(again).toMatchObject({ workouts: 0, duplicates: 2 });
    expect(await listSessions(db)).toHaveLength(2);

    // und der Trainings-CSV-Export enthält die importierten Sätze
    const csv = await buildCsv(db, 'training');
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(1 + 4);
  });

  test('unbekannte Übung wird eigene Übung, „weglassen“ überspringt sie', async () => {
    const imp = parseTrainingCsv(HEVY) as TrainingImport;
    const r = await importTraining(db, imp, {
      'Bench Press (Barbell)': { kind: 'weglassen' },
      'Bench Press (Dumbbell)': { kind: 'neu' },
      'Squat (Barbell)': { kind: 'weglassen' },
    });
    expect(r).toMatchObject({ newExercises: 1, sets: 1, workouts: 1, cardio: 1 });
    const custom = await db.getFirstAsync<{ name: string; equipment: string }>('SELECT custom_name AS name, equipment FROM exercise WHERE name_key IS NULL');
    expect(custom).toEqual({ name: 'Bench Press (Dumbbell)', equipment: 'kurzhantel' });
  });

  test('Gewichte: vorhandene Tage bleiben, neue kommen dazu', async () => {
    await addWeight(db, '2026-10-01', 83);
    const rows = parseWeightCsv('Datum;Gewicht\n01.10.2026;82,4\n02.10.2026;81,8') as WeightRow[];
    expect(await importWeights(db, rows)).toEqual({ added: 1, skipped: 1 });
    expect((await listWeights(db)).map((w) => [w.day, w.kg]).sort()).toEqual([
      ['2026-10-01', 83],
      ['2026-10-02', 81.8],
    ]);
  });
});
