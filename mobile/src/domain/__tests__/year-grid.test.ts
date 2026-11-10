import { expect, test } from '@jest/globals';

import { activeWeeks, yearCells } from '../year-grid';

test('52 Wochen, Montag oben, laufende Woche rechts, Zukunft markiert', () => {
  const cells = yearCells('2026-11-10'); // Dienstag
  expect(cells).toHaveLength(52 * 7);
  const last = cells.filter((c) => c.col === 51);
  expect(last[0].day).toBe('2026-11-09'); // Montag
  expect(last[1]).toMatchObject({ day: '2026-11-10', future: false });
  expect(last[2].future).toBe(true);
  expect(cells[0].day).toBe('2025-11-17');
});

test('aktive Wochen über den Jahreswechsel', () => {
  expect(activeWeeks(['2026-12-28', '2027-01-03', '2027-01-04'])).toBe(2);
});
