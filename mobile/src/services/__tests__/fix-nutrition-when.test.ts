// Fehlerbehebung Ernährung: Nachträge für heute bekommen die übliche Uhrzeit der Mahlzeit, wenn sie lange vorbei ist.

import { describe, expect, test } from '@jest/globals';

import { whenFor } from '../nutrition-format';

// Übliche Essenszeiten (Voreinstellung): Frühstück 7, Mittag 12, Abend 18 Uhr.
const local = (hour: number, minute = 0) => new Date(2026, 10, 3, hour, minute).getTime();
const day = '2026-11-03';

describe('whenFor für heute', () => {
  test('um 21 Uhr nachgetragenes Frühstück zählt um 7 Uhr', () => {
    const w = whenFor(day, 'fruehstueck', local(21));
    expect(w.diaryDate).toBe(day);
    expect(w.at.getTime()).toBe(local(7));
  });

  test('Abendessen kurz nach der üblichen Zeit: Erfassungszeit', () => {
    expect(whenFor(day, 'abend', local(19, 30)).at.getTime()).toBe(local(19, 30));
  });

  test('Mahlzeit noch nicht dran, Snack oder ohne Mahlzeit: Erfassungszeit', () => {
    expect(whenFor(day, 'abend', local(9)).at.getTime()).toBe(local(9));
    expect(whenFor(day, 'snack', local(23)).at.getTime()).toBe(local(23));
    expect(whenFor(day, null, local(23)).at.getTime()).toBe(local(23));
  });

  test('früherer Tag: übliche Uhrzeit der Mahlzeit, sonst 12 Uhr', () => {
    const at = whenFor('2026-11-01', 'abend', local(9)).at;
    expect([at.getDate(), at.getHours()]).toEqual([1, 18]);
    expect(whenFor('2026-11-01', null, local(9)).at.getHours()).toBe(12);
  });
});
