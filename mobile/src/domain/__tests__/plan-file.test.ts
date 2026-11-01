import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import { CATALOG_EXERCISES, CATALOG_STRETCHES } from '../exercise-catalog';
import { HIIT_EXERCISES, MORE_STRENGTH_EXERCISES, STARTER_EXERCISES, STRETCH_EXERCISES } from '../exercises';
import { parsePlanFile } from '../plan-file';

const known = new Set([...STARTER_EXERCISES, ...MORE_STRENGTH_EXERCISES, ...HIIT_EXERCISES, ...STRETCH_EXERCISES, ...CATALOG_EXERCISES, ...CATALOG_STRETCHES].map((e) => e.id));

describe('Plan-Datei', () => {
  test('Lucs Plan wird vollständig übernommen (64 Sätze, alle Übungen bekannt)', () => {
    const text = readFileSync(join(__dirname, '../../../../docs/plaene/lucs-training.myhealth.json'), 'utf8');
    const r = parsePlanFile(text, known);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.draft.days.map((d) => d.name)).toEqual(['Push (So)', 'Pull (Mo)', 'Oberkörper (Mi)', 'Beine (Fr)']);
    expect(r.draft.days.map((d) => d.items.reduce((s, i) => s + i.sets, 0))).toEqual([16, 18, 17, 13]);
    expect(r.draft.days.flatMap((d) => d.items).every((i) => i.rir && i.restSeconds === 240)).toBe(true);
    expect(r.weekdays).toEqual([1, 3, 5, 7]);
    // Namen wie im PDF, Katalog-Übung dahinter bleibt für Verlauf und Bestleistungen.
    expect(r.draft.days[0].items[0]).toMatchObject({ exerciseId: 'cable_crossover', label: 'Cable Flys' });
    expect(r.draft.days[2].items[2]).toMatchObject({ exerciseId: 'rudern_maschine_hoch', label: 'High Row' });
    expect(r.draft.days.flatMap((d) => d.items).every((i) => i.label)).toBe(true);
    expect(r.routines.map((x) => [x.name, x.items.length])).toEqual([['Lucs Dehnroutine', 10], ['Massagepistole', 6]]);
    expect(r.customExercises).toHaveLength(8);
    expect(r.goals).toEqual({ kcal: 3900, drinkMl: 5000 });
    expect(r.note).toContain('RIR');
  });
  test('Mitgelieferte Kopie in der App ist identisch mit docs/plaene', () => {
    const docs = readFileSync(join(__dirname, '../../../../docs/plaene/lucs-training.myhealth.json'), 'utf8');
    const app = readFileSync(join(__dirname, '../../data/presets/lucs-training.myhealth.json'), 'utf8');
    expect(JSON.parse(app)).toEqual(JSON.parse(docs));
  });
  test('Abläufe und eigene Übungen werden geprüft', () => {
    const base = { format: 'myhealth-plan', version: 1, name: 'X', days: [{ name: 'A', items: [{ exercise: 'latzug', sets: 3, reps: [8, 12] }] }] };
    expect(parsePlanFile(JSON.stringify({ ...base, routines: [{ name: 'R', items: [{ exercise: 'latzug', seconds: 2 }] }] }), known)).toMatchObject({ ok: false, error: 'routine' });
    expect(parsePlanFile(JSON.stringify({ ...base, customExercises: [{ key: 'k', name: 'N', equipment: 'quatsch', muscleGroup: 'beine' }] }), known)).toMatchObject({ ok: false, error: 'custom' });
    expect(parsePlanFile(JSON.stringify({ ...base, routines: [{ name: 'R', items: [{ exercise: 'eigen:fehlt', seconds: 30 }] }] }), known)).toMatchObject({ ok: false, error: 'unknownExercises', unknown: ['eigen:fehlt'] });
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
