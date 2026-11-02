// Muskelkarte: jeder Muskel ist zu sehen, alle Flächen liegen im Körper, die Spiegelung stimmt, Antippen trifft.

import { describe, expect, test } from '@jest/globals';

import { FIGURE, hitTest, mirror, OUTLINE, polygon, sidesOf, type Pt } from '@/components/muscle-figure';
import { MUSCLE_GROUPS } from '@/domain/exercises';
import { MAP_MUSCLES } from '@/domain/muscle-map';

function inside([x, y]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a];
    const [xb, yb] = poly[b];
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) hit = !hit;
  }
  return hit;
}

const body = polygon(OUTLINE);
const VIEWS = ['front', 'back', 'frontMini', 'backMini'] as const;

describe('Muskelkarte', () => {
  test('jeder Kartenmuskel hat vorne oder hinten eine Fläche', () => {
    const shown = new Set([...FIGURE.front, ...FIGURE.back].map((r) => r.muscle));
    for (const m of MAP_MUSCLES) expect(shown).toContain(m);
  });

  test('die kleine Karte hat für jede Muskelgruppe außer Ganzkörper eine Fläche', () => {
    const shown = new Set([...FIGURE.frontMini, ...FIGURE.backMini].map((r) => r.group));
    for (const g of MUSCLE_GROUPS) if (g !== 'ganzkoerper') expect(shown).toContain(g);
  });

  test('alle Muskelflächen liegen innerhalb des Körperumrisses', () => {
    const outside: string[] = [];
    for (const v of VIEWS)
      for (const r of FIGURE[v])
        for (const poly of r.polys) for (const p of poly) if (!inside(p, body)) outside.push(`${v}/${r.key}: ${p.map((n) => n.toFixed(1)).join(' ')}`);
    expect(outside).toEqual([]);
  });

  test('der Umriss ist ein geschlossener, symmetrischer Pfad', () => {
    expect(OUTLINE.startsWith('M50 ')).toBe(true);
    expect(OUTLINE.trim().endsWith('Z')).toBe(true);
    // Jeder Punkt hat sein Spiegelbild im Umriss (linke und rechte Hälfte gleich).
    const gap = ([x, y]: Pt) => Math.min(...body.map(([u, v]) => Math.hypot(u - (100 - x), v - y)));
    expect(Math.max(...body.map(gap))).toBeLessThan(0.02);
  });

  test('Spiegeln zweimal ergibt wieder den Pfad', () => {
    const d = 'M10 20 C11.5 22 13 24 15 26 L20 30 Z';
    const back = mirror(mirror(d))
      .match(/-?\d*\.?\d+/g)!
      .map(Number);
    expect(back).toEqual(d.match(/-?\d*\.?\d+/g)!.map(Number));
  });

  test('Reihen laufen von oben nach unten', () => {
    const row = (m: string) => FIGURE.front.find((r) => r.muscle === m)!.row;
    expect(row('nacken')).toBeLessThan(row('brust_mitte'));
    expect(row('brust_mitte')).toBeLessThan(row('quadrizeps'));
    expect(row('quadrizeps')).toBeLessThan(row('waden'));
  });
});

describe('Antippen (Punkt 4)', () => {
  test('ein Punkt in der Fläche trifft sie – links wie rechts', () => {
    expect(hitTest(FIGURE.front, 40, 48)?.muscle).toBe('brust_mitte');
    expect(hitTest(FIGURE.front, 60, 48)?.muscle).toBe('brust_mitte');
    expect(hitTest(FIGURE.back, 40, 110)?.muscle).toBe('gesaess');
  });

  test('auf einer Fuge gilt die nächste Fläche im Fangradius', () => {
    // Mitte zwischen den Brusthälften (Fuge bei x = 50)
    expect(hitTest(FIGURE.front, 50, 48)?.group).toBe('brust');
  });

  test('weit daneben trifft nichts', () => {
    expect(hitTest(FIGURE.front, 2, 10)).toBeNull();
    expect(hitTest(FIGURE.front, 50, 12)).toBeNull(); // Kopf
  });

  test('Seiten eines Muskels', () => {
    expect(sidesOf('bizeps')).toEqual(['front']);
    expect(sidesOf('lat')).toEqual(['back']);
    expect(sidesOf('waden')).toEqual(['front', 'back']);
  });
});
