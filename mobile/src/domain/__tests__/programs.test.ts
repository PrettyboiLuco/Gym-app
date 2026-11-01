// A8.1: Programm-Vorlagen sind gültige Plan-Dateien mit bekannten Übungen und passender Wochentagszahl.

import { describe, expect, test } from '@jest/globals';

import { PROGRAMS } from '@/data/programs';

import { CATALOG_EXERCISES, CATALOG_STRETCHES } from '../exercise-catalog';
import { HIIT_EXERCISES, MORE_STRENGTH_EXERCISES, STARTER_EXERCISES, STRETCH_EXERCISES } from '../exercises';
import { parsePlanFile } from '../plan-file';
import { estimateDayMinutes } from '../training';

const known = new Set(
  [...STARTER_EXERCISES, ...MORE_STRENGTH_EXERCISES, ...HIIT_EXERCISES, ...STRETCH_EXERCISES, ...CATALOG_EXERCISES, ...CATALOG_STRETCHES].map((e) => e.id)
);

describe('Programm-Vorlagen', () => {
  test.each(PROGRAMS.map((p) => [p.id, p] as const))('%s ist gültig und passt in rund 75 Minuten', (_id, program) => {
    const r = parsePlanFile(JSON.stringify(program.file), known);
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.draft.name).toBe(program.file.name);
    expect(r.weekdays?.length).toBeGreaterThanOrEqual(r.draft.days.length);
    if (program.id !== 'lucs-training') for (const d of r.draft.days) expect(estimateDayMinutes(d.items)).toBeLessThanOrEqual(80);
  });
});
