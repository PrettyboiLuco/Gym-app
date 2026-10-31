import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import { CATALOG_EXERCISES } from '../exercise-catalog';
import { HIIT_EXERCISES, MORE_STRENGTH_EXERCISES, STARTER_EXERCISES, STRETCH_EXERCISES } from '../exercises';
import { parsePlanFile } from '../plan-file';

const known = new Set([...STARTER_EXERCISES, ...MORE_STRENGTH_EXERCISES, ...HIIT_EXERCISES, ...STRETCH_EXERCISES, ...CATALOG_EXERCISES].map((e) => e.id));

describe('Plan-Datei', () => {
  test('Lucs Plan wird vollständig übernommen (64 Sätze, alle Übungen bekannt)', () => {
    const text = readFileSync(join(__dirname, '../../../../docs/plaene/lucs-training.myhealth.json'), 'utf8');
    const r = parsePlanFile(text, known);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.draft.days.map((d) => d.name)).toEqual(['Push (So)', 'Pull (Mo)', 'Oberkörper (Mi)', 'Beine (Fr)']);
    expect(r.draft.days.map((d) => d.items.reduce((s, i) => s + i.sets, 0))).toEqual([16, 18, 17, 13]);
  });
  test('Fehler werden erkannt statt still übernommen', () => {
    expect(parsePlanFile('kein json', known)).toMatchObject({ ok: false, error: 'json' });
    expect(parsePlanFile('{"format":"anders"}', known)).toMatchObject({ ok: false, error: 'format' });
    const fremd = JSON.stringify({ format: 'myhealth-plan', version: 1, name: 'X', days: [{ name: 'A', items: [{ exercise: 'gibt_es_nicht', sets: 3, reps: [8, 12] }] }] });
    expect(parsePlanFile(fremd, known)).toMatchObject({ ok: false, error: 'unknownExercises', unknown: ['gibt_es_nicht'] });
    const kaputt = JSON.stringify({ format: 'myhealth-plan', version: 1, name: 'X', days: [{ name: 'A', items: [{ exercise: 'latzug', sets: 0, reps: [8, 12] }] }] });
    expect(parsePlanFile(kaputt, known)).toMatchObject({ ok: false, error: 'invalid' });
  });
});
