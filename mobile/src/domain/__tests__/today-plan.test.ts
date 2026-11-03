// Heute Training oder Ruhetag? Nach Wochentagen im Plan statt immer „nächster Plantag“.

import { describe, expect, test } from '@jest/globals';

import { todayPlan, weekdayFromName } from '../training';

const LUC = ['Push (So)', 'Pull (Mo)', 'Oberkörper (Mi)', 'Beine (Fr)'];

describe('Wochentag im Namen', () => {
  test.each([
    ['Push (So)', 7],
    ['Pull (Mo)', 1],
    ['Beine – Fr', 5],
    ['Mi: Oberkörper', 3],
    ['Ganzkörper A', null],
    ['Mobility', null],
    ['Sonntagstraining', null],
  ])('%s → %s', (name, wd) => expect(weekdayFromName(name)).toBe(wd));
});

describe('heute laut Plan', () => {
  test('Dienstag ist bei Lucs Plan Ruhetag, als Nächstes Oberkörper am Mittwoch', () => {
    expect(todayPlan(LUC, [1, 3, 5, 7], 2, 0)).toEqual({ kind: 'rest', nextIndex: 2, nextWeekday: 3 });
  });
  test('Sonntag ist Push – unabhängig davon, was zuletzt trainiert wurde', () => {
    expect(todayPlan(LUC, [], 7, 3)).toEqual({ kind: 'training', index: 0 });
    expect(todayPlan(LUC, [], 1, 0)).toEqual({ kind: 'training', index: 1 });
  });
  test('Samstag: nächster ist Push am Sonntag', () => {
    expect(todayPlan(LUC, [], 6, 0)).toEqual({ kind: 'rest', nextIndex: 0, nextWeekday: 7 });
  });
  test('ohne Wochentage im Namen gelten die Trainingstage', () => {
    const plan = ['A', 'B'];
    expect(todayPlan(plan, [1, 4], 1, 1)).toEqual({ kind: 'training', index: 1 });
    expect(todayPlan(plan, [1, 4], 2, 1)).toEqual({ kind: 'rest', nextIndex: 1, nextWeekday: 4 });
    expect(todayPlan(plan, [1, 4], 5, 0)).toEqual({ kind: 'rest', nextIndex: 0, nextWeekday: 1 });
  });
  test('ohne jede Angabe: nächster Plantag der Reihe nach', () => {
    expect(todayPlan(['A', 'B', 'C'], [], 3, 2)).toEqual({ kind: 'training', index: 2 });
  });
});
