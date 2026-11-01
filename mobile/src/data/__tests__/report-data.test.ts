// A5: Bericht und KI-Zusammenfassung aus importierten Daten; CSV-Export aller Bereiche.

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { parseTrainingCsv, type TrainingImport } from '@/domain/import-csv';
import { HEVY } from '@/domain/testing/import-samples';

import type { Db } from '../db';
import { buildCsv, EXPORT_AREAS } from '../export-csv';
import { importTraining, suggestChoices } from '../import';
import { migrate } from '../migrations';
import { buildReport, periodFor, reportHtml, reportText } from '../report';
import { createTestDb } from '../testing/node-db';
import { addWeight } from '../weights';

let db: Db & { close(): void };
beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});
afterEach(() => db.close());

describe('Bericht', () => {
  test('Zeitraum', () => {
    expect(periodFor(4, '2026-02-01')).toEqual({ from: '2026-01-05', to: '2026-02-01' });
  });

  test('Zahlen aus Training und Gewicht, ohne Bewertung; Text und PDF enthalten dasselbe', async () => {
    const imp = parseTrainingCsv(HEVY) as TrainingImport;
    await importTraining(db, imp, await suggestChoices(db, ['Bench Press (Barbell)', 'Bench Press (Dumbbell)', 'Squat (Barbell)']));
    await addWeight(db, '2026-01-10', 84);
    await addWeight(db, '2026-01-30', 82.5);
    const r = await buildReport(db, '2026-01-05', '2026-02-01');
    expect(r.weight).toMatchObject({ first: 84, last: 82.5, count: 2 });
    expect(r.training).toMatchObject({ sessions: 2, workSets: 3, cardioCount: 1, cardioMinutes: 20 });
    expect(r.training.top[0].e1rm).not.toBeNull();
    expect(r.nutrition).toBeNull();
    const text = reportText(r);
    expect(text).toContain('84 kg → 82,5 kg (−1,5 kg)');
    expect(text).toContain('Trainings: 2');
    expect(text).not.toMatch(/gut|schlecht|zu viel|zu wenig/i);
    const html = reportHtml(r, '2026-02-01');
    expect(html).toContain('82,5 kg');
    expect(html).toContain('Keine medizinische Bewertung');
  });
});

describe('CSV-Export', () => {
  test('alle Bereiche lassen sich erstellen, auch leer', async () => {
    for (const area of EXPORT_AREAS) {
      const csv = await buildCsv(db, area);
      expect(csv.startsWith('﻿')).toBe(true);
      expect(csv.split('\r\n')[0].split(';').length).toBeGreaterThan(1);
    }
  });
});
