import { describe, expect, test } from '@jest/globals';

import { isStaleSession } from '../training';

describe('Vergessenes Training', () => {
  const start = '2026-10-30T20:00:00Z';
  test('bis 6 Stunden ist es ein laufendes Training', () => {
    expect(isStaleSession(start, Date.parse('2026-10-31T01:59:00Z'))).toBe(false);
  });
  test('danach gilt es als vergessen (z. B. 1608 Minuten)', () => {
    expect(isStaleSession(start, Date.parse(start) + 1608 * 60_000)).toBe(true);
  });
});
