import { expect, test } from '@jest/globals';

import { trendChange } from '../training-stats';

test('Veränderung vom ersten zum letzten Wochenwert, Lücken ignoriert', () => {
  expect(trendChange({ metric: 'e1rm', weeks: [null, 100, null, 112] })).toBeCloseTo(12);
  expect(trendChange({ metric: 'e1rm', weeks: [100, null] })).toBeNull();
  expect(trendChange({ metric: 'e1rm', weeks: [0, 50] })).toBeNull();
  expect(trendChange({ metric: 'gegengewicht', weeks: [40, 30] })).toBeCloseTo(25);
});
