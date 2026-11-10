import { describe, expect, test } from '@jest/globals';

import { neglectedMuscle } from '../muscle-neglect';

const today = '2026-11-10';
describe('Muskel-Hinweis „zuletzt vor N Tagen“', () => {
  test('älteste Gruppe aus dem Plan ab 8 Tagen', () => {
    expect(
      neglectedMuscle({
        planned: ['brust', 'schultern', 'beine'],
        lastTrained: { brust: '2026-11-08', schultern: '2026-11-01', beine: '2026-10-30' },
        today,
      })
    ).toEqual({ group: 'beine', days: 11, lastDay: '2026-10-30' });
  });
  test('unter 8 Tagen still', () => {
    expect(neglectedMuscle({ planned: ['schultern'], lastTrained: { schultern: '2026-11-03' }, today })).toBeNull();
    expect(neglectedMuscle({ planned: ['schultern'], lastTrained: { schultern: '2026-11-02' }, today })?.days).toBe(8);
  });
  test('nicht im Plan, noch nie trainiert, Ganzkörper: kein Hinweis', () => {
    expect(neglectedMuscle({ planned: ['brust'], lastTrained: { beine: '2026-09-01', brust: '2026-11-09' }, today })).toBeNull();
    expect(neglectedMuscle({ planned: ['waden'], lastTrained: {}, today })).toBeNull();
    expect(neglectedMuscle({ planned: ['ganzkoerper'], lastTrained: { ganzkoerper: '2026-09-01' }, today })).toBeNull();
  });
  test('Status oder geschonter Bereich: kein Hinweis', () => {
    const base = { planned: ['schultern', 'beine'] as const, lastTrained: { schultern: '2026-10-01', beine: '2026-10-20' }, today };
    expect(neglectedMuscle({ ...base, status: 'krank' })).toBeNull();
    expect(neglectedMuscle({ ...base, spared: ['schultern'] })?.group).toBe('beine');
  });
});
