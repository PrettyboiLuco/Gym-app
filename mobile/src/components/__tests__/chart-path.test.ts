// Verlaufsdiagramm: weiche Kurve ohne Überschwingen, Achsenwerte, nächster Punkt zum Finger.

import { describe, expect, test } from '@jest/globals';

import { approxLength, axisTicks, monotonePath, nearestIndex, type XY } from '@/components/chart-path';

/** Alle y-Werte im Pfad (Start-, Kontroll- und Endpunkte). */
function ys(d: string): number[] {
  const nums = d.replace(/[MC]/g, ' ').trim().split(/\s+/).map(Number);
  return nums.filter((_, i) => i % 2 === 1);
}

describe('weiche Kurve', () => {
  test('geht durch jeden Punkt und schwingt nicht über die Messwerte hinaus', () => {
    const pts: XY[] = [
      [0, 50],
      [10, 10],
      [20, 10],
      [30, 80],
      [40, 60],
    ];
    const d = monotonePath(pts);
    expect(d.startsWith('M0 50')).toBe(true);
    for (const [x, y] of pts.slice(1)) expect(d).toContain(` ${x} ${y}`);
    const all = ys(d);
    expect(Math.min(...all)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...all)).toBeLessThanOrEqual(80);
  });
  test('ein Punkt ergibt nur einen Startpunkt, keiner einen leeren Pfad', () => {
    expect(monotonePath([[5, 5]])).toBe('M5 5');
    expect(monotonePath([])).toBe('');
  });
  test('Länge reicht für das Einzeichnen', () => {
    expect(
      approxLength([
        [0, 0],
        [30, 40],
      ])
    ).toBeGreaterThanOrEqual(50);
  });
});

describe('Achse und Finger', () => {
  test('drei runde Werte schließen den Bereich ein', () => {
    const t = axisTicks(91.3, 92);
    expect(t[0]).toBeLessThanOrEqual(91.3);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(92);
    expect(t.length).toBeGreaterThanOrEqual(3);
    expect(t.length).toBeLessThanOrEqual(4);
  });
  test('gleiche Werte bekommen trotzdem einen sichtbaren Bereich', () => {
    const t = axisTicks(80, 80);
    expect(t[0]).toBeLessThan(80);
    expect(t[t.length - 1]).toBeGreaterThan(80);
  });
  test('nächster Punkt zum Finger', () => {
    expect(nearestIndex([0, 10, 20, 30], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20, 30], 99)).toBe(3);
    expect(nearestIndex([], 5)).toBe(-1);
  });
});
