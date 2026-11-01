// Programm-Vorlagen (Ausbauplan A8.1): fertige Pläne als myhealth-plan-Dateien, übernommen über „Plan übernehmen“.
// Eigene Namen, keine geschützten Programmnamen.

import ganzkoerper from './presets/ganzkoerper-3.myhealth.json';
import kraftBasis from './presets/kraft-basis-3.myhealth.json';
import lucs from './presets/lucs-training.myhealth.json';
import oberUnter from './presets/ober-unter-4.myhealth.json';
import ppl from './presets/ppl-6.myhealth.json';
import zuhause from './presets/zuhause-kh-3.myhealth.json';

export type Program = { id: string; file: { name: string; note?: string; days: unknown[]; weekdays?: number[] }; level: 'einsteiger' | 'fortgeschritten'; place: 'studio' | 'zuhause' };

export const PROGRAMS: Program[] = [
  { id: 'ganzkoerper-3', file: ganzkoerper, level: 'einsteiger', place: 'studio' },
  { id: 'kraft-basis-3', file: kraftBasis, level: 'einsteiger', place: 'studio' },
  { id: 'zuhause-kh-3', file: zuhause, level: 'einsteiger', place: 'zuhause' },
  { id: 'ober-unter-4', file: oberUnter, level: 'fortgeschritten', place: 'studio' },
  { id: 'ppl-6', file: ppl, level: 'fortgeschritten', place: 'studio' },
  { id: 'lucs-training', file: lucs, level: 'fortgeschritten', place: 'studio' },
];

export const findProgram = (id: string | undefined) => PROGRAMS.find((p) => p.id === id) ?? null;
